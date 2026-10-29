// pages/webshell/login.js
const appConfig = require('../../appConfig.js');
const { applyPageNavigationTheme } = require('../../utils/theme.js')
const MP_LOGIN_NAV_LOCK_KEY = 'mp_login_nav_lock_ts'

Page({
  data: {
    loading: false,
  },

  async onLoad(options) {
    const app = getApp()
    if (app.globalData.mpLoginNavigating !== true) {
      app.globalData.mpLoginNavigating = true
    }

    if (app.globalData.mpLoginPageActive) {
      console.log('[login] duplicate page opened, auto back')
      wx.navigateBack({ delta: 1 })
      return
    }

    app.globalData.mpLoginPageActive = true
    applyPageNavigationTheme()

    console.log('[login] onLoad called with options:', options)
    const returnUrl = options.returnUrl ? decodeURIComponent(options.returnUrl) : ''
    if (returnUrl) {
      wx.setStorageSync('mp_login_return_url', returnUrl)
    }

    // 启动登录流程
    await this.startWxLogin()
  },

  onHide() {
    // 授权弹窗期间可能触发 onHide，这里不解锁，避免快速连点再次打开登录页
  },

  onUnload() {
    try {
      wx.removeStorageSync(MP_LOGIN_NAV_LOCK_KEY)
    } catch {
      // ignore
    }

    getApp().globalData.mpLoginNavigating = false
    getApp().globalData.mpLoginPageActive = false
  },

  async startWxLogin() {
    console.log('[login] startWxLogin called')
    this.setData({ loading: true })
    try {
      const app = getApp()
      const auth = await app.login()
      const code = auth && auth.code ? String(auth.code) : ''

      if (!code) {
        wx.showToast({ title: '获取 code 失败', icon: 'error', duration: 2000 })
        this.setData({ loading: false })
        return
      }

      console.log('[login] Got wx.login code, checking if user exists...')

      // 调用服务端 API 检查用户是否已存在
      const checkResult = await this.checkUserExists(code)

      if (checkResult && checkResult.exists && checkResult.token) {
        // 已授权过的用户直接登录，不再重复进入资料页
        // 即使历史数据缺少头像/昵称，也使用默认值登录，避免每次退出都重新填写
        console.log('[login] Existing user, skipping profile page')
        await this.returnToWebshellDirectly(
          checkResult,
          checkResult.userName || '微信用户',
          checkResult.userAvatar || appConfig.login.defaultAvatarUrl
        )
      } else if (checkResult && checkResult.token) {
        // 新用户首次登录，进入资料页完善头像昵称
        // 注意：此时 code 已被 check API 消耗，必须使用返回的 token
        console.log('[login] New user, redirecting to profile with token')
        await this.redirectToProfile(checkResult)
      } else {
        // check API 调用失败，尝试使用原始 code（可能仍有效）
        console.log('[login] Check API failed, redirecting with code as fallback')
        await this.redirectToProfileWithCode(code)
      }
    } catch (e) {
      console.error('[login] startWxLogin error:', e)
      wx.showToast({ title: '登录异常', icon: 'error', duration: 2000 })
      this.setData({ loading: false })
    }
  },

  // 检查用户是否已存在
  async checkUserExists(code) {
    try {
      // 从 appConfig 获取服务端 URL
      const baseUrl = appConfig.general.initialUrl.replace(/\/$/, '')
      const checkUrl = `${baseUrl}/api/wxlogin/check`

      console.log('[login] Calling check API:', checkUrl)

      return new Promise((resolve) => {
        wx.request({
          url: checkUrl,
          method: 'POST',
          data: { code },
          header: { 'Content-Type': 'application/json' },
          success: (res) => {
            console.log('[login] Check API response:', res.data)
            if (res.statusCode === 200 && res.data && res.data.success) {
              resolve(res.data)
            } else {
              // API 失败，当作用户不存在处理
              console.warn('[login] Check API failed:', res)
              resolve(null)
            }
          },
          fail: (err) => {
            console.error('[login] Check API request failed:', err)
            resolve(null)
          }
        })
      })
    } catch (e) {
      console.error('[login] checkUserExists error:', e)
      return null
    }
  },

  // 直接返回 webshell（老用户）
  // checkResult 包含 token, openid, expiresIn 等信息
  async returnToWebshellDirectly(checkResult, userName, userAvatar) {
    console.log('[login] returnToWebshellDirectly called with checkResult:', checkResult)
    try {
      wx.showLoading({ title: '登录中…' })

      // 保存登录信息到 storage（使用 token 而不是 code）
      try {
        wx.setStorageSync('mp_pending_login', {
          token: checkResult.token,
          openid: checkResult.openid,
          expiresIn: checkResult.expiresIn,
          ts: Date.now(),
        })
        // 保存已有的用户信息
        wx.setStorageSync('mp_pending_profile', {
          nickName: userName || '微信用户',
          avatarUrl: userAvatar || appConfig.login.defaultAvatarUrl,
          ts: Date.now(),
          userInfo: {
            nickName: userName || '微信用户',
            avatarUrl: userAvatar || appConfig.login.defaultAvatarUrl,
          },
        })
        console.log('[login] Storage saved for existing user with token')
      } catch (e) {
        console.error('[login] Failed to save storage:', e)
      }

      wx.hideLoading()

      // 直接返回 webshell
      console.log('[login] Navigating back to webshell')
      wx.navigateBack({ delta: 1 })
    } catch (e) {
      wx.hideLoading()
      console.error('[login] returnToWebshellDirectly error:', e)
      wx.showToast({ title: '返回失败', icon: 'error', duration: 2000 })
      this.setData({ loading: false })
    }
  },

  // 跳转到 profile 页面（新用户或需要填写资料的用户）
  // checkResult 包含 token, openid, expiresIn 等信息（code 已被消耗）
  async redirectToProfile(checkResult) {
    console.log('[login] redirectToProfile called with checkResult:', checkResult)
    try {
      wx.showLoading({ title: '登录中…' })

      wx.removeStorageSync('mp_login_return_url')
      wx.hideLoading()

      // 保存 token 到 storage（不是 code，因为 code 已被 check API 消耗）
      try {
        wx.setStorageSync('mp_pending_login', {
          token: checkResult.token,
          openid: checkResult.openid,
          expiresIn: checkResult.expiresIn,
          ts: Date.now(),
        })
        console.log('[login] mp_pending_login saved with token')
      } catch (e) {
        console.error('[login] Failed to save mp_pending_login:', e)
      }

      // 跳转到 profile 页面让用户填写头像昵称
      console.log('[login] Redirecting to profile page')
      wx.redirectTo({
        url: `/pages/webshell/profile`,
      })
    } catch (e) {
      wx.hideLoading()
      const errMsg = e && e.errMsg ? e.errMsg : String(e)
      console.error('[login] redirectToProfile error:', errMsg)
      wx.showToast({ title: `跳转失败: ${errMsg}`, icon: 'error', duration: 2000 })
      this.setData({ loading: false })
    }
  },

  // 备用方法：使用 code 跳转（仅在 check API 失败时使用）
  async redirectToProfileWithCode(code) {
    console.log('[login] redirectToProfileWithCode called with code')
    try {
      wx.showLoading({ title: '登录中…' })

      wx.removeStorageSync('mp_login_return_url')
      wx.hideLoading()

      // 保存 code 到 storage（check API 失败，code 可能仍有效）
      try {
        wx.setStorageSync('mp_pending_login', {
          code,
          ts: Date.now(),
        })
        console.log('[login] mp_pending_login saved with code (fallback)')
      } catch (e) {
        console.error('[login] Failed to save mp_pending_login:', e)
      }

      // 跳转到 profile 页面让用户填写头像昵称
      console.log('[login] Redirecting to profile page')
      wx.redirectTo({
        url: `/pages/webshell/profile`,
      })
    } catch (e) {
      wx.hideLoading()
      const errMsg = e && e.errMsg ? e.errMsg : String(e)
      console.error('[login] redirectToProfileWithCode error:', errMsg)
      wx.showToast({ title: `跳转失败: ${errMsg}`, icon: 'error', duration: 2000 })
      this.setData({ loading: false })
    }
  },
})
