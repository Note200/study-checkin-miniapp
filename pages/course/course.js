// pages/course/course.js
const app = getApp()

const COURSE_COLORS = [
  '#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A',
  '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99',
  '#FF99C3', '#FF7875'
]

const SEMESTER_START = '2026-02-23'

// 布局常量（rpx，与 WXSS 同步）
const SEC_W = 70   // 节次标签列宽（加宽防挤压）
const COL_W = 97   // 每列宽 = (750-70)/7 ≈ 97
const ROW_H = 160  // 每行高
const CARD_GAP = 4 // 卡片左右间距

Page({
  data: {
    weekDay: 1,
    weekDays: ['一', '二', '三', '四', '五', '六', '日'],
    weekDates: ['', '', '', '', '', '', ''],
    todayDateStr: '',
    weeks: [],
    currentWeek: 1,
    courses: [],
    maxSection: 8,
    allCourses: [],
    showGrid: true,
    todayDay: 1,
    viewAnim: false,
    listSlideDir: '',
    gridRows: [],
    visibleCourses: [],
    // 布局常量暴露给 WXML
    SEC_W: SEC_W,
    COL_W: COL_W,
    ROW_H: ROW_H,
    // 竖线位置数组（WXML 不能直接算 [0,1,...,7]）
    vLines: [0, 1, 2, 3, 4, 5, 6, 7],
    // 拖拽
    dragging: false,
    dragCourse: null,
    dragLeft: 0,
    dragTop: 0,
    ghostCol: 0,
    ghostRow: 0,
    _touchStartX: 0,
    _touchStartY: 0,
    _dragTimer: null,
    _dragStarted: false,
    _scrollY: 0
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
    const sysInfo = wx.getSystemInfoSync()
    this._pxPerRpx = sysInfo.windowWidth / 750
    setTimeout(() => {
      wx.createSelectorQuery().select('.grid-inner').boundingClientRect(rect => {
        if (rect) { this._gridTopPx = rect.top; this._gridLeftPx = rect.left }
      }).exec()
    }, 300)
  },

  onShow() { this.loadAllCourses() },

  initWeeks() {
    const weeks = []
    for (let i = 1; i <= 18; i++) weeks.push(i)
    this.setData({ weeks })
    this.calcWeekDates(1)
  },

  calcWeekDates(weekNum) {
    const start = new Date(SEMESTER_START)
    const monday = new Date(start.getTime() + (weekNum - 1) * 7 * 86400000)
    const dates = []
    const today = new Date()
    let todayDateStr = ''
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000)
      const str = (d.getMonth() + 1) + '/' + d.getDate()
      dates.push(str)
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
        todayDateStr = str
      }
    }
    this.setData({ weekDates: dates, todayDateStr })
  },

  switchWeekDay(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const dir = index + 1 > this.data.weekDay ? 'left' : 'right'
    this.setData({ listSlideDir: dir })
    setTimeout(() => {
      this.setData({ weekDay: index + 1, listSlideDir: '' })
      this.loadCourses()
    }, 200)
  },

  onWeekChange(e) {
    const week = this.data.weeks[e.detail.value]
    this.calcWeekDates(week)
    this.setData({ currentWeek: week })
    this.loadAllCourses()
  },

  switchView() {
    this.setData({ showGrid: !this.data.showGrid, viewAnim: true })
    setTimeout(() => this.setData({ viewAnim: false }), 400)
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
        this.loadCourses()
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  generateGrid(allCourses) {
    const { currentWeek, maxSection } = this.data

    const grid = []
    for (let section = 1; section <= maxSection; section++) {
      grid.push({ section })
    }

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
        const col = (c.weekDay || 1) - 1
        const row = (c.startSection || 1) - 1
        return {
          ...c,
          _top: row * ROW_H + CARD_GAP,
          _left: SEC_W + col * COL_W + CARD_GAP,
          _width: COL_W - CARD_GAP * 2,
          _height: span * ROW_H - CARD_GAP * 2,
          _animDelay: idx * 80
        }
      })

    this.setData({ gridRows: grid, maxSection, visibleCourses: visible })

    // 弹入动画：单次 setData，用 step delay 做错开
    const animMap = {}
    visible.forEach((c, idx) => {
      const anim = wx.createAnimation({ timingFunction: 'ease-out' })
      anim.scale(0.3).opacity(0).step({ duration: 0 })
      anim.scale(1).opacity(1).step({ duration: 400, delay: idx * 80 })
      animMap['visibleCourses[' + idx + ']._anim'] = anim.export()
    })
    this.setData(animMap)
  },

  async loadCourses() {
    try {
      const res = await app.request({
        url: '/api/course/list',
        data: { weekDay: this.data.weekDay, week: this.data.currentWeek }
      })
      if (res.code === 200) {
        this.setData({ courses: (res.data || []).map((c, i) => ({
          ...c, color: c.color || COURSE_COLORS[i % COURSE_COLORS.length]
        })) })
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  addCourse() { wx.navigateTo({ url: '/pages/course/add' }) },

  editCourse(e) {
    if (this.data._dragStarted) return
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

  // ===== 触摸事件：左滑切周 =====
  onGridTouchStart(e) {
    if (this.data.dragging) return
    const touch = e.touches[0]
    this._touchStartX = touch.clientX
    this._touchStartY = touch.clientY
    this._swipeDetected = false
    this._scrollY = e.currentTarget.scrollTop || 0
    const startX = touch.clientX
    const startY = touch.clientY
    if (!this._gridTopPx && this._gridTopPx !== 0) {
      wx.createSelectorQuery().select('.grid-inner').boundingClientRect(rect => {
        if (rect) { this._gridTopPx = rect.top; this._gridLeftPx = rect.left }
      }).exec()
    }
    this._dragTimer = setTimeout(() => {
      const course = this._findCourseAt(startX, startY)
      if (!course) return
      const ghostW = COL_W * this._pxPerRpx
      const ghostH = ROW_H * this._pxPerRpx
      this.setData({
        dragging: true, _dragStarted: true, dragCourse: course,
        dragLeft: startX - ghostW / 2, dragTop: startY - ghostH / 2
      })
      wx.vibrateShort({ type: 'medium' })
    }, 500)
  },

  onGridTouchMove(e) {
    if (!this.data.dragging) {
      const touch = e.touches[0]
      const dx = Math.abs(touch.clientX - this._touchStartX)
      const dy = Math.abs(touch.clientY - this._touchStartY)
      if (dx > 10 || dy > 10) {
        clearTimeout(this._dragTimer)
        this.setData({ _dragStarted: false })
      }
      if (dx > 60 && dx > dy * 1.5) {
        this._swipeDetected = true
        this._swipeDir = (touch.clientX - this._touchStartX) < 0 ? 'left' : 'right'
      }
      return
    }
    this._scrollY = e.currentTarget.scrollTop || 0
    const touch = e.touches[0]
    const gridTop = this._gridTopPx || 200
    const gridLeft = this._gridLeftPx || 0
    const pxPerRpx = this._pxPerRpx
    const col = Math.max(0, Math.min(6, Math.floor((touch.clientX - gridLeft - SEC_W * pxPerRpx) / (COL_W * pxPerRpx))))
    const row = Math.max(0, Math.min(this.data.maxSection - 1, Math.floor((touch.clientY + this._scrollY - gridTop) / (ROW_H * pxPerRpx))))
    this.setData({
      dragLeft: touch.clientX - (COL_W * pxPerRpx) / 2,
      dragTop: touch.clientY - (ROW_H * pxPerRpx) / 2,
      ghostCol: col, ghostRow: row
    })
  },

  onGridTouchEnd(e) {
    clearTimeout(this._dragTimer)
    if (!this.data.dragging) {
      this.setData({ _dragStarted: false })
      if (this._swipeDetected) {
        this._swipeDetected = false
        const { currentWeek, weeks } = this.data
        let newWeek = currentWeek
        if (this._swipeDir === 'left' && currentWeek < weeks.length) newWeek = currentWeek + 1
        else if (this._swipeDir === 'right' && currentWeek > 1) newWeek = currentWeek - 1
        if (newWeek !== currentWeek) {
          this.calcWeekDates(newWeek)
          this.setData({ currentWeek: newWeek })
          this.loadAllCourses()
          wx.showToast({ title: '第' + newWeek + '周', icon: 'none', duration: 800 })
        }
      }
      return
    }
    const { dragCourse, ghostCol, ghostRow } = this.data
    this.setData({ _dragStarted: false })
    const newDay = ghostCol + 1
    const newSection = ghostRow + 1
    const origDay = dragCourse.weekDay
    const origSection = dragCourse.startSection
    if (newDay === origDay && newSection === origSection) {
      this.setData({ dragging: false, dragCourse: null })
      wx.showActionSheet({
        itemList: ['编辑课程', '删除课程'],
        success: (res) => {
          if (res.tapIndex === 0) wx.navigateTo({ url: '/pages/course/add?id=' + dragCourse.id })
          else if (res.tapIndex === 1) this.deleteCourse({ currentTarget: { dataset: { id: dragCourse.id } } })
        }
      })
      return
    }
    const span = (dragCourse.endSection || dragCourse.startSection) - dragCourse.startSection + 1
    const allCourses = this.data.allCourses.map(c => {
      if (c.id === dragCourse.id) return { ...c, weekDay: newDay, startSection: newSection, endSection: newSection + span - 1 }
      return c
    })
    this.setData({ allCourses })
    this.generateGrid(allCourses)
    this.loadCourses()
    app.request({
      url: '/api/course/update', method: 'PUT',
      data: { id: dragCourse.id, weekDay: newDay, startSection: newSection, endSection: newSection + span - 1 }
    }).then(res => {
      if (res.code === 200) wx.showToast({ title: '移动成功', icon: 'success' })
      else {
        wx.showToast({ title: res.msg || '移动失败', icon: 'none' })
        const rb = allCourses.map(c => c.id === dragCourse.id ? { ...c, weekDay: origDay, startSection: origSection, endSection: origSection + span - 1 } : c)
        this.setData({ allCourses: rb }); this.generateGrid(rb); this.loadCourses()
      }
    }).catch(() => {
      wx.showToast({ title: '网络错误', icon: 'none' })
      const rb = allCourses.map(c => c.id === dragCourse.id ? { ...c, weekDay: origDay, startSection: origSection, endSection: origSection + span - 1 } : c)
      this.setData({ allCourses: rb }); this.generateGrid(rb); this.loadCourses()
    })
    this.setData({ dragging: false, dragCourse: null })
  },

  _findCourseAt(clientX, clientY) {
    const gridTop = this._gridTopPx || 200
    const gridLeft = this._gridLeftPx || 0
    const pxPerRpx = this._pxPerRpx || 1
    const col = Math.max(0, Math.min(6, Math.floor((clientX - gridLeft - SEC_W * pxPerRpx) / (COL_W * pxPerRpx))))
    const row = Math.max(0, Math.min(this.data.maxSection - 1, Math.floor((clientY + this._scrollY - gridTop) / (ROW_H * pxPerRpx))))
    return this.data.visibleCourses.find(c => {
      const day = (c.weekDay || 1) - 1
      const startRow = (c.startSection || 1) - 1
      const endRow = (c.endSection || c.startSection) - 1
      return col === day && row >= startRow && row <= endRow
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
