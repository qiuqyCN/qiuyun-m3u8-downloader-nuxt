# Qiuyun M3U8 Downloader

Web-based M3U8 (HLS) video downloader + Tampermonkey userscript: concurrent segment downloads, AES-128 decryption, fMP4 support, streaming save via File System Access API, and cross-origin proxy to bypass hotlink protection.

[**English**](README.md) · [**简体中文**](README.zh-CN.md)

> **GitHub**: [qiuqyCN/qiuyun-m3u8-downloader-nuxt](https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt)

An M3U8 (HLS) video downloader made of two parts:

- **Web downloader** (this repository): a Nuxt 4 single-page app that parses playlists, downloads segments concurrently, decrypts AES-128, handles fMP4 initialization segments, and merges the output. Supports streaming writes to disk and cover image downloads.
- **Tampermonkey userscript** (`qiuyun-m3u8-detector.user.js`): auto-detects M3U8 streams on video pages, shows a floating button with a bitrate list, and jumps to the downloader in one click. It also proxies cross-origin requests for the downloader page (`GM_xmlhttpRequest`) to bypass hotlink protection and CORS.

## Features

- Auto-detects M3U8 streams in web pages (including bitrate selection for Master Playlists)
- Concurrent segment downloads with live progress; configurable concurrency, retry count, and start segment
- AES-128-CBC decryption (falls back to the media sequence number per spec when no IV is declared)
- Automatically detects TS / fMP4 output (`.ts` / `.mp4`)
- Two saving modes:
  - **Streaming download**: the File System Access API writes to disk while downloading, keeping memory usage constant and letting you pick the save directory (Chrome/Edge)
  - **In-memory merge**: downloads directly in the browser and works in all modern browsers
- Downloads the video cover image as well (absolute URL resolution, format sniffing, compressed save)
- Light / dark / follow-system theme

## Project structure

```
qiuyun-m3u8-downloader-nuxt/
├── app/                           # Pages, composables, utilities
├── docker/                        # Docker deployment config (see "Docker deployment" below)
├── qiuyun-m3u8-detector.user.js   # Tampermonkey userscript (published on GreasyFork)
├── package.json
├── README.md
└── README.zh-CN.md
```

## Userscript installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension in your browser.
2. Install it in one click from [GreasyFork](https://update.greasyfork.org/scripts/603547/%E7%A7%8B%E4%BA%91%20M3U8%20%E4%B8%8B%E8%BD%BD%E5%8A%A9%E6%89%8B.user.js) (recommended, supports auto-update), or create a new script and paste the whole `qiuyun-m3u8-detector.user.js` content.
3. The downloader address is controlled by constants in the script; change them as needed:

```js
const DOWNLOADER_ORIGIN = "https://m3u8.qiuyun.dev";
const DOWNLOADER_HOSTS = ["m3u8.qiuyun.dev", "localhost:3000", "127.0.0.1:3000"];
```

The script only injects the cross-origin proxy for the domains/ports listed in `DOWNLOADER_HOSTS`. For local development, always use port 3000.

## Local development

```bash
cd qiuyun-m3u8-downloader-nuxt
npm ci
npm run dev
```

Then open http://localhost:3000 .

---

## Deployment option 1: non-Docker (static hosting)

The build output is a pure static site and can be hosted by any static server (nginx, Caddy, OSS, BaoTa, etc.).

### 1. Build

```bash
cd qiuyun-m3u8-downloader-nuxt
npm ci
npm run generate        # output goes to .output/public
```

### 2. Upload

Upload **all files** inside `.output/public` to your server, for example `/var/www/m3u8.qiuyun.dev`:

```bash
scp -r .output/public/* user@server:/var/www/m3u8.qiuyun.dev/
```

On Windows you can also use the zip package in the repository's `dist/` directory, but that package is a historical archive; always deploy the latest `npm run generate` output.

### 3. Nginx configuration

```nginx
server {
    listen 80;
    server_name m3u8.qiuyun.dev;

    root /var/www/m3u8.qiuyun.dev;
    index index.html;

    # Use relative redirects when appending the trailing slash so internal
    # ports/protocols never leak into the Location header (otherwise CDN
    # TLS termination or port mapping would redirect to a wrong address)
    absolute_redirect off;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1k;

    # Content-hashed build assets can be cached forever
    location /_nuxt/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri.html $uri/ /200.html;
    }

    error_page 404 /404.html;
}
```

---

## Usage

1. Open a video page that contains M3U8; the script's floating button (on the right) shows how many videos were detected.
2. Click the button to expand the list; when multiple bitrates exist, use "Select source" to switch quality.
3. Click **Download** to jump to the downloader, which automatically carries the `url`, `referer`, `title`, and `cover` parameters.
4. Enter a file name (required) in the downloader, adjust concurrency, start segment, cover, and streaming options as needed, then click start download.
5. Streaming mode opens a directory picker first; segments are then written to the chosen directory while downloading, and the cover is saved as an image file with the same name.

You can also paste an M3U8 link manually in the downloader. Cross-origin sites still need the script proxy, so enter via the video page.

## FAQ

| Issue | Cause and solution |
|---|---|
| "Script not installed" after jumping from a download click | The script is disabled or the domain is not in `DOWNLOADER_HOSTS`; check Tampermonkey and the script constants |
| Segment 403 / cover download fails | Cross-origin or hotlink protection. Make sure you entered from the video page (the address bar carries a `referer` parameter); only then does the proxy send the correct headers |
| The download button stays disabled | A previous task has not finished. Deleting a running task aborts it and resets the state |
| No directory picker in Firefox/Safari | The browser does not support the File System Access API, so it automatically falls back to in-memory merge download |

## Tech stack

Nuxt 4 · Vue 3 · TailwindCSS v4 · TypeScript · Web Crypto API · File System Access API · Tampermonkey (GM_xmlhttpRequest / Shadow DOM)
