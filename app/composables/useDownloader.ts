import type { DownloadTask, DownloadOptions, M3U8Playlist } from '~/types';
import { parseM3U8, isMasterPlaylist, parseMasterPlaylist } from '~/utils/m3u8-parser';
import { decryptAES128, hexToBuffer } from '~/utils/crypto';

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
    return task;
  }

  async function startDownload(task: DownloadTask, options: DownloadOptions) {
    try {
      task.status = 'parsing';
      currentTask.value = task;
      isDownloading.value = true;

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

    const segments = playlist.segments.slice(options.startSegmentIndex);
    const downloadedSegments: ArrayBuffer[] = [];
    
    // 获取密钥（如果需要）
    let key: ArrayBuffer | undefined;
    let iv: ArrayBuffer | undefined;
    
    if (playlist.encryption?.method === 'AES-128' && playlist.encryption.uri) {
      key = await fetchKey(playlist.encryption.uri);
      if (playlist.encryption.iv) {
        iv = hexToBuffer(playlist.encryption.iv.replace('0x', ''));
      } else {
        // 默认 IV 是全零
        iv = new Uint8Array(16).buffer;
      }
    }

    // 并发下载
    const concurrency = options.maxConcurrentSegments;
    const queue = [...segments];
    const inProgress = new Set<Promise<void>>();

    while (queue.length > 0 || inProgress.size > 0) {
      while (inProgress.size < concurrency && queue.length > 0) {
        const segment = queue.shift()!;
        const promise = downloadSegment(segment.url, downloadedSegments, key, iv, options.maxRetries)
          .then(() => {
            task.segments.downloaded++;
            task.progress = Math.round((task.segments.downloaded / task.segments.total) * 100);
            task.updatedAt = Date.now();
          })
          .catch((error) => {
            console.error(`Failed to download segment: ${segment.url}`, error);
            task.segments.failed.push(downloadedSegments.length);
          })
          .finally(() => {
            inProgress.delete(promise);
          });
        
        inProgress.add(promise);
      }

      if (inProgress.size > 0) {
        await Promise.race(inProgress);
      }
    }

    // 合并并保存
    task.status = 'merging';
    await mergeAndSave(downloadedSegments, task, options);
    
    task.status = 'completed';
    task.progress = 100;
    task.updatedAt = Date.now();
  }

  async function downloadSegment(
    url: string, 
    downloadedSegments: ArrayBuffer[], 
    key?: ArrayBuffer, 
    iv?: ArrayBuffer,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let data = await fetchSegment(url);
        
        // 解密（如果需要）
        if (key && iv) {
          data = await decryptAES128(data, key, iv);
        }
        
        downloadedSegments.push(data);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await delay(1000 * (attempt + 1)); // 指数退避
        }
      }
    }
    
    throw lastError;
  }

  async function mergeAndSave(segments: ArrayBuffer[], task: DownloadTask, options: DownloadOptions) {
    // 使用流式合并
    const totalSize = segments.reduce((sum, seg) => sum + seg.byteLength, 0);
    const merged = new Uint8Array(totalSize);
    
    let offset = 0;
    for (const segment of segments) {
      merged.set(new Uint8Array(segment), offset);
      offset += segment.byteLength;
    }

    // 保存文件
    const blob = new Blob([merged], { type: 'video/mp2t' });
    const filename = `${task.title || 'video'}_${Date.now()}.ts`;
    
    // 触发下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
