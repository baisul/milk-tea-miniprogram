// pages/checkout/checkout.js - 下单结算页
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    shopId: '',
    shopName: '',
    orderType: 'dine-in',
    cart: [],
    cartTotal: 0,
    cartCount: 0,
    finalTotal: 0,
    deliveryFee: '0.00',  // 配送费，可以从配置或接口获取
    contactPerson: '',
    contactPhone: '',
    remark: '',
    pickupTime: '尽快取餐',
    deliveryTime: '尽快送达',
    addressList: [],
    selectedAddress: null,
    showAddressPicker: false,
    pickupTimeOptions: ['尽快取餐', '30分钟后', '1小时后', '1.5小时后', '2小时后'],
    pickupTimeIndex: 0,
    deliveryTimeOptions: ['尽快送达', '30分钟后', '1小时后', '1.5小时后', '2小时后'],
    deliveryTimeIndex: 0,
    submitting: false
  },

onLoad(options) {
  console.log('========== 结算页 onLoad ==========');
  console.log('options:', options);
  
  if (app.globalData) {
    app.globalData.orderType = this.data.orderType;
  }
  const shopId = options.shopId || '';
  const orderType = options.orderType || app.globalData.orderType || 'dine-in';
  console.log("全局变量orderType：" + app.globalData.orderType)
  this.orderType = orderType;
  const shop = app.globalData.currentShop;
  console.log("当前店铺：" + shop)
  
  let selectedCartItems = [];
  
  // 优先从全局获取
  if (app.globalData.checkoutList && app.globalData.checkoutList.length > 0) {
    selectedCartItems = app.globalData.checkoutList;
    console.log('✅ 从全局获取成功，商品数量:', selectedCartItems.length);
  }
  
  // 从本地存储获取（备用）
  if (selectedCartItems.length === 0) {
    try {
      const localData = wx.getStorageSync('checkout_items');
      if (localData && localData.length > 0) {
        selectedCartItems = localData;
        console.log('✅ 从本地存储获取成功，商品数量:', selectedCartItems.length);
        wx.removeStorageSync('checkout_items');
      }
    } catch (e) {
      console.error('读取本地存储失败', e);
    }
  }
  
  console.log('最终商品数量:', selectedCartItems.length);
  
  if (selectedCartItems.length === 0) {
    console.error('❌ 没有获取到任何商品数据');
    wx.showToast({ title: '请先选择商品', icon: 'none' });
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
    return;
  }
  
  // 继续处理订单...
  this.initOrderData(selectedCartItems, shopId, shop,orderType);
},
  
  initOrderData(selectedCartItems, shopId, shop, orderType) {
    // 计算总价
    const cartTotal = selectedCartItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
    
    const cartCount = selectedCartItems.reduce((sum, item) => {
      return sum + (parseInt(item.quantity) || 1);
    }, 0);
    
    console.log('订单总价:', cartTotal);
    console.log('商品总数:', cartCount);
    
    // 转换为订单需要的格式
    const cart = selectedCartItems.map(item => ({
      cartId: item._id || item.cartId,
      drinkId: item.productId,
      name: item.productName || item.name,
      image: item.productImage || item.image || '/images/drink-placeholder.png',
      price: parseFloat(item.price) || 0,
      specId: item.specId,
      specName: item.specName,
      temperature: item.temperature,
      temperatureText: item.temperatureText,
      sweetness: item.sweetness,
      sweetnessText: item.sweetnessText,
      quantity: parseInt(item.quantity) || 1,
      remark: item.remark || '',
      subtotal: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)
    }));

    this.setData({
      shopId: shopId,
      shopName: shop.name || '奶茶店',
      orderType: orderType,
      cart: cart,
      cartTotal: cartTotal.toFixed(2),
      cartCount: cartCount
    },() => {
      console.log('setData 完成后的 orderType:', this.data.orderType);
      console.log('setData 完成后的 addressList:', this.data.addressList);
      console.log('setData 完成后的 selectedAddress:', this.data.selectedAddress);
    });

      // 异步获取配送费（不阻塞主流程）
  this.fetchDeliveryFee(shopId);

    // 加载用户信息
    this.loadUserPhone();
    if (orderType === 'delivery') {
      this.loadAddresses();
    }
  },

  /**
 * 单独获取配送费（新方法）
 */
