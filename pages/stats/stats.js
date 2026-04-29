// pages/stats/stats.js
const app = getApp()

Page({
  data: {
    totalDays: 0,
    totalHours: 0,
    totalTasks: 0,
    weekData: [],
    weekTotal: '0.0',
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth() + 1,
    calendarDays: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    taskStats: []
  },

  onShow() {
    this.loadStats()
    this.loadWeekData()
    this.loadCalendar()
    this.loadTaskStats()
  },

  async loadStats() {
    try {
      const res = await app.request({ url: '/api/checkin/stats' })
      if (res.code === 200 && res.data) {
        this.setData({
          totalDays: res.data.totalDays || 0,
          totalHours: res.data.totalHours || 0,
          totalTasks: res.data.totalTasks || 0
        })
      }
    } catch (e) {}
  },

  async loadWeekData() {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const today = new Date().getDay()
    const todayIdx = today === 0 ? 6 : today - 1
    try {
      const res = await app.request({ url: '/api/checkin/week' })
      if (res.code === 200 && res.data) {
        const raw = res.data
        const maxH = Math.max(...raw.map(r => r.hours || 0), 1)
        const weekData = days.map((day, i) => {
          const h = (raw[i] && raw[i].hours) || 0
          return { day, hours: h, height: Math.round((h / maxH) * 180) + 20, isToday: i === todayIdx }
        })
        const weekTotal = raw.reduce((s, r) => s + (r.hours || 0), 0).toFixed(1)
        this.setData({ weekData, weekTotal })
      }
    } catch (e) {}
  },

  async loadCalendar() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = now.getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()

    // 获取打卡记录
    let checkedDays = []
    try {
      const res = await app.request({ url: '/api/checkin/calendar/days', data: { year, month } })
      if (res.code === 200 && res.data) {
        checkedDays = res.data
      }
    } catch (e) {}

    const calendarDays = []
    // 填充空白天
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ day: '', isEmpty: true, date: '' })
    }
    // 填充日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      calendarDays.push({
        day: d,
        date: dateStr,
        isToday: d === today,
        checked: checkedDays.includes(dateStr),
        isEmpty: false
      })
    }
    this.setData({ calendarDays, calendarYear: year, calendarMonth: month })
  },

  async loadTaskStats() {
    try {
      const res = await app.request({ url: '/api/checkin/tasks' })
      if (res.code === 200 && res.data) {
        const taskStats = res.data.map(t => ({
          id: t.id,
          title: t.title,
          checkedDays: t.checkedDays || 0,
          targetDays: t.targetDays || 30,
          rate: t.targetDays ? Math.min(100, Math.round((t.checkedDays || 0) / t.targetDays * 100)) : 0
        }))
        this.setData({ taskStats })
      }
    } catch (e) {}
  }
})
