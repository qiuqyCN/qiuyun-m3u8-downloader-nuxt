/**
 * TS → fMP4 无损转封装（基于 mux.js）
 * 不重新编码：仅把 H.264/AAC 等 MP4 兼容码流从 TS 容器换到 MP4 容器。
 *
 * 两种用法：
 *
 * 1) 流式（推迟 flush，保证上一片末帧被当前片首帧校正）：
 *    const t = new TsToMp4Transmuxer(totalDurationSeconds);
 *    for (const seg of segments) {
 *      t.pushOnly(seg);
 *      if (已累计 push 2 片) await write(t.flush());  // 上一片精确，当前片估
 *    }
 *    await write(t.flush());  // 冲刷剩余（末片估算）
 *
 * 2) 全量（最精确，用于内存合并模式）：
 *    for (const seg of segments) t.pushOnly(seg);
 *    const chunks = t.flush();  // 全部推入后一次 flush，除末帧外全部精确
 *    await write(chunks);
 *
 * keepOriginalTimestamps 保持默认 false，时间戳从 0 开始。
 *
 * duration 修正：mux.js 写出的 init segment 中 mvhd/tkhd/mdhd 的 duration
 * 恒为 0xFFFFFFFF（"未知"，fMP4 靠分片时长）。0xFFFFFFFF/90000 ≈ 13:15:21，
 * 会导致文件管理器时长显示错误、部分播放器进度条异常。构造时传入真实总时长
 * （m3u8 EXTINF 之和），flush() 首次输出 init segment 前会自动补写。
 */
// @ts-expect-error mux.js 无官方类型声明
import muxjs from 'mux.js';

function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

type SegmentEvent = { initSegment?: Uint8Array | null; data?: Uint8Array | null };

/**
 * 把 init segment 中 mvhd / tkhd / mdhd 的 duration 从 0xFFFFFFFF 改为真实值。
 * 各 box 的 timescale 直接从 box 自身读取（不假设 90kHz），version 0/1 均支持。
 */
function patchInitSegmentDurations(initSegment: ArrayBuffer | Uint8Array, durationSeconds: number): ArrayBuffer {
  // 拷贝一份连续 ArrayBuffer（兼容传入 Uint8Array 视图的情况）
  const buf = (
    ArrayBuffer.isView(initSegment)
      ? initSegment.buffer.slice(initSegment.byteOffset, initSegment.byteOffset + initSegment.byteLength)
      : initSegment.slice(0)
  ) as ArrayBuffer;
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  const typeOf = (off: number) =>
    String.fromCharCode(u8[off + 4]!, u8[off + 5]!, u8[off + 6]!, u8[off + 7]!);
  const sizeOf = (off: number, end: number) => {
    let size = view.getUint32(off);
    if (size === 1) size = view.getUint32(off + 8)! * 2 ** 32 + view.getUint32(off + 12)!;
    else if (size === 0) size = end - off;
    return size;
  };
  const eachChild = (start: number, end: number, cb: (off: number, end: number, type: string) => void) => {
    let off = start;
    while (off + 8 <= end) {
      const size = sizeOf(off, end);
      if (size < 8 || off + size > end) break;
      cb(off, off + size, typeOf(off));
      off += size;
    }
  };
  // 按各 box 自身 timescale 把秒数换算成 ticks 并写 duration（v0: 32 位 / v1: 64 位）
  // v0Off/v1Off 为 duration 相对 box payload 的偏移
  const writeDuration = (off: number, v0Off: number, v1Off: number, timescale: number) => {
    if (!timescale || timescale <= 0) return;
    const payload = off + 8;
    const version = u8[payload]!;
    const ticks = Math.round(durationSeconds * timescale);
    if (version === 0) {
      if (ticks > 0xffffffff) return; // 超出 32 位表示范围，保持 0xFFFFFFFF
      view.setUint32(payload + v0Off, ticks);
    } else if (version === 1) {
      view.setUint32(payload + v1Off, Math.floor(ticks / 2 ** 32));
      view.setUint32(payload + v1Off + 4, ticks % 2 ** 32);
    }
  };

  eachChild(0, buf.byteLength, (off, end, type) => {
    if (type !== 'moov') return;
    // tkhd 无 timescale 字段，时长单位 = movie timescale（即 mvhd 的 timescale）；
    // mvhd 是 moov 的直接子级，先扫一遍拿到
    let movieTimescale = 0;
    eachChild(off + 8, end, (oo, _ee, tt) => {
      if (tt === 'mvhd') movieTimescale = view.getUint32(oo + 8 + 12);
    });
    eachChild(off + 8, end, (o2, e2, t2) => {
      if (t2 === 'mvhd') {
        // mvhd payload: version+flags(4) creation(4) modification(4) timescale@12 duration@16（v0）
        writeDuration(o2, 16, 24, view.getUint32(o2 + 8 + 12));
      } else if (t2 === 'trak') {
        eachChild(o2 + 8, e2, (o3, e3, t3) => {
          if (t3 === 'tkhd') {
            writeDuration(o3, 20, 28, movieTimescale);
          } else if (t3 === 'mdia') {
            eachChild(o3 + 8, e3, (o4, _e4, t4) => {
              if (t4 === 'mdhd') {
                // mdhd payload: version+flags(4) creation(4) modification(4) timescale@12 duration@16（v0）
                writeDuration(o4, 16, 24, view.getUint32(o4 + 8 + 12));
              }
            });
          }
        });
      }
    });
  });
  return buf;
}

export class TsToMp4Transmuxer {
  private transmuxer: {
    on: (event: string, cb: (segment: SegmentEvent) => void) => void;
    push: (data: Uint8Array) => void;
    flush: () => void;
  };
  private chunks: ArrayBuffer[] = [];
  private initSegment: ArrayBuffer | null = null;
  private initWritten = false;
  private durationSeconds?: number;

  /** durationSeconds：m3u8 EXTINF 之和，用于修正 init segment 的总时长元数据 */
  constructor(durationSeconds?: number) {
    this.durationSeconds = durationSeconds && durationSeconds > 0 ? durationSeconds : undefined;
    this.transmuxer = new muxjs.mp4.Transmuxer(); // keepOriginalTimestamps 默认 false
    this.transmuxer.on('data', (segment) => {
      if (segment.initSegment && segment.initSegment.byteLength > 0 && !this.initSegment) {
        this.initSegment = toArrayBuffer(segment.initSegment);
      }
      if (segment.data && segment.data.byteLength > 0) {
        this.chunks.push(toArrayBuffer(segment.data));
      }
    });
  }

  /** 只推入一个 TS 分片，不 flush。用于推迟 flush 策略 */
  pushOnly(tsSegment: ArrayBuffer): void {
    this.transmuxer.push(new Uint8Array(tsSegment));
  }

  /** flush 自上次 flush 以来积压的数据。首次调用会附带 init segment（已补写真实时长） */
  flush(): ArrayBuffer[] {
    this.transmuxer.flush();
    const out: ArrayBuffer[] = [];
    if (this.initSegment && !this.initWritten) {
      out.push(
        this.durationSeconds
          ? patchInitSegmentDurations(this.initSegment, this.durationSeconds)
          : this.initSegment
      );
      this.initWritten = true;
    }
    out.push(...this.chunks);
    this.chunks = [];
    return out;
  }
}
