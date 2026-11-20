# 部署指南

本文档面向接手本项目的买家，说明从修改配置到上线的完整流程。

项目是纯静态站点（Nuxt 4 SSG），构建产物为普通 HTML/CSS/JS，不需要 Node 常驻进程，也不需要数据库。

---

## 一、环境要求

| 项目 | 要求 |
| --- | --- |
| Node.js | 20 及以上，推荐 26（本项目在 Node 26 下构建验证通过） |
| 包管理器 | **npm**（仓库内置 `package-lock.json`，请勿混用 pnpm / yarn） |
| 构建内存 | 建议 4GB 以上可用内存，否则可能构建中断 |

```bash
node -v   # 确认版本
npm -v
```

---

## 二、部署前必须修改的配置

### 1. 站点域名（最重要）

打开 `nuxt.config.ts`，修改文件顶部的常量：

```ts
const siteUrl = 'https://m3u8-demo.qiuyun.dev'
```

改成你的正式域名，例如 `https://m3u8.example.com`。

这一处会同时影响 canonical、hreflang、sitemap、robots、og:url、结构化数据，以及页面通过 `useRuntimeConfig()` 读取的站点地址。**只需改这一处**，不要在其他文件里再写域名。

> 部署上线后如果 sitemap 里仍出现 `m3u8-demo.qiuyun.dev`，说明改完没有重新构建。

### 2. 统计代码（不需要就留空）

打开 `app/plugins/analytics.client.ts`：

```ts
const GA4_ID = ''
const BAIDU_ID = ''
```

- 两个都留空：不加载任何统计脚本，页面不会请求 Google / 百度。
- 填入自己的 ID 即可启用，脚本会在访客点击「同意」后才注入。

### 3. 油猴脚本中的站点地址

油猴脚本里有两处地址常量，必须改成与 `siteUrl` 一致：

```js
const DOWNLOADER_ORIGIN = "https://m3u8-demo.qiuyun.dev";
const DOWNLOADER_HOSTS = ["m3u8-demo.qiuyun.dev", "localhost:3000", "127.0.0.1:3000"];
```

脚本只有一份，位于 `public/m3u8-detector.user.js`。构建时会原样复制到站点根目录，访客可从 `/m3u8-detector.user.js` 直接下载安装。

直接编辑这个文件即可，不需要额外同步。脚本头部还有 `@author`、`@namespace`、`@homepageURL`、`@supportURL` 占位，按需替换成你的信息。

### 4. 隐私政策联系邮箱

`app/pages/privacy.vue` 中有 3 处 `contact@m3u8-demo.qiuyun.dev`（英文 / 简体 / 繁体各一处），替换成你的真实邮箱。

### 5. 站点图片

| 文件 | 说明 |
| --- | --- |
| `public/favicon.png` | 浏览器标签图标 |
| `public/og-image.jpg` | 社交分享预览图（建议 1200×630） |

请替换为你自己的品牌图片。

### 6. 可选：项目标识

修改 `package.json` 的 `name` 字段即可，不影响运行。

---

## 三、本地构建与验证

```bash
npm install
npm run dev        # 本地开发，默认 http://localhost:3000
```

开发确认无误后生成静态产物：

```bash
npm run generate
```

产物目录：**`.output/public`**

本地预览产物（模拟线上静态托管）：

```bash
npx serve .output/public
```

构建成功的标志：

```
[success] [nitro] Generated public .output/public
[info] [nitro] Prerendered 197 routes
```

> 中文为默认语言，URL 无前缀；其余 15 种语言带前缀，例如 `/en/docs`、`/ja/privacy`。

---

## 四、部署（Nginx）

构建产物 `.output/public` 是纯静态文件，整个目录上传到服务器即可，服务器上不需要安装 Node。

### 1. 上传文件

```bash
# 本地执行，把产物同步到服务器
scp -r .output/public/* user@your-server:/var/www/m3u8/
```

上传目录内的**全部文件**，包括 `_nuxt/`、`_payload.json`、`200.html`、`404.html`。`_payload.json` 是页面预渲染数据，缺失会导致页面空白。

### 2. Nginx 配置

把 `root` 改成实际上传目录，写入站点配置（例如 `/etc/nginx/conf.d/m3u8.conf`）：

