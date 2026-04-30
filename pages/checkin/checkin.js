// pages/checkin/checkin.js
const app = getApp()

// 课程图标映射
const ICONS = ['📐', '🌍', '💻', '📚', '🔭', '🎨', '🎵', '⚗️', '📝', '🏃']
const ICON_BG = ['#E8F8EF', '#E3F2FD', '#FFF3E0', '#F3E8FF', '#FEF0F0', '#E8F5E9', '#E1F5FE', '#FFF8E1', '#F3E5F5', '#E8F5E9']

Page({
  data: {
    tasks: [],
    currentTask: null,
    showCheckinModal: false,
    checkinRemark: '',
    checkinDate: '',
    showHistory: false,
    historyList: [],
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth() + 1,
    calendarDays: [],
    showSuccessAnim: false,
    selectedDate: null,
    confettiList: []   // 撒花粒子
  },

  onShow() {
    this.loadTasks()
    this.loadCalendar()
  },

  async loadTasks() {
    try {
      const res = await app.request({ url: '/api/checkin/tasks' })
      if (res.code === 200) {
        const tasks = (res.data || []).map((t, i) => ({
          ...t,
          icon: ICONS[i % ICONS.length],
          iconBg: ICON_BG[i % ICON_BG.length]
        }))
        this.setData({ tasks })
      }
    } catch (e) {
      console.log('加载任务失败')
    }
  },

  // 加载本月打卡日历（热力图）
  async loadCalendar() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = now.getDate()

    let dayDataMap = {}
    try {
      const res = await app.request({ url: '/api/checkin/calendar', data: { year, month } })
      if (res.code === 200) {
        const items = res.data || []
        items.forEach(item => {
          dayDataMap[item.day] = { count: item.count, level: item.level }
        })
      }
    } catch (e) {}

    // 热力图颜色等级
    const heatColors = ['#eef0f3', '#B8F5D0', '#7CE8A8', '#2ECC71', '#07C160']

    // 生成日历格子
    const firstDay = new Date(year, month - 1, 1).getDay() // 0=周日
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells = []
    // 前面的空格
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true })
    // 日期
    for (let d = 1; d <= daysInMonth; d++) {
      const data = dayDataMap[d] || { count: 0, level: 0 }
      cells.push({
        day: d,
        checked: data.count > 0,
        level: data.level,
        heatColor: heatColors[data.level],
        isToday: d === today,
        count: data.count,
        empty: false,
        selected: false
      })
    }

    this.setData({ calendarYear: year, calendarMonth: month, calendarDays: cells })
  },

  openCheckin(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.tasks.find(t => t.id === taskId)
    const today = this._fmtDate(new Date())
    this.setData({ currentTask: task, showCheckinModal: true, checkinRemark: '', checkinDate: today })
  },

  _fmtDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + day
  },

  onDateChange(e) {
    this.setData({ checkinDate: e.detail.value })
  },

  closeModal() { this.setData({ showCheckinModal: false }) },

  // 阻止弹窗内部点击冒泡到遮罩层
  preventClose() {},

  onRemarkInput(e) { this.setData({ checkinRemark: e.detail.value }) },

  async doCheckin() {
    const { currentTask, checkinRemark, checkinDate } = this.data
    try {
      const res = await app.request({
        url: '/api/checkin/do',
        method: 'POST',
        data: { taskId: currentTask.id, remark: checkinRemark, checkinDate: checkinDate }
      })
      if (res.code === 200) {
        this.closeModal()
        // 撒花 + 打卡成功动画
        const confettiList = this.generateConfetti()
        this.setData({ showSuccessAnim: true, confettiList })
        setTimeout(() => {
          this.setData({ showSuccessAnim: false, confettiList: [] })
          this.loadTasks()
          this.loadCalendar()
        }, 2000)
      } else {
        wx.showToast({ title: res.msg || '打卡失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '打卡失败', icon: 'none' })
    }
  },

  // 撤销今日打卡
  undoCheckin(e) {
    const taskId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认撤销',
      content: '确定要撤销今天的打卡吗？',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: '/api/checkin/undo',
            method: 'POST',
            data: { taskId }
          }).then(result => {
            if (result.code === 200) {
              wx.showToast({ title: '已撤销', icon: 'success' })
              this.loadTasks()
              this.loadCalendar()
            } else {
              wx.showToast({ title: result.msg || '撤销失败', icon: 'none' })
            }
          }).catch(() => {
            wx.showToast({ title: '撤销失败', icon: 'none' })
          })
        }
      }
    })
  },

  async viewHistory(e) {
    const taskId = e.currentTarget.dataset.id
    try {
      const res = await app.request({ url: '/api/checkin/history', data: { taskId } })
      if (res.code === 200) {
        this.setData({ showHistory: true, historyList: res.data || [] })
      }
    } catch (e) {}
  },

  closeHistory() { this.setData({ showHistory: false }) },

  // 删除打卡任务
  deleteTask(e) {
    const taskId = e.currentTarget.dataset.id
    const task = this.data.tasks.find(t => t.id === taskId)
    wx.showModal({
      title: '确认删除',
      content: `确定要删除任务「${task ? task.title : ''}」吗？该任务的所有打卡记录也会被删除，此操作不可撤销。`,
      confirmColor: '#F56C6C',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/api/checkin/task/${taskId}`,
            method: 'DELETE'
          }).then(result => {
            if (result.code === 200) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadTasks()
              this.loadCalendar()
            } else {
              wx.showToast({ title: result.msg || '删除失败', icon: 'none' })
            }
          }).catch(() => {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 左滑删除 — 触摸事件
  onSwipeStart(e) {
    this._touchStartX = e.touches[0].clientX
    this._swipeIndex = e.currentTarget.dataset.index
  },
  onSwipeMove(e) {
    this._touchCurrentX = e.touches[0].clientX
  },
  onSwipeEnd(e) {
    const deltaX = (this._touchCurrentX || 0) - (this._touchStartX || 0)
    const index = this._swipeIndex
    const tasks = this.data.tasks
    // 关闭其他已滑开的
    tasks.forEach((t, i) => { if (i !== index && t.swiped) t.swiped = false })
    if (index >= 0 && index < tasks.length) {
      tasks[index].swiped = deltaX < -30
    }
    this.setData({ tasks: [...tasks] })
    this._touchStartX = 0
    this._touchCurrentX = 0
    this._swipeIndex = -1
  },

  // 点击日历格子，切换选中高亮
  onDateTap(e) {
    const index = e.currentTarget.dataset.index
    const days = this.data.calendarDays.map((d, i) => ({
      ...d,
      selected: i === index && !d.empty
    }))
    this.setData({ calendarDays: days })
  },

  // 长按日历格子，显示日期详情（不跳转）
  longPressDate(e) {
    const index = e.currentTarget.dataset.index
    const cell = this.data.calendarDays[index]
    if (!cell || cell.empty) return
    const { calendarYear, calendarMonth } = this.data
    const dateStr = `${calendarYear}年${calendarMonth}月${cell.day}日`
    const count = cell.count || 0
    const levelText = ['', '较少', '一般', '较多', '很多'][cell.level] || ''
    let msg = `${dateStr}`
    if (count > 0) {
      msg += `\n打卡 ${count} 次` + (levelText ? `（${levelText}）` : '')
    } else {
      msg += '\n未打卡'
    }
    wx.showModal({
      title: '📅 日期详情',
      content: msg,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#58CC02'
    })
  },

  // 生成撒花粒子数据
  generateConfetti() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8A5C', '#58CC02', '#FF9FF3', '#54A0FF']
    const shapes = ['circle', 'square', 'star']
    const list = []
    for (let i = 0; i < 30; i++) {
      list.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1.5
      })
    }
    return list
  },

  // 长按任务弹出菜单
  longPressTask(e) {
    const taskId = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['打卡', '查看历史', '删除任务'],
      success: (res) => {
        if (res.tapIndex === 0) this.openCheckin(e)
        else if (res.tapIndex === 1) this.viewHistory(e)
        else if (res.tapIndex === 2) this.deleteTask(e)
      }
    })
  },

  addTask() { wx.navigateTo({ url: '/pages/checkin/add' }) }

  async onPullDownRefresh() {
    try {
      await Promise.all([this.loadTasks(), this.loadCalendar()])
    } catch (e) {}
    wx.stopPullDownRefresh()
  },
})
