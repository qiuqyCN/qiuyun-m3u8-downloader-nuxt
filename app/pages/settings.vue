<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink to="/" class="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </NuxtLink>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Settings class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-foreground">设置</h1>
          <p class="text-xs text-muted-foreground">自定义下载器行为</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Settings Navigation -->
      <div class="lg:col-span-1">
        <div class="bg-card border border-border rounded-2xl overflow-hidden lg:sticky lg:top-24">
          <div class="p-4 border-b border-border">
            <h2 class="font-semibold text-foreground">设置分类</h2>
          </div>
          <nav class="p-2">
            <button
              v-for="section in sections"
              :key="section.id"
              @click="activeSection = section.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
              :class="activeSection === section.id ? 'bg-violet-500/10 text-violet-500' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
            >
              <component :is="section.icon" class="w-5 h-5" />
              <span class="font-medium">{{ section.name }}</span>
            </button>
          </nav>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Appearance Settings -->
        <div v-show="activeSection === 'appearance'" class="bg-card border border-border rounded-2xl overflow-hidden">
          <div class="p-6 border-b border-border">
            <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
              <Palette class="w-5 h-5 text-violet-500" />
              外观设置
            </h2>
          </div>
          <div class="p-6 space-y-6">
            <!-- Theme Selection -->
            <div>
              <label class="block text-sm font-medium text-foreground mb-3">主题模式</label>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="t in themeOptions"
                  :key="t.value"
                  @click="setTheme(t.value)"
                  class="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all"
                  :class="theme === t.value ? 'bg-violet-500/10 border-violet-500 text-violet-500' : 'bg-background border-input text-muted-foreground hover:border-border'"
                >
                  <component :is="t.icon" class="w-6 h-6" />
                  <span class="text-sm font-medium">{{ t.label }}</span>
                </button>
              </div>
              <p class="text-xs text-muted-foreground mt-3">主题即时生效，无需保存</p>
            </div>
          </div>
        </div>

        <!-- Download Settings -->
        <div v-show="activeSection === 'download'" class="bg-card border border-border rounded-2xl overflow-hidden">
          <div class="p-6 border-b border-border">
            <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
              <Download class="w-5 h-5 text-violet-500" />
              下载设置
            </h2>
          </div>
          <div class="p-6 space-y-6">
            <!-- Default Segments -->
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">默认同时请求片段数</label>
              <div class="flex items-center gap-2 max-w-[200px]">
                <button
                  @click="settings.defaultMaxConcurrentSegments = Math.max(1, settings.defaultMaxConcurrentSegments - 1)"
                  class="w-10 h-10 flex items-center justify-center bg-muted border border-input rounded-xl text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <Minus class="w-4 h-4" />
                </button>
                <input
                  v-model.number="settings.defaultMaxConcurrentSegments"
                  type="number"
                  min="1"
                  max="32"
                  class="flex-1 text-center bg-background border border-input rounded-xl py-2.5 text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                <button
                  @click="settings.defaultMaxConcurrentSegments = Math.min(32, settings.defaultMaxConcurrentSegments + 1)"
                  class="w-10 h-10 flex items-center justify-center bg-muted border border-input rounded-xl text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Default Retries -->
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">默认最大重试次数</label>
              <div class="flex items-center gap-2 max-w-[200px]">
                <button
                  @click="settings.defaultMaxRetries = Math.max(0, settings.defaultMaxRetries - 1)"
                  class="w-10 h-10 flex items-center justify-center bg-muted border border-input rounded-xl text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <Minus class="w-4 h-4" />
                </button>
                <input
                  v-model.number="settings.defaultMaxRetries"
                  type="number"
                  min="0"
                  max="10"
                  class="flex-1 text-center bg-background border border-input rounded-xl py-2.5 text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                >
                <button
                  @click="settings.defaultMaxRetries = Math.min(10, settings.defaultMaxRetries + 1)"
                  class="w-10 h-10 flex items-center justify-center bg-muted border border-input rounded-xl text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Notification -->
            <div class="flex items-center justify-between pt-6 border-t border-border">
              <div>
                <span class="text-sm font-medium text-foreground">下载完成通知</span>
                <p class="text-xs text-muted-foreground mt-0.5">下载完成或失败后显示系统通知（首次会请求浏览器通知权限）</p>
              </div>
              <button
                @click="settings.enableNotification = !settings.enableNotification"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-background"
                :class="settings.enableNotification ? 'bg-violet-500' : 'bg-muted'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.enableNotification ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- About -->
        <div v-show="activeSection === 'about'" class="bg-card border border-border rounded-2xl overflow-hidden">
          <div class="p-6 border-b border-border">
            <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
              <Info class="w-5 h-5 text-violet-500" />
              关于
            </h2>
          </div>
          <div class="p-6 space-y-6">
            <div class="flex items-center gap-4">
              <img src="/favicon.png" alt="秋云 M3U8 下载器" class="w-16 h-16 rounded-2xl" />
              <div>
                <h3 class="text-xl font-bold text-foreground">秋云 M3U8 下载器</h3>
                <p class="text-muted-foreground">版本 {{ appVersion }}</p>
              </div>
            </div>

            <p class="text-muted-foreground text-sm leading-relaxed">
              一个简洁优雅的 M3U8 视频下载工具，支持自动检测、批量下载、格式转换等功能。
              采用纯前端架构，配合油猴脚本实现跨域下载，无需服务器，完全免费。
            </p>

            <div class="flex gap-3">
              <a
                href="https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt"
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2 bg-muted border border-input rounded-xl text-foreground hover:bg-accent transition-colors"
              >
                <Github class="w-4 h-4" />
                GitHub
              </a>
              <NuxtLink
                to="/docs"
                class="inline-flex items-center gap-2 px-4 py-2 bg-muted border border-input rounded-xl text-foreground hover:bg-accent transition-colors"
              >
                <BookOpen class="w-4 h-4" />
                文档
              </NuxtLink>
            </div>

            <div class="pt-4 border-t border-border">
              <p class="text-xs text-muted-foreground">
                © 2026 秋云 M3U8 下载器 · 基于 MIT 协议开源
              </p>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div v-show="activeSection !== 'about'" class="flex justify-end">
          <button
            @click="saveSettings"
            class="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-lg shadow-violet-500/25"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>

    <!-- Save Toast -->
    <Transition name="toast">
      <div v-if="showToast" class="fixed bottom-4 right-4 px-4 py-3 bg-emerald-500 text-white rounded-xl shadow-lg z-50">
        设置已保存
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  ArrowLeft,
  Settings,
  Download,
  Info,
  Github,
  BookOpen,
  Minus,
  Plus,
  Palette,
  Sun,
  Moon,
  Monitor
} from 'lucide-vue-next';
import type { AppSettings } from '~/types';
import type { Theme } from '~/composables/useTheme';
import { defaultSettings, loadSettings, persistSettings } from '~/composables/useSettings';
import { version as appVersion } from '~~/package.json';

