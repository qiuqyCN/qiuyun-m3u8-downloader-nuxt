import type { AppSettings } from '~/types';

const STORAGE_KEY = 'qiuyun-settings';

export const defaultSettings: AppSettings = {
  defaultMaxConcurrentSegments: 15,
  defaultMaxRetries: 3,
  enableNotification: true,
};

/** 读取用户设置，缺失字段回落到默认值（兼容旧版本地存储） */
export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...defaultSettings };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

export function persistSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
