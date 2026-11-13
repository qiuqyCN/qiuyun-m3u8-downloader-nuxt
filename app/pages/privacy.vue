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

const SITE_URL = 'https://m3u8.qiuyun.dev';

useSeoMeta({
  title: () => t('privacy.pageTitle'),
  description: () => t('privacy.description'),
  ogTitle: () => t('privacy.pageTitle'),
  ogDescription: () => t('privacy.description'),
  ogSiteName: () => t('brand.name'),
  ogUrl: () => SITE_URL + localePath('/privacy'),
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

## 3. Analytics (loaded only with your consent)

With your consent, we use two third-party analytics services to understand aggregate traffic and improve the site:

| Service | Provider | Data involved |
|---|---|---|
| Google Analytics 4 | Google Ireland Ltd. | Analytics cookies (e.g. \`_ga\`), page views, device/browser info, IP (truncated by Google) |
| Baidu Analytics | Baidu, Inc. | Analytics cookies, page views, device/browser info |

- If you click **Decline** in the consent banner, **no analytics script is loaded and no analytics cookie is set**.
- You can withdraw consent at any time by clearing this site's data in your browser settings. The banner will reappear, and analytics stay unloaded until you accept again.
- Google Analytics privacy policy: https://support.google.com/analytics/answer/6004245
- Baidu Analytics privacy policy: https://tongji.baidu.com/web/help/article?id=330&type=0

## 4. Cookies and localStorage

This site stores the following data **in your browser only**:

| Name | Type | Purpose |
|---|---|---|
| \`qiuyun-cookie-consent\` | localStorage | Remembers your cookie consent choice |
| \`theme\` | localStorage | Remembers your light/dark theme preference |
| Analytics cookies (e.g. \`_ga\`) | Cookie | Set by the analytics providers listed in section 3, **only after consent** |

We do not use advertising cookies yet. If Google AdSense is enabled in the future, this policy will be updated accordingly before any advertising cookie is set.

## 5. Legal basis and your rights (EEA / UK)

For visitors from the European Economic Area and the United Kingdom, the legal basis for loading analytics is your **consent** (GDPR Art. 6(1)(a) in conjunction with the ePrivacy Directive). You may:

- **Withhold or withdraw consent** at any time via the consent banner or by clearing site data;
- **Access, rectify, or erase** analytics personal data by contacting the analytics providers listed in section 3 (we have no user database of our own);
- **Object to processing** by declining analytics.

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

## 3. 流量统计（仅在获得同意后加载）

在你同意后，我们使用以下两个第三方统计服务了解整体流量、改进站点：

| 服务 | 提供方 | 涉及的数据 |
|---|---|---|
| Google Analytics 4 | Google Ireland Ltd. | 统计 Cookie（如 \`_ga\`）、页面浏览、设备/浏览器信息、IP（Google 端截断） |
| 百度统计 | 百度 | 统计 Cookie、页面浏览、设备/浏览器信息 |

- 如果你在同意横幅中点击**拒绝**，**统计脚本不会被加载，也不会写入任何统计 Cookie**。
- 你可以随时通过清除浏览器中本站数据的方式撤回同意，横幅会重新出现，统计脚本在你再次同意前保持不加载。
- Google Analytics 隐私政策：https://support.google.com/analytics/answer/6004245
- 百度统计隐私政策：https://tongji.baidu.com/web/help/article?id=330&type=0

## 4. Cookie 与 localStorage

本站仅在你的浏览器本地存储以下数据：

| 名称 | 类型 | 用途 |
|---|---|---|
| \`qiuyun-cookie-consent\` | localStorage | 记住你的 Cookie 同意选择 |
| \`theme\` | localStorage | 记住亮色/暗色主题偏好 |
| 统计 Cookie（如 \`_ga\`） | Cookie | 由第 3 节所列统计服务写入，**仅在同意后** |

本站目前未使用广告 Cookie。未来如启用 Google AdSense，将在写入任何广告 Cookie 之前先更新本政策。

## 5. 法律依据与你的权利（欧洲经济区 / 英国）

对于来自欧洲经济区（EEA）和英国的访客，加载统计服务的法律依据是你的**同意**（GDPR 第 6(1)(a) 条及 ePrivacy 指令）。你可以：

- 随时通过同意横幅或清除站点数据**拒绝或撤回同意**；
- 通过联系第 3 节所列统计服务提供方，**访问、更正或删除**分析类个人数据（本站自身没有用户数据库）；
- 通过拒绝统计来**反对相关处理**。

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

## 3. 流量統計（僅在取得同意後載入）

在你同意後，我們使用以下兩個第三方統計服務了解整體流量、改進網站：

| 服務 | 提供方 | 涉及的資料 |
|---|---|---|
| Google Analytics 4 | Google Ireland Ltd. | 統計 Cookie（如 \`_ga\`）、頁面瀏覽、裝置/瀏覽器資訊、IP（Google 端截斷） |
| 百度統計 | 百度 | 統計 Cookie、頁面瀏覽、裝置/瀏覽器資訊 |

- 如果你在同意橫幅中點擊**拒絕**，**統計腳本不會被載入，也不會寫入任何統計 Cookie**。
- 你可以隨時透過清除瀏覽器中本站資料的方式撤回同意，橫幅會重新出現，統計腳本在你再次同意前保持不載入。
- Google Analytics 隱私權政策：https://support.google.com/analytics/answer/6004245
- 百度統計隱私權政策：https://tongji.baidu.com/web/help/article?id=330&type=0

## 4. Cookie 與 localStorage

本站僅在你的瀏覽器本機儲存以下資料：

| 名稱 | 類型 | 用途 |
|---|---|---|
| \`qiuyun-cookie-consent\` | localStorage | 記住你的 Cookie 同意選擇 |
| \`theme\` | localStorage | 記住亮色/暗色主題偏好 |
| 統計 Cookie（如 \`_ga\`） | Cookie | 由第 3 節所列統計服務寫入，**僅在同意後** |

本站目前未使用廣告 Cookie。未來如啟用 Google AdSense，將在寫入任何廣告 Cookie 之前先更新本政策。

## 5. 法律依據與你的權利（歐洲經濟區 / 英國）

對於來自歐洲經濟區（EEA）和英國的訪客，載入統計服務的法律依據是你的**同意**（GDPR 第 6(1)(a) 條及 ePrivacy 指令）。你可以：

- 隨時透過同意橫幅或清除站點資料**拒絕或撤回同意**；
- 透過聯絡第 3 節所列統計服務提供方，**存取、更正或刪除**分析類個人資料（本站自身沒有使用者資料庫）；
- 透過拒絕統計來**反對相關處理**。

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
