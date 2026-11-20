/**
 * 广告脚本按同意状态注入（AdSense + Funding Choices CMP）
 *
 * 流量统计已改为 Umami：无 Cookie、不做跨站追踪，因此不经过本插件、不受 Cookie
 * 同意门控，直接在 nuxt.config.ts 的 head.script 中静态注入（约 197 个预渲染页面
 * 全部生效）。Umami 的 script.js 默认自带 SPA 路由追踪，无需手动上报 pageview。
 *
 * 本插件只负责会写 Cookie 的广告相关脚本：
 *   - consent === 'granted'  → 注入 AdSense（一次性，之后 localStorage 记忆）
 *   - consent === null/denied → 不注入任何广告脚本
 *
 * Funding Choices CMP：
 *   自研横幅已覆盖 16 种语言，UX 优于 FC 原生弹窗。这里只做"信号桥接"——自研横幅的
 *   同意状态同步给 Google 广告系统。FC 的 getjs URL 必须 AdSense 审核通过后在后台
 *   创建 CMP 设置才能拿到，留空字符串即表示不启用。审核通过后填入 URL 即可，
 *   自研横幅无需改动。
 */
import { CONSENT_STORAGE_KEY, useConsent } from '~/composables/useConsent'

const ADSENSE_CLIENT = 'ca-pub-5598459476681539'

/**
 * Google Funding Choices CMP getjs URL。
 * 审核通过后在 AdSense 后台：Settings → Privacy & messaging → GDPR → CMP → Create
 * 得到形如 https://fundingchoices.google.com/messages/.../getjs 的地址，贴到此处。
 * 留空字符串 = 不注入 FC，自研横幅独立承担合规职责。
 */
const FC_GETJS_URL = ''

export default defineNuxtPlugin(() => {
  const { consent } = useConsent()

  // 客户端恢复历史同意状态（先于组件挂载，横幅与脚本注入都用得上）
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
  if (stored === 'granted' || stored === 'denied') {
    consent.value = stored
  }

  let adsLoaded = false

  /**
   * 自研横幅 → Funding Choices 状态同步
   * googlefc.setConsentState 接收 TCF-like 的同意字典，
   * 让 AdSense 根据自研横幅的选择决定是否投放个性化广告。
   * FC 未加载（审核未过 / URL 未填）时静默跳过。
   */
  const syncFcConsent = () => {
    const fc = (window as any).googlefc
    if (!fc || typeof fc.setConsentState !== 'function') return

    const state = consent.value === 'granted'
      ? { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }
      : consent.value === 'denied'
        ? { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }
        : null

    if (state) {
      try { fc.setConsentState(state) } catch { /* FC 未完全初始化时可能抛错，忽略 */ }
    }
  }

  const loadAds = () => {
    if (adsLoaded) return
    adsLoaded = true

    // ---- Google AdSense ----
    // 会写广告 Cookie，必须在同意后注入
    ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
    const ads = document.createElement('script')
    ads.async = true
    ads.crossOrigin = 'anonymous'
    ads.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
    document.head.appendChild(ads)

    // ---- Google Funding Choices CMP ----
    // 信号桥接：自研横幅的同意状态 → Google 广告系统
    if (FC_GETJS_URL) {
      ;(window as any).googlefc = (window as any).googlefc || {}
      // CMP 加载完成后主动告知当前同意状态（避免 FC 自行弹窗）
      ;(window as any).googlefc.callbackQueue = (window as any).googlefc.callbackQueue || []
      const fc = document.createElement('script')
      fc.async = true
      fc.src = FC_GETJS_URL
      fc.onload = () => syncFcConsent()
      document.head.appendChild(fc)
    }
  }

  // 历史已同意的访客：插件启动时立即注入
  if (consent.value === 'granted') {
    loadAds()
  }

  // 新同意 / 改主意的访客：状态变化时注入 + 同步 FC
  watch(consent, (value) => {
    if (value === 'granted') {
      loadAds()
    }
    syncFcConsent()
  })
})