// 页面元数据
definePageMeta({
  layout: 'default'
});

// 设置页是用户个人配置，不参与收录
useSeoMeta({
  title: '设置 - 秋云 M3U8 下载器',
  robots: 'noindex, nofollow',
});

const { theme, setTheme } = useTheme();

const themeOptions = [
  { value: 'light' as Theme, label: '亮色', icon: Sun },
  { value: 'dark' as Theme, label: '暗色', icon: Moon },
  { value: 'system' as Theme, label: '跟随系统', icon: Monitor },
];

const sections = [
  { id: 'appearance', name: '外观', icon: Palette },
  { id: 'download', name: '下载设置', icon: Download },
  { id: 'about', name: '关于', icon: Info },
];

const activeSection = ref('appearance');

// 支持 /settings?section=about 深链
const route = useRoute();
function applySectionQuery() {
  const s = route.query.section;
  if (typeof s === 'string' && sections.some(sec => sec.id === s)) {
    activeSection.value = s;
  }
}

onMounted(applySectionQuery);
watch(() => route.query.section, applySectionQuery);

const settings = ref<AppSettings>({ ...defaultSettings });

onMounted(() => {
  settings.value = loadSettings();
});

const showToast = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function saveSettings() {
  settings.value.defaultMaxConcurrentSegments = clampNumber(
    settings.value.defaultMaxConcurrentSegments, 1, 32, defaultSettings.defaultMaxConcurrentSegments
  );
  settings.value.defaultMaxRetries = clampNumber(
    settings.value.defaultMaxRetries, 0, 10, defaultSettings.defaultMaxRetries
  );
  persistSettings(settings.value);

  showToast.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { showToast.value = false; }, 3000);
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
