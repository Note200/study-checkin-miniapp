// pages/index/index.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    todayCourse: [],
    todayPlans: [],
    checkinStats: { total: 0, done: 0, rate: 0 }
  },

  onShow() {
    this.setData({ userInfo: app.globalData.userInfo })
    this.loadData()
  },

  async loadData() {
    await Promise.all([
      this.loadTodayCourse(),
      this.loadTodayPlans(),
      this.loadCheckinStats()
    ])
  },

  // 加载今日课程
  async loadTodayCourse() {
    try {
      const res = await app.request({ url: '/api/course/today' })
      if (res.code === 200) {
        this.setData({ todayCourse: res.data || [] })
      }
    } catch (e) {
      console.log('加载课程失败')
    }
  },

  // 加载今日计划
  async loadTodayPlans() {
    try {
      const res = await app.request({ url: '/api/plan/list' })
      if (res.code === 200) {
        this.setData({ todayPlans: res.data || [] })
      }
    } catch (e) {
      console.log('加载计划失败')
    }
  },

  // 加载打卡统计
  async loadCheckinStats() {
    try {
      const res = await app.request({ url: '/api/checkin/stats' })
      if (res.code === 200) {
        this.setData({ checkinStats: res.data })
      }
    } catch (e) {
      console.log('加载打卡统计失败')
    }
  },

  // 跳转到打卡页面
  goCheckin() {
    wx.switchTab({ url: '/pages/checkin/checkin' })
  },

  // 跳转到课程表
  goCourse() {
    wx.switchTab({ url: '/pages/course/course' })
  },

  // 跳转到计划
  goPlan() {
    wx.switchTab({ url: '/pages/plan/plan' })
  }
})
