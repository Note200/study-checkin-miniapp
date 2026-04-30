// pages/course/course.js
const app = getApp()

const COURSE_COLORS = [
  '#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A',
  '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99',
  '#FF99C3', '#FF7875'
]

const SEMESTER_START = '2026-02-23'
const ROW_H = 120
const LEFT_W = 70 // 左侧节次列宽度 rpx

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
    weekDays: ['一', '二', '三', '四', '五', '六', '日'],
    weekDates: ['', '', '', '', '', '', ''],
    monthStr: '',
    weeks: [],
    currentWeek: 1,
    todayDay: 1,
    gridRows: [],
    visibleCourses: [],
    maxSection: 12,
    ROW_H: ROW_H,
    LEFT_W: LEFT_W,
    // 滑动切周
    touchStartX: 0,
    touchStartY: 0,
    swiping: false
  },

  onLoad() {
    this.initWeeks()
    const today = new Date().getDay()
    const todayDay = today === 0 ? 7 : today
    const semesterStart = new Date(SEMESTER_START)
    const diffDays = Math.floor((new Date().getTime() - semesterStart.getTime()) / 86400000)
    const autoWeek = Math.max(1, Math.min(18, Math.floor(diffDays / 7) + 1))
    this.calcWeekDates(autoWeek)
    this.setData({ todayDay, currentWeek: autoWeek })
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
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000)
      dates.push((d.getMonth() + 1) + '/' + d.getDate())
    }
    const monthStr = (monday.getMonth() + 1) + '月'
    this.setData({ weekDates: dates, monthStr })
  },

  // picker 切周
  onWeekChange(e) {
    const week = this.data.weeks[e.detail.value]
    this.switchToWeek(week)
  },

  // 滑动手势切周
  onGridTouchStart(e) {
    const t = e.touches[0]
    this.setData({ touchStartX: t.clientX, touchStartY: t.clientY, swiping: false })
  },

  onGridTouchMove(e) {
    const t = e.touches[0]
    const dx = t.clientX - this.data.touchStartX
    const dy = t.clientY - this.data.touchStartY
    // 水平滑动超过40px且水平位移>垂直位移
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this.setData({ swiping: true })
    }
  },

  onGridTouchEnd(e) {
    if (!this.data.swiping) return
    const t = e.changedTouches[0]
    const dx = t.clientX - this.data.touchStartX
    if (dx < -40) {
      // 左滑 → 下一周
      this.switchToWeek(Math.min(18, this.data.currentWeek + 1))
    } else if (dx > 40) {
      // 右滑 → 上一周
      this.switchToWeek(Math.max(1, this.data.currentWeek - 1))
    }
    this.setData({ swiping: false })
  },

  switchToWeek(week) {
    if (week === this.data.currentWeek) return
    wx.vibrateShort({ type: 'light' })
    this.calcWeekDates(week)
    this.setData({ currentWeek: week })
    this.generateGrid(this.data.allCourses)
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

    // 列宽 = (750 - 左侧列宽) / 7
    const gridW = 750 - LEFT_W
    const colW = gridW / 7

    // 构造节次行数据
    const gridRows = []
    for (let section = 1; section <= maxSection; section++) {
      const tm = TIME_MAP[section - 1] || { start: '', end: '' }
      gridRows.push({ section, startTime: tm.start, endTime: tm.end })
    }

    // 筛选当前周课程
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
          // 用 top/left 绝对定位，不用 margin
          _top: row * ROW_H + 4,
          _left: col * colW + 3,
          _width: colW - 6,
          _height: span * ROW_H - 8
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
