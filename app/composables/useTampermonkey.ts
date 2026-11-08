// 统一的 fetcher：直接用 fetch，油猴脚本在 localhost:3000 上会自动 polyfill 代理跨域请求
// 不需要显式调用 QiuyunM3U8Helper —— fetch polyfill 透明接管所有跨域请求

export function useTampermonkey() {
  const detectedM3U8List = ref<Array<{
    url: string;
    title: string;
    pageUrl: string;
    timestamp: number;
  }>>([]);

  const isTampermonkeyAvailable = ref(false);

  onMounted(() => {
    // 轮询检查油猴脚本是否可用（脚本可能在页面加载后才注入）
    const startPolling = () => {
      const checkInterval = setInterval(() => {
        checkTampermonkey();
        if (isTampermonkeyAvailable.value) {
          clearInterval(checkInterval);
          console.log('[M3U8] 油猴脚本已检测到 (version:', window.QiuyunM3U8Helper?.version, ')');
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isTampermonkeyAvailable.value) {
          console.log('[M3U8] 油猴脚本未检测到，将使用普通 fetch（可能跨域失败）');
        }
      }, 10000);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startPolling, { once: true });
    } else {
      startPolling();
    }

    window.addEventListener('message', handleMessage);
  });

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage);
  });

  function checkTampermonkey() {
    isTampermonkeyAvailable.value = !!window.QiuyunM3U8Helper;
  }

  function handleMessage(event: MessageEvent) {
    if (event.data?.source !== 'qiuyun-m3u8-detector') return;
    const { type, data } = event.data;
    if (type === 'm3u8-detected') {
      if (!detectedM3U8List.value.some(item => item.url === data.url)) {
        detectedM3U8List.value.push(data);
      }
    }
  }

  /**
   * 统一请求入口：直接调用原生 fetch
   * 在 localhost:3000 上，油猴脚本已 polyfill fetch → GM_xmlhttpRequest
   * 这是透明的，我们不需要关心
   * 带 60s 超时：防止连接挂起（服务器接收后不再发数据）导致下载进度永久冻结
   */
  async function doFetch(url: string, timeoutMs = 60000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`请求超时 (${timeoutMs / 1000}s): ${url.slice(-80)}`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 预检超时：预览/在线播放的跨域探测要快速失败，不沿用下载的 60s */
  const PREVIEW_PROBE_TIMEOUT = 8000;

  async function fetchM3U8(url: string, timeoutMs = 60000): Promise<string> {
    console.log(`[M3U8] fetchM3U8: ${url}`);
    const response = await doFetch(url, timeoutMs);
    const text = await response.text();
    console.log(`[M3U8] fetchM3U8 完成, 长度: ${text.length} 字符`);
    return text;
  }

  async function fetchSegment(url: string): Promise<ArrayBuffer> {
    const response = await doFetch(url);
    const buffer = await response.arrayBuffer();
    console.log(`[M3U8] fetchSegment: ${url.slice(-60)} => ${buffer.byteLength} bytes, 首字节: 0x${new Uint8Array(buffer)[0].toString(16)}`);
    return buffer;
  }

  async function fetchKey(url: string): Promise<ArrayBuffer> {
    const response = await doFetch(url);
    const buffer = await response.arrayBuffer();
    console.log(`[M3U8] fetchKey: ${url} => ${buffer.byteLength} bytes`);
    return buffer;
  }

  return {
    detectedM3U8List,
    isTampermonkeyAvailable,
    PREVIEW_PROBE_TIMEOUT,
    fetchM3U8,
    fetchSegment,
    fetchKey,
  };
}

declare global {
  interface Window {
    QiuyunM3U8Helper?: {
      version: string;
      available: boolean;
      isProxyEnabled: boolean;
    };
  }
}
