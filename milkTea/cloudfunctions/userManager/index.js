// cloudfunctions/userManager/index.js - 用户管理云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'autoLogin':
      return autoLogin(openid)
    case 'register':
      return register(openid, event)
    case 'getUserInfo':
      return getUserInfo(openid)
    case 'listHotDrinks':
      return listHotDrinks()
    case 'addHotDrink':
      return addHotDrink(event)
    case 'updateHotDrink':
      return updateHotDrink(event)
    case 'deleteHotDrink':
      return deleteHotDrink(event)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// ========== 用户管理 ==========

// 自动登录 - 检查用户是否已注册
async function autoLogin(openid) {
  try {
    // 查询用户是否存在
    const res = await db.collection('users')
      .where({ openid })
      .limit(1)
      .get()

    if (res.data.length > 0) {
      const user = res.data[0]
      // 生成 token
      const token = generateToken(openid)
      return {
        code: 0,
        msg: '登录成功',
        data: {
          token,
          userInfo: {
            openid: user.openid,
            nickname: user.nickname,
            gender: user.gender,
            phone: user.phone,
            avatar: user.avatar || ''
          },
          isRegistered: true
        }
      }
    } else {
      // 未注册
      return {
        code: 1,
        msg: '用户未注册',
        isRegistered: false
      }
    }
  } catch (e) {
    return { code: -1, msg: '登录失败: ' + e.message }
  }
}

// 用户注册
async function register(openid, data) {
  try {
    const { nickname, gender, phone, avatar } = data

    // 参数校验
    if (!nickname || !gender) {
      return { code: -1, msg: '请填写完整信息' }
    }

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return { code: -1, msg: '手机号格式不正确' }
    }

    // 查询是否已注册
    const existRes = await db.collection('users')
      .where({ openid })
      .limit(1)
      .get()

    let userInfo
    if (existRes.data.length > 0) {
      // 已注册则更新信息
      await db.collection('users')
        .where({ openid })
        .update({
          data: {
            nickname,
            gender,
            phone,
            avatar: avatar || '',
            updateTime: db.serverDate()
          }
        })
      userInfo = existRes.data[0]
      userInfo.nickname = nickname
      userInfo.gender = gender
      userInfo.phone = phone
      userInfo.avatar = avatar || ''
    } else {
      // 新用户注册
      const newUser = {
        openid,
        nickname,
        gender,
        phone,
        avatar: avatar || '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      await db.collection('users').add({ data: newUser })
      userInfo = newUser
    }

    // 生成 token
    const token = generateToken(openid)

    return {
      code: 0,
      msg: '注册成功',
      data: {
        token,
        userInfo: {
          openid: userInfo.openid,
          nickname: userInfo.nickname,
          gender: userInfo.gender,
          phone: userInfo.phone,
          avatar: userInfo.avatar || ''
        }
      }
    }
  } catch (e) {
    return { code: -1, msg: '注册失败: ' + e.message }
  }
}

// 获取用户信息
async function getUserInfo(openid) {
  try {
    const res = await db.collection('users')
      .where({ openid })
      .limit(1)
      .get()

    if (res.data.length > 0) {
      return { code: 0, data: res.data[0] }
    }
    return { code: 1, msg: '用户未注册' }
  } catch (e) {
    return { code: -1, msg: '查询失败: ' + e.message }
  }
}

// 生成 token
function generateToken(openid) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  // 简单加密，实际项目中可使用更复杂的加密方式
  const token = Buffer.from(`${openid}_${timestamp}_${random}`).toString('base64')
  return token
}

// 验证 token（可选，用于接口安全校验）
function verifyToken(token, openid) {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const parts = decoded.split('_')
    return parts[0] === openid
  } catch (e) {
    return false
  }
}

// ===== 热门饮品管理 =====

// 获取热门饮品列表
async function listHotDrinks() {
  try {
    const res = await db.collection('hotDrinks')
      .orderBy('sort', 'desc')
      .limit(100)
      .get()

    return { code: 0, data: res.data }
  } catch (e) {
    return { code: -1, msg: '查询失败: ' + e.message }
  }
}

// 新增热门饮品
async function addHotDrink(data) {
  try {
    const { drinkId, sort } = data

    if (!drinkId) {
      return { code: -1, msg: '请选择饮品' }
    }
    if (sort === undefined || sort === null || sort === '') {
      return { code: -1, msg: '请输入排序值' }
    }

    // 检查饮品是否已存在
    const existRes = await db.collection('hotDrinks')
      .where({ drinkId })
      .limit(1)
      .get()

    if (existRes.data.length > 0) {
      return { code: -1, msg: '该饮品已添加到热门推荐' }
    }

    await db.collection('hotDrinks').add({
      data: {
        drinkId,
        sort: Number(sort) || 0,
        createTime: db.serverDate()
      }
    })

    return { code: 0, msg: '添加成功' }
  } catch (e) {
    return { code: -1, msg: '添加失败: ' + e.message }
  }
}

// 更新热门饮品
async function updateHotDrink(data) {
  try {
    const { id, drinkId, sort } = data

    if (!id) {
      return { code: -1, msg: '缺少ID' }
    }
    if (!drinkId) {
      return { code: -1, msg: '请选择饮品' }
    }
    if (sort === undefined || sort === null || sort === '') {
      return { code: -1, msg: '请输入排序值' }
    }

    await db.collection('hotDrinks').doc(id).update({
      data: {
        drinkId,
        sort: Number(sort) || 0,
        updateTime: db.serverDate()
      }
    })

    return { code: 0, msg: '更新成功' }
  } catch (e) {
    return { code: -1, msg: '更新失败: ' + e.message }
  }
}

// 删除热门饮品
async function deleteHotDrink(data) {
  try {
    const { id } = data

    if (!id) {
      return { code: -1, msg: '缺少ID' }
    }

    await db.collection('hotDrinks').doc(id).remove()

    return { code: 0, msg: '删除成功' }
  } catch (e) {
    return { code: -1, msg: '删除失败: ' + e.message }
  }
}