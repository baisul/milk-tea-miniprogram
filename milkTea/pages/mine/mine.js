// pages/mine/mine.js - 我的Tab页
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    isRegistered: false, // 是否已注册
    menuItems: [
      {
        id: 'address',
        title: '收货地址管理',
        desc: '管理你的配送地址',
        icon: '/images/icon-address.png',
        url: '/pages/address-list/address-list'
      },
      {
        id: 'category',
        title: '饮品分类管理',
        desc: '新增、编辑、删除分类',
        icon: '/images/icon-category.png',
        url: '/pages/category-manage/category-manage'
      },
      {
        id: 'hotdrink',
        title: '热门饮品维护',
        desc: '新增、编辑、删除热门饮品',
        icon: '/images/icon-hotdrink.png',
        url: '/pages/hot-drink-manage/hot-drink-manage'
      },
      {
        id: 'shop',
        title: '店铺维护',
        desc: '新增、编辑、删除店铺',
        icon: '/images/icon-shop.png',
        url: '/pages/shop-manage/shop-manage'
      },
      {
        id: 'order',
        title: '订单管理',
        desc: '查看全部订单记录',
        icon: '/images/icon-order.png',
        url: '/pages/order-list/order-list'
      }
    ],
    addressCount: 0,
    orderStats: { total: 0, pending: 0, completed: 0, cancelled: 0 }
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({ canIUseGetUserProfile: true })
    }
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      this.setData({ userInfo, hasUserInfo: true })
    }
    this.checkUserRegistration()
  },

  onShow() {
    console.log('mine 页面显示');
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.updateSelected(3);
    }
    // 同时更新全局状态
    app.setTabBarSelected(3);
    this.loadStats()
    this.checkUserRegistration()
  },

  // 加载统计数据
  async loadStats() {
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || 'test'

      // 地址数量
      const addressRes = await db.collection('addresses')
        .where({ userId: openid })
        .count()
      const addressCount = addressRes.total || 0

      // 订单统计
      const totalRes = await db.collection('orders')
        .where({ userId: openid })
        .count()
      const pendingRes = await db.collection('orders')
        .where({ userId: openid, status: 'pending' })
        .count()
      const completedRes = await db.collection('orders')
        .where({ userId: openid, status: 'completed' })
        .count()
      const cancelledRes = await db.collection('orders')
        .where({ userId: openid, status: 'cancelled' })
        .count()

      this.setData({
        addressCount,
        orderStats: {
          total: totalRes.total || 0,
          pending: pendingRes.total || 0,
          completed: completedRes.total || 0,
          cancelled: cancelledRes.total || 0
        }
      })
    } catch (e) {
      console.warn('加载统计失败', e)
    }
  },

  // ========== 统计卡片点击事件 ==========
  
  // 点击地址统计
  onAddressClick() {
    const app = getApp()
    app.checkAuth('/pages/address-list/address-list').then(() => {
      wx.navigateTo({ url: '/pages/address-list/address-list' })
    })
  },

  // 点击订单统计（全部订单）
  onOrderClick() {
    const app = getApp()
    app.checkAuth('/pages/order-list/order-list?tab=all').then(() => {
      wx.navigateTo({ url: '/pages/order-list/order-list?tab=all' })
    })
  },

  // 点击待处理统计
  onPendingClick() {
    const app = getApp()
    app.checkAuth('/pages/order-list/order-list?tab=pending').then(() => {
      wx.navigateTo({ url: '/pages/order-list/order-list?tab=pending' })
    })
  },

  // 点击已完成统计
  onCompletedClick() {
    const app = getApp()
    app.checkAuth('/pages/order-list/order-list?tab=completed').then(() => {
      wx.navigateTo({ url: '/pages/order-list/order-list?tab=completed' })
    })
  },

  // ========== 原有方法 ==========

  // 获取用户信息
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const userInfo = res.userInfo
        app.globalData.userInfo = userInfo
        this.setData({ userInfo, hasUserInfo: true })
        wx.setStorageSync('userInfo', userInfo)
      },
      fail: () => {
        util.showToast('已取消授权')
      }
    })
  },

  // 点击头像或未注册文本
  onUserInfoClick() {
    if (!this.data.isRegistered) {
      // 未注册，跳转到注册页面
      wx.navigateTo({ url: '/pages/login/login?redirect=/pages/mine/mine' })
    } else {
      // 已注册且有头像，则上传头像
      if (this.data.hasUserInfo && this.data.userInfo?.avatarUrl) {
        this.chooseAvatar()
      } else {
        // 已注册但没有头像，先获取用户信息
        this.getUserProfile()
      }
    }
  },

  // 检查用户是否已注册
  async checkUserRegistration() {
    try {
      // mine 页要求：注册返回后调用“获取用户信息”接口
      const res = await wx.cloud.callFunction({
        name: 'userManager',
        data: { action: 'getUserInfo' }
      })

      if (res && res.result && res.result.code === 0 && res.result.data) {
        const doc = res.result.data
        const nickname = doc.nickname || doc.nickName
        const avatarUrl = doc.avatarUrl || wx.getStorageSync('userInfo')?.avatarUrl

        const currentUserInfo = wx.getStorageSync('userInfo') || this.data.userInfo || app.globalData.userInfo || {}
        const nextUserInfo = {
          ...currentUserInfo,
          nickname,
          gender: doc.gender,
          phone: doc.phone,
          openid: doc.openid || currentUserInfo.openid
        }

        this.setData({
          isRegistered: true,
          hasUserInfo: !!avatarUrl,
          userInfo: {
            ...nextUserInfo,
            avatarUrl
          }
        })

        app.globalData.isRegistered = true
        app.globalData.userInfo = this.data.userInfo
        wx.setStorageSync('userInfo', this.data.userInfo)
        return true
      }

      // 未注册 / 查询失败：兜底使用本地状态，避免页面空白
      const localIsRegistered = wx.getStorageSync('isRegistered') || false
      const localUserInfo = wx.getStorageSync('userInfo') || this.data.userInfo || {}
      this.setData({
        isRegistered: false,
        userInfo: localUserInfo,
        hasUserInfo: !!localUserInfo?.avatarUrl
      })
      app.globalData.isRegistered = false
      return localIsRegistered
    } catch (e) {
      console.warn('检查用户注册状态失败', e)
      this.setData({ isRegistered: false })
      return false
    }
  },

  // 上传/修改头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadAvatar(tempFilePath)
      }
    })
  },

  // 上传头像到云存储
  async uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中...', mask: true })
    try {
      const openid = app.globalData.openid || wx.getStorageSync('openid')
      const cloudPath = `avatars/${openid}_${Date.now()}.jpg`

      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })

      const fileID = uploadRes.fileID
      const db = wx.cloud.database()

      // 检查用户是否已注册
      const userRes = await db.collection('users').where({ openid }).limit(1).get()

      if (userRes.data && userRes.data.length > 0) {
        // 更新用户记录
        await db.collection('users').doc(userRes.data[0]._id).update({
          data: { avatarUrl: fileID }
        })
      } else {
        // 创建用户记录
        await db.collection('users').add({
          data: {
            openid,
            avatarUrl: fileID,
            createTime: db.serverDate()
          }
        })
      }

      // 更新本地状态
      const currentUserInfo = this.data.userInfo || app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
      const nextUserInfo = { ...currentUserInfo, avatarUrl: fileID, openid }
      this.setData({ userInfo: nextUserInfo, hasUserInfo: true })
      app.globalData.userInfo = nextUserInfo
      wx.setStorageSync('userInfo', nextUserInfo)

      wx.hideLoading()
      util.showToast('头像更新成功')
    } catch (e) {
      console.error('上传头像失败', e)
      wx.hideLoading()
      util.showToast('上传失败，请重试')
    }
  },

  // 点击菜单项
  onMenuTap(e) {
    const { url } = e.currentTarget.dataset
    const app = getApp()
    app.checkAuth(url).then(() => {
      wx.navigateTo({ url })
    })
  }
})