fetchDeliveryFee(shopId) {
  wx.cloud.callFunction({
    name: 'shopManager',
    data: {
      action: 'getDetail',
      shopId,
    }
  }).then(res => {
    console.log('获取店铺详情返回:', res);
    
    if (res && res.result && (res.result.code === 0 || res.result.code === 200)) {
      const fee = res.result.data?.deliveryFeeCents || res.result.data?.deliveryFee || 400;
      const deliveryFee = (parseFloat(fee) / 100).toFixed(2);
      this.setData({ deliveryFee: deliveryFee });
      console.log("配送费用：" + deliveryFee)
      
      // 如果订单类型是外卖，重新计算实付金额
      if (this.data.orderType === 'delivery') {
        this.calculateFinalTotal();
      }
    }
  }).catch(err => {
    console.warn('获取店铺配送费失败，使用默认值:', err);
    this.setData({ deliveryFee: '4.00' });
    if (this.data.orderType === 'delivery') {
      this.calculateFinalTotal();
    }
  });
},

/**
 * 计算实付金额（如有需要）
 */
calculateFinalTotal() {
  const cartTotal = parseFloat(this.data.cartTotal) || 0;
  const deliveryFee = parseFloat(this.data.deliveryFee) || 0;
  const finalTotal = (cartTotal + deliveryFee).toFixed(2);
  this.setData({ finalTotal: finalTotal });
},

  /**
 * 切换订单类型（外卖/到店）
 */
