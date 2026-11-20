/**
 * Cookie 同意状态管理（GDPR / ePrivacy）
 *
 * 三态：null = 未选择（需显示横幅）| 'granted' = 同意 | 'denied' = 拒绝
 * 持久化到 localStorage；广告脚本（AdSense）仅在 granted 后注入
 * （见 app/plugins/analytics.client.ts）。
 *
 * 说明：Umami 统计无 Cookie、不做跨站追踪，直接在 nuxt.config.ts 静态注入，
 * 不受本同意状态门控。
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
