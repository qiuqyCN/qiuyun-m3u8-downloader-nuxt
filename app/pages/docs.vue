<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink to="/" class="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </NuxtLink>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-foreground">使用文档</h1>
          <p class="text-xs text-muted-foreground">与 GitHub README 同步</p>
        </div>
      </div>
      <a
        href="https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt"
        target="_blank"
        rel="noopener"
        class="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
      >
        <Github class="w-3.5 h-3.5" />
        在 GitHub 查看
      </a>
    </div>

    <div class="bg-card border border-border rounded-2xl p-6 md:p-8">
      <article class="docs-content" v-html="html" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked';
// 打包时内联 README.md，与 GitHub 仓库内容保持一致，无运行时网络依赖
import readme from '../../README.md?raw';
import { ArrowLeft, BookOpen, Github } from 'lucide-vue-next';

definePageMeta({
  layout: 'default'
});

useSeoMeta({
  title: '使用文档 - 秋云 M3U8 下载器',
  description: '秋云 M3U8 下载器完整使用文档：油猴脚本安装、视频自动检测、Docker 与静态部署教程、常见问题。',
  ogTitle: '使用文档 - 秋云 M3U8 下载器',
  ogDescription: '秋云 M3U8 下载器完整使用文档：油猴脚本安装、视频自动检测、Docker 与静态部署教程、常见问题。',
  ogUrl: 'https://m3u8.qiuyun.dev/docs',
});

marked.setOptions({ breaks: true, gfm: true });

// README 中的相对链接补充为 GitHub 绝对地址
const GITHUB_BASE = 'https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/blob/main/';
const html = marked.parse(
  readme.replace(/\]\((?!https?:|#|mailto:)([^)]+)\)/g, `](${GITHUB_BASE}$1`)
);
</script>

<style>
.docs-content {
  color: var(--foreground, inherit);
  line-height: 1.75;
  font-size: 0.9375rem;
  word-break: break-word;
}
.docs-content h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
}
.docs-content h2 {
  font-size: 1.375rem;
  font-weight: 600;
  margin: 2rem 0 0.75rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid hsl(var(--border));
}
.docs-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1.5rem 0 0.5rem;
}
.docs-content p { margin: 0.75rem 0; }
.docs-content a {
  color: #8b5cf6;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.docs-content a:hover { color: #7c3aed; }
.docs-content ul, .docs-content ol {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}
.docs-content ul { list-style: disc; }
.docs-content ol { list-style: decimal; }
.docs-content li { margin: 0.25rem 0; }
.docs-content blockquote {
  margin: 1rem 0;
  padding: 0.25rem 1rem;
  border-left: 3px solid #8b5cf6;
  background: hsl(var(--muted) / 0.5);
  border-radius: 0 0.5rem 0.5rem 0;
}
.docs-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125em;
  padding: 0.15em 0.4em;
  border-radius: 0.375rem;
  background: hsl(var(--muted));
}
.docs-content pre {
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 0.75rem;
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  overflow-x: auto;
}
.docs-content pre code {
  padding: 0;
  background: transparent;
  font-size: 0.8125rem;
  line-height: 1.6;
}
.docs-content table {
  width: 100%;
  margin: 1rem 0;
  border-collapse: collapse;
  font-size: 0.875rem;
  display: block;
  overflow-x: auto;
}
.docs-content th, .docs-content td {
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  text-align: left;
}
.docs-content th {
  background: hsl(var(--muted) / 0.6);
  font-weight: 600;
}
.docs-content hr {
  margin: 1.5rem 0;
  border: none;
  border-top: 1px solid hsl(var(--border));
}
.docs-content img { max-width: 100%; border-radius: 0.5rem; }
</style>
