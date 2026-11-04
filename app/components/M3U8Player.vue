<template>
  <div class="w-full">
    <div
      ref="videoWrapper"
      class="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
    >
      <video
        ref="videoRef"
        class="w-full h-full"
        controls
        playsinline
        preload="metadata"
        @error="onVideoError"
        @loadedmetadata="onLoadedMetadata"
      />

      <!-- 加载中 -->
      <div
        v-if="status === 'loading'"
        class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <Loader2 class="w-10 h-10 text-white animate-spin" />
      </div>

      <!-- 错误 / 跨域提示 -->
      <div
        v-if="status === 'error'"
        class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center"
      >
        <AlertTriangle class="w-12 h-12 text-red-400 mb-4" />
        <p class="text-white font-medium mb-2">播放失败</p>
        <p class="text-white/70 text-sm max-w-sm leading-relaxed">
          {{ errorMessage }}
        </p>
        <p class="text-white/50 text-xs mt-3">
          建议使用下载功能离线观看，或安装油猴脚本自动绕过跨域限制
        </p>
      </div>

      <!-- 码率切换 -->
      <div
        v-if="showQualityMenu && levels.length > 1 && status !== 'error'"
        class="absolute bottom-14 right-3 z-10 bg-black/80 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10"
      >
        <button
          v-for="(level, idx) in levels"
          :key="idx"
          @click="selectLevel(idx)"
          class="block w-full px-4 py-2 text-xs text-left hover:bg-white/10 transition-colors min-w-[140px]"
          :class="currentLevel === idx ? 'text-violet-400' : 'text-white/80'"
        >
          <span v-if="level.height" class="font-medium">{{ level.height }}p</span>
          <span v-else-if="level.bitrate" class="font-medium">{{ (level.bitrate / 1000).toFixed(0) }}K</span>
          <span v-else>清晰度 {{ idx + 1 }}</span>
          <span v-if="currentLevel === idx" class="ml-2">✓</span>
        </button>
      </div>

      <!-- 右下角码率按钮 -->
      <button
        v-if="levels.length > 1 && status !== 'error'"
        @click.stop="toggleQualityMenu"
        class="absolute bottom-3 right-3 z-10 px-2 py-1 text-xs bg-black/60 hover:bg-black/80 text-white/80 hover:text-white rounded transition-colors"
      >
        {{ currentLevelLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Loader2, AlertTriangle } from 'lucide-vue-next';

const props = defineProps<{
  src: string;
  /** base URL，用于把 m3u8 里的相对引用转绝对路径（可选） */
  baseUrl?: string;
}>();

defineEmits<{
  (e: 'download', src: string): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const videoWrapper = ref<HTMLDivElement | null>(null);
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
const errorMessage = ref('');
const showQualityMenu = ref(false);

type Level = { bitrate: number; height?: number; index: number };
const levels = ref<Level[]>([]);
const currentLevel = ref<number>(-1); // -1 = auto

let hls: any | null = null;
let destroyed = false;
let networkErrorRetryCount = 0;
const MAX_NETWORK_RETRY = 1;

const isSafari = computed(() => {
  if (typeof navigator === 'undefined') return false;
  // 纯 Safari（不含 Chrome/Edge iOS，它们也会说自己是 Safari）
  return (
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent) &&
    !/Chromium/.test(navigator.userAgent)
  );
});

const currentLevelLabel = computed(() => {
  if (currentLevel.value === -1) return '自动';
  const l = levels.value[currentLevel.value];
  if (!l) return '自动';
  if (l.height) return `${l.height}p`;
  return `${(l.bitrate / 1000).toFixed(0)}K`;
});

function toggleQualityMenu() {
  showQualityMenu.value = !showQualityMenu.value;
}

function selectLevel(idx: number) {
  if (!hls) return;
  hls.currentLevel = idx;
  currentLevel.value = idx;
  showQualityMenu.value = false;
}

function onVideoError() {
  const v = videoRef.value;
  if (!v) return;
  const err = v.error;
  const code = err?.code;
  // error code 2 = MEDIA_ERR_NETWORK → 跨域最常见
  // error code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED → 格式不支持（Chrome 原生不支持 HLS）
  const isNetwork = code === 2;
  const isSrcUnsupported = code === 4;

  if (isSafari.value) {
    if (isNetwork) {
      errorMessage.value = '原生 HLS 播放失败：视频源被跨域 (CORS) 限制，或服务器拒绝连接。';
    } else if (isSrcUnsupported) {
      errorMessage.value = '此视频源格式不被 Safari 支持。';
    } else {
      errorMessage.value = '原生 HLS 播放失败，链接可能已失效。';
    }
  } else {
    // Chrome/Edge/Firefox：video.src 模式几乎不会触发（Chrome 不支持 HLS 原生）
    // 如果触发了说明 hls.js 之外还有别的路径设置了 video.src
    if (isSrcUnsupported) {
      errorMessage.value = '当前浏览器不支持原生 HLS 播放，且 hls.js 初始化失败。';
    } else if (isNetwork) {
      errorMessage.value = '视频源加载失败：跨域 (CORS) 限制或网络不可达。';
    } else {
      errorMessage.value = '视频加载失败，请直接下载视频查看。';
    }
  }
  status.value = 'error';
}

function onLoadedMetadata() {
  status.value = 'ready';
}

async function initPlayer() {
  const v = videoRef.value;
  if (!v || !props.src) return;

  status.value = 'loading';
  levels.value = [];
  currentLevel.value = -1;
  errorMessage.value = '';
  networkErrorRetryCount = 0;

  // Safari 原生支持 HLS，直接用 video.src
  if (isSafari.value) {
    v.src = props.src;
    return;
  }

  // 其他浏览器用 hls.js
  try {
    // 动态 import（≈120KB），不在首屏打包
    const HlsModule = await import('hls.js');
    const Hls = HlsModule.default;

    if (destroyed) return; // 组件已卸载，忽略

    // hls.js 再次确认自身可用性
    if (!Hls.isSupported()) {
      status.value = 'error';
      errorMessage.value = '当前浏览器既不支持原生 HLS 也不支持 hls.js，无法播放。';
      return;
    }

    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      // 允许请求时带上 credentials（部分 HLS 源需要）
      xhrSetup: (xhr: XMLHttpRequest, url: string) => {
        xhr.open('GET', url, true);
        xhr.withCredentials = false;
      },
    });

    hls.loadSource(props.src);
    hls.attachMedia(v);

    hls.on(Hls.Events.MANIFEST_PARSED, (_e: any, data: any) => {
      if (destroyed) return;
      levels.value = data.levels.map((l: any, idx: number) => ({
        bitrate: l.bitrate,
        height: l.height,
        index: idx,
      }));
      currentLevel.value = hls!.currentLevel ?? -1;
      // metadata 加载完成即 ready，不自动播放
      v.play().catch(() => {
        // 用户没点击就播不起来，没关系
      });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_e: any, data: any) => {
      currentLevel.value = data.level;
    });

    hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
      if (destroyed) return;
      if (data.fatal) {
        let tip = '';
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            tip = '网络错误：可能是跨域 (CORS) 限制、链接过期、或服务器拒绝请求。';
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            tip = '媒体解码错误：分片损坏或格式不兼容。';
            break;
          case (Hls.ErrorTypes as any).MANIFEST_ERROR:
          case 'manifestError':
            tip = '播放列表格式错误：M3U8 文件不可解析。';
            break;
          default:
            tip = (data.details as string) || '未知错误';
        }

        // 网络错误自动重试一次（防止短暂抖动）
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (networkErrorRetryCount < MAX_NETWORK_RETRY) {
            networkErrorRetryCount++;
            hls!.startLoad();
            return;
          }
          // 重试也失败 → 明确报错
          errorMessage.value = `${tip}（${data.details}）`;
          status.value = 'error';
          return;
        }

        // manifest 解析错误 → 回退 Safari 原生播放（极少数情况原生能播）
        const detailsStr = String(data.details || '');
        if (detailsStr.includes('MANIFEST_PARSING') || detailsStr.includes('UNKNOWN_KEYSYSTEM')) {
          try {
            hls!.destroy();
          } catch {
            // ignore
          }
          hls = null;
          v.src = props.src;
          return;
        }

        errorMessage.value = `${tip}（${data.details}）`;
        status.value = 'error';
      }
    });
  } catch (err) {
    if (destroyed) return;
    console.error('[M3U8Player] 初始化失败:', err);
    // 非 Safari 原生不支持 HLS，直接报错不做 video.src fallback
    if (!isSafari.value) {
      status.value = 'error';
      errorMessage.value =
        '播放器初始化失败：hls.js 无法加载此视频源。' +
        '可能的原因：跨域 (CORS) 限制、链接过期或服务器拒绝请求。';
      return;
    }
    // Safari 才走原生 fallback
    try {
      v.src = props.src;
    } catch {
      status.value = 'error';
      errorMessage.value = '播放器初始化失败，请直接下载视频查看。';
    }
  }
}

function destroyHls() {
  if (hls) {
    try {
      hls.destroy();
    } catch {
      // ignore
    }
    hls = null;
  }
  const v = videoRef.value;
  if (v) {
    try {
      v.pause();
      v.removeAttribute('src');
      v.load();
    } catch {
      // ignore
    }
  }
}

onMounted(() => {
  destroyed = false;
  if (props.src) {
    nextTick(() => initPlayer());
  }
});

onBeforeUnmount(() => {
  destroyed = true;
  destroyHls();
});

watch(
  () => props.src,
  (newSrc, oldSrc) => {
    if (newSrc === oldSrc) return;
    destroyHls();
    destroyed = false;
    status.value = 'idle';
    nextTick(() => initPlayer());
  }
);
</script>
