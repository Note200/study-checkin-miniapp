// pages/plan/plan.js
const app = getApp()

Page({
  data: {
    plans: [],
    activeTab: 0, // 0-今日 1-本周 2-全部
    showAddModal: false,
    newPlan: {
      title: '',
      content: '',
      planDate: '',
      priority: 1
    }
  },

  onShow() {
    this.loadPlans()
  },

  async loadPlans() {
    try {
      const res = await app.request({
        url: '/api/plan/list',
        data: { type: this.data.activeTab }
      })
      if (res.code === 200) {
        this.setData({ plans: res.data || [] })
      }
    } catch (e) {
      console.log('加载计划失败')
    }
  },

  // 切换标签
  switchTab(e) {
    this.setData({ activeTab: parseInt(e.currentTarget.dataset.index) })
    this.loadPlans()
  },

  // 显示添加弹窗
  showAdd() {
    const today = new Date().toISOString().split('T')[0]
    this.setData({
      showAddModal: true,
      newPlan: { title: '', content: '', planDate: today, priority: 1 }
    })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({ showAddModal: false })
  },

  // 阻止弹窗内部点击冒泡到遮罩层
  preventClose() {},

  // 输入监听
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`newPlan.${field}`]: e.detail.value
    })
  },

  // 设置优先级
  setPriority(e) {
    this.setData({ 'newPlan.priority': parseInt(e.currentTarget.dataset.val) })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'newPlan.planDate': e.detail.value
    })
  },

  // 添加计划
  async submitPlan() {
    const { title, content, planDate, priority } = this.data.newPlan
    if (!title) {
      wx.showToast({ title: '请输入计划标题', icon: 'none' })
      return
    }

    try {
      const res = await app.request({
        url: '/api/plan/add',
        method: 'POST',
        data: { title, content, planDate, priority }
      })
      if (res.code === 200) {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.closeModal()
        this.loadPlans()
      }
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  // 切换完成状态
  async togglePlan(e) {
    const id = e.currentTarget.dataset.id
    try {
      await app.request({
        url: `/api/plan/${id}/toggle`,
        method: 'PUT'
      })
      this.loadPlans()
    } catch (e) {
      console.log('更新失败')
    }
  },

  // 删除计划
  async deletePlan(e) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？',
      confirmColor: '#F56C6C',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/api/plan/${e.currentTarget.dataset.id}`,
              method: 'DELETE'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadPlans()
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
