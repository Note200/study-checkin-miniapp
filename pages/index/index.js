// pages/index/index.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    greeting: '早上好',
    notice: '',
    todayRate: 0,
    studyHours: { done: 0, target: 4, rate: 0 },
    todayTasks: [],
    weekData: [],
    weekTotal: 0
  },

  onShow() {
    const info = app.globalData.userInfo
    this.setData({
      userInfo: info,
      isAdmin: info && info.role === 1,
      greeting: this._getGreeting()
    })
    this.loadData()
  },

  _getGreeting() {
    const h = new Date().getHours()
    if (h < 6)  return '凌晨好'
    if (h < 12) return '早上好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  },

  async loadData() {
    await Promise.all([
      this.loadTodayTasks(),
      this.loadWeekData(),
      this.loadNotice()
    ])
  },

  // 加载今日打卡任务（今日进度）
  async loadTodayTasks() {
    try {
      const res = await app.request({ url: '/api/checkin/tasks' })
      if (res.code === 200) {
        const tasks = res.data || []
        const done = tasks.filter(t => t.todayChecked).length
        const total = tasks.length
        const rate = total > 0 ? Math.round((done / total) * 100) : 0
        // 估算学习时长
        const doneMin = tasks.filter(t => t.todayChecked).reduce((s, t) => s + (t.targetMinutes || 30), 0)
        const totalMin = tasks.reduce((s, t) => s + (t.targetMinutes || 30), 0)
        this.setData({
          todayTasks: tasks.slice(0, 6),
          todayRate: rate,
          studyHours: {
            done: (doneMin / 60).toFixed(1),
            target: (totalMin / 60).toFixed(1),
            rate: rate
          }
        })
      }
    } catch (e) {
      // 降级：加载打卡统计
      try {
        const res = await app.request({ url: '/api/checkin/stats' })
        if (res.code === 200 && res.data) {
          const d = res.data
          this.setData({
            todayRate: d.rate || 0,
            studyHours: { done: d.done || 0, target: d.total || 4, rate: d.rate || 0 }
          })
        }
      } catch (_) {}
    }
  },

  // 本周学习时长柱状图数据
  async loadWeekData() {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const today = new Date().getDay() // 0=周日
    const todayIdx = today === 0 ? 6 : today - 1

    try {
      const res = await app.request({ url: '/api/checkin/week' })
      if (res.code === 200 && res.data) {
        const raw = res.data // 期望 [{day, hours}]
        const maxH = Math.max(...raw.map(r => r.hours || 0), 1)
        const weekData = days.map((day, i) => {
          const h = (raw[i] && raw[i].hours) || 0
          return { day, hours: h, height: Math.round((h / maxH) * 140) + 20, isToday: i === todayIdx }
        })
        const weekTotal = raw.reduce((s, r) => s + (r.hours || 0), 0).toFixed(1)
        this.setData({ weekData, weekTotal })
        return
      }
    } catch (e) {}

    // 降级：生成模拟柱状图
    const mock = [2.5, 3.0, 1.5, 4.0, 3.5, 5.1, 2.0]
    const maxH = Math.max(...mock)
    const weekData = days.map((day, i) => ({
      day, hours: mock[i],
      height: Math.round((mock[i] / maxH) * 140) + 20,
      isToday: i === todayIdx
    }))
    this.setData({
      weekData,
      weekTotal: mock.reduce((s, v) => s + v, 0).toFixed(1)
    })
  },

  // 加载公告
  async loadNotice() {
    try {
      const res = await app.request({ url: '/api/notice/latest' })
      if (res.code === 200 && res.data && res.data.content) {
        this.setData({ notice: res.data.content })
      }
    } catch (e) {}
  },

  goCheckin() { wx.switchTab({ url: '/pages/checkin/checkin' }) },
  goCourse()  { wx.switchTab({ url: '/pages/course/course' }) },
  goPlan()    { wx.switchTab({ url: '/pages/plan/plan' }) },
  goProfile() { wx.switchTab({ url: '/pages/profile/profile' }) },
  goAdmin()   { wx.navigateTo({ url: '/pages/admin/admin' }) }
})
