// pages/category-manage/category-manage.js
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    loading: true,
    categories: [],
    showEditModal: false,
    editId: '',
    editName: '',
    editSort: '',
    editShopName: '',
    editShopId: '',
    
    // 店铺列表相关
    shopList: [],
    selectedShopIndex: -1,
    selectedShopId: '',
    selectedShopName: ''
  },

  onLoad() {
    this.loadShopList()
  },

  onShow() {
    // 每次显示时刷新数据
    if (this.data.selectedShopId) {
      this.loadCategories()
    }
  },

  // 加载店铺列表
// pages/category-manage/category-manage.js
// 加载店铺列表
async loadShopList() {
  console.log('========== loadShopList 开始 ==========')
  this.setData({ loading: true })
  
  try {
    const openid = app.globalData.openid || wx.getStorageSync('openid') || 'test'
    console.log('openid:', openid)
    
    // 直接查询数据库
    const db = wx.cloud.database()
    const shopRes = await db.collection('shops')
      .where({
        _openid: openid
      })
      .orderBy('sort', 'asc')
      .get()
    
    console.log('直接查询到的店铺:', shopRes.data)
    
    let shops = shopRes.data || []
    
    if (shops.length === 0) {
      // 没有店铺，显示空状态
      this.setData({ 
        shopList: [], 
        loading: false,
        categories: []
      })
      return
    }
    
    this.setData({
      shopList: shops,
      loading: false
    })
    
    // ========== 关键：自动选中第一个店铺 ==========
    // 默认选中第一个店铺
    const firstShop = shops[0]
    this.setData({
      selectedShopIndex: 0,
      selectedShopId: firstShop._id,
      selectedShopName: firstShop.name
    })
    console.log('默认选中第一个店铺:', firstShop.name)
    
    // 加载该店铺的分类
    this.loadCategories()
    
  } catch (err) {
    console.error('加载店铺列表失败:', err)
    
    // 使用模拟数据
    const mockShops = [
      { _id: 'shop1', name: '奶茶小站·旗舰店', shopCode: '001' },
      { _id: 'shop2', name: '茶颜悦色·体育西店', shopCode: '002' }
    ]
    this.setData({ 
      shopList: mockShops,
      loading: false
    })
    
    // ========== 模拟数据也自动选中第一个 ==========
    if (mockShops.length > 0) {
      const firstShop = mockShops[0]
      this.setData({
        selectedShopIndex: 0,
        selectedShopId: firstShop._id,
        selectedShopName: firstShop.name
      })
      console.log('模拟数据默认选中第一个店铺:', firstShop.name)
      this.loadCategories()
    }
  }
},

  // 加载店铺列表后的处理
handleShopSelection(shops) {
  if (!shops || shops.length === 0) {
    this.setData({ loading: false })
    return
  }
  
  // 如果有选中的店铺ID（从全局或缓存获取）
  const savedShopId = wx.getStorageSync('selectedShopId')
  if (savedShopId) {
    const index = shops.findIndex(s => s._id === savedShopId)
    if (index >= 0) {
      this.setData({
        selectedShopIndex: index,
        selectedShopId: shops[index]._id,
        selectedShopName: shops[index].name
      })
      this.loadCategories()
      return
    }
  }
  
  // 默认选中第一个店铺
  this.setData({
    selectedShopIndex: 0,
    selectedShopId: shops[0]._id,
    selectedShopName: shops[0].name
  })
  this.loadCategories()
},

  // 选择店铺
  onShopChange(e) {
    const index = e.detail.value
    const shop = this.data.shopList[index]
    this.setData({
      selectedShopIndex: index,
      selectedShopId: shop._id,
      selectedShopName: shop.name
    })
    // 切换店铺后重新加载分类
    this.loadCategories()
  },

  // 加载分类列表
  async loadCategories() {
    if (!this.data.selectedShopId) {
      console.warn('没有选中的店铺')
      this.setData({ loading: false, categories: [] })
      return
    }
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      
      // 查询当前店铺的分类
      const res = await db.collection('categories')
        .where({
          shopId: this.data.selectedShopId
        })
        .orderBy('sort', 'asc')
        .orderBy('createTime', 'desc')
        .get()
      
      console.log('查询到的分类:', res.data)
      
      // 格式化时间显示
      const categories = res.data.map(cat => ({
        ...cat,
        createTimeText: this.formatTime(cat.createTime),
        drinkCount: cat.drinkCount || 0,
        shopName: this.data.selectedShopName
      }))
      
      this.setData({
        categories: categories,
        loading: false
      })
    } catch (err) {
      console.error('加载分类失败:', err)
      this.setData({ loading: false, categories: [] })
      // 如果是权限问题，提示用户
      if (err.errCode === -502003) {
        util.showToast('没有权限查看，请检查数据库权限')
      } else {
        util.showToast('加载失败，请重试')
      }
    }
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  },

  // 新增分类
  onAdd() {
    if (!this.data.selectedShopId) {
      util.showToast('请先选择店铺')
      return
    }
    
    this.setData({
      showEditModal: true,
      editId: '',
      editName: '',
      editSort: '',
      editShopName: '',
      editShopId: ''
    })
  },

  // 编辑分类
 // pages/category-manage/category-manage.js
