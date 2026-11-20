<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center gap-4 mb-8">
      <NuxtLinkLocale to="/" class="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </NuxtLinkLocale>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Shield class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-foreground">{{ $t('privacy.heading') }}</h1>
          <p class="text-xs text-muted-foreground">{{ $t('privacy.subheading') }}</p>
        </div>
      </div>
    </div>

    <!-- 非中英语言提示正文以英文呈现 -->
    <p v-if="$t('privacy.notice')" class="mb-4 text-xs text-muted-foreground">
      {{ $t('privacy.notice') }}
    </p>

    <div class="bg-card border border-border rounded-2xl p-6 md:p-8">
      <article class="docs-content" v-html="html" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked';
import { ArrowLeft, Shield } from 'lucide-vue-next';

definePageMeta({
  layout: 'default'
});

const { t, locale } = useI18n();
const localePath = useLocalePath();

const { public: { siteUrl } } = useRuntimeConfig();

useSeoMeta({
  title: () => t('privacy.pageTitle'),
  description: () => t('privacy.description'),
  ogTitle: () => t('privacy.pageTitle'),
  ogDescription: () => t('privacy.description'),
  ogSiteName: () => t('brand.name'),
  ogUrl: () => siteUrl + localePath('/privacy'),
});

marked.setOptions({ breaks: true, gfm: true });

/**
 * 完整正文：zh / zh-TW / en 三种语言各一份；
 * 其余语言是法律文本，回退英文（页面顶部以 notice 说明）。
 */
const policies: Record<string, string> = { en: enPolicy, zh: zhPolicy, 'zh-TW': zhTwPolicy };
const markdown = computed(() => policies[locale.value] ?? enPolicy);
const html = computed(() => marked.parse(markdown.value));

const enPolicy = `**Last updated: November 11, 2026**

## 1. Overview

Qiuyun M3U8 Downloader ("we", "this site") is a fully client-side web tool hosted at **https://m3u8.qiuyun.dev**. All M3U8 parsing, segment downloading, decryption, and merging happen **entirely in your browser**. Your video links, video content, and downloaded files never pass through our servers — we do not operate any backend for user data.

## 2. What we do NOT collect

- The M3U8 links you enter or bring over from the userscript
- Video segments, decrypted content, or merged video files
- Cover images you download
- Any file or directory you select via the File System Access API
- Account information (the site has no user accounts)

## 3. Analytics and advertising

**Analytics — Umami (cookie-free).** We self-host **Umami** at https://umami.qiuyun.dev to understand aggregate traffic. Umami sets **no cookies** and does not track you across sites, so it needs no consent prompt.

**Advertising — Google AdSense.** Advertising scripts are loaded **only after you accept** the cookie banner.

| Service | Provider | Data involved | Loaded |
|---|---|---|---|
| Umami (analytics) | Self-hosted by us | Page views, referrer, device/browser type, approximate country. No cookies. | Always |
| Google AdSense (ads) | Google Ireland Ltd. | Advertising cookies, ad impressions/clicks, device info, approximate location | Only after consent |

- If you click **Decline**, **no advertising script is loaded and no advertising cookie is set**; Umami keeps running because it uses no cookies.
- You can withdraw consent at any time by clearing this site's data in your browser settings; the banner will reappear.
- Google advertising privacy policy: https://policies.google.com/technologies/ads

## 4. Cookies and localStorage

This site stores the following data **in your browser only**:

| Name | Type | Purpose |
|---|---|---|
| \`qiuyun-cookie-consent\` | localStorage | Remembers your cookie consent choice |
| \`theme\` | localStorage | Remembers your light/dark theme preference |
| Advertising cookies | Cookie | Set by Google AdSense, **only after consent** |

Umami sets no cookies at all. Advertising cookies are written only when you accept the banner.

## 5. Legal basis and your rights (EEA / UK)

For visitors from the European Economic Area and the United Kingdom: Umami sets no cookies and no personal identifiers, so it is not subject to cookie consent. Loading **advertising cookies** relies on your **consent** (GDPR Art. 6(1)(a) and the ePrivacy Directive). You may:

- **Withhold or withdraw consent** at any time via the consent banner or by clearing site data;
- **Object to advertising** by declining — ads remain disabled;
- **Ask us** any privacy question via the contact link in section 9 (we have no user database of our own).

## 6. Tampermonkey userscript

The companion userscript runs locally in your browser. When you download through it, it may use \`GM_xmlhttpRequest\` to fetch cross-origin resources directly from the video CDN on your behalf — these requests go **from your browser to the CDN**, never through us. The script stores detected links and settings in your browser's userscript storage only.

## 7. Children's privacy

This site is not directed to children under 13 (or under 16 in the EEA), and we do not knowingly collect personal data from them.

## 8. Changes to this policy

We may update this policy from time to time. The "Last updated" date at the top reflects the current version. Material changes will be announced on this page.

## 9. Contact

Questions about this policy? Open an issue at [github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues](https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues)
`;

