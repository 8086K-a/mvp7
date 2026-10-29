Page({
  data: {
    url: ''
  },

  onLoad(options) {
    if (options.url) {
      this.setData({ url: decodeURIComponent(options.url) })
    }
  },

  copyUrl() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
    })
  }
})
