// 统一的 fetcher：直接用 fetch，油猴脚本在 localhost:3000 上会自动 polyfill 代理跨域请求
// 不需要显式调用 QiuyunM3U8Helper —— fetch polyfill 透明接管所有跨域请求

/** 预检超时：预览/在线播放的跨域探测要快速失败，不沿用下载的 60s */
const PREVIEW_PROBE_TIMEOUT = 8000;
/** 下载/分片请求超时（覆盖到响应体读取完成） */
const DEFAULT_TIMEOUT = 60000;

/** 全局只挂一次 message 监听与轮询：composable 可能被多处实例化 */
let listenerAttached = false;

export function useTampermonkey() {
  // useState 让多处调用共享同一份状态，避免重复监听/轮询和状态不一致
  const detectedM3U8List = useState<Array<{
    url: string;
    title: string;
    pageUrl: string;
    timestamp: number;
  }>>('qiuyun-detected-m3u8', () => []);

  const isTampermonkeyAvailable = useState('qiuyun-tm-available', () => false);

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

  onMounted(() => {
    if (listenerAttached) return;
    listenerAttached = true;

    // 先同步检查一次，避免白等一个轮询周期
    checkTampermonkey();
    if (isTampermonkeyAvailable.value) {
      console.log('[M3U8] 油猴脚本已检测到 (version:', window.QiuyunM3U8Helper?.version, ')');
    }

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
      }, 5000);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startPolling, { once: true });
    } else {
      startPolling();
    }

    // 监听器与页面同生命周期，不解绑（共享单例，避免某组件卸载后其它组件收不到事件）
    window.addEventListener('message', handleMessage);
  });

  /**
   * 统一请求入口：直接调用原生 fetch
   * 在 localhost:3000 上，油猴脚本已 polyfill fetch → GM_xmlhttpRequest
   * 这是透明的，我们不需要关心
   *
   * 关键：超时定时器必须覆盖「响应体读取」全过程。
   * fetch() 只在收到响应头时 resolve，若服务器返回 200 后停止发送 body，
   * 只在 response 层面计时会导致请求永久挂起（下载进度卡死的根因之一）。
   *
   * @param signal 外部取消信号（取消下载时立即中止在途请求）
   */
  async function request<T>(
    url: string,
    timeoutMs: number,
    read: (response: Response) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const onOuterAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onOuterAbort, { once: true });
    }

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await read(response);
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      if (name === 'AbortError') {
        if (timedOut) throw new Error(`请求超时 (${timeoutMs / 1000}s): ${url.slice(-80)}`);
        throw new Error(`请求已取消: ${url.slice(-80)}`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onOuterAbort);
    }
  }

  async function fetchM3U8(url: string, timeoutMs = DEFAULT_TIMEOUT, signal?: AbortSignal): Promise<string> {
    console.log(`[M3U8] fetchM3U8: ${url}`);
    const text = await request(url, timeoutMs, response => response.text(), signal);
    console.log(`[M3U8] fetchM3U8 完成, 长度: ${text.length} 字符`);
    return text;
  }

  async function fetchSegment(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const buffer = await request(url, DEFAULT_TIMEOUT, response => response.arrayBuffer(), signal);
    const firstByte = buffer.byteLength > 0 ? new Uint8Array(buffer)[0]!.toString(16) : 'n/a';
    console.log(`[M3U8] fetchSegment: ${url.slice(-60)} => ${buffer.byteLength} bytes, 首字节: 0x${firstByte}`);
    return buffer;
  }

  async function fetchKey(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const buffer = await request(url, DEFAULT_TIMEOUT, response => response.arrayBuffer(), signal);
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
