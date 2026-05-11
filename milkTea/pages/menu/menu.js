// pages/menu/menu.js
const { getDrinkImage } = require('../../utils/images')
const util = require('../../utils/util')
const app = getApp()
const priceUtil = require('../../utils/price')

Page({
  data: {
    shopId: '',
    shopName: '',
    categories: [],
    currentCategory: '',
    drinks: [],
    loading: true,
    // 购物车
    cartCount: 0,
    cartTotal: 0,
    // 不再需要规格选择弹窗的数据，因为使用独立的 spec-picker 组件
  },

  onLoad(options) {
    console.log('menu onLoad options:', options)
    
    const shopId = options.shopId || ''
    const shop = app.globalData.currentShop || {}
    
    // 保存店铺信息到全局（供购物车使用）
    app.globalData.currentShopId = shopId
    app.globalData.currentShopName = shop.name || '奶茶店'
    
    console.log('shopId:', shopId)
    console.log('当前店铺:', shop)
    
    this.setData({ 
      shopId: shopId, 
      shopName: shop.name || '默认店铺' 
    })
    
    this.loadCategories()
    this.updateCartInfo()
  },

  onShow() {
    this.updateCartInfo()
  },

  /**
   * 调用购物车云函数
   */
  async callCartCloudFunction(action, data = {}) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'cartManager',
        data: { action, data }
      })
      return res.result
    } catch (error) {
      console.error(`云函数调用失败 [${action}]:`, error)
      return { code: 500, message: error.message }
    }
  },

  /**
   * 更新购物车信息
   */
  async updateCartInfo() {
    try {
      const result = await this.callCartCloudFunction('getCartCount', {
        shopId: this.data.shopId
      })
      if (result && result.code === 200) {
        const { count, total } = result.data
        this.setData({ 
          cartCount: count, 
          cartTotal: total.toFixed(2) 
        })
      }
    } catch (error) {
      console.error('获取购物车信息失败', error)
    }
  },

  // 加载分类
  async loadCategories() {
    console.log('开始加载分类, shopId:', this.data.shopId)
    
    try {
      const db = wx.cloud.database()
      let res
      
      if (this.data.shopId) {
        res = await db.collection('categories')
          .where({ shopId: this.data.shopId })
          .orderBy('sort', 'asc')
          .get()
      } else {
        res = await db.collection('categories')
          .orderBy('sort', 'asc')
          .limit(50)
          .get()
      }
      
      console.log('查询到的分类:', res.data)
      
      let categories = res.data
      
      if (categories.length === 0) {
        console.log('使用模拟分类数据')
        categories = [
          { _id: 'c1', name: '经典奶茶', sort: 1, shopId: this.data.shopId || 's1' },
          { _id: 'c2', name: '水果茶', sort: 2, shopId: this.data.shopId || 's1' },
          { _id: 'c3', name: '纯茶', sort: 3, shopId: this.data.shopId || 's1' },
          { _id: 'c4', name: '奶盖系列', sort: 4, shopId: this.data.shopId || 's1' },
          { _id: 'c5', name: '特调饮品', sort: 5, shopId: this.data.shopId || 's1' }
        ]
      }
      
      const currentCategory = categories.length > 0 ? categories[0]._id : ''
      
      this.setData({
        categories,
        currentCategory
      }, () => {
        console.log('当前选中的分类:', currentCategory)
        if (currentCategory) {
          this.loadDrinks()
        } else {
          this.setData({ loading: false, drinks: [] })
        }
      })
      
    } catch (e) {
      console.error('加载分类失败:', e)
      const categories = [
        { _id: 'c1', name: '经典奶茶', sort: 1, shopId: this.data.shopId || 's1' },
        { _id: 'c2', name: '水果茶', sort: 2, shopId: this.data.shopId || 's1' },
        { _id: 'c3', name: '纯茶', sort: 3, shopId: this.data.shopId || 's1' },
        { _id: 'c4', name: '奶盖系列', sort: 4, shopId: this.data.shopId || 's1' },
        { _id: 'c5', name: '特调饮品', sort: 5, shopId: this.data.shopId || 's1' }
      ]
      this.setData({
        categories,
        currentCategory: categories[0]._id
      })
      this.loadDrinks()
    }
  },

