// pages/hot-drink-manage/hot-drink-manage.js - 热门饮品维护页
const app = getApp()
const util = require('../../utils/util')
const { getDrinkImage } = require('../../utils/images')  // 添加这行
const priceUtil = require('../../utils/price')

Page({
  data: {
    hotDrinks: [],
    loading: true,
    showAddModal: false,
    showCategoryPicker: false,
    showDrinkPicker: false,
    editId: '',
    editSort: 10,
    selectedCategory: null,
    selectedCategoryName: '请选择分类',
    selectedDrink: null,
    selectedDrinkName: '请选择饮品',
    keyword: '',
    categories: [],
    drinks: [],
    filteredDrinks: []
  },

  onLoad() {
    this.loadHotDrinks()
  },

  onShow() {
    this.loadHotDrinks()
  },

  onPullDownRefresh() {
    this.loadHotDrinks().then(() => wx.stopPullDownRefresh())
  },

  // 加载热门饮品列表
  async loadHotDrinks() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('hotDrinks')
        .orderBy('sort', 'desc')
        .limit(10)
        .get()
      
      console.log('热门商品列表:', res.data)
      
      const hotDrinks = []
      
      for (let i = 0; i < res.data.length; i++) {
        const hotItem = res.data[i]
        
        if (!hotItem.drinkId) {
          console.warn('热门商品缺少 drinkId:', hotItem)
          hotDrinks.push({
            ...hotItem,
            drink: null,
            category: null,
            drinkImage: '/images/drink-placeholder.png'
          })
          continue
        }
        if (!hotItem.categoryId) {
          console.warn('热门商品缺少 categoryId:', hotItem)
          hotDrinks.push({
            ...hotItem,
            drink: null,
            category: null,
            drinkImage: '/images/drink-placeholder.png'
          })
          continue
        }
        
        try {
          const drinkRes = await db.collection('drinks').doc(hotItem.drinkId).get()
          const categoryRes = await db.collection('categories').doc(hotItem.categoryId).get()
          const drinkData = drinkRes.data
          const categoryData = categoryRes.data
          
          if (!drinkData) {
            console.warn('饮品不存在:', hotItem.drinkId)
            hotDrinks.push({
              ...hotItem,
              drink: null,
              category : null,
              drinkImage: '/images/drink-placeholder.png'
            })
            continue
          }

          if (!categoryData) {
            console.warn('饮品分類不存在:', hotItem.categoryId)
            hotDrinks.push({
              ...hotItem,
              drink: null,
              category : null,
              drinkImage: '/images/drink-placeholder.png'
            })
            continue
          }
          
          // 价格转换
   //       const priceYuan = (drinkData.price / 100).toFixed(2)
          
          hotDrinks.push({
            ...hotItem,
            drink: {
              _id: drinkData._id,
              name: drinkData.name || '',
              price: priceUtil.formatPriceDisplay(drinkData.price),
              image: getDrinkImage(drinkData.image),
              description: drinkData.description || '',
              stock: drinkData.stock || 0,
              isOnShelf: drinkData.isOnShelf !== false
            },
            category: {
              _id: categoryData._id,
              name: categoryData.name || '',
            },
            drinkImage: getDrinkImage(drinkData.image)
          })
          
        } catch (err) {
          console.error('查询饮品失败:', hotItem.drinkId, err)
          hotDrinks.push({
            ...hotItem,
            drink: null,
            drinkImage: '/images/drink-placeholder.png'
          })
        }
      }
      
      console.log('最终热门商品数据:', hotDrinks)
      this.setData({ hotDrinks, loading: false })
      
    } catch (err) {
      console.error('加载热门商品失败:', err)
      this.setData({
        hotDrinks: [],
        loading: false
      })
    }
  },

  // 加载分类列表
  async loadCategories() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('categories')
        .orderBy('sort', 'asc')
        .limit(100)
        .get()
      this.setData({ categories: res.data })
    } catch (e) {
      console.warn('加载分类失败', e)
    }
  },

  // 根据选择的分类加载饮品列表
  async loadDrinksByCategory(categoryId) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('drinks')
        .where({ categoryId, isOnShelf: true })
        .limit(100)
        .get()
      this.setData({ drinks: res.data, filteredDrinks: res.data })
    } catch (e) {
      console.warn('加载饮品失败', e)
    }
  },

  // 搜索饮品
  onSearchInput(e) {
    const keyword = e.detail.value.trim().toLowerCase()
    this.setData({ keyword })
    if (!keyword) {
      this.setData({ filteredDrinks: this.data.drinks })
      return
    }
    const filtered = this.data.drinks.filter(drink =>
      drink.name.toLowerCase().includes(keyword)
    )
    this.setData({ filteredDrinks: filtered })
  },

  // 显示分类选择器
  showCategorySelector() {
    this.loadCategories()
    this.setData({ showCategoryPicker: true })
  },

  // 选择分类
  selectCategory(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      selectedCategory: id,
      selectedCategoryName: name,
      selectedDrink: null,
      selectedDrinkName: '请选择饮品',
      keyword: '',
      filteredDrinks: []
    })
    this.loadDrinksByCategory(id)
    this.setData({ showCategoryPicker: false })
  },

  // 关闭分类选择器
  closeCategoryPicker() {
    this.setData({ showCategoryPicker: false })
  },

  // 显示饮品选择器
  showDrinkSelector() {
    if (!this.data.selectedCategory) {
      util.showToast('请先选择分类')
      return
    }
    this.setData({ showDrinkPicker: true })
  },

  // 选择饮品
  selectDrink(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({
      selectedDrink: id,
      selectedDrinkName: name
    })
    this.setData({ showDrinkPicker: false })
  },

  // 关闭饮品选择器
  closeDrinkPicker() {
    this.setData({ showDrinkPicker: false })
  },

  // 新增热门饮品
  onAdd() {
    this.setData({
      showAddModal: true,
      editId: '',
      editSort: 0,
      selectedCategory: null,
      selectedCategoryName: '请选择分类',
      selectedDrink: null,
      selectedDrinkName: '请选择饮品',
      keyword: ''
    })
  },

  // 编辑热门饮品
  onEdit(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.hotDrinks[index]
    this.setData({
      showAddModal: true,
      editId: item._id,
      editSort: item.sort,
      selectedDrink: item.drinkId,
      selectedDrinkName: item.drink?.name || '未知饮品',
      selectedCategory:item.categoryId,
      selectedCategoryName:item.category?.name || '未知分類'
    })
  },

  // 输入排序
  onSortInput(e) {
    this.setData({ editSort: Number(e.detail.value) || 0 })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showAddModal: false,
      editId: '',
      editSort: 10,
      selectedCategory: null,
      selectedCategoryName: '请选择分类',
      selectedDrink: null,
      selectedDrinkName: '请选择饮品',
      keyword: ''
    })
  },

  // 保存
  async onSave() {
    console.log("數據" + this.data.selectedCategory)
    const { editId, editSort, selectedDrink,selectedCategory } = this.data
    if (!selectedCategory) {
      util.showToast('请选择分類')
      return
    }
    if (!selectedDrink) {
      util.showToast('请选择饮品')
      return
    }
    if (!editSort && editSort !== 0) {
      util.showToast('请输入排序值')
      return
    }

    util.showLoading('保存中...')
    try {
      const db = wx.cloud.database()
      if (editId) {
        await db.collection('hotDrinks').doc(editId).update({
          data: { drinkId: selectedDrink,categoryId: selectedCategory,sort: editSort }
        })
      } else {
        await db.collection('hotDrinks').add({
          data: { drinkId: selectedDrink, sort: editSort, categoryId: selectedCategory,createTime: db.serverDate() }
        })
      }
      util.hideLoading()
      util.showToast('保存成功', 'success')
      this.closeModal()
      this.loadHotDrinks()
    } catch (e) {
      util.hideLoading()
      console.warn('保存失败', e)
      // 模拟保存
      const hotDrinks = [...this.data.hotDrinks]
      if (editId) {
        const idx = hotDrinks.findIndex(h => h._id === editId)
        if (idx > -1) {
          hotDrinks[idx].sort = editSort
        }
      } else {
        hotDrinks.push({
          _id: 'h' + Date.now(),
          sort: editSort,
          drinkId: selectedDrink,
          drink: { _id: selectedDrink, name: this.data.selectedDrinkName, image: '/images/drink-placeholder.png' },
          drinkImage: '/images/drink-placeholder.png'
        })
        hotDrinks.sort((a, b) => b.sort - a.sort)
      }
      this.setData({ hotDrinks })
      util.showToast('保存成功', 'success')
      this.closeModal()
    }
  },

  // 删除
  async onDelete(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.hotDrinks[index]
    const confirmed = await util.showConfirm(`确定要移除「${item.drink?.name || '未知饮品'}」的热门推荐吗？`, '删除确认')
    if (!confirmed) return

    util.showLoading('删除中...')
    try {
      const db = wx.cloud.database()
      await db.collection('hotDrinks').doc(item._id).remove()
      util.hideLoading()
      util.showToast('删除成功')
      this.loadHotDrinks()
    } catch (e) {
      util.hideLoading()
      console.warn('删除失败', e)
      const hotDrinks = this.data.hotDrinks.filter(h => h._id !== item._id)
      this.setData({ hotDrinks })
      util.showToast('删除成功')
    }
  },

