// pages/circle/circle.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    posts: [],
    loading: true,
    showPublishModal: false,
    postContent: '',
    postType: 0
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    this.setData({ userInfo })
    this.loadPosts()
  },

  async loadPosts() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/api/circle/list' })
      if (res.code === 200) {
        // 格式化时间
        const posts = (res.data || []).map(post => {
          if (post.createTime) {
            post.createTime = this._formatTime(post.createTime)
          }
          return post
        })
        this.setData({ posts })
      }
    } catch (e) {
      console.log('加载动态失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  _formatTime(timeStr) {
    try {
      const date = new Date(timeStr)
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return '刚刚'
      if (minutes < 60) return minutes + '分钟前'
      if (hours < 24) return hours + '小时前'
      if (days < 7) return days + '天前'
      return timeStr.substring(0, 10)
    } catch (e) {
      return timeStr
    }
  },

  setType(e) {
    this.setData({ postType: parseInt(e.currentTarget.dataset.type) })
  },

  onContentInput(e) {
    this.setData({ postContent: e.detail.value })
  },

  showPublishModal() {
    this.setData({ showPublishModal: true, postContent: '', postType: 0 })
  },

  hidePublishModal() {
    this.setData({ showPublishModal: false })
  },

  preventClose() {},

  async submitPost() {
    const { postContent, postType } = this.data
    if (!postContent.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    try {
      const res = await app.request({
        url: '/api/circle/publish',
        method: 'POST',
        data: { content: postContent, type: postType }
      })
      if (res.code === 200) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.hidePublishModal()
        this.loadPosts()
      } else {
        wx.showToast({ title: res.msg || '发布失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '发布失败', icon: 'none' })
    }
  },

  deletePost(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条动态？',
      confirmColor: '#FF4B4B',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: '/api/circle/' + id,
              method: 'DELETE'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadPosts()
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
