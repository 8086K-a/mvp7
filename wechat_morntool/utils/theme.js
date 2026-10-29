function applyPageNavigationTheme() {
  try {
    const app = getApp()
    const navTheme = app && app.globalData ? app.globalData.navTheme : null

    if (!navTheme) return

    wx.setNavigationBarColor({
      frontColor: navTheme.frontColor || '#000000',
      backgroundColor: navTheme.backgroundColor || '#ffffff',
      animation: {
        duration: 0,
        timingFunc: 'linear',
      },
    })
  } catch (error) {
    console.warn('[theme] applyPageNavigationTheme failed:', error)
  }
}

module.exports = {
  applyPageNavigationTheme,
}

