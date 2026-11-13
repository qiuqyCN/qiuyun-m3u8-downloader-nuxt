# User Guide

This guide covers everything about using Qiuyun M3U8 Downloader: workflows, features, HLS format knowledge, and troubleshooting.

## Quick Start

### Option 1: Userscript (Recommended)

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension;
2. Install the [Qiuyun M3U8 Download Helper](https://update.greasyfork.org/scripts/603547/%E7%A7%8B%E4%BA%91%20M3U8%20%E4%B8%8B%E8%BD%BD%E5%8A%A9%E6%89%8B.user.js) userscript;
3. Open any page containing a video — a dark floating button appears on the right side, with the m3u8 link sniffed automatically;
4. Click the button, confirm the video title and cover, and jump straight to the download page with the link pre-filled;
5. Pick a save folder (optional) and hit "Start Download".

### Option 2: Paste the Link Manually

If you already have an m3u8 URL, just open the [download page](/) and paste it — no extension required.

## Features in Depth

### Download Modes: Streaming vs In-Memory

| Mode | How it works | Best for |
|---|---|---|
| Streaming (default) | Each segment is written to disk as soon as it arrives; memory usage stays constant | Large files, long videos, modest hardware |
| In-memory | All segments are buffered in memory, then merged at the end | Small files, when you'd rather not grant folder access |

Streaming uses the File System Access API to pick a save folder and requires a Chromium-based browser (Chrome / Edge). If you cancel the folder picker, the download stops — it never silently falls back to a browser download.

### Concurrency Control

The default of 6 concurrent segment requests matches the browser's per-host connection limit. Raising it only increases memory overhead, not speed. Lower it on unreliable networks to be gentler on the origin server.

### TS to MP4 Conversion

With "Convert to MP4" enabled, TS segments are losslessly remuxed into MP4:

- **No re-encoding** — no quality loss, speed is close to a plain download;
- H.264 / AAC streams only; unsupported codecs automatically fall back to saving the original TS;
- fMP4 streams are detected automatically: the init segment (`#EXT-X-MAP`) is downloaded and prepended so players can read duration and track info correctly.

### Encrypted Streams (AES-128)

Full support for `#EXT-X-KEY:METHOD=AES-128`:

- Keys are fetched and applied automatically;
- Both global keys and per-segment keys are handled;
- Explicit IVs and implicit IVs (derived from the segment sequence number) are both supported.

### Pause & Cancel

Each task can be paused anytime (in-flight requests finish, no new ones start) or cancelled (all in-flight requests abort immediately). Deleting a running task also stops its background download and resets the button state.

## HLS / M3U8 Format Basics

### What is m3u8?

An m3u8 file is the playlist used by HLS (HTTP Live Streaming). It is plain text listing the URLs and durations of video segments (typically 2–10 seconds each). Players download segments in order to enable progressive playback. Online courses, livestream replays, and many streaming platforms distribute video this way.

### Master Playlists & Multiple Qualities

If a playlist contains `#EXT-X-STREAM-INF` tags, it is a *master playlist* listing several variants (resolutions/bitrates). The downloader shows all variants with bandwidth and resolution info so you can pick one.

### TS vs fMP4

HLS segments come in two containers:

- **MPEG-TS** — the traditional container, maximum compatibility;
- **fMP4 (fragmented MP4)** — the modern container, smaller overhead, adopted by Netflix and others.

The downloader detects the format from the URL extension and file header bytes, applies the right container and MIME type, and handles fMP4 init segments correctly.

## Troubleshooting

### CORS / Cross-Origin Error

Browser security policy blocks reading responses from other origins. Fixes, in order of preference:

1. Install the userscript and sniff/download from within the video site itself (the script has cross-origin request permissions);
2. Check whether the m3u8 URL has expired — many CDN links expire within minutes, so refresh the page and grab a fresh one;
3. Try a different network — some links are IP- or region-restricted.

### Progress Stuck

Every request has a 60-second timeout with automatic retry. If overall progress stops moving for a long time, the origin server is usually rate-limiting or the link has expired. Pause and resume, or refresh the page for a fresh link.

### Downloaded Video Won't Play

- Open it with up-to-date Chrome/Edge or VLC;
- Make sure the task shows "Completed", not "Error" — this tool never merges incomplete files; failed segments abort the download with an explicit error;
- For fMP4 streams, use the latest version (older versions lacked `#EXT-X-MAP` support).

### Some Segments Fail

The downloader automatically adds up to 2 extra retry waves after the main queue finishes. If segments still fail, the task is marked as failed and lists the segment numbers — change your network or try again later rather than repeatedly restarting.

## Privacy & Safety

This is a fully client-side tool: m3u8 parsing, segment downloading, decryption, and merging all happen inside your browser. Video links and files never touch any server. See the [Privacy Policy](/privacy).

Only download content you are legally allowed to access, and respect the terms of service of the source website and local law.
