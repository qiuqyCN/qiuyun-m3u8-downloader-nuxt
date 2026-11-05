import tailwindcss from '@tailwindcss/vite'

// SEO 常量
const siteUrl = 'https://m3u8.qiuyun.dev'
const siteName = '秋云 M3U8 下载器'
const siteTitle = '秋云 M3U8 下载器 - 免费在线 M3U8 视频下载工具'
const siteDescription = '免费开源的 M3U8 视频在线下载工具。配合油猴脚本自动检测网页中的 M3U8 视频，支持多线程分片下载、AES-128 解密、MP4 转换、封面下载。纯前端实现，视频不经过服务器，保护隐私。'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['shadcn-nuxt', '@nuxtjs/i18n'],
  i18n: {
    locales: [
      // language 用纯语言码，避免同时输出 zh 与 zh-CN 两条重复的 hreflang
      { code: 'zh', language: 'zh', name: '简体中文', file: 'zh.ts' },
      { code: 'zh-TW', language: 'zh-TW', name: '繁體中文', file: 'zh-TW.ts' },
      { code: 'en', language: 'en', name: 'English', file: 'en.ts' },
      { code: 'es', language: 'es', name: 'Español', file: 'es.ts' },
      { code: 'pt', language: 'pt', name: 'Português', file: 'pt.ts' },
      { code: 'ru', language: 'ru', name: 'Русский', file: 'ru.ts' },
      { code: 'id', language: 'id', name: 'Bahasa Indonesia', file: 'id.ts' },
      { code: 'vi', language: 'vi', name: 'Tiếng Việt', file: 'vi.ts' },
      { code: 'ja', language: 'ja', name: '日本語', file: 'ja.ts' },
      { code: 'ko', language: 'ko', name: '한국어', file: 'ko.ts' },
      { code: 'de', language: 'de', name: 'Deutsch', file: 'de.ts' },
      { code: 'fr', language: 'fr', name: 'Français', file: 'fr.ts' },
    ],
    defaultLocale: 'zh',
    // 中文无前缀（/、/play），英文带 /en 前缀（/en、/en/play），URL 全部为 ASCII
    strategy: 'prefix_except_default',
    baseUrl: siteUrl,
    // 关闭自动语言检测与跳转，避免爬虫被重定向到另一语言版本
    detectBrowserLanguage: false,
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: siteTitle,
      meta: [
        { name: 'description', content: siteDescription },
        { name: 'keywords', content: 'M3U8下载,M3U8下载器,M3U8视频下载,HLS下载,m3u8转mp4,视频下载工具,油猴脚本,Tampermonkey,免费视频下载' },
        { name: 'author', content: siteName },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#8b5cf6' },
        // Open Graph（微信/QQ/Telegram 等分享卡片）
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: siteName },
        { property: 'og:title', content: siteTitle },
        { property: 'og:description', content: siteDescription },
        { property: 'og:url', content: siteUrl },
        { property: 'og:image', content: `${siteUrl}/og-image.jpg` },
        { property: 'og:locale', content: 'zh_CN' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: siteTitle },
        { name: 'twitter:description', content: siteDescription },
        { name: 'twitter:image', content: `${siteUrl}/og-image.jpg` },
      ],
      link: [
        { rel: 'canonical', href: siteUrl },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      ],
      script: [
        // Google Analytics (GA4)
        {
          async: true,
          src: 'https://www.googletagmanager.com/gtag/js?id=G-LSQXK5HXX2',
        },
        {
          innerHTML: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LSQXK5HXX2');
          `,
        },
        // Microsoft Clarity
        {
          innerHTML: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "z89s5pnlbk");
          `,
        },
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: siteName,
            url: siteUrl,
            description: siteDescription,
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            inLanguage: 'zh-CN',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
          }),
        },
      ],
    },
  },
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui'
  },
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  
})