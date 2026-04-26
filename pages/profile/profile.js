// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    showEditModal: false,
    showPasswordModal: false,
    editNickname: '',
    editMajor: '',
    editClass: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
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
    isAdmin: false,
    achievements: [],
    totalDays: 0,
    streakDays: 0,
    monthDays: 0
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    this.setData({
      userInfo,
      isAdmin: userInfo && userInfo.role === 1
    })
    this.loadStats()
  },

  // 加载打卡统计，计算成就
  async loadStats() {
    try {
      const res = await app.request({ url: '/api/checkin/stats' })
      if (res.code === 200 && res.data) {
        const d = res.data
        this.setData({
          totalDays: d.totalDays || 0,
          streakDays: d.streakDays || 0,
          monthDays: d.monthDays || 0
        })
        this.calculateAchievements(d.totalDays || 0, d.streakDays || 0, d.monthDays || 0)
      }
    } catch (e) {}
  },

  // 计算成就列表
  calculateAchievements(total, streak, month) {
    const achievements = [
      { name: '初来乍到', desc: '完成首次打卡', icon: '🌱', unlocked: total >= 1, bg: '#E8F8EF' },
      { name: '一周坚持', desc: '累计打卡7天', icon: '📖', unlocked: total >= 7, bg: '#E3F2FD' },
      { name: '月度达人', desc: '累计打卡30天', icon: '⭐', unlocked: total >= 30, bg: '#FFF8E1' },
      { name: '百日征程', desc: '累计打卡100天', icon: '🏆', unlocked: total >= 100, bg: '#FEF0F0' },
      { name: '连击新手', desc: '连续打卡3天', icon: '🔥', unlocked: streak >= 3, bg: '#FFF3E0' },
      { name: '连击高手', desc: '连续打卡7天', icon: '💥', unlocked: streak >= 7, bg: '#F3E8FF' },
      { name: '连击大师', desc: '连续打卡30天', icon: '⚡', unlocked: streak >= 30, bg: '#E1F5FE' },
      { name: '本月勤奋', desc: '本月打卡15天', icon: '📅', unlocked: month >= 15, bg: '#FCE4EC' }
    ]
    this.setData({ achievements })
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
        this.setData({ showPasswordModal: true, oldPassword: '', newPassword: '', confirmPassword: '' })
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
    const info = this.data.userInfo || {}
    this.setData({
      showEditModal: true,
      editNickname: info.nickname || '',
      editMajor: info.major || '',
      editClass: info.className || ''
    })
  },

  closeEditModal() {
    this.setData({ showEditModal: false })
  },

  // 阻止弹窗内部点击冒泡到遮罩层
  preventClose() {},

  onNicknameInput(e) { this.setData({ editNickname: e.detail.value }) },
  onMajorInput(e) { this.setData({ editMajor: e.detail.value }) },
  onClassInput(e) { this.setData({ editClass: e.detail.value }) },
  onOldPwdInput(e) { this.setData({ oldPassword: e.detail.value }) },
  onNewPwdInput(e) { this.setData({ newPassword: e.detail.value }) },
  onConfirmPwdInput(e) { this.setData({ confirmPassword: e.detail.value }) },

  async saveProfile() {
    const { editNickname, editMajor, editClass } = this.data
    if (!editNickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    try {
      const res = await app.request({
        url: '/api/user/profile',
        method: 'PUT',
        data: {
          nickname: editNickname,
          major: editMajor,
          className: editClass
        }
      })
      if (res.code === 200) {
        // 更新本地数据
        const userInfo = { ...this.data.userInfo, nickname: editNickname, major: editMajor, className: editClass }
        app.globalData.userInfo = userInfo
        wx.setStorageSync('userInfo', userInfo)
        this.setData({ userInfo, showEditModal: false })
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.msg || '保存失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 修改密码
  closePasswordModal() { this.setData({ showPasswordModal: false }) },

  async savePassword() {
    const { oldPassword, newPassword, confirmPassword } = this.data
    if (!oldPassword) {
      wx.showToast({ title: '请输入旧密码', icon: 'none' })
      return
    }
    if (!newPassword || newPassword.length < 6) {
      wx.showToast({ title: '新密码至少6位', icon: 'none' })
      return
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    try {
      const res = await app.request({
        url: '/api/user/password',
        method: 'PUT',
        data: { oldPassword, newPassword }
      })
      if (res.code === 200) {
        wx.showToast({ title: '密码修改成功', icon: 'success' })
        this.setData({ showPasswordModal: false })
      } else {
        wx.showToast({ title: res.msg || '修改失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '修改失败', icon: 'none' })
    }
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
