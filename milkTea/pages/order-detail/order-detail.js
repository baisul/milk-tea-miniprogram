// pages/order-detail/order-detail.js - 订单详情页
const app = getApp()
const util = require('../../utils/util')
const { getDrinkImage } = require('../../utils/images')

Page({
  data: {
    orderId: '',
    order: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id })
      this.loadOrderDetail(options.id)
    }
  },

  // 加载订单详情
  async loadOrderDetail(id) {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('orders').doc(id).get()
      const shopRes = await db.collection('shops').doc(res.data.shopId).get()
      const order = this.formatOrder(res.data,shopRes.data)
      this.setData({ order, loading: false })
    } catch (e) {
      console.warn('加载订单详情失败，使用模拟数据', e)
      this.setData({ order: this.getMockOrder(), loading: false })
    }
  },


  // 格式化订单
  formatOrder(order,shop) {
    const items = (order.items || []).map(item => ({
      ...item,
      image: getDrinkImage(item.image),
      specText: [util.getCupSizeText(item.cupSize), util.getTemperatureText(item.temperature), util.getSweetnessText(item.sweetness)]
        .filter(Boolean).join(' / ')
    }))

    let goodsTotalPrice = 0.00
    for (let i of items) {
      goodsTotalPrice += i.price
    }

    const createTime = order.createTime
    const createTimeStr = createTime ? util.formatTime(createTime) : ''

    let timeInfo = ''
    if (order.orderType === 'dine-in') {
      timeInfo = '期望取餐时间：' + (order.pickupTime || '尽快取餐')
    } else {
      timeInfo = '期望送达时间：' + (order.deliveryTime || '尽快送达')
    }

    let addressStr = ''
    if (order.orderType === 'delivery' && order.addressInfo) {
      const addr = order.addressInfo
      const genderText = util.getGenderText(addr.gender)
      addressStr = (addr.name || '') + ' ' + genderText + ' ' + (addr.phone || '') + '\n'
      addressStr += (addr.province || '') + (addr.city || '') + (addr.district || '') + (addr.detail || '')
      if (addr.roomNumber) addressStr += ' ' + addr.roomNumber
    }
    let shopName = shop.name
    let deliveryFee = (order.deliveryFeeCents / 100).toFixed(2)

    return {
      ...order,
      items,
      createTimeStr,
      statusText: util.getStatusText(order.status),
      statusClass: order.status === 'pending' ? 'warning' : order.status === 'completed' ? 'success' : 'danger',
      typeName: order.orderType === 'dine-in' ? '堂食' : '外卖',
      timeInfo,
      addressStr,
      canCancel: order.status === 'pending',
      shopName,
      deliveryFee,
      goodsTotalPrice
    }
  },

  // 模拟订单数据
  getMockOrder() {
    return {
      _id: 'o1',
      orderNo: 'MT20260320120000001',
      shopName: '奶茶小铺(旗舰店)',
      orderType: 'dine-in',
      status: 'pending',
      totalPrice: 30,
      contactPhone: '13812341234',
      remark: '少加冰，谢谢',
      createTimeStr: '2026-03-20 12:00:00',
      statusText: '待确认',
      statusClass: 'warning',
      typeName: '堂食',
      timeInfo: '取餐时间：尽快取餐',
      addressStr: '',
      canCancel: true,
      items: [
        {
          drinkId: 'd1', name: '珍珠奶茶', image: '/images/drink-placeholder.png',
          price: 15, cupSize: 'medium', temperature: 'standard_ice', sweetness: 'standard',
          quantity: 2, subtotal: 30,
          specText: '中杯 / 标准冰 / 标准糖'
        }
      ]
    }
  },

  // 取消订单
  async cancelOrder() {
    const confirmed = await util.showConfirm('确定要取消该订单吗？', '取消订单')
    if (!confirmed) return

    util.showLoading('取消中...')
    try {
      const db = wx.cloud.database()
      await db.collection('orders').doc(this.data.orderId).update({
        data: { status: 'cancelled', cancelTime: db.serverDate() }
      })
      util.hideLoading()
      util.showToast('已取消')
      this.loadOrderDetail(this.data.orderId)
    } catch (e) {
      util.hideLoading()
      // 模拟取消
      this.setData({
        'order.status': 'cancelled',
        'order.statusText': '已取消',
        'order.statusClass': 'danger',
        'order.canCancel': false
      })
      util.showToast('已取消')
    }
  },

