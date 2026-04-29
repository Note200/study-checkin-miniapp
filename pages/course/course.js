// pages/course/course.js
const app = getApp()

// 预定义课程配色（参考用户原图风格）
const COURSE_COLORS = [
  '#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A',
  '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99',
  '#FF99C3', '#FF7875'
]

Page({
  data: {
    weekDay: 1,
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    weeks: [],
    currentWeek: 1,
    courses: [],       // 列表视图数据
    gridData: [],      // 格子视图数据 (8行 x 7列)
    maxSection: 8,     // 固定8节课
    allCourses: [],    // 当周所有课程
    showGrid: true,    // 默认显示格子视图
    todayDay: 1        // 今天星期几
  },

  onLoad() {
    this.initWeeks()
    const today = new Date().getDay()
    const todayDay = today === 0 ? 7 : today
    this.setData({ todayDay, weekDay: todayDay })
  },

  onShow() {
    this.loadAllCourses()
  },

  initWeeks() {
    const weeks = []
    for (let i = 1; i <= 20; i++) {
      weeks.push(i)
    }
    this.setData({ weeks })
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
    this.setData({ currentWeek: week })
    this.loadAllCourses()
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

  // 生成格子数据（每行=一节课，课程卡片直接放在起始格子里，跨行用绝对定位）
  generateGrid(allCourses) {
    const { currentWeek } = this.data
    const maxSection = 8

    // 先建一个 8x7 的空网格，标记哪些格子被跨行课程占用
    const grid = []
    for (let s = 1; s <= maxSection; s++) {
      const row = { section: s, cells: [] }
      for (let d = 1; d <= 7; d++) {
        row.cells.push({ day: d, section: s, course: null, isHidden: false })
      }
      grid.push(row)
    }

    // 把课程放入网格（只放起始节，跨行的标记占用格子）
    const visibleCourses = allCourses.filter(c =>
      c._showInGrid && (c.startWeek || 1) <= currentWeek && (c.endWeek || 20) >= currentWeek
    )

    visibleCourses.forEach(c => {
      const s = c.startSection
      const d = c.weekDay
      const span = (c.endSection || c.startSection) - c.startSection + 1
      if (s >= 1 && s <= maxSection && d >= 1 && d <= 7) {
        grid[s - 1].cells[d - 1].course = { ...c, span }
        // 标记被跨行占用的格子为隐藏
        for (let i = 1; i < span; i++) {
          if (s - 1 + i < maxSection) {
            grid[s - 1 + i].cells[d - 1].isHidden = true
          }
        }
      }
    })

    this.setData({ gridRows: grid, maxSection, allCourses: visibleCourses })
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

  // 编辑课程
  editCourse(e) {
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
