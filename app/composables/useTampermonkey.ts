export function useTampermonkey() {
  const detectedM3U8List = ref<Array<{
    url: string;
    title: string;
    pageUrl: string;
    timestamp: number;
  }>>([]);

  const isTampermonkeyAvailable = ref(false);

  onMounted(() => {
    // 轮询检查油猴脚本是否可用（因为脚本可能在页面加载后才注入）
    const checkInterval = setInterval(() => {
      checkTampermonkey();
      if (isTampermonkeyAvailable.value) {
        clearInterval(checkInterval);
        console.log('[M3U8 Downloader] 油猴脚本已检测到');
      }
    }, 500);

    // 最多检查 10 秒
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!isTampermonkeyAvailable.value) {
        console.log('[M3U8 Downloader] 油猴脚本未检测到');
      }
    }, 10000);

    window.addEventListener('message', handleMessage);
    checkUrlParams();
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

    switch (type) {
      case 'm3u8-detected':
        if (!detectedM3U8List.value.some(item => item.url === data.url)) {
          detectedM3U8List.value.push(data);
        }
        break;
    }
  }

  function checkUrlParams() {
    // URL 参数处理已移至 index.vue 页面中
    // 避免在 composable 中直接调用页面级函数
  }

  async function fetchM3U8(url: string): Promise<string> {
    // 优先使用油猴脚本（可跨域）
    if (window.QiuyunM3U8Helper?.fetchM3U8) {
      return await window.QiuyunM3U8Helper.fetchM3U8(url);
    }
    // 降级：使用普通 fetch（可能因 CORS 失败）
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  }

  async function fetchSegment(url: string): Promise<ArrayBuffer> {
    // 优先使用油猴脚本（可跨域）
    if (window.QiuyunM3U8Helper?.fetchSegment) {
      return await window.QiuyunM3U8Helper.fetchSegment(url);
    }
    // 降级：使用普通 fetch（可能因 CORS 失败）
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }

  async function fetchKey(url: string): Promise<ArrayBuffer> {
    // 优先使用油猴脚本（可跨域）
    if (window.QiuyunM3U8Helper?.fetchKey) {
      return await window.QiuyunM3U8Helper.fetchKey(url);
    }
    // 降级：使用普通 fetch（可能因 CORS 失败）
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }

  return {
    detectedM3U8List,
    isTampermonkeyAvailable,
    fetchM3U8,
    fetchSegment,
    fetchKey,
  };
}

declare global {
  interface Window {
    QiuyunM3U8Helper?: {
      version: string;
      fetchM3U8: (url: string) => Promise<string>;
      fetchSegment: (url: string) => Promise<ArrayBuffer>;
      fetchKey: (url: string) => Promise<ArrayBuffer>;
      getDetectedM3U8: () => Array<{
        url: string;
        title: string;
        pageUrl: string;
        timestamp: number;
      }>;
      onM3U8Detected: (callback: (data: any) => void) => void;
      getPageInfo: () => {
        title: string;
        url: string;
        domain: string;
      };
      // 新增：fetch 代理（在下载器页面使用）
      fetchProxy?: (url: string, options?: any) => Promise<any>;
    };
    autoFillM3U8?: (url: string, title: string | null) => void;
  }
}
