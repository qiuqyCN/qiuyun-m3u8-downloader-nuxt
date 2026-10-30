/**
 * 流式保存工具（File System Access API）
 * 仅 Chromium 内核支持（Chrome / Edge），可直接写入用户选择的目录，内存占用恒定。
 */

export interface StreamWriter {
  filename: string;
  write(chunk: ArrayBuffer): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

/** 当前浏览器是否支持目录选择 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

/** 弹出目录选择框；用户取消或异常时返回 null */
export async function pickSaveDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  } catch (error) {
    console.warn('[M3U8] 未选择保存目录:', error);
    return null;
  }
}

/** 在指定目录创建文件并返回流式写入器 */
export async function createDirectoryWriter(
  dir: FileSystemDirectoryHandle,
  baseName: string,
  ext: string
): Promise<StreamWriter> {
  const filename = `${baseName}.${ext}`;
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();

  return {
    filename,
    write: (chunk) => writable.write(chunk),
    close: () => writable.close(),
    abort: () => writable.abort(),
  };
}

/** 把 Blob 直接写入指定目录（用于封面） */
export async function writeBlobToDirectory(
  dir: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<void> {
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}
