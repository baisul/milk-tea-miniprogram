// pages/home/home.js - 首页
const { getBannerImages, getDrinkImage } = require('../../utils/images')
const priceUtil = require('../../utils/price')
const app = getApp();

Page({
  data: {
    banners: [],
    recommendDrinks: [],
    loading: true,
    showAIChat: false,
    hideTabBar: false,  // 控制 TabBar 隐藏
    modelConfig: {
      modelProvider: "deepseek",
      quickResponseModel: "deepseek-v3.2",
      welcomeMsg: "你好！我是奶茶店AI助手，可以帮你推荐饮品、解答疑问~"
    }
  },

  onLoad() {
    this.loadBanners()
    this.loadRecommendDrinks()
  },

  onShow() {
    console.log('首页显示');
    // 页面显示时，根据弹窗状态决定是否显示 TabBar
    this.setTabBarVisibility(!this.data.hideTabBar);
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.updateSelected(0);
    }
    // 同时更新全局状态
    app.setTabBarSelected(0);
  },
  onPopupStateChange(e) {
    const { show } = e.detail;
    this.setData({ hideTabBar: show });
    this.setTabBarVisibility(!show);
  },
  openAIChat() {
    console.log('打开弹窗');
    this.setData({ showChat: true });
  },

  closeAIChat() {
    console.log('关闭弹窗');
    this.setData({ showChat: false });
  },
    // 控制 TabBar 显示/隐藏
    setTabBarVisibility(visible) {
      const tabBar = this.getTabBar();
      if (tabBar) {
        if (visible) {
          tabBar.show();  // 显示 TabBar
        } else {
          tabBar.hide();  // 隐藏 TabBar
        }
      }
    },

  onPullDownRefresh() {
    this.loadRecommendDrinks()
    wx.stopPullDownRefresh()
  },

  // 加载Banner轮播图
  loadBanners() {
    // Banner数据：可从云数据库加载或使用默认
    const banners = getBannerImages()
    this.setData({ banners })
  },

  // 加载推荐饮品（热门饮品）
  async loadRecommendDrinks() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      // 从 hotDrinks 集合取20条，按 sort 降序
      const hotRes = await db.collection('hotDrinks')
        .orderBy('sort', 'desc')
        .limit(20)
        .get()

      // 关联查询饮品详情
      const recommendDrinks = []
      for (const hot of hotRes.data) {
        try {
          const drinkRes = await db.collection('drinks')
            .doc(hot.drinkId)
            .get()
          const drinkData = drinkRes.data
          if (drinkData) {
            recommendDrinks.push({
              ...hot,
              drink: {
                _id: drinkData._id,
                name: drinkData.name || '',
                price: priceUtil.formatPriceDisplay(drinkData.price),
                image: getDrinkImage(drinkData.image),
                description: drinkData.description || '',
                stock: drinkData.stock || 0,
                isOnShelf: drinkData.isOnShelf !== false
              },
              image: getDrinkImage(drinkRes.data.image),
              hotSort: hot.sort
            })
          }
        } catch (e) {
          console.warn('查询饮品详情失败', hot.drinkId, e)
        }
      }
      this.setData({ recommendDrinks, loading: false })
    } catch (e) {
      console.warn('加载热门饮品失败，使用模拟数据', e)
      // 使用模拟数据用于演示
      this.setData({
        recommendDrinks: [
          { _id: '1', name: '珍珠奶茶', price: 15, image: '/images/drink-placeholder.png', description: '经典口味', hotSort: 100 },
          { _id: '2', name: '杨枝甘露', price: 18, image: '/images/drink-placeholder.png', description: '芒果鲜榨', hotSort: 90 },
          { _id: '3', name: '芋泥波波茶', price: 16, image: '/images/drink-placeholder.png', description: '香浓芋泥', hotSort: 80 },
          { _id: '4', name: '多肉葡萄', price: 20, image: '/images/drink-placeholder.png', description: '新鲜葡萄', hotSort: 70 },
          { _id: '5', name: '草莓摇摇乐', price: 17, image: '/images/drink-placeholder.png', description: '草莓奶昔', hotSort: 60 },
          { _id: '6', name: '椰椰芒芒', price: 19, image: '/images/drink-placeholder.png', description: '椰奶芒果', hotSort: 50 }
        ],
        loading: false
      })
    }
  },

  // 门店自取
  goDineIn() {
    const app = getApp()
    app.globalData.orderType = 'dine-in'
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.updateSelected(1);
    }
    // 同时更新全局状态
    app.setTabBarSelected(1);
    wx.switchTab({ url: '/pages/order/order' })
  },

  // 外卖点单
  goDelivery() {
    const app = getApp()
    app.globalData.orderType = 'delivery'
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.updateSelected(1);
    }
    // 同时更新全局状态
    app.setTabBarSelected(1);
    wx.switchTab({ url: '/pages/order/order' })
  },

  // 点击推荐饮品
  onDrinkTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/menu/menu?drinkId=' + id })
  },

  // 点击查看全部
  goToHotList() {
  wx.navigateTo({
    url: '/pages/hot-list/hot-list'
  })
},

  // 轮播图点击
  onBannerTap(e) {
    const { index } = e.currentTarget.dataset
    console.log('点击了第' + index + '张轮播图')
  }
})
