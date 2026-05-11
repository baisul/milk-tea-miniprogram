// cloudfunctions/initData/index.js - 初始化数据云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'getOpenId':
      return { code: 0, openid }
    case 'initAll':
      return initAllData(openid)
    case 'initShops':
      return initShops(openid)
    case 'initCategories':
      return initCategories(openid)
    case 'initDrinks':
      return initDrinks(openid)
    case 'clearAll':
      return clearAllData(openid)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 初始化所有示例数据
async function initAllData(openid) {
  try {
    const shopResult = await initShops(openid)
    const categoryResult = await initCategories(openid)
    const drinkResult = await initDrinks(openid)
    return {
      code: 0,
      msg: '初始化完成',
      shops: shopResult.msg,
      categories: categoryResult.msg,
      drinks: drinkResult.msg
    }
  } catch (e) {
    return { code: -1, msg: '初始化失败: ' + e.message }
  }
}

// 初始化店铺数据
async function initShops(openid) {
  try {
    const existing = await db.collection('shops').count()
    if (existing.total > 0) {
      return { code: 0, msg: '店铺数据已存在，跳过初始化' }
    }

    const shops = [
      {
        name: '奶茶大师·科技园店',
        address: '广东省深圳市南山区科技园南路100号',
        latitude: 22.5431, longitude: 113.9500,
        phone: '0755-88886666',
        image: '',
        businessHours: '09:00-22:00',
        status: 'open', userId: openid,
        createTime: db.serverDate()
      },
      {
        name: '奶茶大师·福田店',
        address: '广东省深圳市福田区中心城花园1楼',
        latitude: 22.5369, longitude: 114.0546,
        phone: '0755-88887777',
        image: '',
        businessHours: '09:00-22:00',
        status: 'open', userId: openid,
        createTime: db.serverDate()
      },
      {
        name: '奶茶大师·罗湖店',
        address: '广东省深圳市罗湖区东门步行街88号',
        latitude: 22.5554, longitude: 114.1313,
        phone: '0755-88885555',
        image: '',
        businessHours: '10:00-21:30',
        status: 'open', userId: openid,
        createTime: db.serverDate()
      }
    ]

    const batch = db.batch()
    shops.forEach(shop => batch.add({ data: shop }))
    await batch.commit()

    return { code: 0, msg: `成功创建${shops.length}个店铺` }
  } catch (e) {
    return { code: -1, msg: '初始化店铺失败: ' + e.message }
  }
}

// 初始化分类数据
async function initCategories(openid) {
  try {
    const existing = await db.collection('categories').count()
    if (existing.total > 0) {
      return { code: 0, msg: '分类数据已存在，跳过初始化' }
    }

    // 获取第一个店铺ID
    const shopRes = await db.collection('shops').limit(1).get()
    const shopId = shopRes.data.length > 0 ? shopRes.data[0]._id : ''

    const categories = [
      { name: '经典奶茶', sort: 1, shopId, userId: openid, createTime: db.serverDate() },
      { name: '水果茶', sort: 2, shopId, userId: openid, createTime: db.serverDate() },
      { name: '纯茶', sort: 3, shopId, userId: openid, createTime: db.serverDate() },
      { name: '奶盖系列', sort: 4, shopId, userId: openid, createTime: db.serverDate() },
      { name: '特调饮品', sort: 5, shopId, userId: openid, createTime: db.serverDate() }
    ]

    const batch = db.batch()
    categories.forEach(cat => batch.add({ data: cat }))
    await batch.commit()

    return { code: 0, msg: `成功创建${categories.length}个分类` }
  } catch (e) {
    return { code: -1, msg: '初始化分类失败: ' + e.message }
  }
}

