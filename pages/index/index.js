// pages/index/index.js
const app = getApp()

// 每日名言（按日期固定，每天不同）
const DAILY_QUOTES = [
  { text: '学而不思则罔，思而不学则殆', author: '孔子' },
  { text: '业精于勤，荒于嬉；行成于思，毁于随', author: '韩愈' },
  { text: '书山有路勤为径，学海无涯苦作舟', author: '韩愈' },
  { text: '千里之行，始于足下', author: '老子' },
  { text: '不积跬步，无以至千里', author: '荀子' },
  { text: '吾生也有涯，而知也无涯', author: '庄子' },
  { text: '三人行，必有我师焉', author: '孔子' },
  { text: '温故而知新，可以为师矣', author: '孔子' },
  { text: '知之者不如好之者，好之者不如乐之者', author: '孔子' },
  { text: '读书破万卷，下笔如有神', author: '杜甫' },
  { text: '黑发不知勤学早，白首方悔读书迟', author: '颜真卿' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来', author: '佚名' },
  { text: '天行健，君子以自强不息', author: '《周易》' },
  { text: '路漫漫其修远兮，吾将上下而求索', author: '屈原' },
  { text: '少壮不努力，老大徒伤悲', author: '《长歌行》' },
  { text: '博学之，审问之，慎思之，明辨之，笃行之', author: '《中庸》' },
  { text: '纸上得来终觉浅，绝知此事要躬行', author: '陆游' },
  { text: '问渠那得清如许，为有源头活水来', author: '朱熹' },
  { text: '千磨万击还坚劲，任尔东西南北风', author: '郑燮' },
  { text: '苟日新，日日新，又日新', author: '《大学》' }
]

// 每日激励语（随机显示）
const MOTIVATIONS = [
  '坚持就是胜利 💪',
  '今天也要元气满满！✨',
  '学无止境，砥砺前行 📖',
  '每一次打卡都是进步 🚀',
  '积少成多，聚沙成塔 🌟',
  '今天的努力是明天的收获 🌱',
  '比你优秀的人还在努力 ⚡',
  '学习让未来更有底气 💎',
  '日拱一卒，功不唐捐 📚',
  '越努力越幸运 🍀'
]

// 成就里程碑
const MILESTONES = [
  { days: 3,  emoji: '🌱', label: '萌芽' },
  { days: 7,  emoji: '🌿', label: '一周达人' },
  { days: 14, emoji: '🌳', label: '两周坚持' },
  { days: 30, emoji: '🏆', label: '月度冠军' },
  { days: 100, emoji: '💎', label: '百日学霸' }
]

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    greeting: '早上好',
    motivation: '',
    dailyQuote: { text: '', author: '' },
    notice: '',
    todayRate: 0,
    studyHours: { done: 0, target: 4, rate: 0 },
    todayTasks: [],
    weekData: [],
    weekTotal: 0,
    streakDays: 0,
    milestone: null,
    todayCourses: [],
    touchStartX: 0,
    touchCurrentX: 0,
    swipingIndex: -1,
    tooltipIndex: -1
  },

  onShow() {
    const info = app.globalData.userInfo
    // 每日名言（按日期固定）
    const now = new Date()
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    const quote = DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]
    this.setData({
      userInfo: info,
      isAdmin: info && info.role === 1,
      greeting: this._getGreeting(),
      motivation: MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)],
      dailyQuote: quote
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
      this.loadNotice(),
      this.loadStats(),
      this.loadTodayCourses()
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
            studyHours: { done: d.done || 0, target: d.total || 0, rate: d.rate || 0 }
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
        const raw = res.data // [{day, hours}]
        const maxH = Math.max(...raw.map(r => r.hours || 0), 1)
        const weekData = days.map((day, i) => {
          const h = (raw[i] && raw[i].hours) || 0
          return { day, hours: h, height: Math.round((h / maxH) * 140) + 20, isToday: i === todayIdx }
        })
        const weekTotal = raw.reduce((s, r) => s + (r.hours || 0), 0).toFixed(1)
        this.setData({ weekData, weekTotal })
      }
    } catch (e) {
      console.log('加载本周数据失败')
    }
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

  // 加载打卡统计（连续天数、本月天数等）
  async loadStats() {
    try {
      const res = await app.request({ url: '/api/checkin/stats' })
      if (res.code === 200 && res.data) {
        const streak = res.data.streakDays || 0
        // 匹配成就里程碑
        let milestone = null
        for (let i = MILESTONES.length - 1; i >= 0; i--) {
          if (streak >= MILESTONES[i].days) {
            milestone = MILESTONES[i]
            break
          }
        }
        this.setData({
          streakDays: streak,
          milestone: milestone
        })
      }
    } catch (e) {}
  },

  // 加载今日课程
  async loadTodayCourses() {
    try {
      const res = await app.request({ url: '/api/course/today' })
      if (res.code === 200) {
        this.setData({ todayCourses: res.data || [] })
      }
    } catch (e) {}
  },

  // 柱状图点击显示时长
  onBarTap(e) {
    const idx = e.currentTarget.dataset.index
    const cur = this.data.tooltipIndex
    // 点同一根柱：关闭；点不同柱：切换
    this.setData({ tooltipIndex: cur === idx ? -1 : idx })
    // 1.5s 后自动消失
    if (this._tooltipTimer) clearTimeout(this._tooltipTimer)
    if (cur !== idx) {
      this._tooltipTimer = setTimeout(() => {
        this.setData({ tooltipIndex: -1 })
      }, 1500)
    }
  },

  // 导航方法
  goCheckin() { wx.switchTab({ url: '/pages/checkin/checkin' }) },
  goCourse()  { wx.switchTab({ url: '/pages/course/course' }) },
  goPlan()    { wx.switchTab({ url: '/pages/plan/plan' }) },
  goProfile() { wx.switchTab({ url: '/pages/profile/profile' }) },
  goAdmin()   { wx.navigateTo({ url: '/pages/admin/admin' }) },
  goRank()    { wx.navigateTo({ url: '/pages/rank/rank' }) },
  goCircle()  { wx.navigateTo({ url: '/pages/circle/circle' }) },
  goStats()   { wx.navigateTo({ url: '/pages/stats/stats' }) },

  // 左滑手势
  onSwipeStart(e) {
    this.setData({ touchStartX: e.touches[0].clientX, swipingIndex: e.currentTarget.dataset.index })
  },
  onSwipeMove(e) {
    this.setData({ touchCurrentX: e.touches[0].clientX })
  },
  onSwipeEnd(e) {
    const deltaX = this.data.touchCurrentX - this.data.touchStartX
    const index = this.data.swipingIndex
    const tasks = this.data.todayTasks

    // 关闭其他已滑开的
    tasks.forEach((t, i) => {
      if (i !== index && t.swiped) t.swiped = false
    })

    // 左滑超过 60rpx 打开，否则关闭
    if (index >= 0 && index < tasks.length) {
      tasks[index].swiped = deltaX < -30
    }
    this.setData({ todayTasks: [...tasks], touchStartX: 0, touchCurrentX: 0, swipingIndex: -1 })
  },

  // 快捷打卡/撤销
  quickCheckin(e) {
    const taskId = e.currentTarget.dataset.id
    const checked = e.currentTarget.dataset.checked

    if (!checked) {
      // 快捷打卡（无备注）
      app.request({
        url: '/api/checkin/do',
        method: 'POST',
        data: { taskId }
      }).then(res => {
        if (res.code === 200) {
          wx.showToast({ title: '打卡成功', icon: 'success' })
          this.loadTodayTasks()
        } else {
          wx.showToast({ title: res.msg || '操作失败', icon: 'none' })
        }
      }).catch(() => {
        wx.showToast({ title: '操作失败', icon: 'none' })
      })
    } else {
      // 快捷撤销
      wx.showModal({
        title: '确认撤销',
        content: '确定撤销该任务的今日打卡？',
        success: (res) => {
          if (res.confirm) {
            app.request({
              url: '/api/checkin/undo',
              method: 'POST',
              data: { taskId }
            }).then(result => {
              if (result.code === 200) {
                wx.showToast({ title: '已撤销', icon: 'success' })
                this.loadTodayTasks()
              } else {
                wx.showToast({ title: result.msg || '撤销失败', icon: 'none' })
              }
            }).catch(() => {
              wx.showToast({ title: '撤销失败', icon: 'none' })
            })
          }
        }
      })
    }
  },

  // 长按任务弹出菜单
  longPressTask(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.todayTasks.find(t => t.id === taskId)
    wx.showActionSheet({
      itemList: ['删除任务'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认删除',
            content: `删除「${task ? task.title : ''}」将同时删除所有打卡记录，不可恢复`,
            confirmColor: '#F56C6C',
            success: (modalRes) => {
              if (modalRes.confirm) {
                app.request({
                  url: `/api/checkin/task/${taskId}`,
                  method: 'DELETE'
                }).then(r => {
                  if (r.code === 200) {
                    wx.showToast({ title: '已删除', icon: 'success' })
                    this.loadTodayTasks()
                  } else {
                    wx.showToast({ title: r.msg || '删除失败', icon: 'none' })
                  }
                }).catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
              }
            }
          })
        }
      }
    })
  }


  async onPullDownRefresh() {
    try {
      await this.loadData()
    } catch (e) {}
    wx.stopPullDownRefresh()
  },
})
