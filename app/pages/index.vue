<template>
  <div>
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="bg-card border border-border rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-muted-foreground text-sm">下载任务</span>
          <div class="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Download class="w-4 h-4 text-violet-500" />
          </div>
        </div>
        <div class="text-2xl font-bold text-foreground">{{ tasks.length }}</div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ tasks.filter(t => t.status === 'completed').length }} 已完成
        </div>
      </div>

      <div class="bg-card border border-border rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-muted-foreground text-sm">油猴脚本</span>
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="isTampermonkeyAvailable ? 'bg-emerald-500/10' : 'bg-amber-500/10'">
            <Shield class="w-4 h-4" :class="isTampermonkeyAvailable ? 'text-emerald-500' : 'text-amber-500'" />
          </div>
        </div>
        <div class="text-2xl font-bold" :class="isTampermonkeyAvailable ? 'text-emerald-500' : 'text-amber-500'">
          {{ isTampermonkeyAvailable ? '已安装' : '未安装' }}
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ isTampermonkeyAvailable ? '可自动检测 M3U8' : '建议安装以获得最佳体验' }}
        </div>
      </div>

      <div class="bg-card border border-border rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-muted-foreground text-sm">当前状态</span>
          <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Activity class="w-4 h-4 text-blue-500" />
          </div>
        </div>
        <div class="text-2xl font-bold text-foreground">
          {{ isDownloading ? '下载中' : '就绪' }}
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ currentTask ? currentTask.progress + '%' : '等待开始' }}
        </div>
      </div>
    </div>

    <!-- Tampermonkey Banner -->
    <div v-if="!isTampermonkeyAvailable" class="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Zap class="w-6 h-6 text-amber-500" />
        </div>
        <div class="flex-1">
          <h3 class="text-foreground font-semibold mb-1">安装油猴脚本，体验自动检测</h3>
          <p class="text-muted-foreground text-sm mb-4">
            油猴脚本可以自动检测网页中的 M3U8 视频链接，并绕过跨域限制，让下载更加便捷。
          </p>
          <div class="flex gap-3">
            <a 
              href="https://www.tampermonkey.net/" 
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-sm font-medium rounded-lg transition-colors"
            >
              <Download class="w-4 h-4" />
              安装油猴
            </a>
            <button 
              @click="showTampermonkeyHelp = true"
              class="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-accent transition-colors"
            >
              <BookOpen class="w-4 h-4" />
              使用教程
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Download Form -->
      <div class="bg-card border border-border rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
            <Link class="w-5 h-5 text-violet-500" />
            新建下载
          </h2>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Input Type -->
          <div class="flex p-1 bg-muted rounded-lg">
            <button
              @click="inputType = 'url'"
              class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              :class="inputType === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            >
              <Link class="w-4 h-4 inline-block mr-1" />
              链接
            </button>
            <button
              @click="inputType = 'file'"
              class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              :class="inputType === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            >
              <FileText class="w-4 h-4 inline-block mr-1" />
              文件
            </button>
          </div>

          <!-- URL Input -->
          <div v-if="inputType === 'url'">
            <label class="block text-sm font-medium text-muted-foreground mb-2">M3U8 链接</label>
            <div class="relative">
              <textarea
                v-model="m3u8Url"
                rows="4"
                placeholder="粘贴 M3U8 链接到此处...&#10;支持 http:// 或 https:// 开头的链接"
                class="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none font-mono text-sm"
              />
              <button
                v-if="m3u8Url"
                @click="m3u8Url = ''"
                class="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- File Input -->
          <div v-else>
            <label class="block text-sm font-medium text-muted-foreground mb-2">M3U8 文件</label>
            <div 
              class="border-2 border-dashed border-input rounded-xl p-8 text-center hover:border-violet-500 transition-colors cursor-pointer bg-background"
              @click="fileInput?.click()"
              @drop.prevent="handleFileDrop"
              @dragover.prevent
            >
              <input
                ref="fileInput"
                type="file"
                accept=".m3u8"
                class="hidden"
                @change="handleFileSelect"
              />
              <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Upload class="w-8 h-8 text-muted-foreground" />
              </div>
              <p class="text-foreground font-medium mb-1">点击选择或拖拽文件到此处</p>
              <p class="text-muted-foreground text-sm">支持 .m3u8 格式文件</p>
            </div>
          </div>

          <!-- Options Toggle -->
          <div>
            <button
              @click="showOptions = !showOptions"
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SlidersHorizontal class="w-4 h-4" />
              高级选项
              <ChevronDown class="w-4 h-4 transition-transform" :class="showOptions ? 'rotate-180' : ''" />
            </button>
          </div>

          <!-- Advanced Options -->
          <div v-show="showOptions" class="space-y-4 pt-4 border-t border-border">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-2">同时请求片段数</label>
                <div class="flex items-center gap-2">
                  <button 
                    @click="maxConcurrentSegments = Math.max(1, maxConcurrentSegments - 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <input
                    v-model.number="maxConcurrentSegments"
                    type="number"
                    min="1"
                    max="32"
                    class="flex-1 text-center bg-background border border-input rounded-lg py-2 text-sm text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                  <button 
                    @click="maxConcurrentSegments = Math.min(32, maxConcurrentSegments + 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-2">最大重试次数</label>
                <div class="flex items-center gap-2">
                  <button 
                    @click="maxRetries = Math.max(0, maxRetries - 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <input
                    v-model.number="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    class="flex-1 text-center bg-background border border-input rounded-lg py-2 text-sm text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                  <button 
                    @click="maxRetries = Math.min(10, maxRetries + 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted-foreground mb-2">开始片段序号</label>
                <div class="flex items-center gap-2">
                  <button 
                    @click="startSegmentIndex = Math.max(0, startSegmentIndex - 1)"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <input
                    v-model.number="startSegmentIndex"
                    type="number"
                    min="0"
                    class="flex-1 text-center bg-background border border-input rounded-lg py-2 text-sm text-foreground focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                  <button 
                    @click="startSegmentIndex = startSegmentIndex + 1"
                    class="w-8 h-8 flex items-center justify-center bg-muted border border-input rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
                <p class="mt-1.5 text-xs text-muted-foreground">第一个片段序号为 0</p>
              </div>
            </div>

            <div class="flex items-center justify-between py-3 border-t border-border">
              <div>
                <span class="text-sm text-foreground">转为 MP4 格式</span>
                <p class="text-xs text-muted-foreground">实验性功能，可能不稳定</p>
              </div>
              <button
                @click="convertToMp4 = !convertToMp4"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-background"
                :class="convertToMp4 ? 'bg-violet-500' : 'bg-muted'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="convertToMp4 ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>

          <!-- Download Button -->
          <button
            @click="startDownload"
            :disabled="!canDownload || isDownloading"
            class="w-full py-3.5 px-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
          >
            <Loader2 v-if="isDownloading" class="w-5 h-5 animate-spin" />
            <Download v-else class="w-5 h-5" />
            {{ isDownloading ? '下载中...' : '开始下载' }}
          </button>
        </div>
      </div>

      <!-- Tasks List -->
      <div class="bg-card border border-border rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-border flex items-center justify-between">
          <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
            <List class="w-5 h-5 text-violet-500" />
            下载任务
          </h2>
          <button
            v-if="tasks.length > 0"
            @click="clearCompleted"
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            清除已完成
          </button>
        </div>

        <div class="p-6">
          <div v-if="tasks.length === 0" class="text-center py-12">
            <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox class="w-8 h-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground font-medium mb-1">暂无下载任务</p>
            <p class="text-muted-foreground/70 text-sm">粘贴 M3U8 链接开始下载</p>
          </div>

          <div v-else class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="bg-background border border-border rounded-xl p-4 hover:border-border/80 transition-colors"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Film class="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p class="font-medium text-foreground text-sm">{{ task.title }}</p>
                    <p class="text-xs text-muted-foreground">{{ formatTime(task.createdAt) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="getStatusClass(task.status)"
                  >
                    {{ getStatusText(task.status) }}
                  </span>
                  <button
                    v-if="task.status === 'downloading' || task.status === 'paused'"
                    @click="cancelTask(task)"
                    class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <!-- Progress -->
              <div v-if="task.status === 'downloading' || task.status === 'merging'" class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-foreground">{{ task.progress }}%</span>
                  <span class="text-muted-foreground/70">{{ task.segments.downloaded }}/{{ task.segments.total }} 分片</span>
                </div>
                <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                    :style="{ width: `${task.progress}%` }"
                  />
                </div>
              </div>

              <!-- Error -->
              <div v-if="task.status === 'error'" class="mt-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {{ task.error }}
              </div>

              <!-- Actions -->
              <div v-if="task.status === 'paused'" class="mt-3 flex gap-2">
                <button
                  @click="resumeTask(task)"
                  class="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  继续下载
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Code Example Section -->
    <div class="mt-8 bg-card border border-border rounded-2xl overflow-hidden">
      <div class="p-6 border-b border-border">
        <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
          <Code class="w-5 h-5 text-violet-500" />
          快速开始
        </h2>
      </div>
      <div class="p-6">
        <div class="bg-muted/50 rounded-xl p-4 font-mono text-sm overflow-x-auto border border-border">
          <div class="flex items-center gap-2 mb-3 pb-3 border-b border-border">
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span class="ml-2 text-muted-foreground text-xs">usage.js</span>
          </div>
          <pre class="text-foreground"><span class="text-violet-500">// 1. 安装油猴脚本</span>
<span class="text-muted-foreground">// 访问任意视频网站，脚本会自动检测 M3U8</span>

<span class="text-emerald-500">const</span> m3u8Url = <span class="text-amber-500">"https://example.com/video.m3u8"</span>;

<span class="text-violet-500">// 2. 粘贴到下载器并配置参数</span>
<span class="text-emerald-500">const</span> options = {
  maxConcurrentSegments: <span class="text-amber-500">15</span>,  <span class="text-muted-foreground">// 同时下载片段数</span>
  maxRetries: <span class="text-amber-500">3</span>,              <span class="text-muted-foreground">// 失败重试次数</span>
  convertToMp4: <span class="text-amber-500">false</span>         <span class="text-muted-foreground">// 是否转码</span>
};

<span class="text-violet-500">// 3. 开始下载</span>
downloader.<span class="text-blue-500">start</span>(m3u8Url, options);</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  Download,
  Shield,
  Activity,
  Zap,
  BookOpen,
  Link,
  FileText,
  Upload,
  X,
  Minus,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  List,
  Inbox,
  Film,
  Code,
  Loader2
} from 'lucide-vue-next';
import type { DownloadTask, DownloadOptions } from '~/types';

// 页面元数据
definePageMeta({
  layout: 'default'
});

const { isTampermonkeyAvailable, createTask, startDownload: startDownloadTask, tasks, cancelTask, resumeTask, currentTask, isDownloading } = useDownloader();

const inputType = ref<'url' | 'file'>('url');
const m3u8Url = ref('');
const selectedFile = ref<File | null | undefined>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const maxConcurrentSegments = ref(15);
const maxRetries = ref(3);
const startSegmentIndex = ref(0);
const convertToMp4 = ref(false);
const showOptions = ref(false);
const showTampermonkeyHelp = ref(false);

const canDownload = computed(() => {
  if (inputType.value === 'url') {
    return m3u8Url.value.trim().length > 0;
  }
  return selectedFile.value !== null;
});

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
}