// 初始化饮品数据
async function initDrinks(openid) {
  try {
    const existing = await db.collection('drinks').count()
    if (existing.total > 0) {
      return { code: 0, msg: '饮品数据已存在，跳过初始化' }
    }

    // 获取分类列表
    const catRes = await db.collection('categories').limit(100).get()
    const categoryMap = {}
    catRes.data.forEach(cat => { categoryMap[cat.name] = cat._id })

    // 获取第一个店铺ID
    const shopRes = await db.collection('shops').limit(1).get()
    const shopId = shopRes.data.length > 0 ? shopRes.data[0]._id : ''

    const defaultSpecs = {
      cupSizes: ['medium', 'large', 'small'],
      temperatures: ['standard_ice', 'less_ice', 'no_ice', 'hot'],
      sweetnesses: ['standard', 'less', 'half', 'light', 'none']
    }

    const drinks = [
      // 经典奶茶
      { name: '珍珠奶茶', categoryId: categoryMap['经典奶茶'], price: 15, description: '经典口味，Q弹珍珠', stock: 100 },
      { name: '芋泥波波茶', categoryId: categoryMap['经典奶茶'], price: 16, description: '香浓芋泥，绵密口感', stock: 50 },
      { name: '红豆奶茶', categoryId: categoryMap['经典奶茶'], price: 14, description: '精选红豆，甜蜜温暖', stock: 80 },
      { name: '椰果奶茶', categoryId: categoryMap['经典奶茶'], price: 15, description: '爽脆椰果，搭配奶茶', stock: 60 },
      { name: '布丁奶茶', categoryId: categoryMap['经典奶茶'], price: 16, description: '嫩滑布丁，经典搭配', stock: 70 },
      // 水果茶
      { name: '杨枝甘露', categoryId: categoryMap['水果茶'], price: 18, description: '芒果鲜榨，西米露', stock: 40 },
      { name: '多肉葡萄', categoryId: categoryMap['水果茶'], price: 20, description: '新鲜葡萄，果肉满满', stock: 30 },
      { name: '草莓摇摇乐', categoryId: categoryMap['水果茶'], price: 17, description: '草莓奶昔，酸甜可口', stock: 45 },
      { name: '满杯红柚', categoryId: categoryMap['水果茶'], price: 19, description: '红柚鲜果，清爽解渴', stock: 25 },
      { name: '椰椰芒芒', categoryId: categoryMap['水果茶'], price: 19, description: '椰奶芒果，热带风味', stock: 35 },
      // 纯茶
      { name: '金凤茶王', categoryId: categoryMap['纯茶'], price: 12, description: '台湾乌龙，回甘悠长', stock: 90 },
      { name: '茉莉绿茶', categoryId: categoryMap['纯茶'], price: 10, description: '清新茉莉，淡雅绿茶', stock: 100 },
      { name: '四季春茶', categoryId: categoryMap['纯茶'], price: 10, description: '四季春香，自然回甘', stock: 85 },
      // 奶盖系列
      { name: '芝士奶盖绿茶', categoryId: categoryMap['奶盖系列'], price: 18, description: '咸香芝士，搭配绿茶', stock: 40 },
      { name: '芝士奶盖乌龙', categoryId: categoryMap['奶盖系列'], price: 18, description: '浓香芝士，乌龙茶底', stock: 35 },
      { name: '芝士奶盖四季春', categoryId: categoryMap['奶盖系列'], price: 18, description: '芝士奶盖，四季春茶底', stock: 38 },
      // 特调饮品
      { name: '黑糖鹿丸鲜奶', categoryId: categoryMap['特调饮品'], price: 17, description: '手工黑糖，Q弹鹿丸', stock: 50 },
      { name: '焦糖玛奇朵奶茶', categoryId: categoryMap['特调饮品'], price: 20, description: '浓郁焦糖，丝滑奶茶', stock: 30 }
    ]

    const batch = db.batch()
    drinks.forEach(drink => {
      batch.add({
        data: {
          ...drink,
          ...defaultSpecs,
          shopId,
          image: '',
          isOnShelf: true,
          userId: openid,
          createTime: db.serverDate()
        }
      })
    })
    await batch.commit()

    return { code: 0, msg: `成功创建${drinks.length}个饮品` }
  } catch (e) {
    return { code: -1, msg: '初始化饮品失败: ' + e.message }
  }
}

// 清空所有数据（慎用）
async function clearAllData(openid) {
  try {
    const collections = ['drinks', 'categories', 'orders', 'favorites', 'addresses', 'shops']
    const results = {}

    for (const col of collections) {
      try {
        const res = await db.collection(col).where({ userId: openid }).remove()
        results[col] = res.stats.removed
      } catch (e) {
        results[col] = 0
      }
    }

    return { code: 0, msg: '清空完成', details: results }
  } catch (e) {
    return { code: -1, msg: '清空数据失败: ' + e.message }
  }
}
