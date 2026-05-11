// cloudfunctions/drinkManager/index.js - 饮品管理云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    // ---- 分类管理 ----
    case 'getCategoryList':
      return getCategoryList(event)
    case 'createCategory':
      return createCategory(event, openid)
    case 'updateCategory':
      return updateCategory(event, openid)
    case 'deleteCategory':
      return deleteCategory(event, openid)
    // ---- 饮品管理 ----
    case 'getDrinkList':
      return getDrinkList(event)
    case 'searchDrinks':
      return searchDrinks(event)
    case 'getRecommend':
      return getRecommend(event)
    case 'createDrink':
      return createDrink(event, openid)
    case 'updateDrink':
      return updateDrink(event, openid)
    case 'deleteDrink':
      return deleteDrink(event, openid)
    case 'toggleShelf':
      return toggleShelf(event, openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// ========== 分类管理 ==========

async function getCategoryList(event) {
  const { shopId = '' } = event
  try {
    const list = await db.collection('categories')
      .where({ shopId })
      .orderBy('sort', 'asc')
      .limit(100)
      .get()
    return { code: 0, data: list.data }
  } catch (e) {
    return { code: -1, msg: '获取分类列表失败', error: e.message }
  }
}

async function createCategory(event, openid) {
  const { name, sort = 1, shopId = '' } = event
  if (!name) return { code: -1, msg: '请输入分类名称' }
  try {
    const res = await db.collection('categories').add({
      data: {
        name: name.trim(), sort, shopId, userId: openid,
        createTime: db.serverDate()
      }
    })
    return { code: 0, msg: '创建成功', id: res._id }
  } catch (e) {
    return { code: -1, msg: '创建分类失败', error: e.message }
  }
}

async function updateCategory(event, openid) {
  const { categoryId, name, sort } = event
  if (!categoryId) return { code: -1, msg: '缺少分类ID' }
  const updateData = {}
  if (name !== undefined) updateData.name = name.trim()
  if (sort !== undefined) updateData.sort = sort
  try {
    await db.collection('categories').doc(categoryId).update({ data: updateData })
    return { code: 0, msg: '更新成功' }
  } catch (e) {
    return { code: -1, msg: '更新分类失败', error: e.message }
  }
}

async function deleteCategory(event, openid) {
  const { categoryId } = event
  if (!categoryId) return { code: -1, msg: '缺少分类ID' }
  try {
    // 级联删除该分类下的饮品
    const drinks = await db.collection('drinks').where({ categoryId }).limit(100).get()
    if (drinks.data.length > 0) {
      const batch = db.batch()
      drinks.data.forEach(d => batch.delete(db.collection('drinks').doc(d._id)))
      await batch.commit()
    }
    await db.collection('categories').doc(categoryId).remove()
    return { code: 0, msg: '删除成功' }
  } catch (e) {
    return { code: -1, msg: '删除分类失败', error: e.message }
  }
}

// ========== 饮品管理 ==========

async function getDrinkList(event) {
  const { categoryId, shopId = '', isOnShelf, page = 1, pageSize = 20 } = event
  try {
    const where = {}
    if (categoryId) where.categoryId = categoryId
    if (shopId) where.shopId = shopId
    if (isOnShelf !== undefined) where.isOnShelf = isOnShelf

    const countRes = await db.collection('drinks').where(where).count()
    const list = await db.collection('drinks')
      .where(where).orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize).get()

    return { code: 0, data: list.data, total: countRes.total }
  } catch (e) {
    return { code: -1, msg: '获取饮品列表失败', error: e.message }
  }
}

async function searchDrinks(event) {
  const { keyword = '', shopId = '', page = 1, pageSize = 20 } = event
  try {
    const where = { isOnShelf: true }
    if (shopId) where.shopId = shopId
    if (keyword) where.name = db.RegExp({ regexp: keyword, options: 'i' })

    const list = await db.collection('drinks')
      .where(where).orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize).get()

    return { code: 0, data: list.data }
  } catch (e) {
    return { code: -1, msg: '搜索饮品失败', error: e.message }
  }
}

async function getRecommend(event) {
  const { limit = 10 } = event
  try {
    const list = await db.collection('drinks')
      .where({ isOnShelf: true, stock: _.gt(0) })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()
    return { code: 0, data: list.data }
  } catch (e) {
    return { code: -1, msg: '获取推荐饮品失败', error: e.message }
  }
}

async function createDrink(event, openid) {
  const { categoryId, name, price, image, description, cupSizes, temperatures,
    sweetnesses, stock, isOnShelf, shopId = '' } = event
  if (!categoryId || !name) return { code: -1, msg: '缺少必要参数' }

  try {
    const res = await db.collection('drinks').add({
      data: {
        categoryId, shopId, name: name.trim(),
        price: Number(price) || 0,
        image: image || '',
        description: description || '',
        cupSizes: cupSizes || ['medium', 'large', 'small'],
        temperatures: temperatures || ['standard_ice', 'less_ice', 'no_ice', 'hot'],
        sweetnesses: sweetnesses || ['standard', 'less', 'half', 'light', 'none'],
        stock: Number(stock) || 0,
        isOnShelf: isOnShelf !== false,
        userId: openid,
        createTime: db.serverDate()
      }
    })
    return { code: 0, msg: '创建成功', id: res._id }
  } catch (e) {
    return { code: -1, msg: '创建饮品失败', error: e.message }
  }
}

async function updateDrink(event, openid) {
  const { drinkId } = event
  if (!drinkId) return { code: -1, msg: '缺少饮品ID' }

  const updateData = {}
  const fields = ['categoryId', 'name', 'description', 'image', 'cupSizes', 'temperatures', 'sweetnesses', 'shopId']
  fields.forEach(f => { if (event[f] !== undefined) updateData[f] = f === 'name' ? event[f].trim() : event[f] })
  if (event.price !== undefined) updateData.price = Number(event.price) || 0
  if (event.stock !== undefined) updateData.stock = Number(event.stock) || 0
  if (event.isOnShelf !== undefined) updateData.isOnShelf = event.isOnShelf

  try {
    await db.collection('drinks').doc(drinkId).update({ data: updateData })
    return { code: 0, msg: '更新成功' }
  } catch (e) {
    return { code: -1, msg: '更新饮品失败', error: e.message }
  }
}

async function deleteDrink(event, openid) {
  const { drinkId } = event
  if (!drinkId) return { code: -1, msg: '缺少饮品ID' }
  try {
    await db.collection('drinks').doc(drinkId).remove()
    return { code: 0, msg: '删除成功' }
  } catch (e) {
    return { code: -1, msg: '删除饮品失败', error: e.message }
  }
}

async function toggleShelf(event, openid) {
  const { drinkId, isOnShelf } = event
  if (!drinkId) return { code: -1, msg: '缺少饮品ID' }
  try {
    await db.collection('drinks').doc(drinkId).update({ data: { isOnShelf: !!isOnShelf } })
    return { code: 0, msg: isOnShelf ? '已上架' : '已下架' }
  } catch (e) {
    return { code: -1, msg: '操作失败', error: e.message }
  }
}