const zhPolicy = `**更新日期：2026 年 11 月 11 日**

## 1. 概述

秋云 M3U8 下载器（"我们"、"本站"）是托管于 **https://m3u8.qiuyun.dev** 的纯前端网页工具。M3U8 解析、分片下载、解密与合并**全部在你的浏览器中完成**。你输入的视频链接、视频内容与下载得到的文件**不会经过我们的服务器**——本站没有任何用于存储用户数据的服务端。

## 2. 我们不收集的信息

- 你输入或由油猴脚本带入的 M3U8 链接
- 视频分片、解密后的内容或合并得到的视频文件
- 你下载的封面图片
- 你通过 File System Access API 选择的任何文件或目录
- 账号信息（本站没有用户账号体系）

## 3. 流量统计与广告

**流量统计 —— Umami（无 Cookie）。** 本站自托管 **Umami**（https://umami.qiuyun.dev）用于了解整体访问量。Umami **不写入任何 Cookie**，也不跨站追踪，因此无需同意即可加载。

**广告 —— Google AdSense。** 广告脚本**仅在你于 Cookie 横幅中点击同意后**才加载。

| 服务 | 提供方 | 涉及的数据 | 加载时机 |
|---|---|---|---|
| Umami（统计） | 本站自托管 | 页面浏览、来源、设备/浏览器类型、大致国家。不使用 Cookie。 | 始终加载 |
| Google AdSense（广告） | Google Ireland Ltd. | 广告 Cookie、展示/点击、设备信息、大致位置 | 仅同意后加载 |

- 如果你点击**拒绝**，**广告脚本不会被加载，也不会写入广告 Cookie**；Umami 因不使用 Cookie 继续运行。
- 你可以随时通过清除浏览器中本站数据的方式撤回同意，横幅会重新出现。
- Google 广告隐私政策：https://policies.google.com/technologies/ads

## 4. Cookie 与 localStorage

本站仅在你的浏览器本地存储以下数据：

| 名称 | 类型 | 用途 |
|---|---|---|
| \`qiuyun-cookie-consent\` | localStorage | 记住你的 Cookie 同意选择 |
| \`theme\` | localStorage | 记住亮色/暗色主题偏好 |
| 广告 Cookie | Cookie | 由 Google AdSense 写入，**仅在同意后** |

Umami 不写入任何 Cookie；广告 Cookie 仅在你同意横幅后才会写入。

## 5. 法律依据与你的权利（欧洲经济区 / 英国）

对于来自欧洲经济区（EEA）和英国的访客：Umami 不写入 Cookie、不存储可识别个人的信息，因此不属于 Cookie 同意范围；加载**广告 Cookie**的法律依据是你的**同意**（GDPR 第 6(1)(a) 条及 ePrivacy 指令）。你可以：

- 随时通过同意横幅或清除站点数据**拒绝或撤回同意**；
- 点击拒绝来**反对广告处理**——广告将保持关闭；
- 通过第 9 节的联系方式**向我们**提出任何隐私问题（本站自身没有用户数据库）。

## 6. 油猴脚本

配套的油猴脚本在你的浏览器本地运行。通过它下载时，脚本可能使用 \`GM_xmlhttpRequest\` 代你直接向视频 CDN 发起跨域请求——这些请求**从你的浏览器直达 CDN**，不经过本站。脚本检测到的链接与设置仅保存在你浏览器的脚本存储中。

## 7. 儿童隐私

本站不面向 13 周岁以下（欧洲经济区为 16 周岁以下）的儿童，我们不会有意收集其个人数据。

## 8. 政策变更

我们可能不时更新本政策，顶部"更新日期"反映当前版本。重大变更将在本页面公布。

## 9. 联系我们

对本政策有疑问？请在 [github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues](https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues) 提交 Issue
`;

