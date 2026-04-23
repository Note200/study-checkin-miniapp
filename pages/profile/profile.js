// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    menuItems: [
      { icon: 'profile.png', title: '个人信息', path: '/pages/profile/edit', isTab: false },
      { icon: 'course.png', title: '我的课程', path: '/pages/course/course', isTab: true },
      { icon: 'plan.png', title: '我的计划', path: '/pages/plan/plan', isTab: true },
      { icon: 'checkin.png', title: '我的打卡', path: '/pages/checkin/checkin', isTab: true }
    ],
    actionItems: [
      { icon: 'setting.png', title: '设置', action: 'settings' },
      { icon: 'help.png', title: '帮助与反馈', action: 'help' },
      { icon: 'about.png', title: '关于我们', action: 'about' }
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
    const path = e.currentTarget.dataset.path
    if (path) {
      wx.switchTab({ url: path })
    }
  },

  // 操作点击
  onActionTap(e) {
    const action = e.currentTarget.dataset.action
    switch (action) {
      case 'settings':
        wx.showToast({ title: '设置功能开发中', icon: 'none' })
        break
      case 'help':
        wx.showModal({
          title: '帮助与反馈',
          content: '如有问题请联系管理员',
          showCancel: false,
          confirmColor: '#667eea'
        })
        break
      case 'about':
        wx.showModal({
          title: '关于',
          content: '学而时习 — 大学生学习管理与打卡系统\n版本 v1.0.0',
          showCancel: false,
          confirmColor: '#667eea'
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
