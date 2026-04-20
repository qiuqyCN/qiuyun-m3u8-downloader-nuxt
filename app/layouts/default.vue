<template>
  <div class="min-h-screen bg-background text-foreground transition-colors duration-300">
    <!-- Header -->
    <header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Cloud class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-foreground">秋云 M3U8 下载器</h1>
            <p class="text-xs text-muted-foreground">简洁 · 高效 · 免费</p>
          </div>
        </NuxtLink>
        <div class="flex items-center gap-2">
          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="p-2 text-muted-foreground hover:text-foreground transition-colors"
            :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
          >
            <Sun v-if="isDark" class="w-5 h-5" />
            <Moon v-else class="w-5 h-5" />
          </button>
          <a 
            href="https://github.com/qiuyun-m3u8-downloader" 
            target="_blank"
            class="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GithubIcon class="w-5 h-5" />
          </a>
          <NuxtLink 
            to="/settings" 
            class="p-2 text-muted-foreground hover:text-foreground transition-colors"
            :class="{ 'text-violet-500': $route.path === '/settings' }"
          >
            <Settings class="w-5 h-5" />
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-border mt-12">
      <div class="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <p class="text-muted-foreground text-sm">
          © 2024 秋云 M3U8 下载器 · 免费开源
        </p>
        <div class="flex items-center gap-4">
          <a href="#" class="text-muted-foreground hover:text-foreground text-sm transition-colors">文档</a>
          <a href="#" class="text-muted-foreground hover:text-foreground text-sm transition-colors">反馈</a>
          <a href="#" class="text-muted-foreground hover:text-foreground text-sm transition-colors">关于</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { Cloud, GithubIcon, Settings, Sun, Moon } from 'lucide-vue-next';

const { isDark, toggleTheme } = useTheme();
</script>
