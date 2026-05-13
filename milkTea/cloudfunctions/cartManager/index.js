// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      case 'addToCart':
        return await addToCart(openid, data);
      case 'getCartList':
        return await getCartList(openid, data);
      case 'updateQuantity':
        return await updateQuantity(openid, data);
      case 'updateSpec':
        return await updateSpec(openid, data);
      case 'updateTemperature':
        return await updateTemperature(openid, data);
      case 'updateSweetness':
        return await updateSweetness(openid, data);
      case 'updateRemark':
        return await updateRemark(openid, data);
      case 'deleteCartItem':
        return await deleteCartItem(openid, data);
      case 'clearCart':
        return await clearCart(openid);
      case 'selectCheckout':
        return await selectCheckout(openid, data);
      case 'batchDeleteCart':
        return await batchDeleteCart(openid, data);
      case 'getCartCount':
      return await getCartCount(openid,data);
      default:
        return { code: 400, message: '未知操作' };
    }
  } catch (error) {
    console.error(error);
    return { code: 500, message: error.message };
  }
};

// cloudfunctions/cart/index.js

/**
 * 添加到购物车
 */
async function addToCart(openid, data) {
  const { 
    shopId,           // 新增：店铺ID
    shopName,         // 新增：店铺名称
    productId, 
    productName, 
    productImage, 
    cupSize,
    cupSizeLabel,
    price,
    temperature,
    temperatureText,
    sweetness,
    sweetnessText,
    quantity = 1,
    remark = ''
  } = data;

  // 检查是否已存在相同规格的商品（同一店铺下）
  const existResult = await db.collection('shopping_cart')
    .where({
      userId: openid,
      shopId: shopId,
      productId: productId,
      cupSize: cupSize || '',
      temperature: temperature || '',
      sweetness: sweetness || '',
      status: 1
    })
    .get();

  if (existResult.data.length > 0) {
    // 已存在，增加数量
    const cartItem = existResult.data[0];
    const newQuantity = cartItem.quantity + quantity;
    const totalPrice = (price * newQuantity).toFixed(2);
    
    await db.collection('shopping_cart').doc(cartItem._id).update({
      data: {
        quantity: newQuantity,
        totalPrice: totalPrice,
        updateTime: db.serverDate()
      }
    });
    
    return { code: 200, message: '已添加到购物车' };
  } else {
    // 新增
    const totalPrice = (price * quantity).toFixed(2);
    
    await db.collection('shopping_cart').add({
      data: {
        userId: openid,
        shopId: shopId,           // 新增：店铺ID
        shopName: shopName,       // 新增：店铺名称
        productId: productId,
        productName: productName,
        productImage: productImage,
        cupSize: cupSize || '',
        cupSizeLabel: cupSizeLabel || '',
        price: price,
        quantity: quantity,
        totalPrice: totalPrice,
        temperature: temperature || '',
        temperatureText: temperatureText || '',
        sweetness: sweetness || '',
        sweetnessText: sweetnessText || '',
        remark: remark,
        status: 1,
        selected: true,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
    
    return { code: 200, message: '已添加到购物车' };
  }
}

// 获取购物车列表
async function getCartList(openid, data) {
  const { page = 1, pageSize = 10, shopId = null } = data;
  const skip = (page - 1) * pageSize;

  let where = {
    userId: openid,
    status: 1
  };
  
  if (shopId) {
    where.shopId = shopId;
  }

  const result = await db.collection('shopping_cart')
    .where(where)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  const total = await db.collection('shopping_cart')
    .where(where)
    .count();

  // 确保每个商品都有 selected 字段
  const list = result.data.map(item => ({
    ...item,
    selected: item.selected !== undefined ? item.selected : true
  }));

  return {
    code: 200,
    data: {
      list: list,
      total: total.total,
      page: page,
      pageSize: pageSize,
      hasMore: skip + result.data.length < total.total
    }
  };
}

/**
 * 获取购物车商品数量和总价（按店铺）
 */
// 获取购物车数量和总价
async function getCartCount(openid, data = {}) {
  
  // 构建查询条件
  let where = {
    userId: openid,
    status: 1
  };
  
  // 检查是否有 shopId
  if (data && data.shopId) {
    where.shopId = data.shopId;
    console.log('✅ 添加店铺过滤:', data.shopId);
  } else {
    console.log('⚠️ 没有 shopId 过滤条件');
  }
  
  console.log('最终查询条件:', JSON.stringify(where));
  
  try {
    const result = await db.collection('shopping_cart')
      .where(where)
      .get();
    
    console.log('查询到记录数:', result.data.length);
    
    // 计算总数和总价
    let count = 0;
    let total = 0;
    result.data.forEach(item => {
      count += item.quantity || 0;
      total += (item.price || 0) * (item.quantity || 0);
    });
    
    console.log('统计结果:', { count, total });
    
    return {
      code: 200,
      data: {
        count: count,
        total: total
      }
    };
  } catch (error) {
    console.error('数据库查询失败:', error);
    return {
      code: 500,
      message: error.message
    };
  }
}
/**
 * 更新数量
 */
async function updateQuantity(openid, data) {
  const { cartId, quantity } = data;
  
  const cartItem = await db.collection('shopping_cart').doc(cartId).get();
  if (!cartItem.data || cartItem.data.userId !== openid) {
    return { code: 403, message: '无权限操作' };
  }

  const totalPrice = (cartItem.data.price * quantity).toFixed(2);
  
  await db.collection('shopping_cart').doc(cartId).update({
    data: {
      quantity: quantity,
      totalPrice: totalPrice,
      updateTime: db.serverDate()
    }
  });

  return { code: 200, message: '更新成功' };
}

/**
 * 批量删除购物车商品（下单后调用）
 */
async function batchDeleteCart(openid, data) {
  const { cartIds } = data;
  
  if (!cartIds || cartIds.length === 0) {
    return { code: 400, message: '请选择要删除的商品' };
  }
  
  // 批量软删除
  const _ = db.command;
  await db.collection('shopping_cart')
    .where({
      userId: openid,
      _id: _.in(cartIds),
      status: 1
    })
    .update({
      data: {
        status: 0,
        updateTime: db.serverDate()
      }
    });

  return { code: 200, message: '删除成功' };
}

/**
 * 更新规格
 */
async function updateSpec(openid, data) {
  const { cartId, cupSize, cupSizeLabel, price } = data;
  
  const cartItem = await db.collection('shopping_cart').doc(cartId).get();
  if (!cartItem.data || cartItem.data.userId !== openid) {
    return { code: 403, message: '无权限操作' };
  }

  const totalPrice = (price * cartItem.data.quantity).toFixed(2);
  
  await db.collection('shopping_cart').doc(cartId).update({
    data: {
      cupSize: cupSize,
      cupSizeLabel: cupSizeLabel,
      price: price,
      totalPrice: totalPrice,
      updateTime: db.serverDate()
    }
  });

  return { code: 200, message: '更新成功' };
}

/**
 * 更新温度
 */
async function updateTemperature(openid, data) {
  const { cartId, temperature, temperatureText } = data;
  
  const cartItem = await db.collection('shopping_cart').doc(cartId).get();
  if (!cartItem.data || cartItem.data.userId !== openid) {
    return { code: 403, message: '无权限操作' };
  }
  
  await db.collection('shopping_cart').doc(cartId).update({
    data: {
      temperature: temperature,
      temperatureText: temperatureText,
      updateTime: db.serverDate()
    }
  });

  return { code: 200, message: '更新成功' };
}

/**
 * 更新甜度
 */
async function updateSweetness(openid, data) {
  const { cartId, sweetness, sweetnessText } = data;
  
  const cartItem = await db.collection('shopping_cart').doc(cartId).get();
  if (!cartItem.data || cartItem.data.userId !== openid) {
    return { code: 403, message: '无权限操作' };
  }
  
  await db.collection('shopping_cart').doc(cartId).update({
    data: {
      sweetness: sweetness,
      sweetnessText: sweetnessText,
      updateTime: db.serverDate()
    }
  });

  return { code: 200, message: '更新成功' };
}

/**
 * 更新备注
 */
async function updateRemark(openid, data) {
  const { cartId, remark } = data;
  
  const cartItem = await db.collection('shopping_cart').doc(cartId).get();
  if (!cartItem.data || cartItem.data.userId !== openid) {
    return { code: 403, message: '无权限操作' };
  }
  
  await db.collection('shopping_cart').doc(cartId).update({
    data: {
      remark: remark,
      updateTime: db.serverDate()
    }
  });

  return { code: 200, message: '更新成功' };
}

/**
 * 删除购物车项
 */
/**
 * 删除购物车项（支持批量）
 */
async function deleteCartItem(openid, data) {
  const { cartIds } = data;  // 改为接收数组
  
  // 兼容单个删除（如果传的是 cartId 字符串）
  let ids = [];
  if (Array.isArray(cartIds)) {
    ids = cartIds;
  } else if (data.cartId) {
    ids = [data.cartId];
  } else {
    return { code: 400, message: '参数错误：需要 cartIds 数组或 cartId 字符串' };
  }
  
  // 批量查询并验证权限
  const promises = ids.map(async (cartId) => {
    const cartItem = await db.collection('shopping_cart').doc(cartId).get();
    if (!cartItem.data || cartItem.data.userId !== openid) {
      return { cartId, success: false, message: '无权限或不存在' };
    }
    return { cartId, success: true };
  });
  
  const results = await Promise.all(promises);
  const validIds = results.filter(r => r.success).map(r => r.cartId);
  
  if (validIds.length === 0) {
    return { code: 403, message: '没有可删除的商品' };
  }
  
  // 批量软删除（使用 db.command.in）
  const _ = db.command;
  await db.collection('shopping_cart')
    .where({
      _id: _.in(validIds),
      userId: openid  // 二次校验
    })
    .update({
      data: {
        status: 0,
        updateTime: db.serverDate()
      }
    });
  
  return { 
    code: 200, 
    message: `成功删除 ${validIds.length} 条记录`,
    deletedCount: validIds.length
  };
}

/**
 * 清空购物车
 */
async function clearCart(openid) {
  // 软删除所有购物车项
  await db.collection('shopping_cart')
    .where({
      userId: openid,
      status: 1
    })
    .update({
      data: {
        status: 0,
        updateTime: db.serverDate()
      }
    });

  return { code: 200, message: '清空成功' };
}

/**
 * 选中要结算的商品
 */
async function selectCheckout(openid, data) {
  const { cartIds, selected } = data;
  
  if (!cartIds || cartIds.length === 0) {
    return { code: 400, message: '请选择商品' };
  }
  
  // 批量更新选中状态
  const promises = cartIds.map(cartId => {
    return db.collection('shopping_cart').doc(cartId).update({
      data: {
        selected: selected,
        updateTime: db.serverDate()
      }
    });
  });
  
  await Promise.all(promises);
  
  return { code: 200, message: '更新成功' };
}