// utils/images.js - 图片资源管理

const IMAGES = {
  tabBar: {
    home: '/images/tab-home.png',
    homeActive: '/images/tab-home-active.png',
    order: '/images/tab-order.png',
    orderActive: '/images/tab-order-active.png',
    mine: '/images/tab-mine.png',
    mineActive: '/images/tab-mine-active.png'
  },
  cartIcon: '/images/cart-icon.png',
  placeholder: {
    banner: '/images/banner-placeholder.png',
    drink: '/images/drink-placeholder.png',
    shop: '/images/shop-placeholder.png',
    empty: '/images/empty.png'
  },
  banners: [
    '/images/banner-1.jpg',
    '/images/banner-2.jpg'
  ]
}

function getDrinkImage(image) {
  return image || IMAGES.placeholder.drink
}

function getShopImage(image) {
  return image || IMAGES.placeholder.shop
}

function getBannerImages(banners) {
  if (banners && banners.length > 0) return banners
  return IMAGES.banners
}

module.exports = {
  IMAGES,
  getDrinkImage,
  getShopImage,
  getBannerImages
}
