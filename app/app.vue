<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- Cookie 同意横幅：仅在客户端渲染，SSR 不输出，避免水合不匹配 -->
  <ClientOnly>
    <CookieConsent />
  </ClientOnly>
</template>

<script setup>
// 主题初始化 - 在服务端渲染时避免闪烁（标题与 SEO meta 统一在 nuxt.config.ts 中配置）
useHead({
  script: [
    {
      innerHTML: `
        (function() {
          const theme = localStorage.getItem('theme') || 'system';
          const root = document.documentElement;
          
          if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          } else if (theme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        })();
      `,
      type: 'text/javascript',
    },
  ],
});
</script>

<style>
/* 全局动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease;
}

/* 滚动条样式 - 适配亮色/暗色主题 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: hsl(var(--muted));
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}
</style>