const zhTwPolicy = `**更新日期：2026 年 11 月 11 日**

## 1. 概述

秋雲 M3U8 下載器（"我們"、"本站"）是託管於 **https://m3u8.qiuyun.dev** 的純前端網頁工具。M3U8 解析、分片下載、解密與合併**全部在你的瀏覽器中完成**。你輸入的影片連結、影片內容與下載得到的檔案**不會經過我們的伺服器**——本站沒有任何用於儲存使用者資料的伺服端。

## 2. 我們不收集的資訊

- 你輸入或由油猴腳本帶入的 M3U8 連結
- 影片分片、解密後的內容或合併得到的影片檔案
- 你下載的封面圖片
- 你透過 File System Access API 選擇的任何檔案或目錄
- 帳號資訊（本站沒有使用者帳號體系）

## 3. 流量統計與廣告

**流量統計 —— Umami（無 Cookie）。** 本站自架 **Umami**（https://umami.qiuyun.dev）用於了解整體訪問量。Umami **不寫入任何 Cookie**，也不跨站追蹤，因此無需同意即可載入。

**廣告 —— Google AdSense。** 廣告腳本**僅在你於 Cookie 橫幅中點擊同意後**才載入。

| 服務 | 提供方 | 涉及的資料 | 載入時機 |
|---|---|---|---|
| Umami（統計） | 本站自架 | 頁面瀏覽、來源、裝置/瀏覽器類型、大致國家。不使用 Cookie。 | 始終載入 |
| Google AdSense（廣告） | Google Ireland Ltd. | 廣告 Cookie、曝光/點擊、裝置資訊、大致位置 | 僅同意後載入 |

- 如果你點擊**拒絕**，**廣告腳本不會被載入，也不會寫入廣告 Cookie**；Umami 因不使用 Cookie 繼續運作。
- 你可以隨時透過清除瀏覽器中本站資料的方式撤回同意，橫幅會重新出現。
- Google 廣告隱私權政策：https://policies.google.com/technologies/ads

## 4. Cookie 與 localStorage

本站僅在你的瀏覽器本機儲存以下資料：

| 名稱 | 類型 | 用途 |
|---|---|---|
| \`qiuyun-cookie-consent\` | localStorage | 記住你的 Cookie 同意選擇 |
| \`theme\` | localStorage | 記住亮色/暗色主題偏好 |
| 廣告 Cookie | Cookie | 由 Google AdSense 寫入，**僅在同意後** |

Umami 不寫入任何 Cookie；廣告 Cookie 僅在你同意橫幅後才會寫入。

## 5. 法律依據與你的權利（歐洲經濟區 / 英國）

對於來自歐洲經濟區（EEA）和英國的訪客：Umami 不寫入 Cookie、不儲存可識別個人的資訊，因此不屬於 Cookie 同意範圍；載入**廣告 Cookie**的法律依據是你的**同意**（GDPR 第 6(1)(a) 條及 ePrivacy 指令）。你可以：

- 隨時透過同意橫幅或清除站點資料**拒絕或撤回同意**；
- 點擊拒絕來**反對廣告處理**——廣告將保持關閉；
- 透過第 9 節的聯絡方式**向我們**提出任何隱私問題（本站自身沒有使用者資料庫）。

## 6. 油猴腳本

配套的油猴腳本在你的瀏覽器本機執行。透過它下載時，腳本可能使用 \`GM_xmlhttpRequest\` 代你直接向影片 CDN 發起跨域請求——這些請求**從你的瀏覽器直達 CDN**，不經過本站。腳本偵測到的連結與設定僅保存在你瀏覽器的腳本儲存中。

## 7. 兒童隱私

本站不面向 13 歲以下（歐洲經濟區為 16 歲以下）的兒童，我們不會有意收集其個人資料。

## 8. 政策變更

我們可能不時更新本政策，頂部「更新日期」反映目前版本。重大變更將在本頁面公布。

## 9. 聯絡我們

對本政策有疑問？請在 [github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues](https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues) 提交 Issue
`;
</script>