/**
 * 再次购买 - 跳转到结算页面
 */
async rebuy() {
  const { order } = this.data;
  if (!order || !order.items || order.items.length === 0) {
    wx.showToast({
      title: '订单商品为空',
      icon: 'none'
    });
    return;
  }

  console.log('========== 再次购买 ==========');
  console.log('原订单:', order);

  const shopId = order.shopId;
  const shopName = order.shopName;
  const orderType = order.orderType || 'delivery';  // 使用原订单的订单类型
  
  // 将订单商品转换为结算页需要的格式
  const checkoutItems = order.items.map(item => ({
    _id: item.drinkId || item._id,
    productId: item.drinkId || item._id,
    productName: item.name,
    productImage: item.image,
    price: parseFloat(item.price) || 0,
    quantity: item.quantity || 1,
    cupSize: item.cupSize || 'medium',
    cupSizeLabel: item.cupSizeLabel || this.getCupSizeLabel(item.cupSize),
    temperature: item.temperature || 'standard_ice',
    temperatureText: item.temperatureText || this.getTemperatureText(item.temperature),
    sweetness: item.sweetness || 'standard',
    sweetnessText: item.sweetnessText || this.getSweetnessText(item.sweetness),
    remark: item.remark || '',
    selected: true,
    shopId: shopId,
    shopName: shopName
  }));

  console.log('转换后的商品:', checkoutItems);
  console.log('店铺ID:', shopId);
  console.log('店铺名称:', shopName);
  console.log('订单类型:', orderType);

  // 存储到全局
  const app = getApp();
  if (!app.globalData) {
    app.globalData = {};
  }
  
  app.globalData.checkoutList = checkoutItems;
  app.globalData.orderType = orderType;
  app.globalData.currentShop = {
    id: shopId,
    name: shopName
  };

  console.log('存储后 app.globalData.checkoutList:', app.globalData.checkoutList);

  // 跳转到结算页面
  wx.navigateTo({
    url: `/pages/checkout/checkout?shopId=${shopId}&orderType=${orderType}`,
    fail: (err) => {
      console.error('跳转失败:', err);
      // 备用方案：通过 URL 参数传递
      const data = encodeURIComponent(JSON.stringify(checkoutItems));
      wx.navigateTo({
        url: `/pages/checkout/checkout?cartData=${data}&shopId=${shopId}&orderType=${orderType}`
      });
    }
  });
},

/**
 * 获取杯型显示文字
 */
getCupSizeLabel(cupSize) {
  const cupSizeMap = {
    'small': '小杯',
    'medium': '中杯',
    'large': '大杯'
  };
  return cupSizeMap[cupSize] || '中杯';
},

/**
 * 获取温度显示文字
 */
getTemperatureText(temperature) {
  const temperatureMap = {
    'hot': '热饮',
    'standard_ice': '标准冰',
    'less_ice': '少冰',
    'no_ice': '去冰',
    'warm': '温'
  };
  return temperatureMap[temperature] || '标准冰';
},

/**
 * 获取甜度显示文字
 */
getSweetnessText(sweetness) {
  const sweetnessMap = {
    'standard': '标准糖',
    'less': '少糖',
    'half': '半糖',
    'light': '微糖',
    'none': '无糖'
  };
  return sweetnessMap[sweetness] || '标准糖';
},

  // 复制订单号
  copyOrderNo() {
    const { order } = this.data
    if (order && order.orderNo) {
      wx.setClipboardData({
        data: order.orderNo,
        success: () => util.showToast('已复制')
      })
    }
  },

  // 拨打电话
  callPhone() {
    const { order } = this.data
    if (order && order.contactPhone) {
      wx.makePhoneCall({ phoneNumber: order.contactPhone })
    }
  }
})
