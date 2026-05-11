// pages/order/order.js - 点单Tab（店铺选择页）
const app = getApp()
const { getShopImage } = require('../../utils/images')
const util = require('../../utils/util')

// 中国省份列表
const provinces = ['全部', '北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海', '台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆', '香港', '澳门']

Page({
  data: {
    // Tab切换
    currentTab: 0,
    // 地图
    latitude: 23.1291,
    longitude: 113.2644,
    markers: [],
    // 搜索
    searchProvince: '全部',
    searchKeyword: '',
    provinces: provinces,
    provincePickerShow: false,
    // 店铺列表
    shops: [],
    shopsTotal: 0,
    shopsPage: 1,
    shopsPageSize: 10,
    shopsHasMore: true,
    shopsLoadingMore: false,
    favoriteShops: [],
    loading: true,
    selectedShop: null,
    showSpecPicker: false,
    currentDrink: {},
    navHeight: 0,           // 导航栏高度
    fixedHeaderHeight: 0,   // 固定头部总高度
    scrollHeight: 0,        // 滚动区域高度
    currentTab: 0,
  },

  onLoad() {
    console.log("order onLoad");
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.updateSelected(1);
    }
    // 同时更新全局状态
    app.setTabBarSelected(1);
    this.getUserLocation();
    this.loadFavorites();
    this.calcScrollHeight();
  },
  onReady() {
    this.calcHeights();
  },
    // 获取导航栏高度
    onNavHeightChange(e) {
      const { totalHeight } = e.detail;
      this.setData({ navHeight: totalHeight }, () => {
        this.calcHeights();
      });
    },
      // 计算固定区域和滚动区域高度
  calcHeights() {
    const systemInfo = wx.getSystemInfoSync();
    const windowHeight = systemInfo.windowHeight;
    
    // 获取固定头部区域的高度
    const query = wx.createSelectorQuery();
    query.select('.fixed-header').boundingClientRect();
    query.exec((res) => {
      const fixedHeight = res[0]?.height || 500;
      const fixedHeaderHeight = this.data.navHeight + fixedHeight;
      const scrollHeight = windowHeight - fixedHeaderHeight;
      
      console.log('高度计算:', {
        navHeight: this.data.navHeight,
        fixedHeight: fixedHeight,
        fixedHeaderHeight: fixedHeaderHeight,
        windowHeight: windowHeight,
        scrollHeight: scrollHeight
      });
      
      this.setData({ 
        fixedHeaderHeight: fixedHeaderHeight,
        scrollHeight: scrollHeight 
      });
    });
  },


    // 计算滚动区域高度
    calcScrollHeight() {
      const systemInfo = wx.getSystemInfoSync();
      const windowHeight = systemInfo.windowHeight;
      
      // 获取导航栏高度（需要根据实际导航栏组件的高度计算）
      // 导航栏高度 = 状态栏高度 + 44px
      const statusBarHeight = systemInfo.statusBarHeight || 20;
      const navBarHeight = statusBarHeight + 44;
      
      // 获取固定区域高度（Tab栏 + 地图 + 搜索栏）
      const query = wx.createSelectorQuery();
      query.select('.fixed-header').boundingClientRect();
      query.exec((res) => {
        const fixedHeight = res[0]?.height || 400;
        const scrollHeight = windowHeight - navBarHeight - fixedHeight;
        this.setData({ scrollHeight });
      });
    },

  onShow() {
    console.log("order onLoad");
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.updateSelected(1);
    }
    
    // 同时更新全局状态
    app.setTabBarSelected(1);

    this.calcScrollHeight();

    // 检查是否有从热门列表传来的饮品
    if (app.globalData.shouldSelectDrink && app.globalData.selectedDrink) {
      const drink = app.globalData.selectedDrink
      console.log('从热门列表跳转过来，饮品:', drink)
      
      // 清除标志
      app.globalData.shouldSelectDrink = false
      app.globalData.selectedDrink = null
      
      // 延迟显示规格选择弹窗，确保页面和组件都已渲染
      setTimeout(() => {
        this.showSpecForDrink(drink)
      }, 500)
    }
  },

  // 显示饮品的规格选择弹窗
  showSpecForDrink(drink) {
    // 方法1：通过组件方法调用
    const specPicker = this.selectComponent('#spec-picker')
    if (specPicker && specPicker.show) {
      specPicker.show(drink)
    } else {
      // 方法2：直接设置 data 触发显示
      console.log('使用 data 方式显示规格弹窗')
      this.setData({
        showSpecPicker: true,
        currentDrink: drink
      })
    }
  },

  onPullDownRefresh() {
    if (this.data.currentTab === 0) {
      this.loadShops(true)
    } else {
      this.loadFavorites()
    }
    wx.stopPullDownRefresh()
  },

  // 获取用户位置
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('获取位置成功:', res)
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        })
        this.loadShops(true)
      },
      fail: () => {
        console.warn('获取位置失败，使用默认位置')
        this.loadShops(true)
      }
    })
  },

  // 切换Tab
  switchTab(e) {
    const { index } = e.currentTarget.dataset
    console.log('切换Tab:', index)
    
    this.setData({ currentTab: Number(index) })
    
    if (Number(index) === 1) {
      this.loadFavorites()
    } else {
      this.loadShops(true)
    }
    setTimeout(() => {
      this.calcHeights();
    }, 150);
  },

  // 加载附近店铺
  async loadShops(reset = false) {
    console.log('========== loadShops 开始 ==========')
    
    if (reset) {
      this.setData({
        shops: [],
        shopsTotal: 0,
        shopsPage: 1,
        shopsHasMore: true
      })
    }

    if (!reset && (this.data.shopsLoadingMore || !this.data.shopsHasMore)) {
      console.log('跳过加载')
      return
    }

    const isFirstPage = reset || this.data.shopsPage === 1
    if (isFirstPage) this.setData({ loading: true })
    else this.setData({ shopsLoadingMore: true })

    try {
      const { latitude, longitude, searchProvince, searchKeyword, shopsPage, shopsPageSize } = this.data

      const res = await wx.cloud.callFunction({
        name: 'shopManager',
        data: {
          action: 'getNearby',
          latitude,
          longitude,
          page: shopsPage,
          pageSize: shopsPageSize,
          province: searchProvince,
          keyword: searchKeyword
        }
      })

      if (!res || !res.result || res.result.code !== 0) {
        throw new Error(res?.result?.msg || '获取店铺失败')
      }

      const pageData = res.result.data || []
      const total = res.result.total || 0

      // 获取当前用户的收藏列表 - 统一使用 _openid
      const db = wx.cloud.database()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || 'test'
      let favoriteIds = []
      
      try {
        const favRes = await db.collection('favorites')
          .where({ _openid: openid })  // ✅ 统一使用 _openid
          .get()
        favoriteIds = favRes.data.map(f => f.shopId)
        console.log('已收藏的店铺ID:', favoriteIds)
      } catch (err) {
        console.warn('获取收藏列表失败:', err)
      }

      const nextShops = pageData.map(shop => ({
        ...shop,
        image: getShopImage(shop.image || shop.logo),
        distanceText: shop.distanceText || util.formatDistance(shop.distanceMeters ? (shop.distanceMeters / 1000) : 0),
        distance: shop.distanceMeters ? (shop.distanceMeters / 1000) : 0,
        isFavorited: favoriteIds.includes(shop._id)
      }))

      const merged = reset ? nextShops : [...this.data.shops, ...nextShops]

      const markers = merged.filter(s => s.latitude && s.longitude).map(s => ({
        id: s._id,
        latitude: s.latitude,
        longitude: s.longitude,
        title: s.name,
        width: 32,
        height: 32,
        callout: {
          content: s.name,
          fontSize: 14,
          borderRadius: 8,
          padding: 6,
          display: 'ALWAYS',
          bgColor: '#ffffff'
        }
      }))

      const hasMore = merged.length < total
      this.setData({
        shops: merged,
        shopsTotal: total,
        shopsHasMore: hasMore,
        markers,
        loading: false,
        shopsLoadingMore: false,
        shopsPage: hasMore ? this.data.shopsPage + 1 : this.data.shopsPage
      })
      
      console.log('最终 shops 数量:', this.data.shops.length)

    } catch (e) {
      console.warn('加载店铺失败，使用模拟数据', e)
      this.loadMockShops(reset)
    }
  },

  // 加载模拟数据 - ✅ 修复：从 favoriteShops 同步收藏状态
  loadMockShops(reset) {
    // 获取当前已收藏的店铺ID
    const favoriteIds = this.data.favoriteShops.map(f => f._id)
    
    const mock = [
      { _id: 's1', name: '奶茶小站·旗舰店', address: '广州市天河区天河路228号', image: '/images/shop-placeholder.png', distance: 0.5, distanceText: '500m', latitude: 23.1291, longitude: 113.2644, province: '广东', phone: '020-12345678', businessHours: '10:00-22:00', isFavorited: favoriteIds.includes('s1') },
      { _id: 's2', name: '茶颜悦色·体育西店', address: '广州市天河区体育西路100号', image: '/images/shop-placeholder.png', distance: 1.2, distanceText: '1.2km', latitude: 23.1321, longitude: 113.2674, province: '广东', phone: '020-87654321', businessHours: '09:00-22:30', isFavorited: favoriteIds.includes('s2') },
      { _id: 's3', name: '一点点·珠江新城店', address: '广州市天河区珠江新城华夏路30号', image: '/images/shop-placeholder.png', distance: 2.8, distanceText: '2.8km', latitude: 23.1191, longitude: 113.3214, province: '广东', phone: '020-11223344', businessHours: '10:00-23:00', isFavorited: favoriteIds.includes('s3') },
      { _id: 's4', name: '喜茶·天环广场店', address: '广州市天河区天环广场B1层', image: '/images/shop-placeholder.png', distance: 3.5, distanceText: '3.5km', latitude: 23.1251, longitude: 113.3204, province: '广东', phone: '020-55667788', businessHours: '10:00-22:00', isFavorited: favoriteIds.includes('s4') },
      { _id: 's5', name: '奈雪的茶·万菱汇店', address: '广州市天河区天河路232号', image: '/images/shop-placeholder.png', distance: 4.1, distanceText: '4.1km', latitude: 23.1351, longitude: 113.3314, province: '广东', phone: '020-99887766', businessHours: '09:30-22:00', isFavorited: favoriteIds.includes('s5') }
    ]
    
    const merged = reset ? mock : [...this.data.shops, ...mock]
    
    // 去重
    const uniqueShops = []
    const shopIds = new Set()
    for (const shop of merged) {
      if (!shopIds.has(shop._id)) {
        shopIds.add(shop._id)
        uniqueShops.push(shop)
      }
    }
    
    const markers = uniqueShops.filter(s => s.latitude).map(s => ({
      id: s._id,
      latitude: s.latitude,
      longitude: s.longitude,
      title: s.name,
      width: 32,
      height: 32,
      callout: { content: s.name, fontSize: 14, borderRadius: 8, padding: 6, display: 'ALWAYS', bgColor: '#ffffff' }
    }))

    this.setData({
      shops: uniqueShops,
      shopsTotal: uniqueShops.length,
      shopsHasMore: false,
      markers,
      loading: false,
      shopsLoadingMore: false
    })
  },

  // 向下滚动加载更多
  onReachBottom() {
    if (this.data.currentTab !== 0) return
    if (!this.data.shopsHasMore) return
    if (this.data.shopsLoadingMore) return
    this.loadShops(false)
  },

  // 加载收藏列表
  async loadFavorites() {
    console.log('加载收藏列表')
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || 'test'
      
      const favRes = await db.collection('favorites')
        .where({ _openid: openid })
        .limit(50)
        .get()
      
      if (favRes.data.length === 0) {
        this.setData({ favoriteShops: [], loading: false })
        return
      }
      
      const shopIds = favRes.data.map(f => f.shopId)
      console.log('收藏的店铺ID:', shopIds)
      
      const _ = db.command
      const shopRes = await db.collection('shops')
        .where({ _id: _.in(shopIds) })
        .get()
      
      const favoriteShops = shopRes.data.map(shop => ({
        ...shop,
        image: shop.logo || shop.image || '/images/shop-placeholder.png',
        isFavorited: true
      }))
      
      this.setData({
        favoriteShops: favoriteShops,
        loading: false
      })
      
      // ✅ 刷新附近店铺的收藏状态（如果附近Tab有数据）
      if (this.data.shops.length > 0) {
        this.updateShopsFavoriteStatus(shopIds)
      }
      
    } catch (e) {
      console.error('加载收藏失败:', e)
      this.setData({ favoriteShops: [], loading: false })
    }
  },
  
  // ✅ 新增：更新附近店铺的收藏状态
  updateShopsFavoriteStatus(favoriteIds) {
    const updatedShops = this.data.shops.map(shop => ({
      ...shop,
      isFavorited: favoriteIds.includes(shop._id)
    }))
    this.setData({ shops: updatedShops })
  },

  // 选择省份（弹窗列表选择）
  onProvinceSelect(e) {
    const province = e.currentTarget.dataset.province
    this.setData({ searchProvince: province, provincePickerShow: false })
    this.loadShops(true)
  },

  // 显示省份选择器
  showProvincePicker() {
    this.setData({ provincePickerShow: true })
  },

  // 取消省份选择
  cancelProvince() {
    this.setData({ provincePickerShow: false })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  // 执行搜索
  doSearch() {
    this.loadShops(true)
  },

  // 清空搜索
  clearSearch() {
    this.setData({ searchKeyword: '', searchProvince: '全部' })
    this.loadShops(true)
  },

  // 选择店铺
  selectShop(e) {
    const { id } = e.currentTarget.dataset
    const shop = this.data.shops.find(s => s._id === id) || this.data.favoriteShops.find(s => s._id === id)
    if (!shop) return

    app.globalData.currentShop = shop
    wx.navigateTo({
      url: '/pages/menu/menu?shopId=' + shop._id
    })
  },

  // 收藏/取消收藏
  async toggleFavorite(e) {
    const { id } = e.currentTarget.dataset
    console.log('切换收藏, shopId:', id)
    
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || 'test'
      
      const existRes = await db.collection('favorites')
        .where({ 
          shopId: id, 
          _openid: openid
        })
        .get()
      
      const isFavorited = existRes.data.length > 0
      let newFavorited = false
      
      if (isFavorited) {
        await db.collection('favorites').doc(existRes.data[0]._id).remove()
        util.showToast('已取消收藏')
        newFavorited = false
      } else {
        await db.collection('favorites').add({
          data: { 
            shopId: id, 
            _openid: openid,
            createTime: db.serverDate() 
          }
        })
        util.showToast('已收藏', 'success')
        newFavorited = true
      }
      
      // 更新附近Tab中的店铺收藏状态
      const updatedShops = this.data.shops.map(shop => {
        if (shop._id === id) {
          return { ...shop, isFavorited: newFavorited }
        }
        return shop
      })
      this.setData({ shops: updatedShops })
      
      // 更新收藏列表
      if (newFavorited) {
        const shopToAdd = updatedShops.find(shop => shop._id === id)
        if (shopToAdd) {
          const newFavoriteShops = [shopToAdd, ...this.data.favoriteShops]
          this.setData({ favoriteShops: newFavoriteShops })
        }
      } else {
        const newFavoriteShops = this.data.favoriteShops.filter(shop => shop._id !== id)
        this.setData({ favoriteShops: newFavoriteShops })
      }
      
    } catch (e) {
      console.error('收藏操作失败:', e)
      util.showToast('操作失败')
    }
  },

  // 地图标记点击
  onMarkerTap(e) {
    const { markerId } = e.detail
    const shop = this.data.shops.find(s => s._id === markerId)
    if (shop) {
      this.selectShop({ currentTarget: { dataset: { id: shop._id } } })
    }
  }
})