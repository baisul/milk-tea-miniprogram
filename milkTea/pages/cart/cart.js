// pages/cart/cart.js - 购物车页面
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    shopId: '',
    shopName: '',
    cart: [],
    cartCount: 0,
    cartTotal: 0,
    showClearConfirm: false
  },

  onLoad(options) {
    const shopId = options.shopId || ''
    const shop = app.globalData.currentShop || {}
    this.setData({ shopId, shopName: shop.name || '默认店铺' })
  },

  onShow() {
    console.log('order 页面显示');
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.updateSelected(2);
    }
    // 同时更新全局状态
    app.setTabBarSelected(2);
    this.loadCart()
  },

  loadCart() {
    const cart = app.getCart(this.data.shopId)
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    this.setData({ cart, cartCount, cartTotal: parseFloat(cartTotal.toFixed(2)) })
  },

  addQuantity(e) {
    const { index } = e.currentTarget.dataset
    app.updateCartQuantity(this.data.shopId, index, this.data.cart[index].quantity + 1)
    this.loadCart()
  },

  minusQuantity(e) {
    const { index } = e.currentTarget.dataset
    if (this.data.cart[index].quantity <= 1) return
    app.updateCartQuantity(this.data.shopId, index, this.data.cart[index].quantity - 1)
    this.loadCart()
  },

  async deleteItem(e) {
    const { index } = e.currentTarget.dataset
    const confirmed = await util.showConfirm('确定要删除这个商品吗？')
    if (confirmed) {
      app.removeFromCart(this.data.shopId, index)
      this.loadCart()
    }
  },

  showClearDialog() {
    if (this.data.cart.length === 0) return
    this.setData({ showClearConfirm: true })
  },

  cancelClear() {
    this.setData({ showClearConfirm: false })
  },

  confirmClear() {
    app.clearCart(this.data.shopId)
    this.setData({ showClearConfirm: false, cart: [], cartCount: 0, cartTotal: 0 })
    util.showToast('购物车已清空')
  },

  goCheckout() {
    if (this.data.cartCount === 0) {
      util.showToast('购物车是空的')
      return
    }
    wx.navigateTo({ url: '/pages/checkout/checkout?shopId=' + this.data.shopId })
  }
})
