// pages/course/course.js
const app = getApp()

Page({
  data: {
    weekDay: 1,
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    courses: [],
    weeks: [],
    currentWeek: 1,
    maxWeek: 18
  },

  onLoad() {
    this.initWeeks()
  },

  onShow() {
    this.loadCourses()
  },

  initWeeks() {
    const weeks = []
    for (let i = 1; i <= 20; i++) {
      weeks.push(i)
    }
    this.setData({ weeks, maxWeek: 20 })
  },

  // 切换星期
  switchWeekDay(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ weekDay: index + 1 })
    this.loadCourses()
  },

  // 选择周次
  onWeekChange(e) {
    const week = this.data.weeks[e.detail.value]
    this.setData({ currentWeek: week })
    this.loadCourses()
  },

  // 加载课程
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
        this.setData({ courses: res.data || [] })
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
            this.loadCourses()
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
