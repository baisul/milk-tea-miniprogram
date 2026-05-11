// cloudfunctions/shopManager/index.js - 店铺管理云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    // 兼容旧前端：action: 'list' -> getShopList
    case 'list':
      return getShopList(event, openid)
    case 'getList':
      return getShopList(event, openid)
    case 'search':
      return searchShops(event)
    case 'getDetail':
      return getShopDetail(event)
    case 'getMyShops':  // 新增 case
      const shops = await getMyShops(openid)
      return {
        code: 0,
        msg: 'success',
        data: shops
      }
    case 'getNearby':
      return getNearbyShops(event, openid)
    case 'create':
      return createShop(event, openid)
    case 'update':
      return updateShop(event, openid)
    case 'delete':
      return deleteShop(event, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

async function getShopList(event, openid) {
  const { page = 1, pageSize = 20, status = 'open', mine = false } = event
  try {
    const where = {}
    if (mine) where.userId = openid
    if (status && status !== 'all') where.status = status
    const countRes = await db.collection('shops').where(where).count()
    const list = await db.collection('shops')
      .where(where).orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize).get()
    return { code: 0, data: list.data, total: countRes.total, page, pageSize }
  } catch (e) {
    return { code: -1, msg: '获取店铺列表失败', error: e.message }
  }
}

async function searchShops(event) {
  const { keyword = '', page = 1, pageSize = 20 } = event
  try {
    const where = {}
    if (keyword) where.name = db.RegExp({ regexp: keyword, options: 'i' })
    const list = await db.collection('shops')
      .where(where).orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize).get()
    return { code: 0, data: list.data }
  } catch (e) {
    return { code: -1, msg: '搜索店铺失败', error: e.message }
  }
}

async function getShopDetail(event) {
  const { shopId } = event
  try {
    const res = await db.collection('shops').doc(shopId).get()
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: '获取店铺详情失败', error: e.message }
  }
}

async function getNearbyShops(event, openid) {
  const {
    latitude,
    longitude,
    page = 1,
    pageSize = 10,
    // 最大距离（米）。不传则不限制
    maxDistance,
    // 可选筛选
    province,
    keyword
  } = event
  try {
    if (latitude === undefined || longitude === undefined) {
      return { code: -1, msg: '缺少经纬度' }
    }

    // 兼容状态：历史数据是 'open'，新需求是 0/1/2，其中 1=营业中
    const statusIn = ['open', 1, '1']
    const where = { status: db.command.in(statusIn) }

    // 获取候选集合后在内存里计算距离并分页（确保距离排序正确）
    const candidatesRes = await db.collection('shops')
      .where(where)
      .get()

    const kw = (keyword || '').trim().toLowerCase()
    const maxD = maxDistance === undefined || maxDistance === null || maxDistance === ''
      ? null
      : Number(maxDistance)

    const shopsWithDistance = candidatesRes.data
      .map(shop => {
        const distMeters = calculateDistanceMeters(latitude, longitude, shop.latitude, shop.longitude)

        const image = shop.logo || shop.image || ''
        const address = shop.address || shop.detailAddress || ''

        return {
          ...shop,
          image,
          address,
          distanceMeters: distMeters,
          distanceText: formatDistanceMeters(distMeters)
        }
      })
      .filter(s => {
        if (province && province !== '全部') {
          return s.province === province
        }
        return true
      })
      .filter(s => {
        if (!kw) return true
        return (s.name || '').toLowerCase().includes(kw)
      })
      .filter(s => (maxD === null ? true : s.distanceMeters <= maxD))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)

    const total = shopsWithDistance.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageData = shopsWithDistance.slice(start, end)

    return { code: 0, data: pageData, total, page, pageSize }
  } catch (e) {
    return { code: -1, msg: '获取附近店铺失败', error: e.message }
  }
}

// 获取用户的店铺列表（新增）
async function getMyShops(openid) {
  const shops = await db.collection('shops')
    .where({
      _openid: openid  // 使用 _openid 字段
    })
    .orderBy('sort', 'asc')
    .orderBy('createTime', 'desc')
    .get()
  
  return shops.data
}

