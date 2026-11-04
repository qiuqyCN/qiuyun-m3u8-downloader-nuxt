export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'parsing' | 'downloading' | 'paused' | 'merging' | 'completed' | 'error' | 'cancelled';
  progress: number;
  segments: {
    total: number;
    downloaded: number;
    failed: number[];
    startIndex: number;
  };
  speed: number;
  eta: number;
  error?: string;
  filename?: string;
  /** 封面图原始地址（来自视频页面元信息） */
  coverUrl?: string;
  /** 封面缩略图预览加载失败（不影响真正的封面下载） */
  coverPreviewFailed?: boolean;
  /** 是否已流式保存到用户所选目录 */
  savedToDirectory?: boolean;
  /** 流式保存的目录名称（用于"打开目录"） */
  dirName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DownloadOptions {
  inputType: 'url' | 'file';
  url: string;
  file?: File;
  maxConcurrentSegments: number;
  maxRetries: number;
  startSegmentIndex: number;
  convertToMp4: boolean;
  outputPath: string;
  filename?: string;
  /** 封面图地址 */
  coverUrl?: string;
  /** 是否同时下载封面 */
  downloadCover?: boolean;
  /** 流式下载的目标目录（File System Access API） */
  directoryHandle?: FileSystemDirectoryHandle;
}

export interface M3U8Segment {
  url: string;
  duration: number;
  title?: string;
  sequenceNumber?: number;
  encryption?: {
    method: 'AES-128';
    uri?: string;
    iv?: string;
    ivBuffer?: ArrayBuffer;
  };
}

export interface M3U8Playlist {
  version?: number;
  targetDuration?: number;
  mediaSequence?: number;
  playlistType?: 'VOD' | 'EVENT';
  /** fMP4 初始化片段 URL（#EXT-X-MAP） */
  initSegment?: string;
  segments: M3U8Segment[];
  encryption?: {
    method: 'AES-128' | 'NONE';
    uri?: string;
    iv?: string;
  };
}

export interface AppSettings {
  /** 默认同时下载片段数（首页并发输入框的初始值） */
  defaultMaxConcurrentSegments: number;
  /** 默认失败重试次数 */
  defaultMaxRetries: number;
  /** 下载完成/失败时发送系统通知 */
  enableNotification: boolean;
}
