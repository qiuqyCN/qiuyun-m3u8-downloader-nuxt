export function useTampermonkey() {
  const detectedM3U8List = ref<Array<{
    url: string;
    title: string;
    pageUrl: string;
    timestamp: number;
  }>>([]);

  const isTampermonkeyAvailable = ref(false);

  onMounted(() => {
    checkTampermonkey();
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
    const urlParams = new URLSearchParams(window.location.search);
    const m3u8Url = urlParams.get('url');
    const title = urlParams.get('title');

    if (m3u8Url) {
      autoFillM3U8(m3u8Url, title);
    }
  }

  async function fetchM3U8(url: string): Promise<string> {
    if (!window.QiuyunM3U8Helper?.fetchM3U8) {
      throw new Error('油猴脚本未安装或未启用，请安装秋云 M3U8 下载助手脚本');
    }
    return await window.QiuyunM3U8Helper.fetchM3U8(url);
  }

  async function fetchSegment(url: string): Promise<ArrayBuffer> {
    if (!window.QiuyunM3U8Helper?.fetchSegment) {
      throw new Error('油猴脚本未安装或未启用');
    }
    return await window.QiuyunM3U8Helper.fetchSegment(url);
  }

  async function fetchKey(url: string): Promise<ArrayBuffer> {
    if (!window.QiuyunM3U8Helper?.fetchKey) {
      throw new Error('油猴脚本未安装或未启用');
    }
    return await window.QiuyunM3U8Helper.fetchKey(url);
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
    };
    autoFillM3U8?: (url: string, title: string | null) => void;
  }
}
