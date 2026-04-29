// pages/plan/plan.js
const app = getApp()

function fmtLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

Page({
  data: {
    plans: [],
    allPlans: [],
    activeTab: 0,
    showAddModal: false,
    showEditModal: false,
    newPlan: {
      title: '',
      content: '',
      planDate: '',
      priority: 1
    },
    editPlan: {
      id: 0,
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
        url: '/api/plan/list'
      })
      if (res.code === 200) {
        const allPlans = res.data || []
        this.setData({ allPlans })
        this._filterPlans()
      }
    } catch (e) {
      console.log('加载计划失败')
    }
  },

  _filterPlans() {
    const { allPlans, activeTab } = this.data
    let filtered = allPlans
    if (activeTab === 1) {
      filtered = allPlans.filter(p => p.status !== 1)
    } else if (activeTab === 2) {
      filtered = allPlans.filter(p => p.status === 1)
    }
    this.setData({ plans: filtered })
  },

  switchTab(e) {
    this.setData({ activeTab: parseInt(e.currentTarget.dataset.index) })
    this._filterPlans()
  },

  showAdd() {
    const today = fmtLocal(new Date())
    this.setData({
      showAddModal: true,
      newPlan: { title: '', content: '', planDate: today, priority: 1 }
    })
  },

  closeModal() {
    this.setData({ showAddModal: false })
  },

  closeEditModal() {
    this.setData({ showEditModal: false })
  },

  preventClose() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['newPlan.' + field]: e.detail.value
    })
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['editPlan.' + field]: e.detail.value
    })
  },

  setPriority(e) {
    this.setData({ 'newPlan.priority': parseInt(e.currentTarget.dataset.val) })
  },

  setEditPriority(e) {
    this.setData({ 'editPlan.priority': parseInt(e.currentTarget.dataset.val) })
  },

  onDateChange(e) {
    this.setData({ 'newPlan.planDate': e.detail.value })
  },

  onEditDateChange(e) {
    this.setData({ 'editPlan.planDate': e.detail.value })
  },

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

  async submitEditPlan() {
    const { id, title, content, planDate, priority } = this.data.editPlan
    if (!title) {
      wx.showToast({ title: '请输入计划标题', icon: 'none' })
      return
    }
    try {
      const res = await app.request({
        url: '/api/plan/' + id,
        method: 'PUT',
        data: { title, content, planDate, priority }
      })
      if (res.code === 200) {
        wx.showToast({ title: '修改成功', icon: 'success' })
        this.closeEditModal()
        this.loadPlans()
      }
    } catch (e) {
      wx.showToast({ title: '修改失败', icon: 'none' })
    }
  },

  onLongPress(e) {
    const ds = e.currentTarget.dataset
    const that = this
    wx.showActionSheet({
      itemList: ['编辑计划', '删除计划'],
      success(res) {
        if (res.tapIndex === 0) {
          that.setData({
            showEditModal: true,
            editPlan: {
              id: ds.id,
              title: ds.title || '',
              content: ds.content || '',
              planDate: ds.planDate || '',
              priority: ds.priority !== undefined ? ds.priority : 1
            }
          })
        } else if (res.tapIndex === 1) {
          that.deletePlan(e)
        }
      }
    })
  },

  async togglePlan(e) {
    const id = e.currentTarget.dataset.id
    try {
      await app.request({
        url: '/api/plan/' + id + '/toggle',
        method: 'PUT'
      })
      this.loadPlans()
    } catch (e) {
      console.log('更新失败')
    }
  },

  async deletePlan(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？',
      confirmColor: '#F56C6C',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({ url: '/api/plan/' + id, method: 'DELETE' })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadPlans()
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  onSwipeChange(e) {
    const index = e.currentTarget.dataset.index
    let x = e.detail.x
    if (x > 0) x = 0
    if (x < -160) x = -160
    const plans = this.data.plans.map((p, i) => ({
      ...p,
      _x: i === index ? x : (p._x && p._x < -80 ? -160 : 0)
    }))
    this.setData({ plans })
  },

  resetSwipes() {
    const plans = this.data.plans.map(p => ({ ...p, _x: 0 }))
    this.setData({ plans })
  }
})
