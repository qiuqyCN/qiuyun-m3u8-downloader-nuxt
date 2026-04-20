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

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.startsWith('#EXT-X-VERSION:')) {
      const versionStr = line.split(':')[1];
      if (versionStr) {
        playlist.version = parseInt(versionStr);
      }
    } else if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      const durationStr = line.split(':')[1];
      if (durationStr) {
        playlist.targetDuration = parseInt(durationStr);
      }
    } else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      const sequenceStr = line.split(':')[1];
      if (sequenceStr) {
        playlist.mediaSequence = parseInt(sequenceStr);
      }
    } else if (line.startsWith('#EXT-X-PLAYLIST-TYPE:')) {
      const typeStr = line.split(':')[1];
      if (typeStr) {
        playlist.playlistType = typeStr as 'VOD' | 'EVENT';
      }
    } else if (line.startsWith('#EXT-X-KEY:')) {
      const keyAttrs = parseAttributes(line.substring('#EXT-X-KEY:'.length));
      encryption = {
        method: keyAttrs.METHOD as 'AES-128' | 'NONE',
        uri: keyAttrs.URI ? resolveUrl(keyAttrs.URI, baseUrl) : undefined,
        iv: keyAttrs.IV,
      };
    } else if (line.startsWith('#EXTINF:')) {
      const info = line.substring('#EXTINF:'.length);
      const commaIndex = info.indexOf(',');
      currentSegment.duration = parseFloat(info.substring(0, commaIndex));
      currentSegment.title = info.substring(commaIndex + 1) || undefined;
    } else if (line.startsWith('#EXT-X-BYTERANGE:')) {
      // Handle byte range if needed
    } else if (!line.startsWith('#') && line) {
      currentSegment.url = resolveUrl(line, baseUrl);
      playlist.segments.push({
        url: currentSegment.url,
        duration: currentSegment.duration || 0,
        title: currentSegment.title,
      });
      currentSegment = {};
    }
  }

  if (encryption) {
    playlist.encryption = encryption;
  }

  return playlist;
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
