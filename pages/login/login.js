// pages/login/login.js
const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    rememberMe: false,
    loading: false
  },

  onLoad() {
    // 加载记住的账号密码
    const rememberMe = wx.getStorageSync('rememberMe') || false
    const savedUsername = wx.getStorageSync('savedUsername') || ''
    const savedPassword = wx.getStorageSync('savedPassword') || ''
    
    this.setData({
      rememberMe,
      username: savedUsername,
      password: savedPassword
    })
  },

  // 输入框绑定
  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onRememberChange(e) {
    const checked = e.detail.value.length > 0
    this.setData({ rememberMe: checked })
    wx.setStorageSync('rememberMe', checked)
  },

  // 账号密码登录
  async accountLogin() {
    const { username, password, rememberMe } = this.data
    
    if (!username) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    
    if (this.data.loading) return
    this.setData({ loading: true })
    
    try {
      const result = await app.request({
        url: '/api/user/loginByPassword',
        method: 'POST',
        data: { username, password }
      })
      
      if (result.code === 200) {
        app.globalData.token = result.data.token
        app.globalData.userInfo = result.data.userInfo
        this.saveLoginInfo(result.data)
        
        // 记住账号密码
        if (rememberMe) {
          wx.setStorageSync('savedUsername', username)
          wx.setStorageSync('savedPassword', password)
        } else {
          wx.removeStorageSync('savedUsername')
          wx.removeStorageSync('savedPassword')
        }
        
        wx.showToast({ title: '登录成功', icon: 'success' })
        wx.switchTab({ url: '/pages/index/index' })
        return
      } else {
        wx.showToast({ title: result.msg || '登录失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '登录失败', icon: 'none' })
    }
    
    this.setData({ loading: false })
  },

  // 跳转到注册
  toRegister() {
    wx.navigateTo({ url: '/pages/login/register' })
  },

  // 忘记密码
  onForgotPwd() {
    wx.showToast({ title: '请联系管理员重置密码', icon: 'none' })
  },

  // 保存登录信息
  saveLoginInfo(data) {
    try {
      wx.setStorageSync('userInfo', data.userInfo)
      wx.setStorageSync('token', data.token)
    } catch (e) {
      console.log('保存登录信息失败', e)
    }
  }
})