```nginx
server {
    listen 80;
    server_name m3u8-demo.qiuyun.dev;

    root /var/www/m3u8;
    index index.html;

    absolute_redirect off;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1k;

    # 构建产物文件名带哈希，可长期缓存
    location /_nuxt/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # 关键：$uri.html 让 /docs 命中 docs.html
    location / {
        try_files $uri $uri.html $uri/ /200.html;
    }

    error_page 404 /404.html;
}
```

本项目使用 `autoSubfolderIndex: false`，产物是 `docs.html` 而不是 `docs/index.html`，因此 `try_files` 中的 `$uri.html` 不能省略。

如果 Nginx 以非 root 用户运行，确认 `root` 目录对该用户可读：

```bash
sudo chown -R www-data:www-data /var/www/m3u8
```

### 3. 校验并重载

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置 HTTPS

推荐使用宝桐部署，并建议用 Let's Encrypt 申请免费证书：

---

## 五、上线检查清单

| 检查项 | 预期结果 |
| --- | --- |
| `https://你的域名/` | 200，页面正常渲染 |
| `https://你的域名/docs` | 200，指南内容显示 |
| `https://你的域名/privacy` | 200，隐私政策显示 |
| `https://你的域名/en/docs` | 200，英文版本正常 |
| `https://你的域名/sitemap_index.xml` | 200，内容中的域名已是你的 |
| `https://你的域名/robots.txt` | 200，`Sitemap:` 指向你的域名 |
| `https://你的域名/m3u8-detector.user.js` | 200，可直接下载安装 |
| 页面源码的 `<link rel="canonical">` | 指向你的域名，无 `m3u8-demo.qiuyun.dev` |
| 页面源码的 `og:url` | 指向你的域名 |
| 浏览器控制台 | 无报错，无对旧统计 ID 的请求 |

SEO 建议：上线后到 Google Search Console 添加资源（选择「网址前缀」方式），提交 `https://你的域名/sitemap_index.xml`，并对首页请求编入索引。

---

## 六、常见问题

**构建时内存溢出 / 进程被杀**

```bash
# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run generate
```

```bash
# Linux / macOS
NODE_OPTIONS=--max-old-space-size=4096 npm run generate
```

同时关闭占用内存的浏览器标签和本地开发服务。

**访问 `/docs` 返回 301 或 403**

- 301 到 `/docs/`：说明部署的是旧产物（目录形式），重新构建并全量覆盖上传。
- `/docs/` 返回 403：目录存在但没有 `index.html` 时的正常表现，站内链接和 sitemap 都使用无斜杠地址，不影响正常访问。

**页面能打开但内容空白**

检查 `_payload.json` 是否上传完整。SPA 水合依赖这些文件，只传 HTML 会出现空白。

**修改了 `siteUrl` 但 sitemap 仍是旧域名**

`siteUrl` 在构建阶段生效，必须重新 `npm run generate` 并重新部署。

**多语言页面返回 404**

确认部署平台没有强制改写路径大小写。`zh-TW` 是大小写敏感的目录名。

**统计没有数据**

1. 确认已在 `analytics.client.ts` 填入 ID；
2. 统计脚本仅在访客点击 Cookie 横幅「同意」后加载；
3. 重新构建部署后生效。

---

## 七、可选：接入广告

项目隐私政策已包含第三方广告 Cookie 的披露条款。若计划接入 Google AdSense：

1. 用根域名在 AdSense 注册站点；
2. 审核通过后在页面中引入 `adsbygoogle.js`，并在广告位插入广告单元；
3. Google Funding Choices 会自动承接 EEA / 英国地区的同意弹窗，无需额外改代码；
4. 建议在站点根目录放置 `ads.txt`。

广告接入不属于本项目的默认功能，需自行申请账号并承担审核结果。

---

## 八、目录速查

```
m3u8-downloader-nuxt/
├── app/
│   ├── pages/            # 首页、play、docs、privacy、settings
│   ├── components/       # UI 组件（含 Cookie 同意横幅）
│   ├── composables/      # 下载逻辑、设置、油猴通信、同意状态
│   ├── plugins/          # analytics.client.ts（统计）
│   └── assets/docs/      # 指南文档（中英）
├── i18n/locales/         # 16 种语言文案
├── public/               # 静态资源、油猴脚本 m3u8-detector.user.js
├── docker/               # nginx.conf 等服务器配置参考
├── nuxt.config.ts        # 站点域名、SEO、i18n、sitemap 配置
└── DEPLOY.md             # 本文档
```
