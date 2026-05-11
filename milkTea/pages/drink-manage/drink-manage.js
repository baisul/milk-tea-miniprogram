// pages/drink-manage/drink-manage.js
const app = getApp()
const util = require('../../utils/util')
const { getDrinkImage } = require('../../utils/images')
const priceUtil = require('../../utils/price')

Page({
  data: {
    // 当前选中的店铺
    shopId: '',
    shopName: '',
    
    // 分类相关
    categoryId: '',
    categoryName: '',
    categories: [],
    
    // 饮品列表
    drinks: [],
    keyword: '',
    searchKeyword: '',     // 实际用于搜索的关键词（点击搜索后更新）
    loading: true,
    
    // 弹窗控制
    showCategoryPicker: false,
    needRefresh: false  // 添加刷新标志
  },

  onLoad(options) {
    console.log('drink-manage onLoad:', options)
    
    // 获取传入的参数
    const categoryId = options.categoryId || ''
    const categoryName = options.categoryName ? decodeURIComponent(options.categoryName) : ''
    const shopId = options.shopId || ''
    
    this.setData({
      categoryId,
      categoryName,
      shopId
    })
    
    // 如果没有传入shopId，尝试从全局获取
    if (!shopId) {
      const currentShop = app.globalData.currentShop
      if (currentShop && currentShop._id) {
        this.setData({ shopId: currentShop._id, shopName: currentShop.name })
      }
    }
    
    // 加载分类列表（只加载当前店铺下的分类）
    this.loadCategories()
    this.loadDrinks()
  },

  onShow() {
    // 每次显示页面时，如果有刷新标志，重新加载数据
    if (this.data.needRefresh) {
      console.log('检测到刷新标志，重新加载饮品列表')
      this.loadDrinks()
      this.setData({ needRefresh: false })
    }
  },

  // 加载分类列表（根据当前店铺）
  async loadCategories() {
    if (!this.data.shopId) {
      console.warn('没有店铺ID，无法加载分类')
      return
    }
    
    try {
      const db = wx.cloud.database()
      const res = await db.collection('categories')
        .where({
          shopId: this.data.shopId
        })
        .orderBy('sort', 'desc')
        .orderBy('createTime', 'desc')
        .get()
      
      console.log('当前店铺下的分类:', res.data)
      
      const categories = res.data || []
      
      this.setData({ categories })
      
      // 如果没有传入分类ID，但有分类数据，自动选中第一个
      if (!this.data.categoryId && categories.length > 0) {
        const firstCategory = categories[0]
        this.setData({
          categoryId: firstCategory._id,
          categoryName: firstCategory.name
        })
        this.loadDrinks()
      }
      
    } catch (err) {
      console.error('加载分类失败:', err)
      // 模拟数据
      const mockCategories = [
        { _id: 'c1', name: '经典奶茶', sort: 1, shopId: this.data.shopId },
        { _id: 'c2', name: '水果茶', sort: 2, shopId: this.data.shopId }
      ]
      this.setData({ categories: mockCategories })
    }
  },

  // 加载饮品列表
  async loadDrinks() {
    if (!this.data.categoryId) {
      console.warn('没有选中的分类')
      this.setData({ drinks: [], loading: false })
      return
    }
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      let query = db.collection('drinks')
        .where({
          categoryId: this.data.categoryId
        })
      
      // 如果有搜索关键词
      const searchKeyword = this.data.searchKeyword
      if (searchKeyword) {
        query = query.where({
          name: db.RegExp({
            regexp: searchKeyword,
            options: 'i'
          })
        })
      }
      
      const res = await query
        .orderBy('sort', 'desc')
        .orderBy('createTime', 'desc')
        .get()
      
      console.log('查询到的饮品:', res.data)
      
      const drinks = res.data.map(drink => ({
        ...drink,
        image: getDrinkImage(drink.image),
        price: priceUtil.formatPriceDisplay(drink.price),
        statusText: drink.isOnShelf ? '上架中' : '已下架',
        statusClass: drink.isOnShelf ? 'status-on' : 'status-off'
      }))
      
      this.setData({ drinks, loading: false })
      
    } catch (err) {
      console.error('加载饮品失败:', err)
      this.setData({ drinks: [], loading: false })
    }
  },

  // 显示分类选择弹窗
  showCategorySelector() {
    if (this.data.categories.length === 0) {
      util.showToast('暂无分类，请先添加')
      return
    }
    this.setData({ showCategoryPicker: true })
  },

  // 关闭分类选择弹窗
  closeCategoryPicker() {
    this.setData({ showCategoryPicker: false })
  },

  // 选择分类
  selectCategory(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      categoryId: id,
      categoryName: name,
      showCategoryPicker: false,
      keyword: '',           // 清空输入框
      searchKeyword: ''      // 清空搜索关键词
    })
    this.loadDrinks()
  },

  // 搜索输入（实时更新，但不立即搜索）
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  // 点击搜索按钮
  onSearch() {
    const keyword = this.data.keyword.trim()
    console.log('执行搜索:', keyword)
    this.setData({ searchKeyword: keyword })
    this.loadDrinks()
  },

  // 回车确认搜索
  onSearchConfirm() {
    this.onSearch()
  },

  // 清空搜索
  clearSearch() {
    this.setData({ 
      keyword: '', 
      searchKeyword: '' 
    })
    this.loadDrinks()
  },

  // 新增饮品
  onAdd() {
    if (!this.data.categoryId) {
      util.showToast('请先选择分类')
      return
    }
     this.setData({ keyword: '', searchKeyword: '' })
    wx.navigateTo({
      url: `/pages/drink-edit/drink-edit?categoryId=${this.data.categoryId}&categoryName=${encodeURIComponent(this.data.categoryName)}&shopId=${this.data.shopId}`
    })
  },

  // 编辑饮品
  onEdit(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/drink-edit/drink-edit?id=${id}&categoryId=${this.data.categoryId}&categoryName=${encodeURIComponent(this.data.categoryName)}&shopId=${this.data.shopId}`
    })
  },

  // 切换上下架状态
  async onToggleStatus(e) {
    const { id, index } = e.currentTarget.dataset
    const drink = this.data.drinks[index]
    const newStatus = !drink.isOnShelf
    
    util.showLoading('更新中...')
    
    try {
      const db = wx.cloud.database()
      await db.collection('drinks').doc(id).update({
        data: {
          isOnShelf: newStatus,
          updateTime: db.serverDate()
        }
      })
      
      util.hideLoading()
      util.showToast(newStatus ? '已上架' : '已下架', 'success')
      this.loadDrinks()
      
    } catch (err) {
      util.hideLoading()
      console.error('更新状态失败:', err)
      util.showToast('操作失败')
    }
  },

  // 删除饮品
  onDelete(e) {
    const { id, index } = e.currentTarget.dataset
    const drink = this.data.drinks[index]
    
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${drink.name}」吗？`,
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteDrink(id)
        }
      }
    })
  },

  async deleteDrink(id) {
    util.showLoading('删除中...')
    try {
      const db = wx.cloud.database()
      await db.collection('drinks').doc(id).remove()

    // 更新分类的饮品数量（减1）
    await this.updateCategoryDrinkCount(this.data.categoryId, -1)
      
      util.hideLoading()
      util.showToast('删除成功')
      this.loadDrinks()
      
    } catch (err) {
      util.hideLoading()
      console.error('删除失败:', err)
      util.showToast('删除失败')
    }
  },
  async updateCategoryDrinkCount(categoryId, delta) {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 获取当前分类
      const categoryRes = await db.collection('categories').doc(categoryId).get()
      const currentCount = categoryRes.data.drinkCount || 0
      const newCount = Math.max(0, currentCount + delta)
      
      // 更新分类的饮品数量
      await db.collection('categories').doc(categoryId).update({
        data: {
          drinkCount: newCount,
          updateTime: db.serverDate()
        }
      })
      
      console.log(`分类 ${categoryId} 饮品数量更新为: ${newCount}`)
    } catch (err) {
      console.error('更新分类饮品数量失败:', err)
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },
    // 返回上一页
onBack() {
  wx.navigateBack({
    delta: 1
  })
}
})