switchOrderType(e) {
  const type = e.currentTarget.dataset.type;
  console.log('切换订单类型:', type);
  
  // 更新页面数据
  this.setData({
    orderType: type
  });
  
  // 更新全局数据
  const app = getApp();
  if (app.globalData) {
    app.globalData.orderType = type;
  }
  
  console.log('已更新 globalData.orderType:', app.globalData.orderType);
  
  // 可以重置相关字段（例如清空地址选择等）
  if (type === 'dine-in') {
    // 切换到店，清空地址相关数据
    this.setData({
      selectedAddress: null
    });
  } else {
    // 切换到外卖，可以重新加载地址列表
    this.loadAddresses();
  }
},
  
  processOrder(selectedCartItems, shopId, shop, orderType) {
    // 计算总价
    const cartTotal = selectedCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = selectedCartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    console.log('订单总价:', cartTotal);
    console.log('订单数量:', cartCount);
    
    // 转换为订单需要的格式
    const cart = selectedCartItems.map(item => ({
      cartId: item._id,
      drinkId: item.productId,
      name: item.productName,
      image: item.productImage,
      price: item.price,
      specId: item.specId,
      specName: item.specName,
      temperature: item.temperature,
      temperatureText: item.temperatureText,
      sweetness: item.sweetness,
      sweetnessText: item.sweetnessText,
      quantity: item.quantity,
      remark: item.remark || '',
      subtotal: item.price * item.quantity
    }));

    this.setData({
      shopId: shopId,
      shopName: shop.name || shopName || '默认店铺',
      orderType: orderType,
      cart: cart,
      cartTotal: parseFloat(cartTotal.toFixed(2)),
      cartCount: cartCount
    });

    // 加载用户信息等
    this.loadUserPhone();
    if (orderType === 'delivery') {
      this.loadAddresses();
    }
  },

  // 加载用户手机号
  async loadUserPhone() {
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || 'test'
      const res = await db.collection('users').where({ openid }).get()
      if (res.data && res.data.length > 0 && res.data[0].phone) {
        this.setData({ contactPhone: res.data[0].phone })
      }
    } catch (e) {
      console.warn('加载用户手机号失败', e)
    }
  },

  async loadAddresses() {
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || 'test'
      const res = await db.collection('addresses')
        .where({ userId: openid })
        .orderBy('isDefault', 'desc')
        .orderBy('createTime', 'desc')
        .limit(20).get()
      const addressList = res.data
      const selectedAddress = addressList.find(a => a.isDefault) || addressList[0] || null
      this.setData({ addressList, selectedAddress })
    } catch (e) {
      console.warn('加载地址失败', e)
    }
  },

  onPhoneInput(e) { this.setData({ contactPhone: e.detail.value }) },
  onContactPersonInput(e) { this.setData({ contactPerson: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },

  onPickupTimeChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ pickupTimeIndex: idx, pickupTime: this.data.pickupTimeOptions[idx] })
  },

  onDeliveryTimeChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ deliveryTimeIndex: idx, deliveryTime: this.data.deliveryTimeOptions[idx] })
  },

  selectAddress(e) {
    const { index } = e.currentTarget.dataset
    this.setData({ selectedAddress: this.data.addressList[index], showAddressPicker: false })
  },

  showAddressList() {
    if (this.data.addressList.length > 0) {
      this.setData({ showAddressPicker: true })
    } else {
      wx.navigateTo({ url: '/pages/address-edit/address-edit' })
    }
  },

  addAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  closeAddressPicker() { this.setData({ showAddressPicker: false }) },

  validateForm() {
    const { contactPhone, orderType, selectedAddress, contactPerson } = this.data
    if (!contactPhone || !util.isValidPhone(contactPhone)) {
      util.showToast('请输入正确的手机号')
      return false
    }
    // 门店自取时，联系人姓名可选但建议填写
    if (orderType === 'delivery' && !selectedAddress) {
      util.showToast('请选择收货地址')
      return false
    }
    return true
  },

  /**
   * 调用云函数删除购物车中的商品（下单成功后）
   */
  async deleteCartItems(cartIds) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'cartManager',
        data: {
          action: 'deleteCartItem',
          data: { cartIds: cartIds }
        }
      })
      return res.result.code === 200
    } catch (error) {
      console.error('删除购物车商品失败', error)
      return false
    }
  },

  async submitOrder() {
    console.log('提交订单中...', this.data)
    if (this.data.submitting) return
    if (!this.validateForm()) return

    const confirmed = await util.showConfirm('确认提交订单？')
    if (!confirmed) return

    this.setData({ submitting: true })
    util.showLoading('提交订单中...')

    try {
      const db = wx.cloud.database()
      const { shopId, orderType, cart, cartTotal, contactPerson, contactPhone, remark, selectedAddress } = this.data
      const orderNo = util.generateOrderNo()

      // 获取购物车ID列表（用于下单后删除）
      const cartIds = cart.map(item => item.cartId).filter(id => id)

      // cartTotal 当前是“商品金额（元）”
      const cartTotalYuan = Number(cartTotal) || 0
      const cartTotalCents = Math.round(cartTotalYuan * 100)

      const orderData = {
        orderNo: orderNo,
        shopId: shopId,
        orderType: orderType,
        contactPerson: contactPerson || '',
        contactPhone: contactPhone,
        items: cart.map(item => ({
          cartId: item.cartId,
          drinkId: item.drinkId,
          name: item.name,
          image: item.image,
          price: item.price,
          specName: item.specName,
          temperature: item.temperature,
          temperatureText: item.temperatureText,
          sweetness: item.sweetness,
          sweetnessText: item.sweetnessText,
          quantity: item.quantity,
          remark: item.remark,
          subtotal: item.price * item.quantity
        })),
        totalPrice: cartTotalYuan,
        remark: remark,
        status: 'pending',
        userId: app.globalData.openid || 'test',
        createTime: db.serverDate()
      }

      let addressStr = ''
      const shopName = this.data.shopName
      
      if (orderType === 'dine-in') {
        orderData.pickupTime = this.data.pickupTime
      } else {
        orderData.deliveryTime = this.data.deliveryTime
        if (selectedAddress) {
          orderData.addressId = selectedAddress._id
          orderData.addressInfo = {
            name: selectedAddress.name,
            gender: selectedAddress.gender,
            phone: selectedAddress.phone,
            province: selectedAddress.province,
            city: selectedAddress.city,
            district: selectedAddress.district,
            detail: selectedAddress.detail,
            roomNumber: selectedAddress.roomNumber,
            tag: selectedAddress.tag,
            latitude: selectedAddress.latitude,
            longitude: selectedAddress.longitude
          }
          
          const genderText = util.getGenderText(selectedAddress.gender)
          addressStr = (selectedAddress.name || '') + ' ' + genderText + ' ' + (selectedAddress.phone || '') + '\n'
          addressStr += (selectedAddress.province || '') + (selectedAddress.city || '') + (selectedAddress.district || '') + (selectedAddress.detail || '')
          if (selectedAddress.roomNumber) addressStr += ' ' + selectedAddress.roomNumber

          // 配送费/起送金额/配送距离校验
          const shopRes = await db.collection('shops').doc(shopId).get()
          const shop = shopRes.data || {}

          const deliveryRangeMeters = Number(shop.deliveryRangeMeters ?? shop.deliveryRange ?? 0)
          const deliveryFeeCents = Number(shop.deliveryFeeCents ?? shop.deliveryFee ?? 0)
          const minOrderCents = Number(shop.minOrderCents ?? shop.minOrder ?? 0)

          const shopLat = shop.latitude
          const shopLng = shop.longitude
          const addrLat = selectedAddress.latitude
          const addrLng = selectedAddress.longitude

          if (deliveryRangeMeters > 0) {
            if (shopLat === undefined || shopLng === undefined || addrLat === undefined || addrLng === undefined) {
              util.showToast('缺少配送距离计算信息，请稍后重试')
              this.setData({ submitting: false })
              util.hideLoading()
              return
            }
            const distanceMeters = Math.round(util.getDistance(shopLat, shopLng, addrLat, addrLng) * 1000)
            orderData.deliveryDistanceMeters = distanceMeters
          }

          if (minOrderCents > 0 && cartTotalCents < minOrderCents) {
            util.showToast(`未达到起送金额（¥${(minOrderCents / 100).toFixed(2)}）`)
            this.setData({ submitting: false })
            util.hideLoading()
            return
          }

          const deliveryFeeYuan = deliveryFeeCents > 0 ? (deliveryFeeCents / 100) : 0
          orderData.deliveryFeeCents = deliveryFeeCents
          orderData.totalPrice = cartTotalYuan + deliveryFeeYuan
          orderData.deliveryMinOrderCents = minOrderCents
        }
      }

      // 保存订单
      const res = await db.collection('orders').add({ data: orderData })
      
      // 下单成功后，删除购物车中已下单的商品
      if (cartIds.length > 0) {
        await this.deleteCartItems(cartIds)
      }
      
      // 清空全局选中的商品
      app.globalData.checkoutList = []
      
      // 可选：触发购物车页面刷新
      const pages = getCurrentPages()
      const cartPage = pages.find(page => page.route === 'pages/cardlist/cardlist')
      if (cartPage) {
        cartPage.loadCartList(true)
      }

      util.hideLoading()
      this.setData({ submitting: false })

      wx.redirectTo({
        url: '/pages/order-success/order-success?orderNo=' + orderNo + '&orderId=' + res._id
      })
    } catch (e) {
      console.error('提交订单失败', e)
      util.hideLoading()
      this.setData({ submitting: false })
      util.showToast('提交失败，请重试')
    }
  }
})