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

  // 生成格子数据 + 课程叠层定位（用rpx固定值，不依赖百分比）
  generateGrid(allCourses) {
    const { currentWeek } = this.data
    const maxSection = 8
    const ROW_H = 160  // 每行160rpx
    const COL_W_PERCENT = 100 / 7  // 每列宽度百分比（相对course-layer）
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
      .filter(c => (c.startWeek || 1) <= currentWeek && (c.endWeek || 20) >= currentWeek)
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
