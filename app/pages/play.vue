<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- 顶部：返回 + 标题 + 下载 -->
    <div class="flex items-center justify-between gap-4">
      <button
        @click="$router.back()"
        class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        返回
      </button>

      <h1
        v-if="title"
        class="text-lg font-semibold text-foreground truncate flex-1 text-center"
      >
        {{ title }}
      </h1>
      <div v-else class="flex-1" />

      <a
        v-if="url && checkStatus !== 'failed'"
        :href="downloadUrl"
        class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors"
      >
        <Download class="w-4 h-4" />
        下载
      </a>
      <div v-else class="w-[72px]" />
    </div>

    <!-- 播放器：仅在预检成功后才渲染 -->
    <div v-if="url && checkStatus === 'ok'" class="bg-card border border-border rounded-2xl overflow-hidden">
      <M3U8Player :src="url" @download="gotoDownload" />

      <div class="px-5 py-4 border-t border-border space-y-2">
        <div class="flex items-center gap-2">
          <Link class="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p class="text-xs text-muted-foreground break-all" :title="url">
            {{ url }}
          </p>
        </div>
      </div>
    </div>

    <!-- 预检中 -->
    <div v-else-if="url && checkStatus === 'checking'" class="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
      <Loader2 class="w-10 h-10 text-violet-500 animate-spin" />
      <p class="text-muted-foreground">正在检测 M3U8 源可用性...</p>
      <p class="text-xs text-muted-foreground/70 break-all max-w-md text-center" :title="url">{{ url }}</p>
    </div>

    <!-- 预检失败：跨域提示卡片 -->
    <div v-else-if="url && checkStatus === 'failed'" class="bg-card border border-border rounded-2xl overflow-hidden">
      <div class="p-8 text-center space-y-5">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <ShieldAlert class="w-8 h-8 text-amber-500" />
        </div>
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-foreground">此 M3U8 源无法在线预览</h2>
          <p class="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {{ checkError }}
          </p>
        </div>
        <div class="flex items-center justify-center gap-2 flex-wrap pt-2">
          <button
            @click="retryCheck"
            class="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-border text-foreground text-sm rounded-lg transition-colors"
          >
            <RefreshCw class="w-4 h-4" />
            重新检测
          </button>
          <button
            @click="forcePlay"
            class="inline-flex items-center gap-2 px-4 py-2 bg-background border border-input hover:bg-muted text-foreground text-sm rounded-lg transition-colors"
          >
            <Play class="w-4 h-4" />
            仍然尝试播放
          </button>
          <a
            :href="downloadUrl"
            class="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors"
          >
            <Download class="w-4 h-4" />
            直接下载
          </a>
        </div>
        <p class="text-xs text-muted-foreground/70 pt-2">
          💡 安装 <a href="https://www.tampermonkey.net/" target="_blank" class="text-violet-500 hover:text-violet-600 underline">油猴脚本</a> 可自动绕过跨域限制
        </p>
      </div>
      <div class="px-5 py-3 border-t border-border bg-muted/30">
        <p class="text-xs text-muted-foreground break-all" :title="url">{{ url }}</p>
      </div>
    </div>

    <!-- 无 URL 输入框 -->
    <div v-else class="bg-card border border-border rounded-2xl p-6 text-center">
      <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Play class="w-7 h-7 text-muted-foreground" />
      </div>
      <p class="text-foreground font-medium mb-1">请粘贴 M3U8 链接</p>
      <p class="text-muted-foreground text-sm mb-4">
        或者直接访问 <span class="font-mono text-violet-500">/play?url=你的M3U8链接&title=标题</span>
      </p>
      <div class="max-w-xl mx-auto space-y-3">
        <textarea
          v-model="manualUrl"
          rows="3"
          placeholder="https://example.com/index.m3u8"
          class="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none font-mono text-sm"
        />
        <button
          @click="playManual"
          :disabled="!manualUrl.trim() || checkStatus === 'checking'"
          class="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Loader2 v-if="checkStatus === 'checking'" class="w-5 h-5 animate-spin" />
          <Play v-else class="w-5 h-5" />
          {{ checkStatus === 'checking' ? '检测中...' : '开始播放' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ArrowLeft, Download, Link, Play, ShieldAlert, Loader2, RefreshCw } from 'lucide-vue-next';
import M3U8Player from '~/components/M3U8Player.vue';

definePageMeta({ layout: 'default' });

const route = useRoute();
const router = useRouter();
const { fetchM3U8 } = useTampermonkey();

const url = ref('');
const title = ref('');
const manualUrl = ref('');
const checkStatus = ref<'idle' | 'checking' | 'ok' | 'failed'>('idle');
const checkError = ref('');

/** 内置示例：支持 CORS 的 Mux 官方测试流 */
const DEMO_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const DEMO_TITLE = 'Mux 官方测试流（支持跨域）';

const downloadUrl = computed(() => {
  if (!url.value) return '#';
  const params = new URLSearchParams();
  params.set('url', url.value);
  if (title.value) params.set('title', title.value);
  return `/?${params.toString()}`;
});

function gotoDownload(src: string) {
  const params = new URLSearchParams();
  params.set('url', src);
  if (title.value) params.set('title', title.value);
  router.push({ path: '/', query: Object.fromEntries(params.entries()) });
}

function playManual() {
  const u = manualUrl.value.trim();
  if (!u) return;
  router.push({ path: '/play', query: { url: u, title: title.value || undefined } });
}

async function doCheck(targetUrl: string) {
  checkStatus.value = 'checking';
  checkError.value = '';
  try {
    await fetchM3U8(targetUrl);
    checkStatus.value = 'ok';
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    checkError.value =
      `浏览器无法访问此 M3U8 源（${msg}）。` +
      `在线播放需要服务器允许跨域 (CORS)，或安装油猴脚本自动绕过。`;
    checkStatus.value = 'failed';
  }
}

function retryCheck() {
  if (url.value) doCheck(url.value);
}

function forcePlay() {
  // 跳过预检直接渲染播放器（Safari 原生 HLS 有时能播）
  checkStatus.value = 'ok';
}

onMounted(() => {
  const urlParam = route.query.url as string;
  const titleParam = route.query.title as string;
  if (urlParam) {
    // 带 URL 参数 → 直接预检并播放
    url.value = urlParam;
    title.value = titleParam || '';
    doCheck(url.value);
  } else {
    // 无参数 → 输入框预填示例 URL，标题留空，等用户手动点播放
    manualUrl.value = DEMO_URL;
  }
});

// URL 变化时重新预检
watch(
  () => route.query.url as string,
  (newUrl) => {
    url.value = newUrl || '';
    title.value = (route.query.title as string) || '';
    checkStatus.value = 'idle';
    checkError.value = '';
    if (url.value) doCheck(url.value);
  }
);
</script>
