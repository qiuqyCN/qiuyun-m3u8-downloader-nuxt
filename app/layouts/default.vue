<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
    <!-- Header -->
    <header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <!-- 左：Logo + Tab 导航（紧凑一组） -->
        <div class="flex items-center gap-6 min-w-0">
          <NuxtLink to="/" class="flex items-center gap-3">
            <img src="/favicon.png" alt="秋云 M3U8 下载器" class="w-10 h-10 rounded-xl" />
            <div>
              <h1 class="text-lg font-bold text-foreground leading-tight">秋云 M3U8 下载器</h1>
              <p class="text-xs text-muted-foreground leading-tight">简洁 · 高效 · 免费</p>
            </div>
          </NuxtLink>

          <nav class="hidden md:flex items-center gap-1">
            <NuxtLink
              to="/"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="$route.path === '/' ? 'text-violet-500 bg-violet-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
            >
              下载
            </NuxtLink>
            <NuxtLink
              to="/play"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="$route.path === '/play' ? 'text-violet-500 bg-violet-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
            >
              在线播放
            </NuxtLink>
          </nav>
        </div>

        <!-- 右：图标按钮组 -->
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
            href="https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt" 
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
    <main class="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-border">
      <div class="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <p class="text-muted-foreground text-sm">
          © 2026 秋云 M3U8 下载器 · 免费开源
        </p>
        <div class="flex items-center gap-4">
          <NuxtLink to="/docs" class="text-muted-foreground hover:text-foreground text-sm transition-colors">文档</NuxtLink>
          <a href="https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues" target="_blank" rel="noopener" class="text-muted-foreground hover:text-foreground text-sm transition-colors">反馈</a>
          <NuxtLink to="/settings?section=about" class="text-muted-foreground hover:text-foreground text-sm transition-colors">关于</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { GithubIcon, Settings, Sun, Moon } from 'lucide-vue-next';

const { isDark, toggleTheme } = useTheme();
</script>
