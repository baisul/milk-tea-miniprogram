// cloudfunctions/favoriteManager/index.js - 收藏管理云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'getList':
      return getFavoriteList(event, openid)
    case 'add':
      return addFavorite(event, openid)
    case 'remove':
      return removeFavorite(event, openid)
    case 'toggle':
      return toggleFavorite(event, openid)
    case 'check':
      return checkFavorite(event, openid)
    case 'getOpenId':
      return { code: 0, openid }
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 获取收藏列表
async function getFavoriteList(event, openid) {
  const { page = 1, pageSize = 20 } = event
  try {
    const countRes = await db.collection('favorites').where({ userId: openid }).count()

    const list = await db.collection('favorites')
      .where({ userId: openid })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 关联查询店铺信息
    const favorites = []
    for (const fav of list.data) {
      try {
        const shop = await db.collection('shops').doc(fav.shopId).get()
        favorites.push({
          ...fav,
          shopInfo: shop.data
        })
      } catch (e) {
        // 店铺可能已被删除，忽略
        favorites.push(fav)
      }
    }

    return { code: 0, data: favorites, total: countRes.total }
  } catch (e) {
    return { code: -1, msg: '获取收藏列表失败', error: e.message }
  }
}

// 添加收藏
async function addFavorite(event, openid) {
  const { shopId } = event
  if (!shopId) return { code: -1, msg: '缺少店铺ID' }

  try {
    // 检查是否已收藏
    const exist = await db.collection('favorites')
      .where({ userId: openid, shopId })
      .count()

    if (exist.total > 0) {
      return { code: 0, msg: '已收藏', isFavorited: true }
    }

    await db.collection('favorites').add({
      data: {
        userId: openid,
        shopId,
        createTime: db.serverDate()
      }
    })
    return { code: 0, msg: '收藏成功', isFavorited: true }
  } catch (e) {
    return { code: -1, msg: '收藏失败', error: e.message }
  }
}

// 取消收藏
async function removeFavorite(event, openid) {
  const { shopId } = event
  if (!shopId) return { code: -1, msg: '缺少店铺ID' }

  try {
    const res = await db.collection('favorites')
      .where({ userId: openid, shopId })
      .remove()

    return { code: 0, msg: '已取消收藏', isFavorited: false }
  } catch (e) {
    return { code: -1, msg: '取消收藏失败', error: e.message }
  }
}

// 切换收藏状态
async function toggleFavorite(event, openid) {
  const { shopId } = event
  if (!shopId) return { code: -1, msg: '缺少店铺ID' }

  try {
    const exist = await db.collection('favorites')
      .where({ userId: openid, shopId })
      .get()

    if (exist.data.length > 0) {
      // 已收藏，取消
      await db.collection('favorites').doc(exist.data[0]._id).remove()
      return { code: 0, msg: '已取消收藏', isFavorited: false }
    } else {
      // 未收藏，添加
      await db.collection('favorites').add({
        data: { userId: openid, shopId, createTime: db.serverDate() }
      })
      return { code: 0, msg: '收藏成功', isFavorited: true }
    }
  } catch (e) {
    return { code: -1, msg: '操作失败', error: e.message }
  }
}

// 检查是否已收藏
async function checkFavorite(event, openid) {
  const { shopId } = event
  if (!shopId) return { code: -1, msg: '缺少店铺ID' }

  try {
    const count = await db.collection('favorites')
      .where({ userId: openid, shopId })
      .count()

    return { code: 0, isFavorited: count.total > 0 }
  } catch (e) {
    return { code: -1, msg: '查询失败', error: e.message }
  }
}
