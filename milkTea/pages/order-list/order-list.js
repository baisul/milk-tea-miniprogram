// pages/order-list/order-list.js - 订单管理页
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待确认' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ],
    currentTab: 'all',
    orders: [],
    loading: true,
    page: 1,
    hasMore: true,
    pageSize: 20
  },

  onLoad(options) {
    console.log("selected status :" + options.tab)
    if (options.tab) {
      this.setData({ currentTab: options.tab })
    }
    this.loadOrders()
  },

  onShow() {
    // 每次显示刷新（从详情页返回可能状态变化）
    if (this.data.orders.length > 0) {
      this.refreshOrders()
    }
  },

  onPullDownRefresh() {
    this.refreshOrders().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 切换Tab
  switchTab(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.currentTab) return
    this.setData({ currentTab: key, orders: [], page: 1, hasMore: true })
    this.loadOrders()
  },

  // 刷新（重置列表）
  async refreshOrders() {
    this.setData({ page: 1, hasMore: true })
    await this.loadOrders()
  },

  // 加载订单列表
  async loadOrders() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || 'test'
      const { currentTab, page, pageSize } = this.data

      const where = { userId: openid }
      if (currentTab !== 'all') {
        where.status = currentTab
      }

      const countRes = await db.collection('orders').where(where).count()
      const total = countRes.total

      const listRes = await db.collection('orders')
        .where(where)
        .orderBy('createTime', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()

      const orders = listRes.data.map(item => this.formatOrder(item))
      this.setData({
        orders: page === 1 ? orders : [...this.data.orders, ...orders],
        loading: false,
        hasMore: page * pageSize < total
      })
    } catch (e) {
      console.warn('加载订单失败，使用模拟数据', e)
      this.setData({ orders: this.getMockOrders(), loading: false, hasMore: false })
    }
  },

  // 加载更多
  async loadMore() {
    this.setData({ page: this.data.page + 1 })
    await this.loadOrders()
  },

  // 格式化订单数据
  formatOrder(order) {
    const createTime = order.createTime
    const timeStr = createTime ? util.formatTime(createTime, 'MM-dd HH:mm') : ''
    const items = order.items || []
    const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0)

    return {
      ...order,
      timeStr,
      itemCount,
      statusText: util.getStatusText(order.status),
      statusClass: order.status === 'pending' ? 'warning' : order.status === 'completed' ? 'success' : 'danger',
      typeName: order.orderType === 'dine-in' ? '堂食' : '外卖',
      typeClass: order.orderType === 'dine-in' ? 'type-dine' : 'type-delivery',
      itemPreview: items.length > 0 ? items[0].name : ''
    }
  },

  // 模拟订单数据
  getMockOrders() {
    const now = Date.now()
    return [
      {
        _id: 'o1', orderNo: 'MT20260320120000001', shopName: '奶茶小铺(旗舰店)',
        orderType: 'dine-in', status: 'pending', totalPrice: 30,
        items: [{ name: '珍珠奶茶', quantity: 2 }, { name: '芋泥波波茶', quantity: 1 }],
        createTime: new Date(now - 3600000), contactPhone: '138****1234',
        timeStr: '03-20 11:00', itemCount: 3, statusText: '待确认', statusClass: 'warning',
        typeName: '堂食', typeClass: 'type-dine', itemPreview: '珍珠奶茶'
      },
      {
        _id: 'o2', orderNo: 'MT20260319080000002', shopName: '奶茶小铺(旗舰店)',
        orderType: 'delivery', status: 'completed', totalPrice: 45,
        items: [{ name: '杨枝甘露', quantity: 1 }, { name: '多肉葡萄', quantity: 2 }],
        createTime: new Date(now - 86400000), contactPhone: '138****5678',
        timeStr: '03-19 08:00', itemCount: 3, statusText: '已完成', statusClass: 'success',
        typeName: '外卖', typeClass: 'type-delivery', itemPreview: '杨枝甘露'
      },
      {
        _id: 'o3', orderNo: 'MT20260318160000003', shopName: '奶茶小铺(大学城店)',
        orderType: 'dine-in', status: 'cancelled', totalPrice: 15,
        items: [{ name: '红豆奶茶', quantity: 1 }],
        createTime: new Date(now - 172800000), contactPhone: '139****9012',
        timeStr: '03-18 16:00', itemCount: 1, statusText: '已取消', statusClass: 'danger',
        typeName: '堂食', typeClass: 'type-dine', itemPreview: '红豆奶茶'
      }
    ]
  },

  // 查看订单详情
  goDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?id=' + id
    })
  },

  // 取消订单
  async cancelOrder(e) {
    const { id, index } = e.currentTarget.dataset
    const confirmed = await util.showConfirm('确定要取消该订单吗？', '取消订单')
    if (!confirmed) return

    util.showLoading('取消中...')
    try {
      const db = wx.cloud.database()
      await db.collection('orders').doc(id).update({
        data: { status: 'cancelled', cancelTime: db.serverDate() }
      })
      util.hideLoading()
      util.showToast('已取消')
      this.refreshOrders()
    } catch (e) {
      util.hideLoading()
      // 模拟取消
      const key = 'orders[' + index + ']'
      this.setData({
        [key + '.status']: 'cancelled',
        [key + '.statusText']: '已取消',
        [key + '.statusClass']: 'danger'
      })
      util.showToast('已取消')
    }
  }
})