// 加载饮品列表
// 加载饮品列表
async loadDrinks() {
  const { shopId, currentCategory } = this.data
  
  if (!currentCategory) {
    this.setData({ loading: false, drinks: [] })
    return
  }
  
  this.setData({ loading: true })
  
  try {
    const db = wx.cloud.database()
    const res = await db.collection('drinks')
      .where({ categoryId: currentCategory, isOnShelf: true })
      .orderBy('sort', 'asc')
      .limit(50)
      .get()
    
    console.log('查询到的原始饮品数据:', res.data)
    
    let drinks = res.data.map(item => ({
      ...item,
      image: getDrinkImage(item.image),
      price: priceUtil.formatPriceDisplay(item.price),
      // 保留原始的 cupSizes 格式（对象数组）
      cupSizes: item.cupSizes || [],
      temperatures: item.temperatures || [],
      sweetnesses: item.sweetnesses || []
    }))
    
    console.log('处理后的饮品 cupSizes 格式:', drinks.map(d => ({ name: d.name, cupSizes: d.cupSizes })))
    
    this.setData({ drinks, loading: false })
    
  } catch (e) {
    console.error('加载饮品失败:', e)
    this.setData({ loading: false, drinks: [] })
  }
},

// 获取模拟饮品数据（确保 cupSizes 正确）
getMockDrinks(categoryId) {
  const mockDrinks = {
    'c1': [
      { 
        _id: 'd1', name: '珍珠奶茶', price: 15, image: '/images/drink-placeholder.png', 
        description: '经典口味，Q弹珍珠', categoryId: 'c1', sort: 1, isOnShelf: true,
        cupSizes: ['small', 'medium', 'large'], 
        temperatures: ['standard_ice', 'less_ice', 'no_ice', 'hot'], 
        sweetnesses: ['standard', 'less', 'half', 'light', 'none'] 
      },
      { 
        _id: 'd2', name: '芋泥波波茶', price: 16, image: '/images/drink-placeholder.png', 
        description: '香浓芋泥，绵密口感', categoryId: 'c1', sort: 2, isOnShelf: true,
        cupSizes: ['medium', 'large'], 
        temperatures: ['hot'], 
        sweetnesses: ['standard', 'less', 'half'] 
      }
    ],
    'c2': [
      { 
        _id: 'd6', name: '杨枝甘露', price: 18, image: '/images/drink-placeholder.png', 
        description: '芒果鲜榨，西米露', categoryId: 'c2', sort: 1, isOnShelf: true,
        cupSizes: ['medium', 'large'], 
        temperatures: ['standard_ice', 'less_ice', 'no_ice'], 
        sweetnesses: ['standard', 'less', 'half'] 
      }
    ]
  }
  
  const drinks = (mockDrinks[categoryId] || mockDrinks['c1']).map(item => ({
    ...item,
    image: getDrinkImage(item.image),
    price: (item.price).toFixed(2)
  }))
  
  return drinks
},

  // 切换分类
  switchCategory(e) {
    const { id } = e.currentTarget.dataset
    console.log('切换分类:', id)
    
    if (id === this.data.currentCategory) return
    
    this.setData({ currentCategory: id })
    this.loadDrinks()
  },

  // 显示规格选择弹窗 - 使用独立的 spec-picker 组件
  showSpec(e) {
    const drink = e.currentTarget.dataset.drink
    console.log('显示规格选择:', drink)
    console.log('店铺信息:', this.data.shopId, this.data.shopName)
    
    // 获取规格选择器组件实例
    const specPicker = this.selectComponent('#specPicker')
    if (specPicker) {
      // 调用组件的 show 方法，传入饮品、店铺ID、店铺名称
      specPicker.show(drink, this.data.shopId, this.data.shopName)
    } else {
      console.error('未找到 specPicker 组件')
    }
  },
  // pages/menu/menu.js

/**
 * 编辑购物车商品（从弹框触发）
 */
