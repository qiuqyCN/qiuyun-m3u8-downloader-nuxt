<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center gap-4 mb-8">
      <NuxtLinkLocale to="/" class="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </NuxtLinkLocale>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-foreground">{{ $t('docs.heading') }}</h1>
          <p class="text-xs text-muted-foreground">{{ $t('docs.subheading') }}</p>
        </div>
      </div>
      <a
        href="https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt"
        target="_blank"
        rel="noopener"
        class="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
      >
        <LucideGithub class="w-3.5 h-3.5" />
        {{ $t('docs.githubLink') }}
      </a>
    </div>

    <div class="bg-card border border-border rounded-2xl p-6 md:p-8">
      <article class="docs-content" v-html="html" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked';
// 构建时内联指南文档，无运行时网络依赖；docs 页与 GitHub README 解耦，可独立扩充
import guideEn from '~/assets/docs/guide.en.md?raw';
import guideZh from '~/assets/docs/guide.zh.md?raw';
import { ArrowLeft, BookOpen, LucideGithub } from 'lucide-vue-next';

definePageMeta({
  layout: 'default'
});

const { t, locale } = useI18n();
const localePath = useLocalePath();

const SITE_URL = 'https://m3u8.qiuyun.dev';

useSeoMeta({
  title: () => t('docs.pageTitle'),
  description: () => t('docs.description'),
  ogTitle: () => t('docs.pageTitle'),
  ogDescription: () => t('docs.description'),
  ogSiteName: () => t('brand.name'),
  ogUrl: () => SITE_URL + localePath('/docs'),
});

marked.setOptions({ breaks: true, gfm: true });

// zh / zh-TW 命中中文指南，其余语言回退英文
const guides: Record<string, string> = { en: guideEn, zh: guideZh, 'zh-TW': guideZh };
const html = marked.parse(guides[locale.value] ?? guideEn);
</script>

