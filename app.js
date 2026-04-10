// app.js
const { BASE_URL } = require('./config')

App({
  globalData: {
    userInfo: null,
    token: null,
    BASE_URL: BASE_URL
  },

  onLaunch() {
    // 读取本地存储的token
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }
  },

  // 统一请求方法
  request(options) {
    const token = this.globalData.token
    return new Promise((resolve, reject) => {
      console.log('发起请求:', BASE_URL + options.url, options.data)
      wx.request({
        url: BASE_URL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        timeout: 30000,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        success(res) {
          console.log('请求成功:', res.statusCode, res.data)
          if (res.data.code === 401) {
            // token过期，跳转登录
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
            wx.reLaunch({ url: '/pages/login/login' })
            reject(res.data)
          } else {
            resolve(res.data)
          }
        },
        fail(err) {
          console.error('请求失败详情:', JSON.stringify(err))
          wx.showToast({ title: '网络请求失败', icon: 'none' })
          reject(err)
        }
      })
    })
  },

  // 退出登录
  logout() {
    this.globalData.token = null
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.reLaunch({ url: '/pages/login/login' })
  }
})
