// cloudfunctions/addressManager/index.js - 地址管理云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'getList':
      return getAddressList(event, openid)
    case 'getDetail':
      return getAddressDetail(event, openid)
    case 'create':
      return createAddress(event, openid)
    case 'update':
      return updateAddress(event, openid)
    case 'delete':
      return deleteAddress(event, openid)
    case 'setDefault':
      return setDefaultAddress(event, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

async function getAddressList(event, openid) {
  const { page = 1, pageSize = 50 } = event
  try {
    const countRes = await db.collection('addresses').where({ userId: openid }).count()
    const list = await db.collection('addresses')
      .where({ userId: openid })
      .orderBy('isDefault', 'desc').orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize).get()
    return { code: 0, data: list.data, total: countRes.total }
  } catch (e) {
    return { code: -1, msg: '获取地址列表失败', error: e.message }
  }
}

async function getAddressDetail(event, openid) {
  const { addressId } = event
  if (!addressId) return { code: -1, msg: '缺少地址ID' }
  try {
    const res = await db.collection('addresses').doc(addressId).get()
    if (res.data.userId !== openid) return { code: -1, msg: '无权查看该地址' }
    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: '获取地址详情失败', error: e.message }
  }
}

async function createAddress(event, openid) {
  const { name, gender, phone, province, city, district, detail, roomNumber, tag, latitude, longitude } = event
  if (!name || !phone) return { code: -1, msg: '请输入收货人和手机号' }
  if (!/^1[3-9]\d{9}$/.test(phone)) return { code: -1, msg: '手机号格式不正确' }
  if (!detail) return { code: -1, msg: '请输入详细地址' }

  try {
    const countRes = await db.collection('addresses').where({ userId: openid }).count()
    const isDefault = countRes.total === 0

    const res = await db.collection('addresses').add({
      data: {
        userId: openid, name: name.trim(), gender: gender || 'male',
        phone: phone.trim(), province: province || '', city: city || '',
        district: district || '', detail: detail.trim(),
        roomNumber: roomNumber ? roomNumber.trim() : '',
        tag: tag || 'home', latitude: latitude || null,
        longitude: longitude || null, isDefault,
        createTime: db.serverDate()
      }
    })
    return { code: 0, msg: '创建成功', id: res._id }
  } catch (e) {
    return { code: -1, msg: '创建地址失败', error: e.message }
  }
}

async function updateAddress(event, openid) {
  const { addressId } = event
  if (!addressId) return { code: -1, msg: '缺少地址ID' }
  try {
    const existing = await db.collection('addresses').doc(addressId).get()
    if (existing.data.userId !== openid) return { code: -1, msg: '无权修改该地址' }
  } catch (e) {
    return { code: -1, msg: '地址不存在' }
  }

  const updateData = {}
  const trimFields = ['name', 'phone', 'detail', 'roomNumber']
  const rawFields = ['gender', 'province', 'city', 'district', 'tag', 'latitude', 'longitude']
  trimFields.forEach(f => { if (event[f] !== undefined) updateData[f] = String(event[f]).trim() })
  rawFields.forEach(f => { if (event[f] !== undefined) updateData[f] = event[f] })

  try {
    await db.collection('addresses').doc(addressId).update({ data: updateData })
    return { code: 0, msg: '更新成功' }
  } catch (e) {
    return { code: -1, msg: '更新地址失败', error: e.message }
  }
}

async function deleteAddress(event, openid) {
  const { addressId } = event
  if (!addressId) return { code: -1, msg: '缺少地址ID' }
  try {
    const existing = await db.collection('addresses').doc(addressId).get()
    if (existing.data.userId !== openid) return { code: -1, msg: '无权删除该地址' }
    const wasDefault = existing.data.isDefault
    await db.collection('addresses').doc(addressId).remove()

    if (wasDefault) {
      const latest = await db.collection('addresses')
        .where({ userId: openid }).orderBy('createTime', 'desc').limit(1).get()
      if (latest.data.length > 0) {
        await db.collection('addresses').doc(latest.data[0]._id).update({ data: { isDefault: true } })
      }
    }
    return { code: 0, msg: '删除成功' }
  } catch (e) {
    return { code: -1, msg: '删除地址失败', error: e.message }
  }
}

async function setDefaultAddress(event, openid) {
  const { addressId } = event
  if (!addressId) return { code: -1, msg: '缺少地址ID' }
  try {
    const all = await db.collection('addresses').where({ userId: openid, isDefault: true }).get()
    if (all.data.length > 0) {
      const batch = db.batch()
      all.data.forEach(doc => {
        batch.update(db.collection('addresses').doc(doc._id), { data: { isDefault: false } })
      })
      await batch.commit()
    }
    await db.collection('addresses').doc(addressId).update({ data: { isDefault: true } })
    return { code: 0, msg: '设置成功' }
  } catch (e) {
    return { code: -1, msg: '设置默认地址失败', error: e.message }
  }
}
