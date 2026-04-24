// pages/checkin/checkin.js
const app = getApp()

// 课程图标映射
const ICONS = ['📐', '🌍', '💻', '📚', '🔭', '🎨', '🎵', '⚗️', '📝', '🏃']
const ICON_BG = ['#E8F8EF', '#E3F2FD', '#FFF3E0', '#F3E8FF', '#FEF0F0', '#E8F5E9', '#E1F5FE', '#FFF8E1', '#F3E5F5', '#E8F5E9']

Page({
  data: {
    tasks: [],
    currentTask: null,
    showCheckinModal: false,
    checkinRemark: '',
    showHistory: false,
    historyList: [],
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth() + 1,
    calendarDays: []
  },

  onShow() {
    this.loadTasks()
    this.loadCalendar()
  },

  async loadTasks() {
    try {
      const res = await app.request({ url: '/api/checkin/tasks' })
      if (res.code === 200) {
        const tasks = (res.data || []).map((t, i) => ({
          ...t,
          icon: ICONS[i % ICONS.length],
          iconBg: ICON_BG[i % ICON_BG.length]
        }))
        this.setData({ tasks })
      }
    } catch (e) {
      console.log('加载任务失败')
    }
  },

  // 加载本月打卡日历
  async loadCalendar() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = now.getDate()

    let checkedDays = []
    try {
      const res = await app.request({ url: '/api/checkin/calendar', data: { year, month } })
      if (res.code === 200) {
        checkedDays = res.data || []
      }
    } catch (e) {}

    // 生成日历格子
    const firstDay = new Date(year, month - 1, 1).getDay() // 0=周日
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells = []
    // 前面的空格
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true })
    // 日期
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        checked: checkedDays.includes(d),
        isToday: d === today,
        empty: false
      })
    }

    this.setData({ calendarYear: year, calendarMonth: month, calendarDays: cells })
  },

  openCheckin(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.tasks.find(t => t.id === taskId)
    this.setData({ currentTask: task, showCheckinModal: true, checkinRemark: '' })
  },

  closeModal() { this.setData({ showCheckinModal: false }) },

  // 阻止弹窗内部点击冒泡到遮罩层
  preventClose() {},

  onRemarkInput(e) { this.setData({ checkinRemark: e.detail.value }) },

  async doCheckin() {
    const { currentTask, checkinRemark } = this.data
    try {
      const res = await app.request({
        url: '/api/checkin/do',
        method: 'POST',
        data: { taskId: currentTask.id, remark: checkinRemark }
      })
      if (res.code === 200) {
        wx.showToast({ title: '打卡成功 🎉', icon: 'success' })
        this.closeModal()
        this.loadTasks()
        this.loadCalendar()
      } else {
        wx.showToast({ title: res.msg || '打卡失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '打卡失败', icon: 'none' })
    }
  },

  async viewHistory(e) {
    const taskId = e.currentTarget.dataset.id
    try {
      const res = await app.request({ url: '/api/checkin/history', data: { taskId } })
      if (res.code === 200) {
        this.setData({ showHistory: true, historyList: res.data || [] })
      }
    } catch (e) {}
  },

  closeHistory() { this.setData({ showHistory: false }) },

  addTask() { wx.navigateTo({ url: '/pages/checkin/add' }) }
})
