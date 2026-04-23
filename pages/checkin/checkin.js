// pages/checkin/checkin.js
const app = getApp()

Page({
  data: {
    tasks: [],
    currentTask: null,
    showCheckinModal: false,
    checkinRemark: '',
    showHistory: false,
    historyList: []
  },

  onShow() {
    this.loadTasks()
  },

  async loadTasks() {
    try {
      const res = await app.request({ url: '/api/checkin/tasks' })
      if (res.code === 200) {
        this.setData({ tasks: res.data || [] })
      }
    } catch (e) {
      console.log('加载任务失败')
    }
  },

  // 打开打卡弹窗
  openCheckin(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.tasks.find(t => t.id === taskId)
    this.setData({
      currentTask: task,
      showCheckinModal: true,
      checkinRemark: ''
    })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showCheckinModal: false })
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({ checkinRemark: e.detail.value })
  },

  // 打卡
  async doCheckin() {
    const { currentTask, checkinRemark } = this.data

    try {
      const res = await app.request({
        url: '/api/checkin/do',
        method: 'POST',
        data: {
          taskId: currentTask.id,
          remark: checkinRemark
        }
      })

      if (res.code === 200) {
        wx.showToast({ title: '打卡成功', icon: 'success' })
        this.closeModal()
        this.loadTasks()
      } else {
        wx.showToast({ title: res.msg || '打卡失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '打卡失败', icon: 'none' })
    }
  },

  // 查看历史
  async viewHistory(e) {
    const taskId = e.currentTarget.dataset.id
    try {
      const res = await app.request({
        url: '/api/checkin/history',
        data: { taskId }
      })
      if (res.code === 200) {
        this.setData({
          showHistory: true,
          historyList: res.data || []
        })
      }
    } catch (e) {
      console.log('加载历史失败')
    }
  },

  // 关闭历史
  closeHistory() {
    this.setData({ showHistory: false })
  },

  // 添加新任务
  addTask() {
    wx.navigateTo({ url: '/pages/checkin/add' })
  }
})