async function createShop(event, openid) {
  const {
    // 主键：可选，若传入则使用该作为 docId
    shopId,
    // 唯一标识
    shopCode,
    name,
    // 兼容 logo/image 两个字段
    logo,
    image,
    phone,
    contact,
    province,
    city,
    district,
    // 兼容 address/detailAddress
    detailAddress,
    address,
    latitude,
    longitude,
    businessHours,
    sort,
    // 0-关闭，1-营业中，2-装修中；兼容 'open'
    status,
    deliveryRangeMeters,
    deliveryFeeCents,
    minOrderCents
  } = event

  if (!name) return { code: -1, msg: '请输入店铺名称' }
  const normalizedStatus = (status === 'open' || status === '1') ? 1 : Number(status ?? 1)

  // shopCode 唯一校验（创建时）
  if (shopCode) {
    const existRes = await db.collection('shops').where({ shopCode }).limit(1).get()
    if (existRes.data && existRes.data.length > 0) {
      const existId = existRes.data[0]._id
      if (String(existId) !== String(shopId || '')) {
        return { code: -1, msg: '店铺编号已存在' }
      }
    }
  }

  const finalLogo = logo || image || ''
  const finalAddress = detailAddress || address || ''
  try {
    const payload = {
      shopId: shopId || '',
      shopCode: shopCode || '',
      name: String(name).trim(),
      logo: finalLogo,
      image: finalLogo, // 兼容旧字段
      phone: phone || '',
      contact: contact || '',
      province: province || '',
      city: city || '',
      district: district || '',
      address: finalAddress, // 兼容旧字段
      detailAddress: finalAddress,
      latitude: latitude || 0,
      longitude: longitude || 0,
      businessHours: businessHours || '09:00-22:00',
      sort: Number(sort) || 0,
      status: normalizedStatus,
      deliveryRangeMeters: Number(deliveryRangeMeters) || 0,
      deliveryFeeCents: Number(deliveryFeeCents) || 0,
      minOrderCents: Number(minOrderCents) || 0,
      userId: openid,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    if (shopId) {
      await db.collection('shops').doc(shopId).set({ data: payload })
      return { code: 0, msg: '创建成功', id: shopId }
    }

    const res = await db.collection('shops').add({ data: payload })
    return { code: 0, msg: '创建成功', id: res._id }
  } catch (e) {
    return { code: -1, msg: '创建店铺失败', error: e.message }
  }
}

async function updateShop(event, openid) {
  const { shopId } = event
  if (!shopId) return { code: -1, msg: '缺少店铺ID' }
  const docRes = await db.collection('shops').doc(shopId).get()
  const old = docRes.data || null
  if (old && old.userId && String(old.userId) !== String(openid)) {
    return { code: -1, msg: '无权限更新店铺' }
  }

  const updateData = {}

  const fields = [
    'shopCode',
    'name',
    'logo',
    'image',
    'phone',
    'contact',
    'province',
    'city',
    'district',
    'detailAddress',
    'address',
    'latitude',
    'longitude',
    'businessHours',
    'sort',
    'deliveryRangeMeters',
    'deliveryFeeCents',
    'minOrderCents'
  ]

  fields.forEach(f => {
    if (event[f] !== undefined) updateData[f] = f === 'name' ? String(event[f]).trim() : event[f]
  })

  if (event.status !== undefined) {
    updateData.status = (event.status === 'open' || event.status === '1') ? 1 : Number(event.status)
  }

  // 统一兼容字段
  if (updateData.logo !== undefined) updateData.image = updateData.logo
  if (updateData.detailAddress !== undefined) updateData.address = updateData.detailAddress

  updateData.updateTime = db.serverDate()
  try {
    await db.collection('shops').doc(shopId).update({ data: updateData })
    return { code: 0, msg: '更新成功' }
  } catch (e) {
    return { code: -1, msg: '更新店铺失败', error: e.message }
  }
}

async function deleteShop(event, openid) {
  const { shopId } = event
  if (!shopId) return { code: -1, msg: '缺少店铺ID' }
  try {
    await db.collection('shops').doc(shopId).remove()
    return { code: 0, msg: '删除成功' }
  } catch (e) {
    return { code: -1, msg: '删除店铺失败', error: e.message }
  }
}

function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) return 999
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return 999
  const R = 6371000 // 地球半径：米
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function formatDistanceMeters(meters) {
  if (!meters || meters < 0) return '未知'
  if (meters < 1000) return Math.round(meters) + 'm'
  return (meters / 1000).toFixed(1).replace(/\.0$/, '') + 'km'
}
