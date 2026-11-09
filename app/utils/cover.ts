/**
 * 封面图处理工具
 * 说明：下载器页面的 fetch 已被油猴脚本代理为 GM_xmlhttpRequest，
 * 因此跨域 / 防盗链图片也能正常抓取（只读不落地）。
 *
 * 不使用 response.blob()，而是取 arrayBuffer 后按文件头嗅探真实格式，
 * 避免伪 Response 实现差异或 content-type 不准确导致封面下载失败。
 */

export interface CoverResult {
  blob: Blob;
  /** 文件扩展名，如 jpg / png / webp / gif */
  ext: string;
}

/** 封面抓取超时（跨域抓图挂起时不能无限等待） */
const COVER_TIMEOUT = 15000;

/** 抓取封面并压缩为 jpeg；失败返回 null */
export async function fetchCoverBlob(url: string): Promise<CoverResult | null> {
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_TIMEOUT);

  try {
    console.log('[M3U8] 开始获取封面:', url);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn(`[M3U8] 封面请求失败: HTTP ${response.status}`, url);
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      console.warn('[M3U8] 封面内容为空:', url);
      return null;
    }

    const type = sniffImageType(buffer);
    if (!type) {
      console.warn('[M3U8] 封面不是有效图片（可能被防盗链拦截）:', url);
      return null;
    }

    const raw = new Blob([buffer], { type: type.mime });
    if (!type.compressible) {
      console.log(`[M3U8] 封面获取成功: ${type.ext}, ${raw.size} bytes`);
      return { blob: raw, ext: type.ext };
    }

    const compressed = await compressImage(raw);
    // 压缩失败时 compressImage 会原样返回 raw
    if (compressed === raw) {
      return { blob: raw, ext: type.ext };
    }

    console.log(`[M3U8] 封面已压缩为 jpeg: ${compressed.size} bytes`);
    return { blob: compressed, ext: 'jpg' };
  } catch (error) {
    console.warn('[M3U8] 封面下载失败:', url, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface ImageType {
  ext: string;
  mime: string;
  /** 是否可以用 canvas 重新编码为 jpeg */
  compressible: boolean;
}

/** 根据文件头识别图片格式 */
function sniffImageType(buffer: ArrayBuffer): ImageType | null {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  if (len < 12) return null;

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg', compressible: true };
  }
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: 'png', mime: 'image/png', compressible: true };
  }
  // GIF: GIF8
  if (ascii(0, 4) === 'GIF8') {
    return { ext: 'gif', mime: 'image/gif', compressible: false };
  }
  // WebP: RIFF....WEBP
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp', compressible: true };
  }
  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return { ext: 'bmp', mime: 'image/bmp', compressible: false };
  }
  // AVIF / HEIC: ftyp 品牌
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12).toLowerCase();
    if (brand === 'avif' || brand === 'avis') {
      return { ext: 'avif', mime: 'image/avif', compressible: false };
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'mif1') {
      return { ext: 'heic', mime: 'image/heic', compressible: false };
    }
  }

  return null;
}

/** 压缩图片（宽 > maxWidth 时等比缩放），并统一输出 jpeg */
async function compressImage(blob: Blob, maxWidth = 1280): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const width = Math.min(bitmap.width, maxWidth);
    const height = Math.round(bitmap.height * (width / bitmap.width));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });

    return compressed || blob;
  } catch (error) {
    // 动图 / 特殊格式无法解码时，原样保存
    console.warn('[M3U8] 封面压缩失败，使用原图:', error);
    return blob;
  }
}

/** 触发浏览器下载图片 */
export function saveImageBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  console.log(`[M3U8] 封面已下载: ${filename}`);
}
