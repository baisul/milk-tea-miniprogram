// pages/order-success/order-success.js - 下单成功页
const util = require('../../utils/util')

Page({
  data: {
    orderNo: '',
    orderId: '',
    totalPrice: '0.00',
    shop: '',
    orderType: '',
    contactPerson: '',
    contactPhone: '',
    addressStr : ''
  },

  onLoad(options) {
    this.setData({ orderId: options.orderId })
    this.loadOrderDetail(options.orderId)
  },

    // 加载订单详情
    async loadOrderDetail(id) {
      this.setData({ loading: true })
      try {
        const db = wx.cloud.database()
        const res = await db.collection('orders').doc(id).get()
        const shopRes = await db.collection('shops').doc(res.data.shopId).get()
        const order = res.data
        const shop = shopRes.data
        this.setData({ order, loading: false })

        let addressStr = ''
        if (order.orderType === 'delivery' && order.addressInfo) {
          const addr = order.addressInfo
          const genderText = util.getGenderText(addr.gender)
          addressStr = (addr.name || '') + ' ' + genderText + ' ' + (addr.phone || '') + '\n'
          addressStr += (addr.province || '') + (addr.city || '') + (addr.district || '') + (addr.detail || '')
          if (addr.roomNumber) addressStr += ' ' + addr.roomNumber
        }
        this.setData({
          orderNo: decodeURIComponent(order.orderNo || ''),
          orderId: order._id || '',
          totalPrice: order.totalPrice || '0.00',
          shop: shop.name || '',
          orderType: order.orderType || '',
          contactPerson: order.contactPerson || '',
          contactPhone: order.contactPhone || '',
          addressList:  [],
          addressStr: addressStr || ''
        })
      } catch (e) {
        console.warn('加载订单详情失败，使用模拟数据', e)
        this.setData({ order: this.getMockOrder(), loading: false })
      }
    },

  viewOrder() {
    if (this.data.orderId) {
      wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + this.data.orderId })
    }
  },
  

    // 获取当前时间
    getCurrentTime() {
      const now = new Date()
      const year = now.getFullYear()
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const hour = now.getHours().toString().padStart(2, '0')
      const minute = now.getMinutes().toString().padStart(2, '0')
      const second = now.getSeconds().toString().padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    },

  goHome() {
    wx.switchTab({ url: '/pages/home/home' })
  },

  continueOrder() {
    wx.switchTab({ url: '/pages/order/order' })
  }
})