function handleFileDrop(event: DragEvent) {
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    selectedFile.value = event.dataTransfer.files[0];
  }
}

async function startDownload() {
  if (!canDownload.value) return;

  const options: DownloadOptions = {
    inputType: inputType.value,
    url: inputType.value === 'url' ? m3u8Url.value : '',
    file: inputType.value === 'file' ? selectedFile.value! : undefined,
    maxConcurrentSegments: maxConcurrentSegments.value,
    maxRetries: maxRetries.value,
    startSegmentIndex: startSegmentIndex.value,
    convertToMp4: convertToMp4.value,
    outputPath: '',
  };

  const task = await createTask(options);
  await startDownloadTask(task, options);
}

function clearCompleted() {
  const completedIds = tasks.value
    .filter(t => t.status === 'completed')
    .map(t => t.id);
  tasks.value = tasks.value.filter(t => !completedIds.includes(t.id));
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusClass(status: DownloadTask['status']) {
  const classes: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    parsing: 'bg-blue-500/10 text-blue-500',
    downloading: 'bg-violet-500/10 text-violet-500',
    paused: 'bg-amber-500/10 text-amber-500',
    merging: 'bg-fuchsia-500/10 text-fuchsia-500',
    completed: 'bg-emerald-500/10 text-emerald-500',
    error: 'bg-destructive/10 text-destructive',
  };
  return classes[status] || 'bg-muted text-muted-foreground';
}

function getStatusText(status: DownloadTask['status']) {
  const texts: Record<string, string> = {
    pending: '等待中',
    parsing: '解析中',
    downloading: '下载中',
    paused: '已暂停',
    merging: '合并中',
    completed: '已完成',
    error: '失败',
  };
  return texts[status] || status;
}

onMounted(() => {
  (window as Window & { autoFillM3U8?: (url: string, title: string | null) => void }).autoFillM3U8 = (url: string, _title: string | null) => {
    m3u8Url.value = url;
  };
});
</script>
