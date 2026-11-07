# 秋云 M3U8 下载器

[**English**](README.md) · [**简体中文**](README.zh-CN.md)

> **GitHub**：[qiuqyCN/qiuyun-m3u8-downloader-nuxt](https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt)

一个 M3U8（HLS）视频下载工具，由两部分组成：

- **Web 下载器**（本仓库）：Nuxt 4 单页应用，负责解析播放列表、并发下载分片、AES-128 解密、fMP4 初始化段处理、合并输出，支持流式写盘与封面下载。
- **油猴脚本**（`qiuyun-m3u8-detector.user.js`）：在视频页自动检测 M3U8，悬浮按钮展示码率列表，一键跳转下载器；同时为下载器页面提供跨域请求代理（`GM_xmlhttpRequest`），绕过防盗链与 CORS。

## 功能特性

- 自动检测网页中的 M3U8（含 Master Playlist 多码率选择）
- 分片并发下载，进度实时刷新，支持自定义并发数 / 重试次数 / 起始分片
- AES-128-CBC 解密（无显式 IV 时按规范使用媒体序列号）
- 自动识别 TS / fMP4 输出格式（`.ts` / `.mp4`）
- 两种保存模式：
  - **流式下载**：File System Access API 边下边写盘，内存占用恒定，支持选择保存目录（Chrome/Edge）
  - **内存合并**：浏览器直接下载，兼容所有现代浏览器
- 同时下载视频封面（绝对地址转换、格式嗅探、压缩保存）
- 亮色 / 暗色 / 跟随系统主题

## 目录结构

```
qiuyun-m3u8-downloader-nuxt/
├── app/                           # 页面、composables、工具函数
├── docker/                        # Docker 部署配置（见下文 Docker 部署）
├── qiuyun-m3u8-detector.user.js   # 油猴脚本（GreasyFork 已发布）
├── package.json
└── README.md
```

## 油猴脚本安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
2. 从 [GreasyFork](https://update.greasyfork.org/scripts/603547/%E7%A7%8B%E4%BA%91%20M3U8%20%E4%B8%8B%E8%BD%BD%E5%8A%A9%E6%89%8B.user.js) 一键安装（推荐，可自动更新），或新建脚本将 `qiuyun-m3u8-detector.user.js` 全文粘贴保存。
3. 脚本中下载器地址由常量控制，按需修改：

```js
const DOWNLOADER_ORIGIN = "https://m3u8.qiuyun.dev";
const DOWNLOADER_HOSTS = ["m3u8.qiuyun.dev", "localhost:3000", "127.0.0.1:3000"];
```

只有在 `DOWNLOADER_HOSTS` 列出的域名/端口下，脚本才会注入跨域代理；本地开发请固定使用 3000 端口。

## 本地开发

```bash
cd qiuyun-m3u8-downloader-nuxt
npm ci
npm run dev
```

访问 http://localhost:3000 。

---

## 部署方式一：非 Docker（静态托管）

构建产物是纯静态站点，任意静态服务器（nginx、Caddy、OSS、宝塔）均可托管。

### 1. 构建

```bash
cd qiuyun-m3u8-downloader-nuxt
npm ci
npm run generate        # 产物输出到 .output/public
```

### 2. 上传

将 `.output/public` 目录内**全部文件**上传到服务器，例如 `/var/www/m3u8.qiuyun.dev`：

```bash
scp -r .output/public/* user@server:/var/www/m3u8.qiuyun.dev/
```

Windows 下也可以用仓库根目录 `dist/` 里打好的 zip 包，但该包为历史归档，部署前请以最新 `npm run generate` 产物为准。

### 3. Nginx 配置

```nginx
server {
    listen 80;
    server_name m3u8.qiuyun.dev;

    root /var/www/m3u8.qiuyun.dev;
    index index.html;

    # 目录补斜杠时用相对跳转，避免把内部端口/协议写进 Location
    # （否则经端口映射或 CDN 终止 SSL 时会跳到错误地址）
    absolute_redirect off;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1k;

    # 带内容哈希的构建产物，可永久缓存
    location /_nuxt/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 兜底
    location / {
        try_files $uri $uri.html $uri/ /200.html;
    }

    error_page 404 /404.html;
}
```

---

## 使用说明

1. 打开含 M3U8 的视频页，脚本悬浮按钮（右侧）显示检测到的视频数量。
2. 点击按钮展开列表，多码率时可「选择源」切换清晰度。
3. 点击 **下载(Download)** 跳转下载器，自动带入 `url`、`referer`、`title`、`cover` 参数。
4. 在下载器中填写文件名称（必填），按需调整并发数、起始分片、封面与流式开关，点击开始下载。
5. 流式模式会先弹出目录选择框，之后分片边下边写入所选目录；封面保存为同名图片文件。

也可以直接在下载器手动粘贴 M3U8 链接使用（跨域站点需脚本代理，请从视频页跳转进入）。

## 常见问题

| 问题 | 原因与解决 |
|---|---|
| 点下载跳转后提示脚本未安装 | 脚本未启用或域名不在 `DOWNLOADER_HOSTS`，检查 Tampermonkey 与脚本常量 |
| 分片 403 / 封面下载失败 | 跨域或防盗链。确认是从视频页跳转进入（地址栏带 `referer` 参数），代理才会携带正确请求头 |
| 下载按钮一直不可用 | 上一个任务未结束。删除下载中的任务会自动中断并复位 |
| Firefox/Safari 无目录选择 | 浏览器不支持 File System Access API，自动回退为内存合并下载 |

## 技术栈

Nuxt 4 · Vue 3 · TailwindCSS v4 · TypeScript · Web Crypto API · File System Access API · Tampermonkey（GM_xmlhttpRequest / Shadow DOM）
