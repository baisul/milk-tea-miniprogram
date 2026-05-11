const app = getApp()

Page({
  data: {
    shops: [],
    userLocation: null,
    searchKeyword: '',
    loading: true
  },

  onLoad(options) {
    // 如果有指定类型参数（0:堂食, 1:外卖）
    const orderType = options.orderType
    if (orderType) {
      this.setData({ orderType: parseInt(orderType) })
    }
    this.loadShops()
    this.getUserLocation()
  },

  // 获取用户位置
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res
        this.setData({ userLocation: { latitude, longitude } })
        this.calculateDistances()
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'none' })
      }
    })
  },

  // 加载店铺列表
  async loadShops() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'shopManager',
        data: { action: 'list' }
      })

      if (res.result.success) {
        let shops = res.result.data || []
        // 过滤营业中的店铺
        shops = shops.filter(s => s.isOpen)
        this.setData({ shops, loading: false })
        this.calculateDistances()
      } else {
        this.fallbackShops()
      }
    } catch (err) {
      console.error('加载店铺失败:', err)
      this.fallbackShops()
    }
  },

  // 降级数据
  fallbackShops() {
    const shops = [
      { _id: '1', name: '万达广场店', address: '万达广场负一层', isOpen: true, businessHours: '10:00-22:00' },
      { _id: '2', name: '步行街店', address: '步行街中段', isOpen: true, businessHours: '10:00-22:00' },
      { _id: '3', name: '大学城店', address: '大学城南门', isOpen: true, businessHours: '10:00-22:00' }
    ]
    this.setData({ shops, loading: false })
  },

  // 计算距离
  calculateDistances() {
    if (!this.data.userLocation) return

    const { latitude, longitude } = this.data.userLocation
    const shops = this.data.shops.map(shop => {
      if (shop.location && shop.location.latitude && shop.location.longitude) {
        shop.distance = this.getDistance(latitude, longitude, shop.location.latitude, shop.location.longitude)
      }
      return shop
    })
    this.setData({ shops })
  },

  // 计算两点间距离（米）
  getDistance(lat1, lng1, lat2, lng2) {
    const radLat1 = lat1 * Math.PI / 180
    const radLat2 = lat2 * Math.PI / 180
    const a = radLat1 - radLat2
    const b = lng1 * Math.PI / 180 - lng2 * Math.PI / 180
    const s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
    const EARTH_RADIUS = 6378137
    return Math.round(s * EARTH_RADIUS)
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  // 选择店铺
  onSelectShop(e) {
    const shop = e.currentTarget.dataset.shop
    
    const app = getApp()
    app.checkAuth().then(() => {
      app.globalData.selectedShop = shop
      wx.navigateBack()
    })
  },

  // 重新定位
  onRelocate() {
    this.getUserLocation()
    wx.showLoading({ title: '定位中...' })
    setTimeout(() => wx.hideLoading(), 1000)
  }
})
