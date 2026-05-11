// cloudfunctions/orderManager/index.js - 订单管理云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'create':
      return createOrder(event, openid)
    case 'getList':
      return getOrderList(event, openid)
    case 'getDetail':
      return getOrderDetail(event, openid)
    case 'cancel':
      return cancelOrder(event, openid)
    case 'complete':
      return completeOrder(event, openid)
    case 'getStats':
      return getOrderStats(event, openid)
    case 'rebuy':
      return rebuy(event, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 创建订单
async function createOrder(event, openid) {
  const { shopId, shopName, orderType, items, totalPrice, contactPerson,contactPhone, remark,
    pickupTime, deliveryTime, addressId, addressInfo } = event

  if (!shopId || !items || items.length === 0) {
    return { code: -1, msg: '缺少必要参数' }
  }
  if (!contactPhone || !/^1[3-9]\d{9}$/.test(contactPhone)) {
    return { code: -1, msg: '请输入正确的手机号' }
  }
  if (orderType === 'delivery' && !addressId) {
    return { code: -1, msg: '请选择收货地址' }
  }

  // 生成订单号
  const now = new Date()
  const orderNo = 'MT' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0') +
    String(Math.floor(Math.random() * 10000)).padStart(4, '0')

  const orderData = {
    orderNo, shopId, shopName: shopName || '',
    orderType: orderType || 'dine-in',
    items: items.map(item => ({
      drinkId: item.drinkId || '',
      name: item.name || '',
      image: item.image || '',
      price: Number(item.price) || 0,
      cupSize: item.cupSize || 'medium',
      temperature: item.temperature || 'standard_ice',
      sweetness: item.sweetness || 'standard',
      quantity: Number(item.quantity) || 1,
      subtotal: Number(item.price || 0) * Number(item.quantity || 1)
    })),
    totalPrice: Number(totalPrice) || 0,
    contactPerson: contactPerson.trim(),
    contactPhone: contactPhone.trim(),
    remark: remark || '',
    status: 'pending',
    userId: openid,
    createTime: db.serverDate()
  }

  if (orderType === 'dine-in') {
    orderData.pickupTime = pickupTime || '尽快取餐'
  } else {
    orderData.deliveryTime = deliveryTime || '尽快送达'
    orderData.addressId = addressId || ''
    orderData.addressInfo = addressInfo || {}
  }

  try {
    const res = await db.collection('orders').add({ data: orderData })
    return { code: 0, msg: '下单成功', orderId: res._id, orderNo }
  } catch (e) {
    return { code: -1, msg: '创建订单失败', error: e.message }
  }
}

// 获取订单列表
async function getOrderList(event, openid) {
  const { status, page = 1, pageSize = 20 } = event
  try {
    const where = { userId: openid }
    if (status && status !== 'all') where.status = status

    const countRes = await db.collection('orders').where(where).count()
    const list = await db.collection('orders')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { code: 0, data: list.data, total: countRes.total }
  } catch (e) {
    return { code: -1, msg: '获取订单列表失败', error: e.message }
  }
}

// 获取订单详情
async function getOrderDetail(event, openid) {
  const { orderId } = event
  if (!orderId) return { code: -1, msg: '缺少订单ID' }

  try {
    const res = await db.collection('orders').doc(orderId).get()
    // 只能查看自己的订单
    if (res.data.userId !== openid) {
      return { code: -1, msg: '无权查看该订单' }
    }
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: '获取订单详情失败', error: e.message }
  }
}

// 取消订单
async function cancelOrder(event, openid) {
  const { orderId } = event
  if (!orderId) return { code: -1, msg: '缺少订单ID' }

  try {
    const order = await db.collection('orders').doc(orderId).get()
    if (order.data.userId !== openid) {
      return { code: -1, msg: '无权操作该订单' }
    }
    if (order.data.status !== 'pending') {
      return { code: -1, msg: '只能取消待确认的订单' }
    }
    await db.collection('orders').doc(orderId).update({
      data: { status: 'cancelled', cancelTime: db.serverDate() }
    })
    return { code: 0, msg: '订单已取消' }
  } catch (e) {
    return { code: -1, msg: '取消订单失败', error: e.message }
  }
}

// 完成订单
async function completeOrder(event, openid) {
  const { orderId } = event
  if (!orderId) return { code: -1, msg: '缺少订单ID' }

  try {
    await db.collection('orders').doc(orderId).update({
      data: { status: 'completed', completeTime: db.serverDate() }
    })
    return { code: 0, msg: '订单已完成' }
  } catch (e) {
    return { code: -1, msg: '完成订单失败', error: e.message }
  }
}

// 订单统计
async function getOrderStats(event, openid) {
  try {
    const total = await db.collection('orders').where({ userId: openid }).count()
    const pending = await db.collection('orders').where({ userId: openid, status: 'pending' }).count()
    const completed = await db.collection('orders').where({ userId: openid, status: 'completed' }).count()
    const cancelled = await db.collection('orders').where({ userId: openid, status: 'cancelled' }).count()
    return {
      code: 0,
      data: {
        total: total.total, pending: pending.total,
        completed: completed.total, cancelled: cancelled.total
      }
    }
  } catch (e) {
    return { code: -1, msg: '获取统计失败', error: e.message }
  }
}

// 再次购买
async function rebuy(event, openid) {
  const { orderId } = event
  if (!orderId) return { code: -1, msg: '缺少订单ID' }

  try {
    const res = await db.collection('orders').doc(orderId).get()
    const order = res.data
    if (order.userId !== openid) {
      return { code: -1, msg: '无权操作该订单' }
    }
    // 返回订单中的商品列表，供前端加入购物车
    return { code: 0, data: order.items, shopId: order.shopId }
  } catch (e) {
    return { code: -1, msg: '操作失败', error: e.message }
  }
}
