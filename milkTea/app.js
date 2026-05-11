// app.js - 小程序入口文件
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      const initConfig = { traceUser: true }
      const envId = 'your envId'

      if (wx.cloud && wx.cloud.DYNAMIC_CURRENT_ENV) {
        initConfig.env = wx.cloud.DYNAMIC_CURRENT_ENV
      } else if (envId && envId !== 'your envId') {
        initConfig.env = envId
      }

      wx.cloud.init(initConfig)
    }

    // 初始化全局数据
    this.globalData.userInfo = null
    this.globalData.userToken = null
    this.globalData.openid = null
    
    // 检查本地缓存的登录状态
    this.checkLocalLogin()
    
    // 获取 openid
    this.getOpenId().then(openid => {
      if (openid) {
        this.globalData.openid = openid
        // 如果有 openid 但没有 token，尝试自动登录
        if (!this.globalData.userToken) {
          this.autoLogin()
        }
      }
    })
  },

  // 检查本地缓存的登录状态
  checkLocalLogin() {
    try {
      const token = wx.getStorageSync('userToken')
      const tokenExpireTime = wx.getStorageSync('tokenExpireTime')
      const userInfo = wx.getStorageSync('userInfo')
      
      // 检查 token 是否过期
      if (token && tokenExpireTime && Date.now() < tokenExpireTime) {
        this.globalData.userToken = token
        this.globalData.userInfo = userInfo
        this.globalData.isRegistered = true
        console.log('登录有效，token 未过期')
        return true
      } else if (token) {
        // token 已过期，清除缓存
        this.clearLoginCache()
        console.log('token 已过期，清除缓存')
      }
      return false
    } catch (e) {
      console.error('检查本地登录失败:', e)
      return false
    }
  },

  // 清除登录缓存
  clearLoginCache() {
    wx.removeStorageSync('userToken')
    wx.removeStorageSync('tokenExpireTime')
    wx.removeStorageSync('userInfo')
    this.globalData.userToken = null
    this.globalData.userInfo = null
    this.globalData.isRegistered = false
  },

  // 自动登录（只处理已注册用户）
  async autoLogin() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'userManager',
        data: { action: 'autoLogin' }
      })
      
      if (res.result && res.result.code === 0) {
        const { token, userInfo } = res.result.data
        this.saveLoginInfo(token, userInfo)
        console.log('自动登录成功')
        return { success: true, userInfo }
      } else if (res.result && res.result.code === 1) {
        // 未注册
        console.log('用户未注册，需要跳转注册页')
        return { success: false, needRegister: true }
      } else {
        throw new Error(res.result?.msg || '自动登录失败')
      }
    } catch (e) {
      console.error('自动登录失败:', e)
      return { success: false, error: e.message }
    }
  },

  // 保存登录信息到缓存（有效期半小时）
  saveLoginInfo(token, userInfo) {
    const expireTime = Date.now() + 30 * 60 * 1000 // 半小时后过期
    wx.setStorageSync('userToken', token)
    wx.setStorageSync('tokenExpireTime', expireTime)
    wx.setStorageSync('userInfo', userInfo)
    this.globalData.userToken = token
    this.globalData.userInfo = userInfo
    this.globalData.isRegistered = true
    console.log('登录信息已保存，有效期至:', new Date(expireTime))
  },

  // 用户注册
  async register(userData) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'userManager',
        data: { 
          action: 'register',
          userData: {
            nickname: userData.nickname,
            avatar: userData.avatar,
            phone: userData.phone,
            ...userData
          }
        }
      })
      
      if (res.result && res.result.code === 0) {
        const { token, userInfo } = res.result.data
        this.saveLoginInfo(token, userInfo)
        return { success: true, userInfo }
      } else {
        throw new Error(res.result?.msg || '注册失败')
      }
    } catch (e) {
      console.error('注册失败:', e)
      return { success: false, error: e.message }
    }
  },

  // 检查并刷新登录状态
  async ensureLogin() {
    // 检查本地 token 是否有效
    if (this.checkLocalLogin()) {
      return true
    }
    
    // token 无效，尝试自动登录
    const result = await this.autoLogin()
    
    if (result.success) {
      return true
    } else if (result.needRegister) {
      // 未注册，跳转注册页
      this.navigateToRegister()
      return false
    }
    
    return false
  },

  // 跳转到注册页
  navigateToRegister(redirectUrl) {
    const url = redirectUrl
      ? `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}`
      : '/pages/login/login'
    
    // 避免重复跳转
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage && currentPage.route === 'pages/login/login') {
      return
    }
    
    wx.navigateTo({ url })
  },

  // 登录拦截检查
  async checkAuth(redirectUrl) {
    const isLogin = await this.ensureLogin()
    
    if (!isLogin) {
      // 未登录，跳转到注册页
      this.navigateToRegister(redirectUrl)
      return false
    }
    return true
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo
  },

  // 获取 openid
  async getOpenId() {
    if (this.globalData.openid) return this.globalData.openid
    try {
      const res = await wx.cloud.callFunction({ 
        name: 'initData', 
        data: { action: 'getOpenId' } 
      })
      this.globalData.openid = res.result.openid
      return res.result.openid
    } catch (e) {
      console.warn('获取openid失败', e)
      return null
    }
  },

  // ============ 购物车管理 ============

  getCart(shopId) {
    if (!shopId) return []
    const key = 'cart_' + shopId
    return wx.getStorageSync(key) || []
  },

  saveCart(shopId, cart) {
    if (!shopId) return
    const key = 'cart_' + shopId
    wx.setStorageSync(key, cart)
  },

  clearCart(shopId) {
    if (!shopId) return
    const key = 'cart_' + shopId
    wx.removeStorageSync(key)
  },

  getCartCount(shopId) {
    const cart = this.getCart(shopId)
    return cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
  },

  getCartTotal(shopId) {
    const cart = this.getCart(shopId)
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  },

  addToCart(shopId, product) {
    const cart = this.getCart(shopId)
    const existIndex = cart.findIndex(item =>
      item.drinkId === product.drinkId &&
      item.cupSize === product.cupSize &&
      item.temperature === product.temperature &&
      item.sweetness === product.sweetness
    )
    if (existIndex > -1) {
      cart[existIndex].quantity += (product.quantity || 1)
    } else {
      cart.push({ ...product, quantity: product.quantity || 1 })
    }
    this.saveCart(shopId, cart)
    return cart
  },

  updateCartQuantity(shopId, index, quantity) {
    const cart = this.getCart(shopId)
    if (cart[index]) {
      if (quantity <= 0) {
        cart.splice(index, 1)
      } else {
        cart[index].quantity = quantity
      }
    }
    this.saveCart(shopId, cart)
    return cart
  },

  removeFromCart(shopId, index) {
    const cart = this.getCart(shopId)
    cart.splice(index, 1)
    this.saveCart(shopId, cart)
    return cart
  },
    // 设置 TabBar 选中状态
    setTabBarSelected(index) {
      this.globalData.tabBarSelected = index;
      // 触发全局事件，通知所有组件更新
      this.updateTabBarComponent();
    },
    
    // 更新 TabBar 组件
    updateTabBarComponent() {
      const tabBarComponent = this.globalData.tabBarComponent;
      if (tabBarComponent && tabBarComponent.updateSelected) {
        tabBarComponent.updateSelected(this.globalData.tabBarSelected);
        console.log('TabBar 组件已更新');
      }
    },
    
    // 注册 TabBar 组件
    registerTabBarComponent(component) {
      this.globalData.tabBarComponent = component;
      if (component) {
        component.updateSelected(this.globalData.tabBarSelected);
      }
    },

  globalData: {
    userInfo: null,
    userToken: null,
    isRegistered: false,
    openid: null,
    currentShop: null,
    orderType: 'dine-in',
    tabBarSelected: 0,
    checkoutList: [],    // 确保这个字段存在
    defaultImages: {
      banner: 'https://mmbiz.qpic.cn/mmbiz_png/OiaFlprRq0u2aa6vVia1icibEibd7ibTWSB5T5a7TNG7G7JiaIcgbrSgYz4DWsWZlGkQjMokE5ab3wibRZQiaOgXRr8X3zQ/0?wx_fmt=png',
      drink: 'https://mmbiz.qpic.cn/mmbiz_png/OiaFlprRq0u2aa6vVia1icibEibd7ibTWSB5T5a7TNG7G7JiaIcgbrSgYz4DWsWZlGkQjMokE5ab3wibRZQiaOgXRr8X3zQ/0?wx_fmt=png',
      shop: 'https://mmbiz.qpic.cn/mmbiz_png/OiaFlprRq0u2aa6vVia1icibEibd7ibTWSB5T5a7TNG7G7JiaIcgbrSgYz4DWsWZlGkQjMokE5ab3wibRZQiaOgXRr8X3zQ/0?wx_fmt=png',
      empty: 'https://mmbiz.qpic.cn/mmbiz_png/OiaFlprRq0u2aa6vVia1icibEibd7ibTWSB5T5a7TNG7G7JiaIcgbrSgYz4DWsWZlGkQjMokE5ab3wibRZQiaOgXRr8X3zQ/0?wx_fmt=png',
      cartIcon: '/images/cart-icon.png'
    }
  }
})