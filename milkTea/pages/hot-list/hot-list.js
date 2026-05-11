// pages/hot-list/hot-list.js
const app = getApp()
const util = require('../../utils/util')
const { getDrinkImage } = require('../../utils/images')
const priceUtil = require('../../utils/price')

Page({
  data: {
    hotDrinks: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    total: 0
  },

  onLoad() {
    this.loadHotDrinks()
  },

  onReachBottom() {
    // 触底加载更多
    if (!this.data.loadingMore && this.data.hasMore) {
      this.loadMore()
    }
  },

  // 加载热门饮品列表
  async loadHotDrinks() {
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 查询热门饮品，按排序值降序（数值越大越靠前）
      const res = await db.collection('hotDrinks')
        .orderBy('sort', 'desc')
        .limit(this.data.pageSize)
        .get()
      
      console.log('热门列表:', res.data)
      
      // 获取饮品详情
      const hotDrinks = await this.getDrinkDetails(res.data)
      
      this.setData({
        hotDrinks,
        loading: false,
        hasMore: res.data.length === this.data.pageSize,
        page: 2,
        total: res.data.length
      })
      
    } catch (err) {
      console.error('加载热门列表失败:', err)
      this.setData({ loading: false })
      util.showToast('加载失败，请重试')
    }
  },

  // 加载更多
  async loadMore() {
    if (this.data.loadingMore) return
    
    this.setData({ loadingMore: true })
    
    try {
      const db = wx.cloud.database()
      
      const res = await db.collection('hotDrinks')
        .orderBy('sort', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()
      
      if (res.data.length === 0) {
        this.setData({ hasMore: false, loadingMore: false })
        return
      }
      
      const newDrinks = await this.getDrinkDetails(res.data)
      
      this.setData({
        hotDrinks: [...this.data.hotDrinks, ...newDrinks],
        loadingMore: false,
        hasMore: res.data.length === this.data.pageSize,
        page: this.data.page + 1
      })
      
    } catch (err) {
      console.error('加载更多失败:', err)
      this.setData({ loadingMore: false })
      util.showToast('加载失败，请重试')
    }
  },

  // 获取饮品详情
  async getDrinkDetails(hotList) {
    const db = wx.cloud.database()
    const drinks = []
    
    for (const hot of hotList) {
      if (!hot.drinkId) continue
      
      try {
        const drinkRes = await db.collection('drinks').doc(hot.drinkId).get()
        const drink = drinkRes.data
        
        if (drink) {
          drinks.push({
            ...hot,
            drink: {
              _id: drink._id,
              name: drink.name || '',
              price: priceUtil.formatPriceDisplay(drink.price),
              image: getDrinkImage(drink.image),
              description: drink.description || '',
              isOnShelf: drink.isOnShelf !== false
            },
            drinkImage: getDrinkImage(drink.image)
          })
        }
      } catch (err) {
        console.error('获取饮品详情失败:', hot.drinkId, err)
      }
    }
    
    return drinks
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 去点单
 // 去点单 - 跳转到店铺列表页面
 onOrder(e) {
  const drink = e.currentTarget.dataset.drink
  if (!drink) return
  
  console.log('去点单，饮品:', drink)
  
  // 保存选中的饮品到全局，方便店铺列表页获取
  app.globalData.selectedDrink = drink
  
  // 跳转到店铺列表页面（点单页）
  wx.switchTab({
    url: '/pages/order/order',
    success: () => {
      // 可以设置一个全局标志，告诉店铺列表页需要选中某个饮品
      app.globalData.shouldSelectDrink = true
    }
  })
}
})