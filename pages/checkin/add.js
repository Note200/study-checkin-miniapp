// pages/checkin/add.js
const app = getApp()

Page({
  data: {
    title: '',
    type: 0,
    targetDays: 30,
    targetMinutes: 30,
    isPublic: 1,
    days: [7, 14, 21, 30, 60, 90],
    minutes: [15, 30, 45, 60, 90, 120]
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }) },

  onTypeChange(e) {
    this.setData({ type: parseInt(e.currentTarget.dataset.type) })
  },

  onDaysChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ targetDays: this.data.days[index] })
  },

  onMinutesChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ targetMinutes: this.data.minutes[index] })
  },

  onPublicChange(e) {
    this.setData({ isPublic: e.detail.value.length > 0 ? 1 : 0 })
  },

  async submit() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }

    try {
      const res = await app.request({
        url: '/api/checkin/task/add',
        method: 'POST',
        data: {
          title: this.data.title,
          type: this.data.type,
          targetDays: this.data.targetDays,
          targetMinutes: this.data.targetMinutes,
          isPublic: this.data.isPublic
        }
      })
      if (res.code === 200) {
        wx.showToast({ title: '创建成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    } catch (e) {
      wx.showToast({ title: '创建失败', icon: 'none' })
    }
  }
})
