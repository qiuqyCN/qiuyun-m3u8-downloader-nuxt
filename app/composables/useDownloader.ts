import type { DownloadTask, DownloadOptions } from '~/types';
import { parseM3U8, isMasterPlaylist, parseMasterPlaylist } from '~/utils/m3u8-parser';
import { decryptAES128 } from '~/utils/crypto';
import { fetchCoverBlob, saveImageBlob } from '~/utils/cover';
import { createDirectoryWriter, writeBlobToDirectory } from '~/utils/stream-save';
import type { StreamWriter } from '~/utils/stream-save';
import { TsToMp4Transmuxer } from '~/utils/ts-to-mp4';
import { triggerRef } from 'vue';

/** 已被用户取消的任务 id（下载循环据此立即退出） */
const cancelledTaskIds = new Set<string>();
/** 已暂停的任务 id（派发循环据此停止派发新分片） */
const pausedTaskIds = new Set<string>();
/** 每个任务的取消控制器：取消时用于立即中止在途请求 */
const taskAbortControllers = new Map<string, AbortController>();
/** 正在写入的文件句柄，取消时用于中止并删除半成品 */
const activeWriters = new Map<string, StreamWriter>();

export function useDownloader() {
  const tasks = ref<DownloadTask[]>([]);
  const currentTask = ref<DownloadTask | null>(null);
  const isDownloading = ref(false);

  const { fetchM3U8, fetchSegment, fetchKey, isTampermonkeyAvailable } = useTampermonkey();

  async function createTask(options: DownloadOptions): Promise<DownloadTask> {
    const task: DownloadTask = {
      id: generateId(),
      url: options.url,
      title: options.filename || '未命名视频',
      status: 'pending',
      progress: 0,
      segments: {
        total: 0,
        downloaded: 0,
        failed: [],
        startIndex: options.startSegmentIndex,
      },
      speed: 0,
      eta: 0,
      coverUrl: options.coverUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    tasks.value.push(task);
    triggerRef(tasks);
    return task;
  }

  /** 强制刷新 task 数组以触发 Vue 响应式更新 */
  function refresh() {
    triggerRef(tasks);
    if (currentTask.value) triggerRef(currentTask);
  }

  async function startDownload(task: DownloadTask, options: DownloadOptions) {
    // 取消控制器贯穿整个任务（解析阶段也能被取消中止）
    const controller = new AbortController();
    taskAbortControllers.set(task.id, controller);

    try {
      task.status = 'parsing';
      currentTask.value = task;
      isDownloading.value = true;
      refresh();

      // 获取 M3U8 内容
      const m3u8Content = await fetchM3U8(task.url, undefined, controller.signal);
      
      // 检查是否是主播放列表
      if (isMasterPlaylist(m3u8Content)) {
        const variants = parseMasterPlaylist(m3u8Content, task.url);
        if (variants.length === 0) {
          throw new Error('No variants found in master playlist');
        }
        // 选择最高质量的变体
        const bestVariant = variants.reduce((best, current) => 
          (current.bandwidth || 0) > (best.bandwidth || 0) ? current : best
        );
        task.url = bestVariant.url;
        // 主播放列表声明了 RESOLUTION 才追加到标题，避免出现 "xxx_unknown"
        if (bestVariant.resolution) {
          task.title = `${task.title}_${bestVariant.resolution}`;
        }
        
        // 重新获取媒体播放列表
        const mediaContent = await fetchM3U8(task.url, undefined, controller.signal);
        await downloadPlaylist(task, mediaContent, options, controller.signal);
      } else {
        await downloadPlaylist(task, m3u8Content, options, controller.signal);
      }
    } catch (error) {
      // 用户主动取消不算错误，避免把已移除的任务又标成 error
      if (controller.signal.aborted) {
        console.log(`[M3U8] 任务已取消: ${task.id}`);
      } else {
        task.status = 'error';
        task.error = error instanceof Error ? error.message : 'Unknown error';
        console.error('Download error:', error);
      }
    } finally {
      taskAbortControllers.delete(task.id);
      pausedTaskIds.delete(task.id);
      isDownloading.value = false;
      currentTask.value = null;
    }
  }

  async function downloadPlaylist(
    task: DownloadTask,
    content: string,
    options: DownloadOptions,
    signal: AbortSignal,
  ) {
    // 解析阶段就被删除的任务，直接退出，不创建任何文件
    if (cancelledTaskIds.has(task.id)) {
      cancelledTaskIds.delete(task.id);
      return;
    }

    const playlist = parseM3U8(content, task.url);
    const segments = playlist.segments.slice(options.startSegmentIndex);

    task.segments.total = segments.length;
    task.segments.downloaded = 0;
    task.status = 'downloading';
    refresh();

    // 统一文件名（视频与封面共用）
    const timestamp = localTimestamp();
    const fileBase = `${sanitizeFilename(options.filename || task.title || 'video')}_${timestamp}`;

    // ========== 先下载 fMP4 初始化片段 ==========
    let initSegmentData: ArrayBuffer | null = null;
    if (playlist.initSegment) {
      console.log(`[M3U8] 下载 fMP4 init segment: ${playlist.initSegment}`);
      initSegmentData = await fetchSegment(playlist.initSegment, signal);
      const bytes = new Uint8Array(initSegmentData);
      const ftyp = String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!);
      console.log(`[M3U8] init segment: ${initSegmentData.byteLength} bytes, type=${ftyp} (应为 ftyp)`);
    }

    // 预加载所有 key（去重缓存）
    const keyCache = new Map<string, ArrayBuffer>();
    for (const seg of segments) {
      if (seg.encryption?.uri && !keyCache.has(seg.encryption.uri)) {
        try {
          keyCache.set(seg.encryption.uri, await fetchKey(seg.encryption.uri, signal));
        } catch (e) {
          console.error(`[M3U8] 加载密钥失败 ${seg.encryption.uri}:`, e);
        }
      }
    }

    // ========== 保存方式：流式写盘 / 内存合并 ==========
    const dir = options.directoryHandle;
    if (dir) task.dirName = dir.name;
    let streamMode = !!dir;
    let writer: StreamWriter | null = null;

    // 流式模式只缓存"已下载但尚未按序写盘"的分片，内存占用有上限
    const pending = new Map<number, ArrayBuffer>();
    const collected: (ArrayBuffer | null)[] = new Array(segments.length).fill(null);
    let nextWrite = 0;

    // TS → MP4 无损转封装（fMP4 源本身即 MP4，会自动跳过）
    const wantMp4 = options.convertToMp4 === true;
    // m3u8 EXTINF 之和 = 精确总时长。mux.js 写出的 init segment 中 mvhd/tkhd/mdhd
    // duration 恒为 0xFFFFFFFF（≈13 小时），导致文件管理器时长错误、进度条异常，
    // 这里传入真实时长供转封装器补写
    const mp4DurationSeconds = wantMp4
      ? segments.reduce((sum, s) => sum + (s.duration > 0 ? s.duration : 0), 0)
      : 0;
    let transmuxer: TsToMp4Transmuxer | null = null;
    // 流式推迟 flush：每连续 push 2 片 TS 后 flush 一次
    // 这样 flush 产出里，上一片末帧被当前片首帧 PTS 校正，duration 精确
    // 当前片末帧仍用 mux.js 分片内平均 duration 估算（偏差 < 1ms/片，累积可忽略）
    let consecutiveTsPushes = 0;

    // 有 init segment 时格式已知，可立即创建目标文件
    if (streamMode && dir && initSegmentData) {
      const { ext } = detectFormat(playlist.initSegment || '', initSegmentData);
      try {
        writer = await createDirectoryWriter(dir, fileBase, ext);
        activeWriters.set(task.id, writer);
        await writer.write(initSegmentData);
        console.log(`[M3U8] 流式写入开始: ${writer.filename}`);
      } catch (error) {
        console.error('[M3U8] 创建目标文件失败，回退内存合并:', error);
        streamMode = false;
      }
    }

    const concurrency = Math.max(1, options.maxConcurrentSegments);
    // 限制"领先写盘位置"的分片数量，避免乱序下载导致内存堆积
    const maxBuffered = Math.max(concurrency * 2, 16);
    const queue = segments.map((seg, idx) => ({ seg, idx }));
    const inProgress = new Set<Promise<void>>();

    const commit = (idx: number, data: ArrayBuffer) => {
      if (streamMode) pending.set(idx, data);
      else collected[idx] = data;
    };

    // 进度按「已处理分片数」计算：失败分片也算处理完，否则进度永远到不了 100%
    const updateProgress = () => {
      const processed = task.segments.downloaded + task.segments.failed.length;
      task.progress = Math.round((processed / Math.max(1, task.segments.total)) * 100);
      task.updatedAt = Date.now();
    };

    // 进度刷新节流：高并发 × 数百分片时，逐片 triggerRef 会造成频繁整块重渲染
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let lastRefreshAt = 0;
    const REFRESH_INTERVAL = 200;
    function throttledRefresh() {
      const wait = REFRESH_INTERVAL - (Date.now() - lastRefreshAt);
      if (wait <= 0) {
        lastRefreshAt = Date.now();
        refresh();
      } else if (!refreshTimer) {
        refreshTimer = setTimeout(() => {
          refreshTimer = null;
          lastRefreshAt = Date.now();
          refresh();
        }, wait);
      }
    }

    // 按序写盘
    const flush = async () => {
      if (!streamMode || !dir) return;

      while (pending.has(nextWrite)) {
        const data = pending.get(nextWrite)!;
        pending.delete(nextWrite);

        const isTs = detectFormat(segments[nextWrite]?.url || '', data).ext === 'ts';
        const doRemux = wantMp4 && isTs && data.byteLength > 0;

        if (doRemux) {
          // TS→MP4 流式转封装：推迟一片 flush，上一片末帧被当前片首帧校正
          transmuxer ??= new TsToMp4Transmuxer(mp4DurationSeconds || undefined);
          transmuxer.pushOnly(data);
          consecutiveTsPushes++;

          // 累计 2 片才 flush：上一片精确（被当前片首帧校正），当前片用分片内平均估算
          if (consecutiveTsPushes >= 2) {
            const chunks = transmuxer.flush();
            if (chunks.length === 0) {
              throw new Error('TS 转封装失败：源编码可能不兼容 MP4 容器，请关闭"转为 MP4"后重试');
            }
            if (!writer) {
              writer = await createDirectoryWriter(dir, fileBase, 'mp4');
              activeWriters.set(task.id, writer);
              console.log(`[M3U8] 流式转封装写入开始: ${writer.filename}`);
            }
            for (const c of chunks) {
              if (c.byteLength > 0) await writer.write(c);
            }
            consecutiveTsPushes = 0;
          }
        } else {
          // 非转封装分支：先 flush 之前缓冲的 TS 转封装数据（如果有）
          if (transmuxer && consecutiveTsPushes > 0) {
            const chunks = transmuxer.flush();
            if (!writer) writer = await createDirectoryWriter(dir, fileBase, 'mp4');
            for (const c of chunks) {
              if (c.byteLength > 0) await writer.write(c);
            }
            consecutiveTsPushes = 0;
            transmuxer = null; // 切分支后不再转封装
          }
          // fMP4 源 / 未开启转封装：直接按序写盘
          if (!writer && data.byteLength > 0) {
            const ext = detectFormat(segments[nextWrite]?.url || '', data).ext;
            try {
              writer = await createDirectoryWriter(dir, fileBase, ext);
              activeWriters.set(task.id, writer);
              console.log(`[M3U8] 流式写入开始: ${writer.filename}`);
            } catch (error) {
              console.error('[M3U8] 创建目标文件失败，回退内存合并:', error);
              streamMode = false;
              pending.forEach((buf, i) => { collected[i] = buf; });
              pending.clear();
              return;
            }
          }

          if (writer && data.byteLength > 0) {
            await writer.write(data);
          }
        }
        nextWrite++;
      }
    };

    /** 写盘失败时清理句柄并删除残缺文件，避免残留半成品 */
    const abortWriter = async () => {
      const w = writer;
      writer = null;
      if (w) {
        await w.abort().catch(() => {});
        if (dir) await dir.removeEntry(w.filename).catch(() => {});
      }
      activeWriters.delete(task.id);
    };

    const safeFlush = async () => {
      try {
        await flush();
      } catch (error) {
        await abortWriter();
        throw error;
      }
    };

    console.log(`[M3U8] 共 ${segments.length} 个媒体分片开始下载...`);

    while (
      (queue.length > 0 || inProgress.size > 0) &&
      !cancelledTaskIds.has(task.id) &&
      !signal.aborted
    ) {
      // 暂停：停止派发新分片，已派发的请求自然完成即可
      if (pausedTaskIds.has(task.id)) {
        await delay(200);
        continue;
      }

      while (
        inProgress.size < concurrency &&
        queue.length > 0 &&
        // 背压闸门（领先写盘位置不超过 maxBuffered）仅流式模式需要；
        // 内存模式 nextWrite 恒为 0，套用此闸门会在派发 maxBuffered 片后永久关闭，
        // 外层循环退化为纯微任务死循环，整页卡死
        (!streamMode || queue[0]!.idx - nextWrite < maxBuffered)
      ) {
        const { seg, idx } = queue.shift()!;

        const promise = downloadSegment(seg.url, options.maxRetries, signal)
          .then(async (rawData) => {
            let data = rawData;
            if (seg.encryption) {
              const iv = seg.encryption.ivBuffer;
              const keyData = seg.encryption.uri ? keyCache.get(seg.encryption.uri) : undefined;
              if (keyData && iv) {
                data = await decryptAES128(data, keyData, iv);
              }
            }
            commit(idx, data);
            task.segments.downloaded++;
            updateProgress();
            throttledRefresh();
          })
          .catch((error) => {
            // 取消导致的中止不计入失败
            if (cancelledTaskIds.has(task.id) || signal.aborted) return;
            console.error(`[M3U8] 分片#${idx} 下载失败:`, seg.url, error);
            task.segments.failed.push(idx);
            commit(idx, new ArrayBuffer(0));
            updateProgress();
            throttledRefresh();
          })
          .finally(() => { inProgress.delete(promise); });

        inProgress.add(promise);
      }

      if (inProgress.size > 0) await Promise.race(inProgress);
      await safeFlush();
    }

    // ========== 用户取消：中止写入并删除半成品 ==========
    if (cancelledTaskIds.has(task.id) || signal.aborted) {
      cancelledTaskIds.delete(task.id);
      pausedTaskIds.delete(task.id);
      await abortWriter();
      console.log(`[M3U8] 任务已取消: ${task.id}`);
      return;
    }

    await safeFlush();

    // flush 最后残留的转封装数据（比如只积了 1 片没到 flush 阈值）
    if (streamMode && transmuxer && consecutiveTsPushes > 0) {
      try {
        const chunks = (transmuxer as TsToMp4Transmuxer).flush();
        if (chunks.length > 0) {
          if (!writer && dir) {
            writer = await createDirectoryWriter(dir, fileBase, 'mp4');
            activeWriters.set(task.id, writer);
          }
          if (writer) {
            for (const c of chunks) {
              if (c.byteLength > 0) await writer.write(c);
            }
          }
        }
      } catch (error) {
        await abortWriter();
        throw error;
      }
      consecutiveTsPushes = 0;
    }

    // ========== 流式模式：关闭文件 ==========
    if (streamMode && writer) {
      task.status = 'merging';
      refresh();

      try {
        await writer.close();
      } catch (error) {
        await abortWriter();
        throw error;
      }
      activeWriters.delete(task.id);
      task.savedToDirectory = true;

      const filename = writer.filename;
      task.status = 'completed';
      task.progress = 100;
      task.updatedAt = Date.now();
      task.filename = filename;
      refresh();

      saveCover(task, options, fileBase, dir);
      return;
    }

    // ========== 回退：内存合并 ==========
    const validSegments = collected.filter(
      (s): s is ArrayBuffer => s !== null && s.byteLength > 0
    );
    if (validSegments.length === 0) throw new Error('没有可合并的分片');

    // 如果有 init segment，必须放在最前面
    const formatSource: ArrayBuffer = initSegmentData ?? validSegments[0]!;
    const formatUrl = initSegmentData ? (playlist.initSegment || '') : (segments[0]?.url || '');
    let { ext, mime } = detectFormat(formatUrl, formatSource);
    console.log(`[M3U8] 输出格式: .${ext} (${mime}), init=${!!initSegmentData}`);

    // TS → MP4 转封装（内存模式：全部分片按序推入）
    let allSegments: ArrayBuffer[] = initSegmentData
      ? [initSegmentData, ...validSegments]
      : validSegments;
    if (wantMp4 && ext === 'ts') {
      try {
        const t = new TsToMp4Transmuxer(mp4DurationSeconds || undefined);
        for (const seg of validSegments) t.pushOnly(seg);
        const remuxed = t.flush();
        if (remuxed.length === 0) throw new Error('转封装未产出数据');
        allSegments = remuxed;
        ext = 'mp4';
        mime = 'video/mp4';
        console.log(`[M3U8] 已转封装为 MP4: ${remuxed.length} 个数据块`);
      } catch (error) {
        console.warn('[M3U8] TS 转封装失败（编码可能不兼容 MP4），回退保存原始 TS:', error);
      }
    }

    task.status = 'merging';
    refresh();

    const filename = await mergeAndSave(allSegments, task, { ...options, ext, mime, fileBase });

    task.status = 'completed';
    task.progress = 100;
    task.updatedAt = Date.now();
    task.filename = filename;
    refresh();

    saveCover(task, options, fileBase, dir);
  }

  /** 保存封面（优先写入所选目录，否则走浏览器下载） */
  function saveCover(
    task: DownloadTask,
    options: DownloadOptions,
    fileBase: string,
    dir?: FileSystemDirectoryHandle
  ) {
    if (options.downloadCover === false) {
      console.log('[M3U8] 已关闭封面下载');
      return;
    }
    if (!task.coverUrl) {
      console.warn('[M3U8] 未获取到封面地址，跳过封面下载');
      return;
    }

    fetchCoverBlob(task.coverUrl).then(async (result) => {
      if (!result) {
        console.warn('[M3U8] 封面获取失败，跳过保存');
        return;
      }

      const { blob, ext } = result;
      const filename = `${fileBase}.${ext}`;
      if (dir) {
        try {
          await writeBlobToDirectory(dir, filename, blob);
          console.log(`[M3U8] 封面已保存到所选目录: ${filename}`);
          return;
        } catch (error) {
          console.error('[M3U8] 封面写入目录失败，改为浏览器下载:', error);
        }
      }
      saveImageBlob(blob, filename);
    });
  }

  function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'video';
  }

  /** 本地时区时间戳 YYYYMMDDHHmmss（toISOString 是 UTC，会造成 8 小时偏差） */
  function localTimestamp(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  /** 根据分片 URL 和首字节判断是 TS 还是 fMP4 */
  function detectFormat(firstUrl: string, firstSegment: ArrayBuffer): { ext: string; mime: string } {
    const url = firstUrl.toLowerCase();
    // 空分片（e.g. 失败占位）不应访问首字节
    const firstByte = firstSegment.byteLength > 0 ? new Uint8Array(firstSegment)[0]! : -1;
    
    // 1. 先看 URL 后缀
    if (url.endsWith('.m4s')) return { ext: 'mp4', mime: 'video/mp4' };
    if (url.endsWith('.mp4')) return { ext: 'mp4', mime: 'video/mp4' };
    if (url.endsWith('.ts')) return { ext: 'ts', mime: 'video/mp2t' };
    
    // 2. 看首字节判断格式
    if (firstByte === 0x47) return { ext: 'ts', mime: 'video/mp2t' };       // TS 同步字节
    if (firstByte === 0x00) {                                               // fMP4: 起始 box 通常是 size
      const view = new DataView(firstSegment);
      const boxType = String.fromCharCode(view.getUint8(4)!, view.getUint8(5)!, view.getUint8(6)!, view.getUint8(7)!);
      if (boxType === 'ftyp' || boxType === 'styp' || boxType === 'moof') {
        return { ext: 'mp4', mime: 'video/mp4' };
      }
    }
    if (firstByte === 0x1a) return { ext: 'ts', mime: 'video/mp2t' };       // TS 变体
    
    // 3. 默认保守：根据 URL 路径关键字
    if (url.includes('mp4') || url.includes('m4s')) return { ext: 'mp4', mime: 'video/mp4' };
    
    console.warn(`[M3U8] 无法确定分片格式 (首字节: 0x${firstByte.toString(16)}), 默认保存为 .ts`);
    return { ext: 'ts', mime: 'video/mp2t' };
  }

  async function downloadSegment(
    url: string,
    maxRetries: number = 3,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (signal?.aborted) throw new Error('请求已取消');
      try {
        const data = await fetchSegment(url, signal);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (signal?.aborted) throw lastError;
        if (attempt < maxRetries - 1) {
          await delay(300 * (attempt + 1)); // 指数退避
        }
      }
    }
    
    throw lastError;
  }

  async function mergeAndSave(
    segments: ArrayBuffer[], 
    task: DownloadTask, 
    options: DownloadOptions & { ext?: string; mime?: string; fileBase?: string }
  ): Promise<string> {
    const ext = options.ext || 'ts';
    const mime = options.mime || 'video/mp2t';
    
    const totalSize = segments.reduce((sum, seg) => sum + seg.byteLength, 0);
    const firstByte = segments[0] && segments[0].byteLength > 0
      ? new Uint8Array(segments[0])[0]!.toString(16)
      : 'N/A';

    console.log(`[M3U8] 合并完成: ${segments.length} 分片, 总大小 ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[M3U8] 输出格式: .${ext} (${mime}), 首字节: 0x${firstByte}`);

    // 直接把分片数组交给 Blob，避免再复制一份整文件大小的缓冲（原实现峰值内存 ≈ 2×文件）
    const blob = new Blob(segments, { type: mime });
    const timestamp = localTimestamp();
    const base = options.fileBase || `${task.title || 'video'}_${timestamp}`;
    const filename = `${base}.${ext}`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 延迟释放，让下载开始
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    
    console.log(`[M3U8] 文件已下载: ${filename}`);
    return filename;
  }

  function pauseTask(task: DownloadTask) {
    if (task.status === 'downloading') {
      pausedTaskIds.add(task.id);
      task.status = 'paused';
      task.updatedAt = Date.now();
    }
  }

  function resumeTask(task: DownloadTask) {
    if (task.status === 'paused') {
      pausedTaskIds.delete(task.id);
      task.status = 'downloading';
      task.updatedAt = Date.now();
    }
  }

  function cancelTask(task: DownloadTask) {
    if (task.status === 'parsing' || task.status === 'downloading' || task.status === 'merging' || task.status === 'paused') {
      cancelledTaskIds.add(task.id);
      pausedTaskIds.delete(task.id);
      // 立即中止在途请求，避免取消后还要等请求自然结束（最长 60s）
      taskAbortControllers.get(task.id)?.abort();
      task.status = 'cancelled';
    }

    const index = tasks.value.findIndex(t => t.id === task.id);
    if (index > -1) {
      tasks.value.splice(index, 1);
    }
  }

  function generateId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);
  }

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    tasks,
    currentTask,
    isDownloading,
    isTampermonkeyAvailable,
    createTask,
    startDownload,
    pauseTask,
    resumeTask,
    cancelTask,
  };
}
