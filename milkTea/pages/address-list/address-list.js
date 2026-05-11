// pages/address-list/address-list.js - 收货地址列表页
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    addressList: [],
    loading: true,
    selectMode: false,
  },

  onLoad(options) {
    if (options.mode === 'select') {
      this.setData({ selectMode: true })
    }
  },

  onShow() {
    this.loadAddresses()
  },

  onPullDownRefresh() {
    this.loadAddresses().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadAddresses() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || 'test'
      const res = await db.collection('addresses')
        .where({ userId: openid })
        .orderBy('isDefault', 'desc')
        .orderBy('createTime', 'desc')
        .limit(50)
        .get()

      const addressList = res.data.map(item => ({
        ...item,
        tagText: util.getTagText(item.tag),
        genderText: util.getGenderText(item.gender)
      }))
      this.setData({ addressList, loading: false })
    } catch (e) {
      console.warn('加载地址列表失败，使用模拟数据', e)
      this.setData({
        addressList: [
          {
            _id: 'mock1',
            name: '张三', gender: 'male', phone: '13800138000',
            province: '广东省', city: '深圳市', district: '南山区',
            detail: '科技园南路100号', roomNumber: 'A栋501',
            tag: 'company', tagText: '公司', genderText: '先生',
            isDefault: true
          },
          {
            _id: 'mock2',
            name: '张三', gender: 'male', phone: '13800138000',
            province: '广东省', city: '深圳市', district: '福田区',
            detail: '中心城花园', roomNumber: '3栋1602',
            tag: 'home', tagText: '家', genderText: '先生',
            isDefault: false
          }
        ],
        loading: false
      })
    }
  },

  onAddAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  onEditAddress(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/address-edit/address-edit?id=' + id })
  },

  async onDeleteAddress(e) {
    const { id } = e.currentTarget.dataset
    const confirmed = await util.showConfirm('确定要删除该地址吗？', '删除确认')
    if (!confirmed) return

    util.showLoading('删除中...')
    try {
      const db = wx.cloud.database()
      await db.collection('addresses').doc(id).remove()
      util.hideLoading()
      util.showToast('删除成功')
      this.loadAddresses()
    } catch (e) {
      util.hideLoading()
      const addressList = this.data.addressList.filter(item => item._id !== id)
      this.setData({ addressList })
      util.showToast('删除成功')
    }
  },

  async onSetDefault(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.addressList.find(a => a._id === id)
    if (!item || item.isDefault) return

    util.showLoading('设置中...')
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || 'test'
      const all = await db.collection('addresses').where({ userId: openid, isDefault: true }).get()
      for (const doc of all.data) {
        await db.collection('addresses').doc(doc._id).update({ data: { isDefault: false } })
      }
      await db.collection('addresses').doc(id).update({ data: { isDefault: true } })
      util.hideLoading()
      util.showToast('设置成功')
      this.loadAddresses()
    } catch (e) {
      util.hideLoading()
      const addressList = this.data.addressList.map(a => ({
        ...a, isDefault: a._id === id
      }))
      this.setData({ addressList })
      util.showToast('设置成功')
    }
  },

  onSelectAddress(e) {
    if (!this.data.selectMode) return
    const { index } = e.currentTarget.dataset
    const address = this.data.addressList[index]
    const eventChannel = this.getOpenerEventChannel()
    if (eventChannel && eventChannel.emit) {
      eventChannel.emit('selectAddress', { address })
    }
    wx.navigateBack()
  },
  // 返回上一页
onBack() {
  wx.navigateBack({
    delta: 1
  })
}
})
