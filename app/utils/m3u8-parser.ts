import type { M3U8Playlist, M3U8Segment } from '~/types';

export function parseM3U8(content: string, baseUrl: string): M3U8Playlist {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (!lines[0]?.includes('#EXTM3U')) {
    throw new Error('Invalid M3U8 file: missing #EXTM3U header');
  }

  const playlist: M3U8Playlist = {
    segments: [],
  };

  let currentSegment: Partial<M3U8Segment> = {};
  let encryption: M3U8Playlist['encryption'];
  let mediaSequence = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.startsWith('#EXT-X-VERSION:')) {
      const versionStr = line.split(':')[1];
      if (versionStr) playlist.version = parseInt(versionStr);
    } else if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      const durationStr = line.split(':')[1];
      if (durationStr) playlist.targetDuration = parseInt(durationStr);
    } else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      const sequenceStr = line.split(':')[1];
      if (sequenceStr) {
        playlist.mediaSequence = parseInt(sequenceStr);
        mediaSequence = parseInt(sequenceStr);
      }
    } else if (line.startsWith('#EXT-X-PLAYLIST-TYPE:')) {
      const typeStr = line.split(':')[1];
      if (typeStr) playlist.playlistType = typeStr as 'VOD' | 'EVENT';
    } else if (line.startsWith('#EXT-X-KEY:')) {
      const keyAttrs = parseAttributes(line.substring('#EXT-X-KEY:'.length));
      if (keyAttrs.METHOD === 'NONE') {
        encryption = undefined;
      } else {
        encryption = {
          method: keyAttrs.METHOD as 'AES-128',
          uri: keyAttrs.URI ? resolveUrl(keyAttrs.URI, baseUrl) : undefined,
          iv: keyAttrs.IV,
        };
      }
      // #EXT-X-KEY 作用于后续所有分片，直到下一个 #EXT-X-KEY
    } else if (line.startsWith('#EXT-X-MAP:')) {
      // fMP4 初始化片段 — 必须拼接在所有媒体片段之前
      const mapAttrs = parseAttributes(line.substring('#EXT-X-MAP:'.length));
      if (mapAttrs.URI) {
        playlist.initSegment = resolveUrl(mapAttrs.URI, baseUrl);
        console.log('[M3U8] 检测到 fMP4 init segment:', playlist.initSegment);
      }
    } else if (line.startsWith('#EXT-X-BYTERANGE:')) {
      // 暂不处理 BYTERANGE
    } else if (line.startsWith('#EXTINF:')) {
      const info = line.substring('#EXTINF:'.length);
      const commaIndex = info.indexOf(',');
      currentSegment.duration = parseFloat(info.substring(0, commaIndex));
      currentSegment.title = info.substring(commaIndex + 1) || undefined;
    } else if (!line.startsWith('#') && line) {
      currentSegment.url = resolveUrl(line, baseUrl);
      
      // 为每个分片附加当前有效的加密信息和 mediaSequence
      const segEncryption = encryption ? {
        ...encryption,
        // 如果没有显式 IV，使用 mediaSequence 作为大端序 16 字节 IV
        ivBuffer: encryption.iv 
          ? hexToBufferLE(encryption.iv.replace('0x', ''))
          : intToBigEndianBuffer(mediaSequence),
      } : undefined;
      
      playlist.segments.push({
        url: currentSegment.url,
        duration: currentSegment.duration || 0,
        title: currentSegment.title,
        encryption: segEncryption,
        sequenceNumber: mediaSequence,
      });
      currentSegment = {};
      mediaSequence++;
    }
  }

  return playlist;
}

// 将 media sequence number 转为 16 字节大端序 ArrayBuffer
function intToBigEndianBuffer(num: number): ArrayBuffer {
  const buf = new ArrayBuffer(16);
  const view = new DataView(buf);
  // 高 8 字节全零，低 8 字节写入 num (大端序)
  view.setBigUint64(8, BigInt(num), false); // false = big-endian
  return buf;
}

// 十六进制字符串转 ArrayBuffer (小端序兼容)
function hexToBufferLE(hex: string): ArrayBuffer {
  const cleanHex = hex.replace(/^0x/, '').padStart(32, '0');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16) || 0;
  }
  return bytes.buffer;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([A-Z-]+)="([^"]+)"/g;
  let match;
  
  while ((match = regex.exec(attrString)) !== null) {
    if (match[1] && match[2]) {
      attrs[match[1]] = match[2];
    }
  }
  
  return attrs;
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  const base = new URL(baseUrl);
  
  if (url.startsWith('/')) {
    return `${base.protocol}//${base.host}${url}`;
  }
  
  const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
  return `${base.protocol}//${base.host}${basePath}${url}`;
}

export function isMasterPlaylist(content: string): boolean {
  return content.includes('#EXT-X-STREAM-INF');
}

export function parseMasterPlaylist(content: string, baseUrl: string): Array<{
  url: string;
  bandwidth?: number;
  resolution?: string;
  codecs?: string;
}> {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const variants: Array<{
    url: string;
    bandwidth?: number;
    resolution?: string;
    codecs?: string;
  }> = [];
  
  let currentInfo: Partial<{
    bandwidth: number;
    resolution: string;
    codecs: string;
  }> = {};

  for (const line of lines) {
    if (!line) continue;
    
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-STREAM-INF:'.length));
      currentInfo = {
        bandwidth: attrs.BANDWIDTH ? parseInt(attrs.BANDWIDTH) : undefined,
        resolution: attrs.RESOLUTION,
        codecs: attrs.CODECS,
      };
    } else if (!line.startsWith('#') && line) {
      variants.push({
        url: resolveUrl(line, baseUrl),
        ...currentInfo,
      });
      currentInfo = {};
    }
  }

  return variants;
}
