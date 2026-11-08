// ==UserScript==
// @name         秋云 M3U8 下载助手
// @namespace    https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt
// @version      1.0.7
// @description  自动检测网页 M3U8 视频并提供下载功能，配合秋云 M3U8 下载器使用
// @author       Qiuyun
// @match        *://*/*
// @grant        unsafeWindow
// @grant        GM_openInTab
// @grant        GM.getValue
// @grant        GM_getValue
// @grant        GM.setValue
// @grant        GM_setValue
// @grant        GM.deleteValue
// @grant        GM_deleteValue
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-start
// @supportURL   https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues
// @homepageURL  https://m3u8.qiuyun.dev
// @downloadURL https://update.greasyfork.org/scripts/603547/%E7%A7%8B%E4%BA%91%20M3U8%20%E4%B8%8B%E8%BD%BD%E5%8A%A9%E6%89%8B.user.js
// @updateURL https://update.greasyfork.org/scripts/603547/%E7%A7%8B%E4%BA%91%20M3U8%20%E4%B8%8B%E8%BD%BD%E5%8A%A9%E6%89%8B.meta.js
// @license MIT
// ==/UserScript==

(function () {
    'use strict';

    const mgmapi = {
        async getValue(name, defaultVal) {
            return await ((typeof GM_getValue === "function") ? GM_getValue : GM.getValue)(name, defaultVal);
        },
        async setValue(name, value) {
            return await ((typeof GM_setValue === "function") ? GM_setValue : GM.setValue)(name, value);
        },
        async deleteValue(name) {
            return await ((typeof GM_deleteValue === "function") ? GM_deleteValue : GM.deleteValue)(name);
        },
        openInTab(url, open_in_background = false) {
            return ((typeof GM_openInTab === "function") ? GM_openInTab : GM.openInTab)(url, open_in_background);
        },
        xmlHttpRequest(details) {
            return ((typeof GM_xmlhttpRequest === "function") ? GM_xmlhttpRequest : GM.xmlHttpRequest)(details);
        },
        copyText(text) {
            var copyFrom = document.createElement("textarea");
            copyFrom.textContent = text;
            document.body.appendChild(copyFrom);
            copyFrom.select();
            document.execCommand('copy');
            copyFrom.blur();
            document.body.removeChild(copyFrom);
        },
        message(text, disappearTime = 3000) {
            const id = "qiuyun-gm-message-panel";
            let p = document.querySelector(`#${id}`);
            if (!p) {
                p = document.createElement("div");
                p.id = id;
                p.style = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: end;
                    z-index: 999999999999999;
                `;
                (document.body || document.documentElement).appendChild(p);
            }
            let mdiv = document.createElement("div");
            mdiv.innerText = text;
            mdiv.style = `
                padding: 8px 16px;
                border-radius: 8px;
                background: black;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                margin-top: 10px;
                font-size: 14px;
                color: #fff;
                text-align: right;
            `;
            p.appendChild(mdiv);
            setTimeout(() => {
                if (p.contains(mdiv)) p.removeChild(mdiv);
            }, disappearTime);
        }
    };

    // 下载器地址（线上部署域名）
    const DOWNLOADER_ORIGIN = "https://m3u8.qiuyun.dev";
    // 识别是否为下载器页面（线上 + 本地开发）
    const DOWNLOADER_HOSTS = ["m3u8.qiuyun.dev", "localhost:3000", "127.0.0.1:3000"];
    const isDownloaderPage = DOWNLOADER_HOSTS.includes(location.host);

    // 根据浏览器语言返回下载器页面的 i18n 路径前缀（与站点 prefix_except_default 策略一致，未匹配语言回退英文）
    function getLocalePrefix() {
        const lang = (navigator.language || "").toLowerCase();
        if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk") || lang.startsWith("zh-mo") || lang.includes("hant")) return "/zh-TW";
        if (lang.startsWith("zh")) return "";
        const map = { en: "/en", es: "/es", pt: "/pt", ru: "/ru", id: "/id", vi: "/vi", ja: "/ja", ko: "/ko", de: "/de", fr: "/fr", tr: "/tr", it: "/it", pl: "/pl", th: "/th" };
        return map[lang.split("-")[0]] ?? "/en";
    }

    // 下载器页面：请求代理
    if (isDownloaderPage) {
        const _fetch = unsafeWindow.fetch;
        const refererUrl = new URLSearchParams(location.search).get("referer");
        
        unsafeWindow.fetch = async function (...args) {
            const url = args[0];
            
            // 如果是跨域请求，直接使用 GM_xmlhttpRequest
            if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
                console.log(`[秋云 M3U8] 代理请求：${url}`);
                
                return await new Promise((resolve, reject) => {
                    let headers = {
                        "Accept": "*/*",
                        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                        "User-Agent": navigator.userAgent,
                    };
                    
                    if (refererUrl) {
                        const referer = new URL(refererUrl);
                        headers["Origin"] = referer.origin;
                        headers["Referer"] = referer.href;
                    }
                    
                    const control = mgmapi.xmlHttpRequest({
                        method: "GET",
                        url: url,
                        responseType: 'arraybuffer',
                        headers: headers,
                        timeout: 60000,
                        onload(r) {
                            console.log(`[秋云 M3U8] 代理响应：${r.status}`);
                            // 解析 content-type，供 blob() 使用
                            const rawHeaders = r.responseHeaders || '';
                            const typeMatch = rawHeaders.match(/content-type:\s*([^\r\n]+)/i);
                            const contentType = typeMatch ? typeMatch[1].trim() : '';
                            const responseHeaders = new Headers();
                            if (contentType) responseHeaders.set('content-type', contentType);

                            resolve({
                                status: r.status,
                                statusText: r.statusText,
                                headers: responseHeaders,
                                ok: r.status >= 200 && r.status < 300,
                                async text() {
                                    const decoder = new TextDecoder('utf-8');
                                    return decoder.decode(r.response);
                                },
                                async arrayBuffer() {
                                    return r.response;
                                },
                                async blob() {
                                    return new Blob([r.response], { type: contentType });
                                },
                                async json() {
                                    const text = await this.text();
                                    return JSON.parse(text);
                                }
                            });
                        },
                        onerror(err) {
                            console.error(`[秋云 M3U8] 代理失败：`, err);
                            reject(new Error('Network error'));
                        },
                        ontimeout() {
                            reject(new Error('Timeout'));
                        }
                    });

                    // 支持调用方传入 AbortSignal（下载器页面的 60s 超时控制会经此生效）
                    const signal = args[1]?.signal;
                    if (signal) {
                        const abort = () => {
                            try { control?.abort?.(); } catch { /* 忽略 */ }
                            reject(new Error('Aborted'));
                        };
                        if (signal.aborted) abort();
                        else signal.addEventListener('abort', abort, { once: true });
                    }
                });
            }
            
            // 本地请求使用原 fetch
            return _fetch.apply(this, args);
        };
        
        console.log('[秋云 M3U8] 下载器页面 fetch 代理已启用');
    }

    // 暴露全局 API 供下载器页面检测
    unsafeWindow.QiuyunM3U8Helper = {
        version: '2.0.6',
        available: true,
        isProxyEnabled: isDownloaderPage,
        
        async fetchM3U8(url) {
            return await fetch(url).then(r => r.text());
        },
        
        async fetchSegment(url) {
            return await fetch(url).then(r => r.arrayBuffer());
        },
        
        async fetchKey(url) {
            return await fetch(url).then(r => r.arrayBuffer());
        },
        
        getPageInfo() {
            return {
                title: document.title,
                url: location.href,
                domain: location.hostname,
            };
        }
    };
    
    console.log('[秋云 M3U8] QiuyunM3U8Helper 已暴露');

    // iframe 信息交流 - 获取顶部标题
    window.addEventListener("message", async (e) => {
        if (e.data === "qiuyun-get-title") {
            let name = `qiuyun-title-${Date.now()}`;
            await mgmapi.setValue(name, document.title);
            e.source.postMessage(`qiuyun-title-name:${name}`, "*");
        }
    });

    // 获取页面封面图（poster > og:image > twitter:image > JSON-LD > image_src）
    function getPageCover() {
        let cover = null;
        try {
            const poster = document.querySelector('video[poster]')?.poster;
            const og = document.querySelector('meta[property="og:image"]')?.content;
            const tw = document.querySelector('meta[name="twitter:image"]')?.content;
            const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
                .map(s => {
                    try {
                        const d = JSON.parse(s.textContent);
                        const item = Array.isArray(d) ? d[0] : d;
                        return item?.thumbnailUrl;
                    } catch {
                        return null;
                    }
                })
                .find(Boolean);
            const imageSrc = document.querySelector('link[rel="image_src"]')?.href;

            cover = og || tw
                || poster 
                || (ld ? (typeof ld === 'string' ? ld : ld.url) : null)
                || imageSrc
                || null;
        } catch (e) {
            console.warn('[秋云 M3U8] 获取封面失败:', e);
        }

        if (!cover) return null;
        if (cover.startsWith('blob:')) return null; // blob: 地址离开页面即失效

        // 相对路径转绝对路径，否则下载器页面会把它解析成下载器域名
        try {
            cover = new URL(cover, location.href).href;
        } catch {
            return null;
        }

        // 只接受 http(s) / data:image
        if (!/^(https?:|data:image\/)/i.test(cover)) return null;

        console.log('[秋云 M3U8] 获取到封面:', cover);
        return cover;
    }

    function getTopTitle() {
        return new Promise(resolve => {
            window.addEventListener("message", async function l(e) {
                if (typeof e.data === "string") {
                    if (e.data.startsWith("qiuyun-title-name:")) {
                        let name = e.data.slice("qiuyun-title-name:".length);
                        await new Promise(r => setTimeout(r, 5));
                        resolve(await mgmapi.getValue(name));
                        mgmapi.deleteValue(name);
                        window.removeEventListener("message", l);
                    }
                }
            });
            window.top.postMessage("qiuyun-get-title", "*");
        });
    }

    // 请求检测
    {
        const _r_text = unsafeWindow.Response.prototype.text;
        unsafeWindow.Response.prototype.text = function () {
            return new Promise((resolve, reject) => {
                _r_text.call(this).then((text) => {
                    resolve(text);
                    if (checkContent(text)) doM3U({ url: this.url, content: text });
                }).catch(reject);
            });
        }

        const _open = unsafeWindow.XMLHttpRequest.prototype.open;
        unsafeWindow.XMLHttpRequest.prototype.open = function (...args) {
            this.addEventListener("load", () => {
                try {
                    let content = this.responseText;
                    if (checkContent(content)) doM3U({ url: args[1], content });
                } catch { }
            });
            return _open.apply(this, args);
        }

        function checkContent(content) {
            if (typeof content === 'string' && content.trim().startsWith("#EXTM3U")) {
                return true;
            }
        }

        // 检查纯视频
        setInterval(doVideos, 1000);
    }

    // UI 容器
    const rootDiv = document.createElement("div");
    rootDiv.style = `
        position: fixed;
        z-index: 9999999999999999;
        opacity: 0.95;
    `;
    rootDiv.style.display = "none";
    document.documentElement.appendChild(rootDiv);

    const shadowDOM = rootDiv.attachShadow({ mode: 'open' });
    const wrapper = document.createElement("div");
    shadowDOM.appendChild(wrapper);

    // 指示器（按钮）
    const bar = document.createElement("div");
    bar.style = `
        text-align: right;
    `;
    bar.innerHTML = `
        <button
            class="number-indicator"
            type="button"
            data-number="0"
            title="秋云 M3U8 下载助手"
        >
            <span class="qiuyun-wordmark">M<span class="qiuyun-accent">3U8</span></span>
            <span class="qiuyun-rule"></span>
        </button>
    `;

    wrapper.appendChild(bar);

    // 样式
    const style = document.createElement("style");
    style.innerHTML = `
        .number-indicator {
            position: relative;
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            width: 46px;
            height: 46px;
            margin: 0;
            padding: 0;
            border: 1px solid rgba(148, 163, 184, 0.28);
            border-radius: 14px;
            background: linear-gradient(160deg, #233247 0%, #101a2b 55%, #0a1220 100%);
            color: #f8fafc;
            cursor: grab;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.16),
                0 0 0 1px rgba(56, 189, 248, 0.16),
                0 8px 20px -6px rgba(2, 6, 23, 0.7);
            transition:
                transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.18s ease,
                border-color 0.18s ease;
        }
        .number-indicator:hover {
            transform: translateY(-1px) scale(1.05);
            border-color: rgba(56, 189, 248, 0.55);
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.22),
                0 0 0 1px rgba(56, 189, 248, 0.35),
                0 10px 24px -6px rgba(2, 6, 23, 0.75),
                0 0 18px rgba(56, 189, 248, 0.28);
        }
        .number-indicator:active {
            cursor: grabbing;
            transform: scale(0.94);
        }
        .number-indicator:focus-visible {
            outline: 2px solid rgba(56, 189, 248, 0.75);
            outline-offset: 2px;
        }
        .qiuyun-wordmark {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.4px;
            line-height: 1;
            pointer-events: none;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
        }
        .qiuyun-accent {
            color: #38bdf8;
        }
        .qiuyun-rule {
            width: 20px;
            height: 2px;
            border-radius: 2px;
            background: linear-gradient(90deg, rgba(56, 189, 248, 0), #38bdf8 50%, rgba(56, 189, 248, 0));
            opacity: 0.85;
            pointer-events: none;
        }
        .number-indicator::after {
            content: attr(data-number);
            position: absolute;
            top: -6px;
            right: -6px;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 999px;
            background: #ffffff;
            color: #0284c7;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            font-weight: 700;
            line-height: 1;
            pointer-events: none;
            box-shadow:
                0 2px 6px rgba(2, 6, 23, 0.35),
                0 0 0 1px rgba(56, 189, 248, 0.35);
        }
        .number-indicator[data-number="0"]::after {
            display: none;
        }
        .copy-link:active {
            color: #ccc;
        }
        .download-btn:hover {
            text-decoration: underline;
        }
        .download-btn:active {
            opacity: 0.9;
        }
        .m3u8-item {
            color: #e5e7eb;
            margin-bottom: 6px;
            display: flex;
            flex-direction: row;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            user-select: none;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        [data-shown="false"] {
            opacity: 0.8;
        }
        [data-shown="false"]:hover {
            opacity: 1;
        }
        [data-shown="false"] .m3u8-item {
            display: none;
        }
    `;
    wrapper.appendChild(style);

    const barBtn = bar.querySelector(".number-indicator");

    // 关于显隐和移动
    (async function () {
        let shown = await mgmapi.getValue("qiuyun_shown", true);
        wrapper.setAttribute("data-shown", shown);

        let x = await mgmapi.getValue("qiuyun_x", 20);
        let y = await mgmapi.getValue("qiuyun_y", 20);

        x = Math.min(innerWidth - 60, x);
        y = Math.min(innerHeight - 60, y);

        if (x < 0) x = 0;
        if (y < 0) y = 0;

        rootDiv.style.top = `${y}px`;
        rootDiv.style.right = `${x}px`;

        barBtn.addEventListener("mousedown", e => {
            let startX = e.pageX;
            let startY = e.pageY;
            let moved = false;

            let mousemove = e => {
                let offsetX = e.pageX - startX;
                let offsetY = e.pageY - startY;
                if (moved || (Math.abs(offsetX) + Math.abs(offsetY)) > 5) {
                    moved = true;
                    rootDiv.style.top = `${y + offsetY}px`;
                    rootDiv.style.right = `${x - offsetX}px`;
                }
            };

            let mouseup = e => {
                let offsetX = e.pageX - startX;
                let offsetY = e.pageY - startY;

                if (moved) {
                    x -= offsetX;
                    y += offsetY;
                    mgmapi.setValue("qiuyun_x", x);
                    mgmapi.setValue("qiuyun_y", y);
                } else {
                    shown = !shown;
                    mgmapi.setValue("qiuyun_shown", shown);
                    wrapper.setAttribute("data-shown", shown);
                }

                removeEventListener("mousemove", mousemove);
                removeEventListener("mouseup", mouseup);
            }

            addEventListener("mousemove", mousemove);
            addEventListener("mouseup", mouseup);
        });
    })();

    let count = 0;
    let shownUrls = [];

    function doVideos() {
        for (let v of Array.from(document.querySelectorAll("video"))) {
            if (v.duration && v.src && v.src.startsWith("http") && (!shownUrls.includes(v.src))) {
                const src = v.src;
                shownUrls.push(src);
                showVideo({
                    type: "video",
                    url: new URL(src),
                    duration: `${Math.ceil(v.duration * 10 / 60) / 10} mins`,
                    download() {
                        mgmapi.openInTab(src);
                    }
                });
            }
        }
    }

    async function doM3U({ url, content }) {
        url = new URL(url);
        if (shownUrls.includes(url.href)) return;

        // 解析 m3u
        try {
            content = content || await (await fetch(url)).text();
        } catch {
            return;
        }

        // 检查是否是 Master Playlist（多码率）
        const isMaster = content.includes('#EXT-X-STREAM-INF');
        
        if (isMaster) {
            // 解析 Master Playlist
            const playlists = parseMasterPlaylist(content, url);
            showMasterPlaylist({
                type: "m3u8",
                url,
                playlists,
            });
        } else {
            // 简单解析获取时长
            let duration = 0;
            const lines = content.split('\n');
            for (let line of lines) {
                if (line.startsWith('#EXTINF:')) {
                    const match = line.match(/#EXTINF:([\d.]+)/);
                    if (match) duration += parseFloat(match[1]);
                }
            }

            showVideo({
                type: "m3u8",
                url,
                duration: duration > 0 ? `${Math.ceil(duration * 10 / 60) / 10} mins` : "未知",
                async download() {
                    const title = await getTopTitle();
                    mgmapi.openInTab(
                        `${DOWNLOADER_ORIGIN}${getLocalePrefix()}?${new URLSearchParams({
                            url: url.href,
                            referer: location.href,
                            title: title || "",
                            cover: getPageCover() || ""
                        })}`
                    );
                }
            });
        }
    }

    // 解析 Master Playlist
    function parseMasterPlaylist(content, baseUrl) {
        const playlists = [];
        const lines = content.split('\n');
        let currentInfo = {};
        
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('#EXT-X-STREAM-INF:')) {
                // 解析属性
                const attrs = line.substring('#EXT-X-STREAM-INF:'.length);
                const bandwidthMatch = attrs.match(/BANDWIDTH=(\d+)/);
                const resolutionMatch = attrs.match(/RESOLUTION=(\d+x\d+)/);
                const nameMatch = attrs.match(/NAME="([^"]+)"/);
                
                currentInfo = {
                    bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0,
                    resolution: resolutionMatch ? resolutionMatch[1] : null,
                    name: nameMatch ? nameMatch[1] : null,
                };
            } else if (line && !line.startsWith('#') && currentInfo.bandwidth !== undefined) {
                // 这是 URL 行
                const resolvedUrl = new URL(line, baseUrl).href;
                
                // 从 URL 路径中提取分辨率（如 360p, 480p, 720p, 1080p）
                const urlPath = line;
                const resolutionFromPath = urlPath.match(/(\d{3,4})p/i);
                const resolutionLabel = resolutionFromPath ? resolutionFromPath[0] : 
                                       (currentInfo.resolution ? currentInfo.resolution.split('x')[1] + 'p' : null);
                
                playlists.push({
                    ...currentInfo,
                    url: resolvedUrl,
                    path: urlPath,
                    label: resolutionLabel || currentInfo.name || `${Math.round(currentInfo.bandwidth / 1000)}k`
                });
                currentInfo = {};
            }
        }
        
        // 按带宽排序（从高到低）
        return playlists.sort((a, b) => b.bandwidth - a.bandwidth);
    }

    // 显示 Master Playlist（多码率选择）
    function showMasterPlaylist({ type, url, playlists }) {
        let div = document.createElement("div");
        div.className = "m3u8-item";
        div.style.flexDirection = "column";
        div.style.alignItems = "flex-start";
        
        const selectId = `qiuyun-select-${Date.now()}`;
        
        div.innerHTML = `
            <div style="display: flex; width: 100%; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: bold; min-width: 45px;">${type}</span>
                <span
                    class="copy-link"
                    title="${url}"
                    style="
                        max-width: 120px;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        overflow: hidden;
                        margin-left: 10px;
                        cursor: pointer;
                        color: #40a9ff;
                    "
                >${url.pathname}</span>
                <span style="margin-left: 10px; flex-grow: 1; color: #888;">多(Multi)(${playlists.length})</span>
            </div>
            <div style="display: flex; width: 100%; gap: 8px;">
                <select id="${selectId}" style="
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 4px;
                    border: 1px solid #333;
                    background: #222;
                    color: white;
                    font-size: 13px;
                    cursor: pointer;
                ">
                    ${playlists.map((p, i) => `
                        <option value="${p.url}">${p.path}</option>
                    `).join('')}
                </select>
                <span
                class="download-btn"
                style="
                    padding: 6px 12px;
                    cursor: pointer;
                    color: #52c41a;
                    font-weight: 500;
                    white-space: nowrap;
            ">下载(Download)</span>
            </div>
        `;

        div.querySelector(".copy-link").addEventListener("click", () => {
            mgmapi.copyText(url.href);
            mgmapi.message("已复制链接", 2000);
        });

        div.querySelector(".download-btn").addEventListener("click", async () => {
            const select = div.querySelector(`#${selectId}`);
            const selectedUrl = select.value;
            const title = await getTopTitle();
            mgmapi.openInTab(
                `${DOWNLOADER_ORIGIN}${getLocalePrefix()}?${new URLSearchParams({
                    url: selectedUrl,
                    referer: location.href,
                    title: title || "",
                    cover: getPageCover() || ""
                })}`
            );
        });

        rootDiv.style.display = "block";
        count++;
        shownUrls.push(url.href);
        bar.querySelector(".number-indicator").setAttribute("data-number", count);
        wrapper.appendChild(div);
    }

    function showVideo({ type, url, duration, download }) {
        let div = document.createElement("div");
        div.className = "m3u8-item";
        div.innerHTML = `
            <span style="font-weight: bold; min-width: 45px;">${type}</span>
            <span
                class="copy-link"
                title="${url}"
                style="
                    max-width: 180px;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    overflow: hidden;
                    margin-left: 10px;
                    cursor: pointer;
                    color: #40a9ff;
                "
            >${url.pathname}</span>
            <span style="margin-left: 10px; flex-grow: 1; color: #888;">${duration}</span>
            <span
                class="download-btn"
                style="
                    margin-left: 10px;
                    cursor: pointer;
                    color: #52c41a;
                    font-weight: 500;
            ">下载(Download)</span>
        `;

        div.querySelector(".copy-link").addEventListener("click", () => {
            mgmapi.copyText(url.href);
            mgmapi.message("已复制链接", 2000);
        });

        div.querySelector(".download-btn").addEventListener("click", download);

        rootDiv.style.display = "block";
        count++;
        shownUrls.push(url.href);
        bar.querySelector(".number-indicator").setAttribute("data-number", count);
        wrapper.appendChild(div);
    }
})();
