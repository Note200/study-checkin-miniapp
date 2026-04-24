// pages/login/register.js
const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    loading: false
  },

  onUsernameInput(e) { this.setData({ username: e.detail.value }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value }) },
  onConfirmInput(e) { this.setData({ confirmPassword: e.detail.value }) },
  onNicknameInput(e) { this.setData({ nickname: e.detail.value }) },

  async register() {
    const { username, password, confirmPassword, nickname } = this.data
    
    if (!username) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    
    if (this.data.loading) return
    this.setData({ loading: true })
    
    try {
      const result = await app.request({
        url: '/api/user/register',
        method: 'POST',
        data: { username, password, nickname: nickname || username }
      })
      
      if (result.code === 200) {
        app.globalData.token = result.data.token
        app.globalData.userInfo = result.data.userInfo
        wx.showToast({ title: '注册成功', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      } else {
        wx.showToast({ title: result.msg || '注册失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '注册失败', icon: 'none' })
    }
    
    this.setData({ loading: false })
  },

  goBack() {
    wx.navigateBack()
  }
})
