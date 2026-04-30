// pages/course/add.js
const app = getApp()

Page({
  data: {
    id: null,
    name: '',
    teacher: '',
    classroom: '',
    weekDay: 1,
    startSection: 1,
    endSection: 2,
    startWeek: 1,
    endWeek: 18,
    weekType: 0,
    color: '#07C160',
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    weeks: Array.from({ length: 18 }, (_, i) => i + 1),
    weekTypes: ['全周', '单周', '双周', '前8周', '后8周'],
    weekTypeIndex: 0,
    colors: ['#07C160', '#2ECC71', '#E6A23C', '#F56C6C', '#9B59B6', '#1ABC9C', '#FF6B6B']
  },

  onLoad(options) {
    const now = new Date()
    this.setData({ weekDay: now.getDay() === 0 ? 7 : now.getDay() })

    // 编辑模式：加载已有课程
    if (options.id) {
      this.setData({ id: options.id })
      wx.setNavigationBarTitle({ title: '编辑课程' })
      this.loadCourseDetail(options.id)
    }
  },

  async loadCourseDetail(id) {
    try {
      const res = await app.request({ url: '/api/course/' + id })
      if (res.code === 200 && res.data) {
        const c = res.data
        this.setData({
          name: c.name || '',
          teacher: c.teacher || '',
          classroom: c.classroom || '',
          weekDay: c.weekDay || 1,
          startSection: c.startSection || 1,
          endSection: c.endSection || 2,
          startWeek: c.startWeek || 1,
          endWeek: c.endWeek || 18,
          weekType: c.weekType || 0,
          weekTypeIndex: c.weekType || 0,
          color: c.color || '#07C160'
        })
        return
      }
    } catch (e) {
      // 详情接口失败，尝试从列表接口取
    }
    // 兜底：从课程列表中查找
    try {
      const listRes = await app.request({ url: '/api/course/list' })
      if (listRes.code === 200 && listRes.data) {
        const c = listRes.data.find(item => item.id == id)
        if (c) {
          this.setData({
            name: c.name || '',
            teacher: c.teacher || '',
            classroom: c.classroom || '',
            weekDay: c.weekDay || 1,
            startSection: c.startSection || 1,
            endSection: c.endSection || 2,
            startWeek: c.startWeek || 1,
            endWeek: c.endWeek || 18,
            weekType: c.weekType || 0,
            weekTypeIndex: c.weekType || 0,
            color: c.color || '#07C160'
          })
          return
        }
      }
    } catch (e2) {}
    wx.showToast({ title: '加载课程信息失败', icon: 'none' })
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onTeacherInput(e) { this.setData({ teacher: e.detail.value }) },
  onClassroomInput(e) { this.setData({ classroom: e.detail.value }) },

  onWeekDayChange(e) {
    this.setData({ weekDay: parseInt(e.detail.value) + 1 })
  },

  onStartSectionChange(e) {
    this.setData({ startSection: parseInt(e.detail.value) + 1 })
  },

  onEndSectionChange(e) {
    this.setData({ endSection: parseInt(e.detail.value) + 1 })
  },

  onStartWeekChange(e) {
    this.setData({ startWeek: parseInt(e.detail.value) + 1 })
  },

  onEndWeekChange(e) {
    this.setData({ endWeek: parseInt(e.detail.value) + 1 })
  },

  onWeekTypeChange(e) {
    this.setData({ weekType: parseInt(e.detail.value), weekTypeIndex: parseInt(e.detail.value) })
  },

  onColorChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ color: this.data.colors[index] })
  },

  async submit() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入课程名称', icon: 'none' })
      return
    }

    const isEdit = !!this.data.id
    const url = isEdit ? '/api/course/update' : '/api/course/add'
    const method = isEdit ? 'PUT' : 'POST'
    const data = {
      name: this.data.name,
      teacher: this.data.teacher,
      classroom: this.data.classroom,
      weekDay: this.data.weekDay,
      startSection: this.data.startSection,
      endSection: this.data.endSection,
      startWeek: this.data.startWeek,
      endWeek: this.data.endWeek,
      weekType: this.data.weekType,
      color: this.data.color
    }

    if (isEdit) {
      data.id = this.data.id
    }

    try {
      const res = await app.request({ url, method, data })
      if (res.code === 200) {
        wx.showToast({ title: isEdit ? '修改成功' : '添加成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      } else {
        wx.showToast({ title: res.msg || '操作失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})
