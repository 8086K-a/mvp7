// app.js
// 读取集中化配置
const appConfig = require('./appConfig.js')

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查小程序更新
    this.checkUpdate()

    // 启动时尝试一次登录（不阻塞）
    if (appConfig.login && appConfig.login.enableWxLogin) {
      this.login().catch(() => {})
    }
  },

  // 检查小程序更新
  checkUpdate() {
    if (!wx.canIUse('getUpdateManager')) {
      console.log('[app] UpdateManager not supported')
      return
    }

    const updateManager = wx.getUpdateManager()

    updateManager.onCheckForUpdate((res) => {
      console.log('[app] hasUpdate:', res.hasUpdate)
    })

    updateManager.onUpdateReady(() => {
      console.log('[app] Update ready')
      wx.showModal({
        title: '更新提示',
        content: '新版本已准备好，是否重启应用？',
        confirmText: '立即更新',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })

    updateManager.onUpdateFailed(() => {
      console.error('[app] Update failed')
      wx.showToast({
        title: '更新失败，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    })
  },

  // 微信登录方法
  login() {
    console.log('[app] login method called')
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (!res.code) {
            reject(new Error('wx.login: missing code'))
            return
          }

          // 只把 code 返回给页面，让 H5 用同源 fetch 去换 token
          const auth = { code: res.code, from: 'wx.login' }
          wx.setStorageSync('auth', auth)
          this.globalData.auth = auth
          resolve(auth)
        },
        fail: reject,
      })
    })
  },

  // 获取配置
  getConfig() {
    return appConfig
  },

  globalData: {
    userInfo: null,
    auth: null,
    appConfig: appConfig
  }
})