onEditCartItem(e) {
  console.log('编辑商品', e.detail);
  const { item } = e.detail;
  
  // 获取规格选择器组件
  const specPicker = this.selectComponent('#specPicker');
  if (specPicker) {
    // 将购物车商品转换为饮品格式
    const drink = {
      _id: item.productId,
      name: item.productName,
      image: item.productImage,
      price: item.price,
      cupSizes: item.cupSizes || ['small', 'medium', 'large'],
      temperatures: item.temperatures || ['standard_ice', 'less_ice', 'no_ice', 'hot'],
      sweetnesses: item.sweetnesses || ['standard', 'less', 'half', 'light', 'none']
    };
    
    // 打开规格选择器，传入购物车商品ID用于更新
    specPicker.showForEdit(drink, this.data.shopId, this.data.shopName, item);
  }
},

    /**
   * 显示购物车弹框
   */
    showCartPopup() {
      console.log('点击购物车图标，显示弹框');
      const cartPopup = this.selectComponent('#cartPopup');
      if (cartPopup) {
        cartPopup.show();
      } else {
        console.error('未找到 cartPopup 组件');
      }
    },
  
   /**
 * 弹框去结算
 */
  onPopupCheckout(e) {
    console.log('弹框去结算', e.detail);
    const { items } = e.detail;
    const app = getApp();
    app.globalData.checkoutList = items;
    wx.navigateTo({
      url: '/pages/checkout/checkout'
    });
},

  // 规格选择器关闭回调
  onSpecClose() {
    console.log('规格选择器关闭')
  },

  // 添加成功回调，更新购物车数量
  onSpecAdd(e) {
    console.log('添加成功', e.detail)
    // 刷新购物车数量显示
    this.updateCartInfo()
  },

  // 跳转购物车
  goCart() {
    wx.navigateTo({ url: '/pages/cardlist/cardlist' })
  },

  // 显示购物车弹框
showCartPopup() {
  const cartPopup = this.selectComponent('#cartPopup');
  if (cartPopup) {
    cartPopup.show();
  }
},

// pages/menu/menu.js

// 去结算
goCheckout() {
  if (this.data.cartCount === 0) {
    util.showToast('购物车是空的');
    return;
  }

  // 获取购物车所有商品，获取成功后再跳转
  this.getAllCartItemsForCheckout();
},

/**
 * 获取该店铺的所有未删除的购物车商品并跳转结算
 */
async getAllCartItemsForCheckout() {
  try {
    wx.showLoading({ title: '加载中...' });
    
    // 检查 callCartCloudFunction 的返回值结构
    const result = await this.callCartCloudFunction('getCartList', { 
      page: 1, 
      pageSize: 100,
      shopId: this.data.shopId 
    });
    
    wx.hideLoading();
    
    console.log('获取购物车商品结果:', result);
    
    // 根据 callCartCloudFunction 的返回结构解析数据
    let items = [];
    
    // 调试：打印完整结果结构
    console.log('result 结构:', JSON.stringify(result));
    
    // 尝试多种可能的数据结构
    if (result && result.code === 200) {
      // 如果 result 直接包含 data
      if (result.data && result.data.list) {
        items = result.data.list;
      } else if (result.list) {
        items = result.list;
      }
    } else if (result && result.result && result.result.code === 200) {
      // 如果 result 包含 result 属性
      if (result.result.data && result.result.data.list) {
        items = result.result.data.list;
      } else if (result.result.list) {
        items = result.result.list;
      }
    }
    
    console.log('解析后的购物车商品数量:', items.length);
    
    if (items.length === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    
    // 将所有商品标记为选中状态
    const selectedItems = items.map(item => ({
      ...item,
      selected: true
    }));
    
    // 存储到全局
    const app = getApp();
    app.globalData.checkoutList = selectedItems;
    // 直接在 URL 中传递 orderType
    const orderType = app.globalData.orderType || 'dine-in';
    
    console.log('存储到结算页的商品数量:', selectedItems.length);
    console.log('存储的商品:', selectedItems);
    console.log('存储的orderType:', orderType);

    // 数据存储成功后跳转
    wx.navigateTo({
      url: '/pages/checkout/checkout?shopId=' + this.data.shopId + '&orderType=' + orderType
    });
    
  } catch (error) {
    wx.hideLoading();
    console.error('获取购物车商品失败', error);
    wx.showToast({ title: '网络错误', icon: 'none' });
  }
},

/**
 * 购物车刷新回调（数量变化时触发）
 */
onCartRefresh() {
  console.log('购物车数据已变化，刷新外部显示');
  // 重新获取购物车数量
  this.updateCartInfo();
},
  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/order/order'
        })
      }
    })
  }
})