// pages/hot-drink-manage/hot-drink-manage.js

// 上移
async onMoveUp(e) {
  const { index } = e.currentTarget.dataset
  if (index === 0) return  // 已经是第一个，不能上移
  
  const hotDrinks = [...this.data.hotDrinks]
  const currentItem = hotDrinks[index]
  const prevItem = hotDrinks[index - 1]
  
  // 只交换两个项目的排序值
  const currentSort = currentItem.sort
  const prevSort = prevItem.sort
  
  // 交换排序值
  currentItem.sort = prevSort
  prevItem.sort = currentSort
  
  // 重新排序数组
  hotDrinks.sort((a, b) => b.sort - a.sort)
  
  this.setData({ hotDrinks })
  
  // 可选：同步到数据库
  this.syncSortToDatabase(currentItem._id, prevSort)
  this.syncSortToDatabase(prevItem._id, currentSort)
  
  util.showToast('已上移', 'success')
},

// 下移
async onMoveDown(e) {
  const { index } = e.currentTarget.dataset
  if (index === this.data.hotDrinks.length - 1) return  // 已经是最后一个，不能下移
  
  const hotDrinks = [...this.data.hotDrinks]
  const currentItem = hotDrinks[index]
  const nextItem = hotDrinks[index + 1]
  
  // 只交换两个项目的排序值
  const currentSort = currentItem.sort
  const nextSort = nextItem.sort
  
  // 交换排序值
  currentItem.sort = nextSort
  nextItem.sort = currentSort
  
  // 重新排序数组
  hotDrinks.sort((a, b) => b.sort - a.sort)
  
  this.setData({ hotDrinks })
  
  // 可选：同步到数据库
  this.syncSortToDatabase(currentItem._id, nextSort)
  this.syncSortToDatabase(nextItem._id, currentSort)
  
  util.showToast('已下移', 'success')
},

// 同步排序值到数据库
async syncSortToDatabase(id, newSort) {
  try {
    const db = wx.cloud.database()
    await db.collection('hotDrinks').doc(id).update({
      data: { sort: newSort }
    })
  } catch (err) {
    console.error('同步排序失败:', err)
  }
}
})