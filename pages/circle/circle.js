// pages/circle/circle.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    posts: [],
    loading: true,
    showPublishModal: false,
    postContent: '',
    postType: 0,
    commentsMap: {}
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

  // 点赞
  async toggleLike(e) {
    const post = e.currentTarget.dataset.post
    const posts = this.data.posts
    const index = posts.findIndex(p => p.id === post.id)
    if (index === -1) return

    try {
      const res = await app.request({
        url: '/api/circle/like',
        method: 'POST',
        data: { postId: post.id }
      })
      if (res.code === 200) {
        const updated = !post.liked
        const newCount = updated ? (post.likeCount || 0) + 1 : Math.max(0, (post.likeCount || 0) - 1)
        posts[index] = { ...post, liked: updated, likeCount: newCount }
        this.setData({ posts })
      }
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 切换评论列表显示
  toggleComments(e) {
    const postId = e.currentTarget.dataset.postid
    const index = e.currentTarget.dataset.index
    const posts = this.data.posts
    const currentShow = posts[index]._showComments

    posts[index]._showComments = !currentShow
    this.setData({ posts })

    // 展开时加载评论
    if (!currentShow && !this.data.commentsMap[postId]) {
      this.loadComments(postId)
    }
  },

  // 内嵌评论输入
  onCommentInput2(e) {
    const postId = e.currentTarget.dataset.postid
    const value = e.detail.value
    const commentsMap = { ...this.data.commentsMap }
    commentsMap[postId] = commentsMap[postId] || []
    commentsMap[postId]._input = value
    this.setData({ commentsMap })
  },

  // 加载评论列表
  async loadComments(postId) {
    try {
      const res = await app.request({ url: '/api/circle/comments/' + postId })
      if (res.code === 200) {
        const commentsMap = { ...this.data.commentsMap }
        commentsMap[postId] = res.data || []
        this.setData({ commentsMap })
      }
    } catch (e) {
      console.log('加载评论失败')
    }
  },

  // 提交内嵌评论
  async submitComment2(e) {
    const postId = e.currentTarget.dataset.postid
    const commentsMap = this.data.commentsMap
    const input = commentsMap[postId]?._input || ''

    if (!input.trim()) {
      wx.showToast({ title: '请输入评论', icon: 'none' })
      return
    }

    try {
      const res = await app.request({
        url: '/api/circle/comment',
        method: 'POST',
        data: { postId, content: input }
      })
      if (res.code === 200) {
        wx.showToast({ title: '评论成功', icon: 'success' })
        // 更新评论列表
        const newMap = { ...commentsMap }
        newMap[postId] = newMap[postId] || []
        newMap[postId].push({
          id: Date.now(),
          content: input,
          createTime: '刚刚',
          userId: this.data.userInfo?.id,
          nickname: this.data.userInfo?.nickname || '我',
          avatar: this.data.userInfo?.avatar
        })
        newMap[postId]._input = ''
        this.setData({ commentsMap: newMap })
        // 更新评论数
        const posts = this.data.posts
        const idx = posts.findIndex(p => p.id == postId)
        if (idx !== -1) {
          posts[idx].commentCount = (posts[idx].commentCount || 0) + 1
          this.setData({ posts })
        }
      } else {
        wx.showToast({ title: res.msg || '评论失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '评论失败', icon: 'none' })
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
