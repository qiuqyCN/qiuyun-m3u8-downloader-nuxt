/**
 * 统计脚本按同意状态注入 + SPA 路由切换 pageview 上报
 *
 * GDPR/ePrivacy：GA4 / 百度统计 / AdSense 都会写 Cookie，必须用户同意后才能加载。
 * 脚本原本在 nuxt.config.ts 的 head 中同步注入，现移到这里动态注入：
 *   - consent === 'granted'  → 注入 GA4 + 百度统计 + AdSense（一次性，之后 localStorage 记忆）
 *   - consent === null/denied → 不注入任何脚本
 *
 * Funding Choices CMP：
 *   自研横幅已覆盖 16 种语言，UX 优于 FC 原生弹窗。这里只做"信号桥接"——自研横幅的
 *   同意状态同步给 Google 广告系统。FC 的 getjs URL 必须 AdSense 审核通过后在后台
 *   创建 CMP 设置才能拿到，留空字符串即表示不启用。审核通过后填入 URL 即可，
 *   自研横幅无需改动。
 *
 * pageview 逻辑：
 *   - 注入时 GA4 的 gtag('config') 自动上报当前页（即首次 pageview）
 *   - 之后由 router.afterEach 手动上报路由切换，与 config 不会重复
 *   - 初始导航（from.name === null）跳过，避免重复
 */
import { CONSENT_STORAGE_KEY, useConsent } from '~/composables/useConsent'

const GA4_ID = 'G-LSQXK5HXX2'
const BAIDU_ID = '22e0597b5b3b4d2838a5243dd283b123'
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

  let analyticsLoaded = false

  const loadAnalytics = () => {
    if (analyticsLoaded) return
    analyticsLoaded = true

    // ---- GA4 ----
    // 先建 dataLayer 与 gtag stub，再注入脚本，保证 config 调用不丢
    ;(window as any).dataLayer = (window as any).dataLayer || []
    ;(window as any).gtag = function () {
      ;(window as any).dataLayer.push(arguments)
    }
    const gtag = (window as any).gtag
    gtag('js', new Date())
    gtag('config', GA4_ID)

    const ga = document.createElement('script')
    ga.async = true
    ga.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
    document.head.appendChild(ga)

    // ---- 百度统计 ----
    // 脚本加载完成后 _hmt 会从数组变成带 push 方法的对象
    ;(window as any)._hmt = (window as any)._hmt || []
    const hm = document.createElement('script')
    hm.src = `https://hm.baidu.com/hm.js?${BAIDU_ID}`
    document.head.appendChild(hm)

    // ---- Google AdSense ----
    // 同样写 Cookie，必须在同意后注入；与 GA4/百度统计统一走 loadAnalytics
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

  // 历史已同意的访客：插件启动时立即注入
  if (consent.value === 'granted') {
    loadAnalytics()
  }

  // 新同意 / 改主意的访客：状态变化时注入 + 同步 FC
  watch(consent, (value) => {
    if (value === 'granted') {
      loadAnalytics()
    }
    syncFcConsent()
  })

  const router = useRouter()

  router.afterEach((to, from) => {
    // Vue Router 初始导航：from 是 START_LOCATION 哨兵对象，name 恒为 null
    // 首次 pageview 由注入时的 gtag('config') 上报，跳过避免重复
    if (from.name === null) return

    // 完全相同路径（含 query/hash）不重复上报
    if (to.fullPath === from.fullPath) return

    // 等一次 tick，确保 document.title 已更新后再上报
    nextTick(() => {
      const path = to.fullPath || to.path

      // ---- 百度统计 ----
      // 不 hook history.pushState，只有 popstate（后退）能自动感知，
      // 必须显式传 path；脚本未注入（未同意）时 _hmt 不存在，自然跳过
      const _hmt = (window as any)._hmt
      if (_hmt && typeof _hmt.push === 'function') {
        _hmt.push(['_trackPageview', path])
      }

      // ---- Google Analytics (GA4) ----
      const gtag = (window as any).gtag
      if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
          page_path: path,
          page_title: document.title,
          page_location: window.location.href,
        })
      }
    })
  })
})
