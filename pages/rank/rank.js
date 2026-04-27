// pages/rank/rank.js
const app = getApp()

Page({
  data: {
    rankList: [],
    loading: true
  },

  onShow() {
    this.loadRank()
  },

  async loadRank() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/checkin/rank' })
      if (res.code === 200) {
        this.setData({ rankList: res.data || [] })
      }
    } catch (e) {
      console.log('加载排行榜失败')
    } finally {
      this.setData({ loading: false })
    }
  }
})
