export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'parsing' | 'downloading' | 'paused' | 'merging' | 'completed' | 'error';
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
  downloadPath: string;
  maxConcurrentTasks: number;
  defaultMaxConcurrentSegments: number;
  defaultMaxRetries: number;
  autoStartDownload: boolean;
  proxy: {
    enabled: boolean;
    url: string;
  };
  timeout: number;
  defaultConvertToMp4: boolean;
  keepTempFiles: boolean;
  enableNotification: boolean;
  tampermonkey: {
    scriptUrl: string;
    installUrl: string;
    enabled: boolean;
  };
}
