// pages/drink-edit/drink-edit.js - 新增/编辑饮品页
const app = getApp()
const util = require('../../utils/util')
const { getDrinkImage } = require('../../utils/images')
const priceUtil = require('../../utils/price')

Page({
  data: {
    isEdit: false,
    drinkId: '',
    categoryId: '',
    categoryName: '',
    name: '',
    price: '',
    image: '',
    description: '',
    
    // 规格多选数据
    cupSizes: [],      // 选中的杯型值数组
    temperatures: [],  // 选中的温度值数组
    sweetnesses: [],   // 选中的甜度值数组
    
    stock: '',
    isOnShelf: true,
    uploading: false,
    submitting: false,
      // 新增：用于 wxml 渲染的状态数组
    cupSizeOptionsWithStatus: [],
    temperatureOptionsWithStatus: [],
    sweetnessOptionsWithStatus: [],
    
    // 选项配置
    cupSizeExtras: {        // 杯型加价映射
      small: 0,
      medium: 2,
      large: 4
    },
    cupSizeOptions: [
      { value: 'small', label: '小杯', defaultExtra: 0},
      { value: 'medium', label: '中杯', defaultExtra: 1  },
      { value: 'large', label: '大杯', defaultExtra: 2 }
    ],
    temperatureOptions: [
      { value: 'standard_ice', label: '标准冰' },
      { value: 'less_ice', label: '少冰' },
      { value: 'no_ice', label: '去冰' },
      { value: 'hot', label: '热' }
    ],
    sweetnessOptions: [
      { value: 'standard', label: '标准糖' },
      { value: 'less', label: '少糖' },
      { value: 'half', label: '半糖' },
      { value: 'light', label: '微糖' },
      { value: 'none', label: '不额外加糖' }
    ]
  },

  onLoad(options) {
    console.log('drink-edit onLoad:', options)
    const categoryId = options.categoryId || ''
    const categoryName = options.categoryName ? decodeURIComponent(options.categoryName) : ''
    this.setData({ categoryId, categoryName })

    if (options.id) {
      this.setData({ isEdit: true, drinkId: options.id })
      wx.setNavigationBarTitle({ title: '编辑饮品' })
      this.loadDrinkDetail(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '新增饮品' })
      // 新增模式，默认全选所有规格
      this.setDefaultSpecs()
    }
  },

  // 更新所有规格选项的选中状态
updateSpecOptionsStatus() {
  const { cupSizes, cupSizeOptions, temperatures, temperatureOptions, sweetnesses, sweetnessOptions } = this.data
  
  // 更新杯型选项状态
  const cupSizeOptionsWithStatus = cupSizeOptions.map(opt => ({
    ...opt,
    selected: cupSizes.includes(opt.value)
  }))
  
  // 更新温度选项状态
  const temperatureOptionsWithStatus = temperatureOptions.map(opt => ({
    ...opt,
    selected: temperatures.includes(opt.value)
  }))
  
  // 更新甜度选项状态
  const sweetnessOptionsWithStatus = sweetnessOptions.map(opt => ({
    ...opt,
    selected: sweetnesses.includes(opt.value)
  }))
  
  this.setData({
    cupSizeOptionsWithStatus,
    temperatureOptionsWithStatus,
    sweetnessOptionsWithStatus
  })
  
  console.log('杯型状态:', cupSizeOptionsWithStatus)
},

  // 设置默认规格（全选）
  setDefaultSpecs() {
    // 所有规格数组都设置为空，不选中任何选项
   // 默认选中所有杯型
   const allCupSizes = this.data.cupSizeOptions.map(opt => opt.value)
   // 温度：默认选中所有
  const allTemperatures = this.data.temperatureOptions.map(opt => opt.value)
  // 甜度：默认选中所有
  const allSweetnesses = this.data.sweetnessOptions.map(opt => opt.value)
   // 初始化加价映射
   const cupSizeExtras = {}
   this.data.cupSizeOptions.forEach(opt => {
     cupSizeExtras[opt.value] = opt.defaultExtra
   })
   
   this.setData({
    cupSizes: allCupSizes,
    cupSizeExtras: cupSizeExtras,
    temperatures: allTemperatures,
    sweetnesses: allSweetnesses
  }, () => {
   // 数据设置完成后更新状态
   this.updateSpecOptionsStatus()
   console.log('cupSizeExtras:', JSON.stringify(this.data.cupSizeExtras))
  })
  },

  // 加载饮品详情（编辑模式）
  async loadDrinkDetail(id) {
    util.showLoading('加载中...')
    try {
      const db = wx.cloud.database()
      const res = await db.collection('drinks').doc(id).get()
      const drink = res.data

        // ========== 处理杯型数据 ==========
    let cupSizes = []
    let cupSizeExtras = {}
    
    if (drink.cupSizes && drink.cupSizes.length > 0) {
      // 检查 cupSizes 的第一个元素是对象还是字符串
      if (typeof drink.cupSizes[0] === 'object') {
        // 新格式：对象数组 [{ size, name, extraPrice }]
        cupSizes = drink.cupSizes.map(item => item.size)
        drink.cupSizes.forEach(item => {
          cupSizeExtras[item.size] = item.extraPrice || 0
        })
      } else {
        // 旧格式：字符串数组 ['small', 'medium', 'large']
        cupSizes = drink.cupSizes
        // 为每个杯型设置默认加价
        cupSizes.forEach(size => {
          const option = this.data.cupSizeOptions.find(opt => opt.value === size)
          cupSizeExtras[size] = option ? option.defaultExtra : 0
        })
      }
    }
        
        // 如果没有数据，使用默认值
        if (cupSizes.length === 0) {
          cupSizes = this.data.cupSizeOptions.map(opt => opt.value)
          this.data.cupSizeOptions.forEach(opt => {
            cupSizeExtras[opt.value] = opt.defaultExtra
          })
        }
      
        
      console.log('处理后的杯型数组:', cupSizes)
      console.log('处理后的加价:', cupSizeExtras)
      
      console.log('加载到的饮品:', drink)
      
      this.setData({
        name: drink.name || '',
        price: priceUtil.formatPriceDisplay(drink.price),
        image: getDrinkImage(drink.image),
        _rawImage: drink.image || '',
        description: drink.description || '',
        cupSizes: cupSizes || [],      // 从数据库加载已选杯型
        cupSizeExtras: cupSizeExtras, // 从数据库加载杯型加價
        temperatures: drink.temperatures || [], // 从数据库加载已选温度
        sweetnesses: drink.sweetnesses || [],   // 从数据库加载已选甜度
        stock: drink.stock ? drink.stock.toString() : '',
        isOnShelf: drink.isOnShelf !== false
      }, () => {
        this.updateSpecOptionsStatus()
      })
      util.hideLoading()
    } catch (e) {
      console.error('加载失败:', e)
      util.hideLoading()
      // 模拟数据
      this.setData({
        name: '珍珠奶茶', 
        price: '15', 
        image: '/images/drink-placeholder.png',
        description: '经典口味，Q弹珍珠', 
        stock: '100', 
        isOnShelf: true,
        cupSizes: ['small', 'medium', 'large'],
        cupSizeExtras: { small: 0, medium: 1, large: 2 },
        temperatures: ['standard_ice', 'less_ice', 'no_ice', 'hot'],
        sweetnesses: ['standard', 'less', 'half', 'light', 'none']
      })
    }
  },
  // 杯型加价输入
  onCupSizeExtraInput(e) {
    const { value } = e.currentTarget.dataset
    let extra = e.detail.value
    // 只允许数字和小数点
    extra = extra.replace(/[^\d.]/g, '')
    // 限制最多两位小数
    if (extra.includes('.')) {
      const parts = extra.split('.')
      if (parts[1].length > 2) {
        extra = parts[0] + '.' + parts[1].substring(0, 2)
      }
    }
    const extras = { ...this.data.cupSizeExtras }
    extras[value] = extra === '' ? 0 : parseFloat(extra)
    this.setData({ cupSizeExtras: extras })
  },
    // 杯型加价失去焦点时格式化
    onCupSizeExtraBlur(e) {
      const { value } = e.currentTarget.dataset
      const extras = { ...this.data.cupSizeExtras }
      let extra = extras[value]
      if (extra === '' || isNaN(extra)) {
        extras[value] = 0
      } else {
        extras[value] = parseFloat(extra).toFixed(2)
      }
      this.setData({ cupSizeExtras: extras })
    },

  // 输入事件
  onNameInput(e) { 
    this.setData({ name: e.detail.value }) 
  },
  // 使用
onPriceInput(e) {
  const value = priceUtil.formatPriceInput(e.detail.value)
  this.setData({ price: value })
},

onPriceBlur(e) {
  let value = e.detail.value
  if (value && !isNaN(parseFloat(value))) {
    this.setData({ price: parseFloat(value).toFixed(2) })
  }
},
  
  onStockInput(e) { 
    this.setData({ stock: e.detail.value }) 
  },
  
  onDescInput(e) { 
    this.setData({ description: e.detail.value }) 
  },

  // 切换上架状态
  toggleShelf(e) {
    this.setData({ isOnShelf: e.detail.value })
  },

// 杯型选择（多选）
toggleCupSize(e) {
  const { value } = e.currentTarget.dataset
  let sizes = [...this.data.cupSizes]
  const idx = sizes.indexOf(value)
  
  console.log('点击杯型:', value, '当前选中的:', sizes)  // 添加调试日志
  
  if (idx >= 0) {
    sizes.splice(idx, 1)  // 取消选中
    console.log('取消选中后:', sizes)
  } else {
    sizes.push(value)      // 添加选中
    console.log('添加选中后:', sizes)
     // 新增选中时，设置默认加价
     const option = this.data.cupSizeOptions.find(opt => opt.value === value)
     if (option && !this.data.cupSizeExtras[value]) {
       const extras = { ...this.data.cupSizeExtras }
       extras[value] = option.defaultExtra
       this.setData({ cupSizeExtras: extras })
     }
  }

  console.log('选中后:', sizes)
  console.log('加价数据:', this.data.cupSizeExtras)
  
  this.setData({ cupSizes: sizes }, () => {
    this.updateSpecOptionsStatus()  // 更新状态
  })
},

  // 温度选择（多选）
  toggleTemperature(e) {
    const { value } = e.currentTarget.dataset
    let temps = [...this.data.temperatures]
    const idx = temps.indexOf(value)
    
    if (idx >= 0) {
      temps.splice(idx, 1)
    } else {
      temps.push(value)
    }
    
    this.setData({ temperatures: temps }, () => {
      this.updateSpecOptionsStatus()
      console.log('更新后温度状态:', this.data.temperatures)
    })
    console.log('选中的温度:', temps)
  },

  // 甜度选择（多选）
  toggleSweetness(e) {
    const { value } = e.currentTarget.dataset
    let sweets = [...this.data.sweetnesses]
    const idx = sweets.indexOf(value)
    
    if (idx >= 0) {
      sweets.splice(idx, 1)
    } else {
      sweets.push(value)
    }
    
    this.setData({ sweetnesses: sweets }, () => {
      this.updateSpecOptionsStatus()
      console.log('更新后甜度状态:', this.data.sweetnesses)
    })
  },

  // 上传图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ image: tempPath })
        this.uploadImage(tempPath)
      }
    })
  },

  async uploadImage(filePath) {
    this.setData({ uploading: true })
    try {
      const cloudPath = 'drinks/' + Date.now() + '_' + Math.floor(Math.random() * 10000) + filePath.match(/\.[^.]+$/)[0]
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })
      this.setData({ image: res.fileID, uploading: false })
      util.showToast('上传成功')
    } catch (e) {
      console.warn('上传失败', e)
      this.setData({ uploading: false })
    }
  },

  // 表单验证
  validateForm() {
    const { name, price, stock, cupSizes, temperatures, sweetnesses } = this.data
    
    if (!name || !name.trim()) {
      util.showToast('请输入饮品名称')
      return false
    }
    if (!price || parseFloat(price) <= 0) {
      util.showToast('请输入正确的价格')
      return false
    }
    if (stock === '' || parseInt(stock) < 0) {
      util.showToast('请输入正确的库存')
      return false
    }
    if (cupSizes.length === 0) {
      util.showToast('请至少选择一种杯型')
      return false
    }
    if (temperatures.length === 0) {
      util.showToast('请至少选择一种温度')
      return false
    }
    if (sweetnesses.length === 0) {
      util.showToast('请至少选择一种甜度')
      return false
    }
    return true
  },

  // 保存
  async onSave() {
    if (this.data.submitting) return
    if (!this.validateForm()) return

    this.setData({ submitting: true })
    util.showLoading('保存中...')

  // 构建杯型数据（对象数组格式，包含加价）
  const cupSizesData = this.data.cupSizes.map(size => ({
    size: size,
    name: this.data.cupSizeOptions.find(opt => opt.value === size)?.label || size,
    extraPrice: parseFloat(this.data.cupSizeExtras[size] || 0)
  }))

    const { isEdit, drinkId, categoryId, name, price, image, description,
      cupSizes, temperatures, sweetnesses, stock, isOnShelf } = this.data

    try {
      const db = wx.cloud.database()
      
      // 價格四捨五入，保留兩位小數，單位為元
      const priceInFen = priceUtil.formatPriceSave(price)
      
      const drinkData = {
        categoryId,
        name: name.trim(),
        price: priceInFen,
        image: image,
        description: description.trim(),
        cupSizes: cupSizesData,           // 保存选中的杯型数组
        temperatures: temperatures,    // 保存选中的温度数组
        sweetnesses: sweetnesses,      // 保存选中的甜度数组
        stock: parseInt(stock),
        isOnShelf,
        updateTime: db.serverDate()
      }

      let saveSuccess = false
      if (isEdit) {
        await db.collection('drinks').doc(drinkId).update({ data: drinkData })
        util.showToast('修改成功', 'success')
        saveSuccess = true
      } else {
        drinkData.createTime = db.serverDate()
        await db.collection('drinks').add({ data: drinkData })
        // ========== 新增：更新分类的饮品数量 ==========
        await this.updateCategoryDrinkCount(categoryId, 1)
        util.showToast('添加成功', 'success')
        saveSuccess = true
      }

      util.hideLoading()
      this.setData({ submitting: false })

      if (saveSuccess) {
        // ========== 关键：设置需要刷新的标志 ==========
        // 获取上一页的页面实例
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        
        // 如果上一页存在，调用它的刷新方法
        if (prevPage && prevPage.loadDrinks) {
          prevPage.setData({ needRefresh: true })
          prevPage.loadDrinks()
          console.log('通知上一页刷新饮品列表')
        }
        
        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (e) {
      console.error('保存失败:', e)
      util.hideLoading()
      this.setData({ submitting: false })
      util.showToast('保存失败，请重试')
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
  }
})