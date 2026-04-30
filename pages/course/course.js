// pages/course/course.js
const app = getApp()

const COURSE_COLORS = [
  '#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A',
  '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99',
  '#FF99C3', '#FF7875'
]

const SEMESTER_START = '2026-02-23'

// 行高（rpx）
const ROW_H = 120

// 节次时间表
const TIME_MAP = [
  { start: '8:00', end: '8:45' },
  { start: '8:55', end: '9:40' },
  { start: '10:00', end: '10:45' },
  { start: '10:55', end: '11:40' },
  { start: '14:20', end: '15:05' },
  { start: '15:15', end: '16:00' },
  { start: '16:10', end: '16:55' },
  { start: '17:05', end: '17:50' },
  { start: '19:00', end: '19:45' },
  { start: '19:55', end: '20:40' },
  { start: '20:50', end: '21:35' }
]

Page({
  data: {
    weekDay: 1,
    weekDays: ['一', '二', '三', '四', '五', '六', '日'],
    weekDates: ['', '', '', '', '', '', ''],
    monthStr: '',
    weeks: [],
    currentWeek: 1,
    courses: [],
    maxSection: 12,
    allCourses: [],
    todayDay: 1,
    gridRows: [],
    visibleCourses: [],
    vLines: [0, 1, 2, 3, 4, 5, 6, 7],
    ROW_H: ROW_H
  },

  onLoad() {
    this.initWeeks()
    const today = new Date().getDay()
    const todayDay = today === 0 ? 7 : today
    const semesterStart = new Date(SEMESTER_START)
    const diffDays = Math.floor((new Date().getTime() - semesterStart.getTime()) / 86400000)
    const autoWeek = Math.max(1, Math.min(18, Math.floor(diffDays / 7) + 1))
    this.calcWeekDates(autoWeek)
    this.setData({ todayDay, weekDay: todayDay, currentWeek: autoWeek })
  },

  onShow() { this.loadAllCourses() },

  initWeeks() {
    const weeks = []
    for (let i = 1; i <= 18; i++) weeks.push(i)
    this.setData({ weeks })
  },

  calcWeekDates(weekNum) {
    const start = new Date(SEMESTER_START)
    const monday = new Date(start.getTime() + (weekNum - 1) * 7 * 86400000)
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000)
      dates.push((d.getMonth() + 1) + '/' + d.getDate())
    }
    // 月份
    const m = new Date(monday.getTime())
    const monthStr = (m.getMonth() + 1) + '月'
    this.setData({ weekDates: dates, monthStr })
  },

  onWeekChange(e) {
    const week = this.data.weeks[e.detail.value]
    this.calcWeekDates(week)
    this.setData({ currentWeek: week })
    this.loadAllCourses()
  },

  async loadAllCourses() {
    try {
      const res = await app.request({ url: '/api/course/list' })
      if (res.code === 200) {
        const all = (res.data || []).map((c, i) => ({
          ...c,
          color: c.color || COURSE_COLORS[i % COURSE_COLORS.length]
        }))
        this.setData({ allCourses: all })
        this.generateGrid(all)
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  generateGrid(allCourses) {
    const { currentWeek, maxSection } = this.data

    // 构造节次行数据（含时间）
    const gridRows = []
    for (let section = 1; section <= maxSection; section++) {
      const tm = TIME_MAP[section - 1] || { start: '', end: '' }
      gridRows.push({ section, startTime: tm.start, endTime: tm.end })
    }

    // 筛选当前周可见课程
    const visible = allCourses
      .filter(c => {
        if (currentWeek < (c.startWeek || 1) || currentWeek > (c.endWeek || 18)) return false
        const wt = c.weekType || 0
        if (wt === 1 && currentWeek % 2 === 0) return false
        if (wt === 2 && currentWeek % 2 === 1) return false
        if (wt === 3 && currentWeek > 8) return false
        if (wt === 4 && currentWeek <= 8) return false
        return true
      })
      .map((c, idx) => {
        const span = (c.endSection || c.startSection) - c.startSection + 1
        const col = (c.weekDay || 1) - 1 // 0-6
        const row = (c.startSection || 1) - 1 // 0-based
        return {
          ...c,
          _col: col,                           // 列索引 0-6
          _top: row * ROW_H + 5,              // rpx 定位（kezhidao: (nums-1)*60+2.5)*2）
          _height: span * ROW_H - 10          // rpx 高度（kezhidao: (span*60-5)*2）
        }
      })

    this.setData({ gridRows, maxSection, visibleCourses: visible })
  },

  addCourse() { wx.navigateTo({ url: '/pages/course/add' }) },

  editCourse(e) {
    wx.navigateTo({ url: '/pages/course/add?id=' + e.currentTarget.dataset.id })
  },

  longPressCourse(e) {
    const id = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.editCourse(e)
        else if (res.tapIndex === 1) this.deleteCourse(e)
      }
    })
  },

  deleteCourse(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这门课程吗？',
      confirmColor: '#F56C6C',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({ url: '/api/course/' + id, method: 'DELETE' })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadAllCourses()
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  async onPullDownRefresh() {
    try { await this.loadAllCourses() } catch (e) {}
    wx.stopPullDownRefresh()
  }
})
