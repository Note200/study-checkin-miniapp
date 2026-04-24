// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    menuItems: [
      { emoji: '🔔', title: '提醒设置', desc: '设置打卡提醒时间', path: '', isTab: false, bg: '#FFF3E0' },
      { emoji: '📚', title: '学习计划', desc: '管理每周学习计划', path: '/pages/plan/plan', isTab: true, bg: '#E3F2FD' },
      { emoji: '📈', title: '目标管理', desc: '设置学习目标', path: '', isTab: false, bg: '#E8F8EF' }
    ],
    actionItems: [
      { emoji: '🔑', title: '修改密码', action: 'password', bg: '#FEF0F0' },
      { emoji: '💬', title: '帮助与反馈', action: 'help', bg: '#F3E8FF' },
      { emoji: 'ℹ️', title: '关于我们', action: 'about', bg: '#F7F8FA' }
    ],
    isAdmin: false
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    this.setData({ 
      userInfo,
      isAdmin: userInfo && userInfo.role === 1
    })
  },

  // 菜单点击
  onMenuTap(e) {
    const item = e.currentTarget.dataset
    const path = item.path
    if (!path) { wx.showToast({ title: '功能开发中', icon: 'none' }); return }
    if (item.isTab) {
      wx.switchTab({ url: path })
    } else {
      wx.navigateTo({ url: path })
    }
  },

  // 操作点击
  onActionTap(e) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'password':
        wx.showToast({ title: '修改密码功能开发中', icon: 'none' })
        break
      case 'help':
        wx.showModal({
          title: '帮助与反馈',
          content: '如有问题请联系管理员',
          showCancel: false,
          confirmColor: '#07C160'
        })
        break
      case 'about':
        wx.showModal({
          title: '关于',
          content: '学而时习 — 大学生学习管理与打卡系统\n版本 v1.0.0',
          showCancel: false,
          confirmColor: '#07C160'
        })
        break
    }
  },

  // 编辑个人信息
  editProfile() {
    wx.showToast({ title: '个人信息编辑开发中', icon: 'none' })
  },

  // 管理员入口
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#F56C6C',
      success: (res) => {
        if (res.confirm) {
          app.logout()
        }
      }
    })
  }
})
