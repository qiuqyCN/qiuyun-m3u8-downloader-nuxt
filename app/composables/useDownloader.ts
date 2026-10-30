import type { DownloadTask, DownloadOptions } from '~/types';
import { parseM3U8, isMasterPlaylist, parseMasterPlaylist } from '~/utils/m3u8-parser';
import { decryptAES128 } from '~/utils/crypto';
import { triggerRef } from 'vue';

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
    try {
      task.status = 'parsing';
      currentTask.value = task;
      isDownloading.value = true;
      refresh();

      // 获取 M3U8 内容
      const m3u8Content = await fetchM3U8(task.url);
      
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
        task.title = `${task.title}_${bestVariant.resolution || 'unknown'}`;
        
        // 重新获取媒体播放列表
        const mediaContent = await fetchM3U8(task.url);
        await downloadPlaylist(task, mediaContent, options);
      } else {
        await downloadPlaylist(task, m3u8Content, options);
      }
    } catch (error) {
      task.status = 'error';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Download error:', error);
    } finally {
      isDownloading.value = false;
      currentTask.value = null;
    }
  }

  async function downloadPlaylist(task: DownloadTask, content: string, options: DownloadOptions) {
    const playlist = parseM3U8(content, task.url);
    
    task.segments.total = playlist.segments.length;
    task.status = 'downloading';
    refresh();

    // ========== 关键：先下载 fMP4 初始化片段 ==========
    let initSegmentData: ArrayBuffer | null = null;
    if (playlist.initSegment) {
      console.log(`[M3U8] 下载 fMP4 init segment: ${playlist.initSegment}`);
      initSegmentData = await fetchSegment(playlist.initSegment);
      const bytes = new Uint8Array(initSegmentData);
      const ftyp = String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!);
      console.log(`[M3U8] init segment: ${initSegmentData.byteLength} bytes, type=${ftyp} (应为 ftyp)`);
    }

    const segments = playlist.segments.slice(options.startSegmentIndex);
    const downloadedSegments: (ArrayBuffer | null)[] = new Array(segments.length).fill(null);
    
    // 预加载所有 key（去重缓存）
    const keyCache = new Map<string, ArrayBuffer>();
    for (const seg of segments) {
      if (seg.encryption?.uri && !keyCache.has(seg.encryption.uri)) {
        try {
          keyCache.set(seg.encryption.uri, await fetchKey(seg.encryption.uri));
        } catch (e) {
          console.error(`[M3U8] 加载密钥失败 ${seg.encryption.uri}:`, e);
        }
      }
    }
    
    console.log(`[M3U8] 共 ${segments.length} 个媒体分片开始下载...`);

    // 并发下载
    const concurrency = options.maxConcurrentSegments;
    const queue = segments.map((seg, idx) => ({ seg, idx }));
    const inProgress = new Set<Promise<void>>();

    while (queue.length > 0 || inProgress.size > 0) {
      while (inProgress.size < concurrency && queue.length > 0) {
        const { seg, idx } = queue.shift()!;
        
        const promise = downloadSegment(seg.url, options.maxRetries)
          .then(async (rawData) => {
            let data = rawData;
            if (seg.encryption) {
              const iv = seg.encryption.ivBuffer;
              const keyData = seg.encryption.uri ? keyCache.get(seg.encryption.uri) : undefined;
              if (keyData && iv) {
                data = await decryptAES128(data, keyData, iv);
              }
            }
            downloadedSegments[idx] = data;
            task.segments.downloaded++;
            task.progress = Math.round((task.segments.downloaded / task.segments.total) * 100);
            task.updatedAt = Date.now();
            refresh(); // 每次分片完成立即刷新
          })
          .catch((error) => {
            console.error(`[M3U8] 分片#${idx} 下载失败:`, seg.url, error);
            task.segments.failed.push(idx);
            downloadedSegments[idx] = new ArrayBuffer(0);
          })
          .finally(() => { inProgress.delete(promise); });
        
        inProgress.add(promise);
      }
      if (inProgress.size > 0) await Promise.race(inProgress);
    }

    const validSegments = downloadedSegments.filter(
      (s): s is ArrayBuffer => s !== null && s.byteLength > 0
    );
    if (validSegments.length === 0) throw new Error('没有可合并的分片');

    // ========== 组装最终分片数组 ==========
    // 如果有 init segment，必须放在最前面
    const allSegments: ArrayBuffer[] = initSegmentData 
      ? [initSegmentData, ...validSegments]
      : validSegments;

    // 检测格式（优先用 init segment）
    const formatSource: ArrayBuffer = initSegmentData ?? validSegments[0]!;
    const formatUrl = initSegmentData ? (playlist.initSegment || '') : (segments[0]?.url || '');
    const { ext, mime } = detectFormat(formatUrl, formatSource);
    console.log(`[M3U8] 输出格式: .${ext} (${mime}), init=${!!initSegmentData}`);

    task.status = 'merging';
    refresh();
    
    const filename = await mergeAndSave(allSegments, task, { ...options, ext, mime });
    
    task.status = 'completed';
    task.progress = 100;
    task.updatedAt = Date.now();
    task.filename = filename;
    refresh();
  }

  /** 根据分片 URL 和首字节判断是 TS 还是 fMP4 */
  function detectFormat(firstUrl: string, firstSegment: ArrayBuffer): { ext: string; mime: string } {
    const url = firstUrl.toLowerCase();
    const firstByte = new Uint8Array(firstSegment)[0]!;
    
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
    maxRetries: number = 3
  ): Promise<ArrayBuffer> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const data = await fetchSegment(url);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
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
    options: DownloadOptions & { ext?: string; mime?: string }
  ): Promise<string> {
    const ext = options.ext || 'ts';
    const mime = options.mime || 'video/mp2t';
    
    const totalSize = segments.reduce((sum, seg) => sum + seg.byteLength, 0);
    const merged = new Uint8Array(totalSize);
    
    let offset = 0;
    for (const segment of segments) {
      merged.set(new Uint8Array(segment), offset);
      offset += segment.byteLength;
    }

    console.log(`[M3U8] 合并完成: ${segments.length} 分片, 总大小 ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[M3U8] 输出格式: .${ext} (${mime}), 首字节: 0x${merged[0]?.toString(16) ?? 'N/A'}`);

    const blob = new Blob([merged], { type: mime });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${task.title || 'video'}_${timestamp}.${ext}`;
    
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
      task.status = 'paused';
    }
  }

  function resumeTask(task: DownloadTask) {
    if (task.status === 'paused') {
      task.status = 'downloading';
    }
  }

  function cancelTask(task: DownloadTask) {
    const index = tasks.value.findIndex(t => t.id === task.id);
    if (index > -1) {
      tasks.value.splice(index, 1);
    }
  }

  function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
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
