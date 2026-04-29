// pages/course/course.js
const app = getApp()

// 预定义课程配色（参考用户原图风格）
const COURSE_COLORS = [
  '#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A',
  '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99',
  '#FF99C3', '#FF7875'
]

// 学期开学日期（第1周的周一），修改这里适配你的学校
const SEMESTER_START = '2026-02-23'

Page({
  data: {
    weekDay: 1,
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    weekDates: ['', '', '', '', '', '', ''],  // 每天日期字符串
    todayDateStr: '',  // 今天的日期（如 '4/29'）
    weeks: [],
    currentWeek: 1,
    weekLabel: '第1周',
    courses: [],       // 列表视图数据
    gridData: [],      // 格子视图数据 (8行 x 5列)
    maxSection: 8,     // 固定8节课
    allCourses: [],    // 当周所有课程
    showGrid: true,    // 默认显示格子视图
    todayDay: 1,       // 今天星期几
    slideDir: '',      // 周次切换动画方向
    // 拖拽状态
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
    _cellPx: 0,
    _rowPx: 0,
    _scrollY: 0,
    _headerPx: 0,
    _gridLeftPx: 0
  },

  onLoad() {
    this.initWeeks()
    const today = new Date().getDay()
    const todayDay = today === 0 ? 7 : today
    // 计算当前是第几周，自动跳转
    const semesterStart = new Date(SEMESTER_START)
    const diffDays = Math.floor((new Date().getTime() - semesterStart.getTime()) / 86400000)
    const autoWeek = Math.max(1, Math.min(18, Math.floor(diffDays / 7) + 1))
    const weekLabel = autoWeek >= 17 ? '第' + autoWeek + '周（考试周）' : '第' + autoWeek + '周'
    this.calcWeekDates(autoWeek)
    this.setData({ todayDay, weekDay: todayDay, currentWeek: autoWeek, weekLabel })
    // 计算格子像素尺寸（rpx→px）
    const sysInfo = wx.getSystemInfoSync()
    const pxPerRpx = sysInfo.windowWidth / 750
    this._pxPerRpx = pxPerRpx
    this._cellPx = (sysInfo.windowWidth - 70 * pxPerRpx) / 7
    this._rowPx = 128 * pxPerRpx
    this._headerPx = 72 * pxPerRpx
    // 查询 scroll-view 实际屏幕位置
    setTimeout(() => {
      wx.createSelectorQuery().select('.grid-body').boundingClientRect(rect => {
        if (rect) {
          this._gridTopPx = rect.top
          this._gridLeftPx = rect.left
        }
      }).exec()
    }, 300)
  },

  onShow() {
    this.loadAllCourses()
  },

  initWeeks() {
    const weeks = []
    for (let i = 1; i <= 18; i++) {
      weeks.push(i)
    }
    this.setData({ weeks })
    this.calcWeekDates(1)
  },

  // 计算某一周每天的具体日期
  calcWeekDates(weekNum) {
    const start = new Date(SEMESTER_START)
    // 第weekNum周的周一 = 开学周一 + (weekNum-1)*7
    const monday = new Date(start.getTime() + (weekNum - 1) * 7 * 86400000)
    const dates = []
    const today = new Date()
    const todayStr = (today.getMonth() + 1) + '/' + today.getDate()
    let todayDateStr = ''
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000)
      const str = (d.getMonth() + 1) + '/' + d.getDate()
      dates.push(str)
      // 检查是否是今天
      if (d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()) {
        todayDateStr = str
      }
    }
    this.setData({ weekDates: dates, todayDateStr })
  },

  // 切换星期
  switchWeekDay(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ weekDay: index + 1 })
    this.loadCourses()
  },

  // 选择周次
  onWeekChange(e) {
    const week = this.data.weeks[e.detail.value]
    const label = week >= 17 ? '第' + week + '周（考试周）' : '第' + week + '周'
    // 阶段1：旧内容滑出
    this.setData({ slidePhase: 'out', slideDir: 'left' })
    setTimeout(() => {
      this.calcWeekDates(week)
      this.setData({ currentWeek: week, weekLabel: label, slidePhase: 'in' })
      this.loadAllCourses()
      setTimeout(() => this.setData({ slidePhase: '', slideDir: '' }), 300)
    }, 150)
  },

  // 切换视图模式
  switchView() {
    this.setData({ showGrid: !this.data.showGrid })
  },

  // 加载所有课程（用于格子视图）
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

  // 生成格子数据 + 课程叠层定位（用rpx固定值，不依赖百分比）
  generateGrid(allCourses) {
    const { currentWeek } = this.data
    const maxSection = 8
    const ROW_H = 128  // 每行128rpx（压低卡片）
    const COL_W_PERCENT = 100 / 7  // 每列宽度百分比（相对course-layer，7列）
    const GAP = 4  // 间隙rpx

    // 构建 8行 x 7列网格背景
    const grid = []
    for (let section = 1; section <= maxSection; section++) {
      const row = { section, cells: [] }
      for (let day = 1; day <= 7; day++) {
        row.cells.push({ day, section })
      }
      grid.push(row)
    }

    // 筛选当前周可见课程，计算rpx定位
    const visible = allCourses
      .filter(c => {
        // 周次范围筛选
        if (currentWeek < (c.startWeek || 1) || currentWeek > (c.endWeek || 18)) return false
        // 周类型筛选
        const wt = c.weekType || 0
        if (wt === 1 && currentWeek % 2 === 0) return false  // 单周
        if (wt === 2 && currentWeek % 2 === 1) return false  // 双周
        if (wt === 3 && currentWeek > 8) return false        // 前8周
        if (wt === 4 && currentWeek <= 8) return false       // 后8周
        return true
      })
      .map(c => {
        const span = (c.endSection || c.startSection) - c.startSection + 1
        return {
          ...c,
          _top: (c.startSection - 1) * ROW_H + GAP,
          _left: (c.weekDay - 1) * COL_W_PERCENT + 0.5,
          _width: COL_W_PERCENT - 1,
          _height: span * ROW_H - GAP * 2
        }
      })

    this.setData({ gridRows: grid, maxSection, visibleCourses: visible })
  },

  // 加载课程（列表视图）
  async loadCourses() {
    try {
      const res = await app.request({
        url: '/api/course/list',
        data: {
          weekDay: this.data.weekDay,
          week: this.data.currentWeek
        }
      })
      if (res.code === 200) {
        this.setData({ courses: (res.data || []).map((c, i) => ({
          ...c,
          color: c.color || COURSE_COLORS[i % COURSE_COLORS.length]
        })) })
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 添加课程
  addCourse() {
    wx.navigateTo({ url: '/pages/course/add' })
  },

  // 编辑课程（格子视图单击）
  editCourse(e) {
    if (this.data._dragStarted) return  // 拖拽中不触发编辑
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/course/add?id=' + id })
  },

  // 长按课程弹出菜单
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

  // ===== 格子视图触摸事件 =====
  onGridTouchStart(e) {
    if (this.data.dragging) return
    const touch = e.touches[0]
    this._touchStartX = touch.clientX
    this._touchStartY = touch.clientY
    this._swipeDetected = false
    this._scrollY = e.currentTarget.scrollTop || 0
    const startX = touch.clientX
    const startY = touch.clientY
    // 确保网格位置已查询
    if (!this._gridTopPx) {
      wx.createSelectorQuery().select('.grid-body').boundingClientRect(rect => {
        if (rect) {
          this._gridTopPx = rect.top
          this._gridLeftPx = rect.left
        }
      }).exec()
    }
    // 500ms长按触发拖拽
    this._dragTimer = setTimeout(() => {
      const course = this._findCourseAt(startX, startY)
      if (!course) return
      this.setData({
        dragging: true,
        _dragStarted: true,
        dragCourse: course,
        dragLeft: startX - this._cellPx / 2,
        dragTop: startY - this._rowPx / 2
      })
      wx.vibrateShort({ type: 'medium' })
    }, 500)
  },

  onGridTouchMove(e) {
    if (!this.data.dragging) {
      // 未进入拖拽，检查是否移动过远则取消长按
      const touch = e.touches[0]
      const dx = touch.clientX - this._touchStartX
      const dy = touch.clientY - this._touchStartY
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (adx > 10 || ady > 10) {
        clearTimeout(this._dragTimer)
        this.setData({ _dragStarted: false })
      }
      // 检测水平滑动（切换周次）
      if (adx > 60 && adx > ady * 1.5) {
        this._swipeDetected = true
        this._swipeDir = dx < 0 ? 'left' : 'right'
      }
      return
    }
    this._scrollY = e.currentTarget.scrollTop || 0
    const touch = e.touches[0]
    const gridTop = this._gridTopPx || 200
    const gridLeft = this._gridLeftPx || this._cellPx
    const col = Math.max(0, Math.min(6, Math.round((touch.clientX - gridLeft) / this._cellPx)))
    const row = Math.max(0, Math.min(this.data.maxSection - 1, Math.round((touch.clientY + this._scrollY - gridTop) / this._rowPx)))
    this.setData({
      dragLeft: touch.clientX - this._cellPx / 2,
      dragTop: touch.clientY - this._rowPx / 2,
      ghostCol: col,
      ghostRow: row
    })
  },

  onGridTouchEnd(e) {
    clearTimeout(this._dragTimer)
    if (!this.data.dragging) {
      this.setData({ _dragStarted: false })
      // 滑动切换周次
      if (this._swipeDetected) {
        this._swipeDetected = false
        const { currentWeek, weeks } = this.data
        let newWeek = currentWeek
        if (this._swipeDir === 'left' && currentWeek < weeks.length) {
          newWeek = currentWeek + 1
        } else if (this._swipeDir === 'right' && currentWeek > 1) {
          newWeek = currentWeek - 1
        }
        if (newWeek !== currentWeek) {
          const label = newWeek >= 17 ? '第' + newWeek + '周（考试周）' : '第' + newWeek + '周'
          const dir = this._swipeDir === 'left' ? 'left' : 'right'
          // 阶段1：旧内容滑出
          this.setData({ slidePhase: 'out', slideDir: dir })
          setTimeout(() => {
            // 阶段2：更新数据，新内容滑入
            this.calcWeekDates(newWeek)
            this.setData({ currentWeek: newWeek, weekLabel: label, slidePhase: 'in' })
            this.loadAllCourses()
            setTimeout(() => this.setData({ slidePhase: '', slideDir: '' }), 300)
          }, 150)
          wx.showToast({ title: label, icon: 'none', duration: 800 })
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
    // 没变位置→弹出菜单（编辑/删除）
    if (newDay === origDay && newSection === origSection) {
      this.setData({ dragging: false, dragCourse: null })
      const id = dragCourse.id
      wx.showActionSheet({
        itemList: ['编辑课程', '删除课程'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.navigateTo({ url: '/pages/course/add?id=' + id })
          } else if (res.tapIndex === 1) {
            this.deleteCourse({ currentTarget: { dataset: { id } } })
          }
        }
      })
      return
    }
    // 计算目标rpx位置
    const COL_W = 100 / 7
    const ROW_H = 128
    const GAP = 4
    const span = (dragCourse.endSection || dragCourse.startSection) - dragCourse.startSection + 1
    const targetLeft = (newDay - 1) * COL_W + 0.5
    const targetTop = newSection * ROW_H + GAP
    // 更新allCourses
    const allCourses = this.data.allCourses.map(c => {
      if (c.id === dragCourse.id) {
        return { ...c, weekDay: newDay, startSection: newSection, endSection: newSection + span - 1 }
      }
      return c
    })
    this.setData({ allCourses })
    this.generateGrid(allCourses)
    this.loadCourses()
    // 调用后端更新
    app.request({
      url: '/api/course/update',
      method: 'POST',
      data: {
        id: dragCourse.id,
        weekDay: newDay,
        startSection: newSection,
        endSection: newSection + span - 1
      }
    }).then(res => {
      if (res.code === 200) {
        wx.showToast({ title: '移动成功', icon: 'success' })
      } else {
        wx.showToast({ title: res.msg || '移动失败', icon: 'none' })
        // 回滚
        const rollback = allCourses.map(c => {
          if (c.id === dragCourse.id) {
            return { ...c, weekDay: origDay, startSection: origSection, endSection: origSection + span - 1 }
          }
          return c
        })
        this.setData({ allCourses })
        this.generateGrid(rollback)
        this.loadCourses()
      }
    }).catch(() => {
      wx.showToast({ title: '网络错误', icon: 'none' })
      const rollback = allCourses.map(c => {
        if (c.id === dragCourse.id) {
          return { ...c, weekDay: origDay, startSection: origSection, endSection: origSection + span - 1 }
        }
        return c
      })
      this.setData({ allCourses })
      this.generateGrid(rollback)
      this.loadCourses()
    })
    this.setData({ dragging: false, dragCourse: null })
  },

  // 根据屏幕坐标查找课程
  _findCourseAt(clientX, clientY) {
    const gridTop = this._gridTopPx || 200
    const gridLeft = this._gridLeftPx || this._cellPx
    const col = Math.max(0, Math.min(6, Math.round((clientX - gridLeft) / this._cellPx)))
    const row = Math.max(0, Math.min(this.data.maxSection - 1, Math.round((clientY + this._scrollY - gridTop) / this._rowPx)))
    return this.data.visibleCourses.find(c => {
      const day = c.weekDay - 1
      const startRow = c.startSection - 1
      const endRow = (c.endSection || c.startSection) - 1
      return col === day && row >= startRow && row <= endRow
    })
  },

  // 删除课程
  deleteCourse(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这门课程吗？',
      confirmColor: '#F56C6C',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: '/api/course/' + id,
              method: 'DELETE'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadAllCourses()
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