onEdit(e) {
  console.log('========== onEdit 开始 ==========')
  console.log('事件对象:', e)
  console.log('currentTarget:', e.currentTarget)
  console.log('dataset:', e.currentTarget.dataset)
  
  // 获取传递的数据
  const id = e.currentTarget.dataset.id
  const index = e.currentTarget.dataset.index
  
  console.log('id:', id)
  console.log('index:', index)
  console.log('当前 categories 数组:', this.data.categories)
  
  let item = null
  
  // 方法1：通过 id 查找
  if (id) {
    item = this.data.categories.find(cat => cat._id === id)
    if (item) {
      console.log('通过 id 找到分类:', item)
    }
  }
  
  // 方法2：通过 index 查找（降级方案）
  if (!item && index !== undefined && index !== null) {
    const idx = parseInt(index)
    if (!isNaN(idx) && this.data.categories[idx]) {
      item = this.data.categories[idx]
      console.log('通过 index 找到分类:', item)
    }
  }
  
  // 检查是否找到分类
  if (!item) {
    console.error('未找到要编辑的分类')
    wx.showToast({
      title: '编辑失败，请重试',
      icon: 'none'
    })
    return
  }
  
  // 设置弹窗数据
  this.setData({
    showEditModal: true,
    editId: item._id,
    editName: item.name,
    editSort: item.sort,
    editShopName: item.shopName || this.data.selectedShopName,
    editShopId: item.shopId
  })
  
  console.log('弹窗数据设置完成')
},

  // 删除分类
  onDelete(e) {
    console.log('onDelete 事件对象:', e)
    
    const id = e.currentTarget.dataset.id
    const { index } = e.currentTarget.dataset
    
    let item = null
    
    // 优先通过 id 查找
    if (id) {
      item = this.data.categories.find(cat => cat._id === id)
    }
    
    // 降级：通过 index 查找
    if (!item && index !== undefined) {
      item = this.data.categories[index]
    }
    
    if (!item) {
      console.error('找不到要删除的分类')
      util.showToast('删除失败，请重试')
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${item.name}」吗？删除后该分类下的饮品也会被删除。`,
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteCategory(item._id)
        }
      }
    })
  },

  async deleteCategory(categoryId) {
    util.showLoading('删除中...')
    
    try {
      const db = wx.cloud.database()
      
      // 删除分类
      await db.collection('categories').doc(categoryId).remove()
      
      // 删除该分类下的所有饮品
      const drinks = await db.collection('drinks')
        .where({ categoryId: categoryId })
        .get()
      
      for (const drink of drinks.data) {
        await db.collection('drinks').doc(drink._id).remove()
      }
      
      util.hideLoading()
      util.showToast('删除成功')
      this.loadCategories()
    } catch (err) {
      util.hideLoading()
      console.error('删除失败:', err)
      util.showToast('删除失败，请重试')
    }
  },

  // 表单输入
  onNameInput(e) {
    this.setData({ editName: e.detail.value })
  },

  onSortInput(e) {
    this.setData({ editSort: e.detail.value })
  },

  // 保存分类
  async onSave() {
    const { editName, editSort, editId, selectedShopId, selectedShopName } = this.data
    
    if (!editName || !editName.trim()) {
      util.showToast('请输入分类名称')
      return
    }
    
    // 新增时检查是否选择了店铺
    if (!editId && !selectedShopId) {
      util.showToast('请选择店铺')
      return
    }
    
    const sort = parseInt(editSort) || 0
    
    util.showLoading('保存中...')
    
    try {
      const db = wx.cloud.database()
      
      if (editId) {
        // 更新分类
        await db.collection('categories').doc(editId).update({
          data: {
            name: editName.trim(),
            sort: sort,
            updateTime: db.serverDate()
          }
        })
        util.showToast('修改成功')
      } else {
        // 新增分类
        await db.collection('categories').add({
          data: {
            shopId: selectedShopId,
            shopName: selectedShopName,
            name: editName.trim(),
            sort: sort,
            drinkCount: 0,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
        util.showToast('添加成功')
      }
      
      util.hideLoading()
      this.closeModal()
      this.loadCategories()
    } catch (err) {
      util.hideLoading()
      console.error('保存失败:', err)
      util.showToast('保存失败，请重试')
    }
  },

  // 跳转到饮品管理页
  goDrinkManage(e) {
    const { id, name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/drink-manage/drink-manage?categoryId=${id}&categoryName=${encodeURIComponent(name)}&shopId=${this.data.selectedShopId}`
    })
  },

  closeModal() {
    this.setData({ showEditModal: false })
  },
  
  // 阻止冒泡
  preventTap() {
    // 阻止点击弹窗内容时关闭弹窗
  }
})