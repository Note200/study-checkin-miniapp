// pages/admin/admin.js
const app = getApp()

Page({
  data: {
    activeTab: 0,
    tabs: ['班级管理', '公告管理', '数据统计'],
    classList: [],
    classInfo: null,
    noticeList: [],
    stats: {
      memberCount: 0,
      taskCount: 0,
      checkinCount: 0,
      planCount: 0
    },
    showPublishModal: false,
    noticeTitle: '',
    noticeContent: ''
  },

  onLoad() {
    const userInfo = app.globalData.userInfo
    if (!userInfo || userInfo.role !== 1) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    // 首次进入由 onShow 统一加载，避免重复请求
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    await Promise.all([
      this.loadClass(),
      this.loadNotices(),
      this.loadStats()
    ])
  },

  switchTab(e) {
    this.setData({ activeTab: parseInt(e.currentTarget.dataset.index) })
  },

  async loadClass() {
    try {
      const res = await app.request({ url: '/api/admin/classes' })
      if (res.code === 200) {
        const classList = res.data || []
        this.setData({ 
          classList,
          classInfo: classList.length > 0 ? classList[0] : null
        })
      }
    } catch (e) {
      console.log('加载班级失败')
    }
  },

  async loadNotices() {
    try {
      const res = await app.request({ url: '/api/admin/notices' })
      if (res.code === 200) {
        this.setData({ noticeList: res.data || [] })
      } else {
        this.setData({ noticeList: [] })
      }
    } catch (e) {
      console.log('加载公告失败，使用空列表')
      this.setData({ noticeList: [] })
    }
  },

  async loadStats() {
    try {
      const res = await app.request({ url: '/api/admin/stats' })
      if (res.code === 200) {
        this.setData({
          stats: {
            memberCount: res.data.memberCount || 0,
            taskCount: res.data.taskCount || 0,
            checkinCount: res.data.checkinCount || 0,
            planCount: res.data.planCount || 0
          }
        })
      }
    } catch (e) {
      console.log('加载统计失败，使用默认数据')
      // 不修改 stats，保持 data 中的默认值 0
    }
  },

  // 显示发布公告弹窗
  showNoticeModal() {
    this.setData({
      showPublishModal: true,
      noticeTitle: '',
      noticeContent: ''
    })
  },

  // 隐藏弹窗
  hideNoticeModal() {
    this.setData({ showPublishModal: false })
  },

  // 阻止弹窗内部点击冒泡到遮罩层
  preventClose() {},

  // 输入监听
  onNoticeTitleInput(e) {
    this.setData({ noticeTitle: e.detail.value })
  },

  onNoticeContentInput(e) {
    this.setData({ noticeContent: e.detail.value })
  },

  // 提交公告
  async submitNotice() {
    const { noticeTitle, noticeContent } = this.data
    if (!noticeTitle) {
      wx.showToast({ title: '请输入公告标题', icon: 'none' })
      return
    }
    try {
      const res = await app.request({
        url: '/api/admin/notice',
        method: 'POST',
        data: { title: noticeTitle, content: noticeContent }
      })
      if (res.code === 200) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.hideNoticeModal()
        this.loadNotices()
      } else {
        wx.showToast({ title: res.msg || '发布失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '发布失败', icon: 'none' })
    }
  },

  // 复制邀请码
  copyCode() {
    const code = this.data.classInfo && this.data.classInfo.inviteCode
    if (code) {
      wx.setClipboardData({
        data: code,
        success: () => {
          wx.showToast({ title: '已复制', icon: 'success' })
        }
      })
    } else {
      wx.showToast({ title: '暂无邀请码', icon: 'none' })
    }
  },

  async deleteNotice(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条公告吗？',
      confirmColor: '#F56C6C',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: '/api/admin/notice/' + id,
              method: 'DELETE'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadNotices()
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  async generateCode() {
    const classInfo = this.data.classInfo
    if (!classInfo || !classInfo.id) {
      wx.showToast({ title: '班级信息异常', icon: 'none' })
      return
    }
    try {
      const res = await app.request({
        url: '/api/admin/invite-code',
        method: 'POST',
        data: { classId: classInfo.id }
      })
      if (res.code === 200) {
        wx.showToast({ title: '生成成功', icon: 'success' })
        this.loadClass()
      } else {
        wx.showToast({ title: res.msg || '生成失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  }
})
