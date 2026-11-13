/**
 * Cookie 同意状态管理（GDPR / ePrivacy）
 *
 * 三态：null = 未选择（需显示横幅）| 'granted' = 同意 | 'denied' = 拒绝
 * 持久化到 localStorage；GA4 / 百度统计脚本仅在 granted 后注入
 * （见 app/plugins/analytics.client.ts）。
 *
 * 插件与组件共享同一个 useState 单例，localStorage 读取只做一次。
 */
export const CONSENT_STORAGE_KEY = 'qiuyun-cookie-consent'

export type ConsentState = 'granted' | 'denied' | null

export function useConsent() {
  const consent = useState<ConsentState>('cookie-consent', () => null)

  /** 从 localStorage 恢复历史选择（仅客户端、仅一次） */
  const init = () => {
    if (!import.meta.client) return
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (stored === 'granted' || stored === 'denied') {
      consent.value = stored
    }
  }

  const setConsent = (value: 'granted' | 'denied') => {
    consent.value = value
    if (import.meta.client) {
      localStorage.setItem(CONSENT_STORAGE_KEY, value)
    }
  }

  return { consent, init, setConsent }
}
