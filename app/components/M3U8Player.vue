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
        <p class="text-white font-medium mb-2">{{ t('player.failed') }}</p>
        <p class="text-white/70 text-sm max-w-sm leading-relaxed">
          {{ errorMessage }}
        </p>
        <p class="text-white/50 text-xs mt-3">
          {{ t('player.corsHint') }}
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
          <span v-else>{{ $t('player.quality', { n: idx + 1 }) }}</span>
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
}>();

const { t } = useI18n();

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

/** 看门狗：预检通过但分片请求一直挂起时，不能无限转圈 */
const WATCHDOG_MS = 15000;
let watchdog: ReturnType<typeof setTimeout> | null = null;

function startWatchdog() {
  clearWatchdog();
  watchdog = setTimeout(() => {
    watchdog = null;
    if (destroyed || status.value !== 'loading') return;
    status.value = 'error';
    errorMessage.value = t('player.networkError');
  }, WATCHDOG_MS);
}

function clearWatchdog() {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

const isSafari = computed(() => {
  if (typeof navigator === 'undefined') return false;
  return (
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent) &&
    !/Chromium/.test(navigator.userAgent)
  );
});

const currentLevelLabel = computed(() => {
  if (currentLevel.value === -1) return t('player.auto');
  const l = levels.value[currentLevel.value];
  if (!l) return t('player.auto');
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
  clearWatchdog();
  const v = videoRef.value;
  if (!v) return;
  const err = v.error;
  const code = err?.code;
  const isNetwork = code === 2;
  const isSrcUnsupported = code === 4;

  if (isSafari.value) {
    if (isNetwork) errorMessage.value = t('player.nativeFailedNetwork');
    else if (isSrcUnsupported) errorMessage.value = t('player.nativeFailedUnsupported');
    else errorMessage.value = t('player.nativeFailedGeneric');
  } else {
    if (isSrcUnsupported) errorMessage.value = t('player.chromiumNativeUnsupported');
    else if (isNetwork) errorMessage.value = t('player.chromiumNetworkError');
    else errorMessage.value = t('player.chromiumGeneric');
  }
  status.value = 'error';
}

function onLoadedMetadata() {
  clearWatchdog();
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
  startWatchdog();

  if (isSafari.value) {
    v.src = props.src;
    return;
  }

  try {
    const HlsModule = await import('hls.js');
    const Hls = HlsModule.default;

    if (destroyed) return;

    if (!Hls.isSupported()) {
      status.value = 'error';
      errorMessage.value = t('player.chromiumGeneric');
      return;
    }

    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      // 限制缓冲，避免长时间播放时内存持续增长（backBufferLength 默认 Infinity）
      backBufferLength: 30,
      maxBufferLength: 30,
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
      v.play().catch(() => { /* 用户没点击就播不起来 */ });
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
            tip = t('player.networkError');
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            tip = t('player.mediaError');
            break;
          case (Hls.ErrorTypes as any).MANIFEST_ERROR:
          case 'manifestError':
            tip = t('player.manifestError');
            break;
          default:
            tip = (data.details as string) || 'Unknown error';
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (networkErrorRetryCount < MAX_NETWORK_RETRY) {
            networkErrorRetryCount++;
            hls!.startLoad();
            return;
          }
          errorMessage.value = `${tip} (${data.details})`;
          status.value = 'error';
          return;
        }

        const detailsStr = String(data.details || '');
        if (detailsStr.includes('MANIFEST_PARSING') || detailsStr.includes('UNKNOWN_KEYSYSTEM')) {
          try { hls!.destroy(); } catch { /* ignore */ }
          hls = null;
          v.src = props.src;
          return;
        }

        errorMessage.value = `${tip} (${data.details})`;
        status.value = 'error';
      }
    });
  } catch (err) {
    if (destroyed) return;
    console.error('[M3U8Player] init failed:', err);
    if (!isSafari.value) {
      status.value = 'error';
      errorMessage.value = t('player.initFailed');
      return;
    }
    try {
      v.src = props.src;
    } catch {
      status.value = 'error';
      errorMessage.value = t('player.initFailedGeneric');
    }
  }
}

function destroyHls() {
  clearWatchdog();
  if (hls) {
    try { hls.destroy(); } catch { /* ignore */ }
    hls = null;
  }
  const v = videoRef.value;
  if (v) {
    try {
      v.pause();
      v.removeAttribute('src');
      v.load();
    } catch { /* ignore */ }
  }
}

onMounted(() => {
  destroyed = false;
  if (props.src) nextTick(() => initPlayer());
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
