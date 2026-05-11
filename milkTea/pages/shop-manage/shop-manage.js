// pages/shop-manage/shop-manage.js - 店铺维护页
const app = getApp()
const util = require('../../utils/util')
const { getShopImage } = require('../../utils/images')

Page(
  {
  
  data: {
    shops: [],
    loading: true,

    showEditModal: false,
    editShopId: '',

    logoUploading: false,

    // 状态：0-关闭，1-营业中，2-装修中
    statusLabels: ['关闭', '营业中', '休息中'],
    editStatusIndex: 1,
    preventTap() {
      // 阻止冒泡，不做任何操作
    },
    form: {
      shopCode: '',
      name: '',
      logo: '',
      businessImage: '',
      phone: '',
      contact: '',
      province: '',
      provinceId: '',
      city: '',
      cityId: '',
      district: '',
      districtId: '',
      detail: '',
      latitude: null,
      longitude: null,
      addressMode: 'map', // 'map' 或 'manual'
      businessHours: '09:00-22:00',
      sort: 1,
      status: 1,
      deliveryRangeMeters: 5000,
      deliveryFeeCents: 500,
      minOrderCents: 2000,
      submitting: false,
      savedLocation: null
    },
    locationText: '',

    // 防抖标志 - 防止递归更新
    _isUpdatingRegion: false,
    _isUpdatingMap: false,
    _isUpdatingForm: false
  },

  onLoad() {
    this.loadShops()
  },

  onShow() {
    this.loadShops()
  },

  onPullDownRefresh() {
    this.loadShops().then(() => wx.stopPullDownRefresh())
  },

  async loadShops() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || 'test'

      const res = await db.collection('shops')
        .where({ userId: openid })
        .orderBy('sort', 'asc')
        .orderBy('createTime', 'desc')
        .limit(200)
        .get()

      const shops = res.data.map(item => ({
        ...item,
        logo: item.logo || '',
        businessImage: item.businessImage || '',
        address: item.address || item.detailAddress,
        statusText: this.formatStatus(item.status)
      }))

      this.setData({ shops, loading: false })
    } catch (e) {
      console.warn('加载店铺失败，使用模拟数据', e)
      this.setData({
        shops: [
          {
            _id: 's1',
            shopId: 's1',
            shopCode: '001',
            name: '奶茶小铺·旗舰店',
            logo: '/images/shop-placeholder.png',
            address: '广东省深圳市南山区科技园南路100号',
            status: 1,
            statusText: '营业中',
            sort: 1
          }
        ],
        loading: false
      })
    }
  },

  formatStatus(status) {
    if (status === 1 || status === 'open' || status === '1') return '营业中'
    if (status === 0 || status === '0') return '关闭'
    if (status === 2 || status === '2') return '装修中'
    return String(status || '')
  },

  // 打开新增弹窗
  onAdd() {
    this.setData({
      showEditModal: true,
      editShopId: '',
      logoUploading: false,
      editStatusIndex: 1,
      form: {
        shopCode: '',
        name: '',
        logo: '',
        phone: '',
        contact: '',
        province: '',
        city: '',
        district: '',
        detailAddress: '',
        latitude: null,
        longitude: null,
        businessHours: '09:00-22:00',
        sort: 1,
        status: 1,
        deliveryRangeMeters: 5000,
        deliveryFeeCents: 500,
        minOrderCents: 2000
      }
    })
  },

  // 打开编辑弹窗
  onEdit(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.shops[index]
    if (!item) return

    let statusIndex = 1  // 默认营业中
    if (item.status === 0) {
      statusIndex = 0
    } else if (item.status === 2) {
      statusIndex = 2
    } else {
      statusIndex = 1
    }
    this.setData({
      showEditModal: true,
      editShopId: item._id,
      logoUploading: false,
      businessImageUploading: false,
      editStatusIndex: statusIndex,
      form: {
        shopCode: item.shopCode || '',
        name: item.name || '',
        logo: item.logo || item.image || '',
        businessImage: item.businessImage || '',
        phone: item.phone || '',
        contact: item.contact || '',
        province: item.province || '',
        provinceId: item.provinceId || '',
        city: item.city || '',
        cityId: item.cityId || '',
        district: item.district || '',
        districtId: item.v || '',
        detail: item.detail || '',
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        addressMode: item.addressMode || '',
        businessHours: item.businessHours || '09:00-22:00',
        sort: item.sort ?? 1,
        status: item.status ?? 1,
        deliveryRangeMeters: item.deliveryRangeMeters ?? 5000,
        deliveryFeeCents: item.deliveryFeeCents ?? 500,
        minOrderCents: item.minOrderCents ?? 2000
      },
      locationText: item.detail ? (item.province + item.city + item.district + item.detail) : ''
    });
           // 准备传递给组件的数据（用于回显）
           const componentData = {
            addressMode: item.addressMode,
            province: item.province || '',
            provinceId: item.provinceId || '',
            city: item.city || '',
            cityId: item.cityId || '',
            district: item.district || '',
            districtId: item.districtId || '',
            address: item.detail || '',
            detailAddress: item.detail || '',
            longitude: item.longitude || null,
            latitude: item.latitude || null
          };
          
          this.setData({ componentInitialData: componentData });
  },

  onDelete(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.shops[index]
    if (!item) return

    util.showConfirm(`确定删除「${item.name || '店铺'}」吗？`, '删除确认').then(async (ok) => {
      if (!ok) return
      util.showLoading('删除中...')
      try {
        const db = wx.cloud.database()
        await db.collection('shops').doc(item._id || item.shopId).remove()
        util.hideLoading()
        util.showToast('删除成功')
        this.loadShops()
      } catch (err) {
        util.hideLoading()
        console.warn('删除失败', err)
        util.showToast('删除失败，请重试')
      }
    })
  },

  closeModal() {
    this.setData({ showEditModal: false, editShopId: '', logoUploading: false,businessImageUploading: false })
  },

  // ============ 表单输入 ============
  onShopCodeInput(e) { 
    this.safeSetData({ 'form.shopCode': e.detail.value.trim() }) 
  },
  onNameInput(e) { 
    this.safeSetData({ 'form.name': e.detail.value }) 
  },
  onPhoneInput(e) { 
    this.safeSetData({ 'form.phone': e.detail.value.trim() }) 
  },
  onContactInput(e) { 
    this.safeSetData({ 'form.contact': e.detail.value.trim() }) 
  },
  onProvinceInput(e) { 
    this.safeSetData({ 'form.province': e.detail.value.trim() }) 
  },
  onCityInput(e) { 
    this.safeSetData({ 'form.city': e.detail.value.trim() }) 
  },
  onDistrictInput(e) { 
    this.safeSetData({ 'form.district': e.detail.value.trim() }) 
  },
  onDetailAddressInput(e) { 
    this.safeSetData({ 'form.detailAddress': e.detail.value }) 
  },
  onLatitudeInput(e) { 
    this.safeSetData({ 'form.latitude': Number(e.detail.value) }) 
  },
  onLongitudeInput(e) { 
    this.safeSetData({ 'form.longitude': Number(e.detail.value) }) 
  },
  onBusinessHoursInput(e) { 
    this.safeSetData({ 'form.businessHours': e.detail.value }) 
  },
  onSortInput(e) { 
    this.safeSetData({ 'form.sort': Number(e.detail.value) || 0 }) 
  },
  onDeliveryRangeInput(e) { 
    this.safeSetData({ 'form.deliveryRangeMeters': Number(e.detail.value) || 0 }) 
  },
  onDeliveryFeeInput(e) { 
    this.safeSetData({ 'form.deliveryFeeCents': Number(e.detail.value) || 0 }) 
  },
  onMinOrderInput(e) { 
    this.safeSetData({ 'form.minOrderCents': Number(e.detail.value) || 0 }) 
  },

  // 安全的 setData 封装，避免递归
  safeSetData(data, callback) {
    if (this.data._isUpdatingForm) {
      // 如果正在更新中，延迟执行
      setTimeout(() => {
        this.setData(data, callback)
      }, 50)
      return
    }
    this.setData(data, callback)
  },

// pages/shop-manage/shop-manage.js
// 店铺状态切换
onStatusChange(e) {
  const idx = Number(e.detail.value)
  console.log('状态切换, 索引:', idx)
  
  // 根据索引获取对应的状态值
  // statusLabels: ['关闭', '营业中', '装修中']
  // 索引0=关闭(0), 索引1=营业中(1), 索引2=装修中(2)
  let status = idx === 0 ? 0 : idx === 2 ? 2 : 1
  
  console.log('新状态值:', status)
  
  this.setData({ 
    editStatusIndex: idx, 
    'form.status': status 
  })
  
  console.log('更新后 form.status:', this.data.form.status)
},

  // ========== 地址选择组件回调 ==========
  onLocationChange(e) {
    // 安全检查
    if (!e || !e.detail) {
      console.warn('地址选择事件数据为空', e);
      return;
    }
    
    const locationInfo = e.detail;
    console.log('地址信息更新:', locationInfo);
    
    // 根据模式处理不同的数据
    if (locationInfo.mode === 'map') {
      // 地图模式：有经纬度
      this.setData({
        'form.province': locationInfo.province || '',
        'form.provinceId': locationInfo.provinceId || '',
        'form.city': locationInfo.city || '',
        'form.cityId': locationInfo.cityId || '',
        'form.district': locationInfo.district || '',  // 注意：这里是 district
        'form.districtId': locationInfo.districtId || '',
        'form.detail': locationInfo.address || '',
        'form.longitude': locationInfo.longitude || null,
        'form.latitude': locationInfo.latitude || null,
        'form.addressMode': 'map'
      });
    } else {
      // 手动模式：没有经纬度
      this.setData({
        'form.province': locationInfo.province || '',
        'form.provinceId': locationInfo.provinceId || '',
        'form.city': locationInfo.city || '',
        'form.cityId': locationInfo.cityId || '',
        'form.district': locationInfo.district || '',  // 注意：这里是 district
        'form.districtId': locationInfo.districtId || '',
        'form.detail': locationInfo.address || '',
        'form.longitude': null,
        'form.latitude': null,
        'form.addressMode': 'manual'
      });
    }
    
    // 更新显示文本
    this.updateLocationText();
  },
  // 更新地址显示文本
  updateLocationText() {
    const { province, city, district, detail } = this.data.form;
    const text = [province, city, district, detail].filter(v => v).join('');
    this.setData({ locationText: text });
  },

  // 选择位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const detail = res.name || res.address || ''
        // 一次性更新所有位置相关数据
        this.setData({
          'form.detailAddress': detail,
          'form.latitude': res.latitude,
          'form.longitude': res.longitude
        })
      },
      fail: (err) => {
        console.warn('chooseLocation失败', err)
        util.showToast('选择位置失败')
      }
    })
  },

  // 省/市/区变更
  onRegionChange(e) {
    // 防止递归更新
    if (this.data._isUpdatingRegion) {
      return
    }
    
    const { province, city, district } = e.detail || {}
    
    // 检查数据是否真的有变化
    const currentProvince = this.data.form.province
    const currentCity = this.data.form.city
    const currentDistrict = this.data.form.district
    
    const hasProvinceChange = province !== undefined && province !== currentProvince
    const hasCityChange = city !== undefined && city !== currentCity
    const hasDistrictChange = district !== undefined && district !== currentDistrict
    
    // 如果没有变化，直接返回
    if (!hasProvinceChange && !hasCityChange && !hasDistrictChange) {
      return
    }
    
    this.setData({ _isUpdatingRegion: true })
    
    // 构建更新数据
    const updateData = {}
    if (hasProvinceChange) updateData['form.province'] = province || ''
    if (hasCityChange) updateData['form.city'] = city || ''
    if (hasDistrictChange) updateData['form.district'] = district || ''
    
    this.setData(updateData, () => {
      // 延迟重置标志，避免频繁更新
      setTimeout(() => {
        this.setData({ _isUpdatingRegion: false })
      }, 100)
    })
  },

  // 地图选点变更（填充经纬度与地址）
  onMapChange(e) {
    // 防止递归更新
    if (this.data._isUpdatingMap) {
      return
    }
    
    const { latitude, longitude, address } = e.detail || {}
    
    // 检查数据是否真的有变化
    const currentLat = this.data.form.latitude
    const currentLng = this.data.form.longitude
    const currentAddr = this.data.form.detailAddress
    
    const hasLatChange = latitude !== undefined && latitude !== currentLat
    const hasLngChange = longitude !== undefined && longitude !== currentLng
    const hasAddrChange = address !== undefined && address.trim() !== currentAddr.trim()
    
    // 如果没有变化，直接返回
    if (!hasLatChange && !hasLngChange && !hasAddrChange) {
      return
    }
    
    this.setData({ _isUpdatingMap: true })
    
    // 构建更新数据
    const updateData = {}
    if (hasLatChange) updateData['form.latitude'] = latitude ?? null
    if (hasLngChange) updateData['form.longitude'] = longitude ?? null
    if (hasAddrChange) updateData['form.detailAddress'] = (address || '').trim()
    
    // 一次性更新所有数据
    this.setData(updateData, () => {
      // 延迟重置标志
      setTimeout(() => {
        this.setData({ _isUpdatingMap: false })
      }, 100)
    })
  },

  // 营业时间范围变更
  onBusinessHoursChange(e) {
    const { businessHours } = e.detail || {}
    if (businessHours !== undefined && businessHours !== this.data.form.businessHours) {
      this.setData({
        'form.businessHours': businessHours || this.data.form.businessHours
      })
    }
  },

  // 上传Logo
  chooseLogo() {
    if (this.data.logoUploading) return
    this.setData({ logoUploading: true })
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const filePath = res.tempFiles?.[0]?.tempFilePath
        if (!filePath) {
          this.setData({ logoUploading: false })
          util.showToast('未选择图片')
          return
        }

        try {
          const dbPathKey = this.data.editShopId || 'new'
          const cloudPath = `shop-logos/${dbPathKey}_${Date.now()}.png`
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath })
          this.setData({ 'form.logo': uploadRes.fileID })
        } catch (err) {
          console.warn('上传Logo失败', err)
          util.showToast('上传Logo失败')
        } finally {
          this.setData({ logoUploading: false })
        }
      },
      fail: () => {
        this.setData({ logoUploading: false })
        util.showToast('选择图片失败')
      }
    })
  },

    // 上传营业执照图
    chooseBusinessImage() {
      if (this.data.businessImageUploading) return
      this.setData({ businessImageUploading: true })
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        success: async (res) => {
          const filePath = res.tempFiles?.[0]?.tempFilePath
          if (!filePath) {
            this.setData({ businessImageUploading: false })
            util.showToast('未选择图片')
            return
          }
  
          try {
            const dbPathKey = this.data.editShopId || 'new'
            const cloudPath = `shop-business-image/${dbPathKey}_${Date.now()}.png`
            const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath })
            this.setData({ 'form.businessImage': uploadRes.fileID })
          } catch (err) {
            console.warn('上传营业执照图失败', err)
            util.showToast('上传营业执照图失败')
          } finally {
            this.setData({ businessImageUploading: false })
          }
        },
        fail: () => {
          this.setData({ businessImageUploading: false })
          util.showToast('选择图片失败')
        }
      })
    },

  validateForm() {
    const { contact, phone } = this.data.form
    
    // 姓名验证
    if (!contact || !contact.trim()) {
      util.showToast('请输入联系人姓名')
      return false
    }
    
    // 手机号验证
    if (!phone || !util.isValidPhone(phone)) {
      util.showToast('请输入正确的手机号')
      return false
    }
    
    // 获取组件实例，验证当前模式下的地址
    const locationPicker = this.selectComponent('#locationPicker');
    if (locationPicker) {
      return locationPicker.validateCurrentMode();
    }
    
    return true
  },

  async onSave() {
    if (this.data.logoUploading) return
    if (!this.validateForm()) return

    util.showLoading('保存中...')
    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || wx.getStorageSync('openid') || 'test'
      const f = this.data.form

      const shopCode = f.shopCode

    // 获取组件当前模式的数据
    const locationPicker = this.selectComponent('#locationPicker');
    const currentData = locationPicker.getCurrentData();

      // 店铺编号唯一校验（创建/编辑都校验一次）
      const existByCode = await db.collection('shops')
        .where({ shopCode })
        .limit(1)
        .get()
      if (existByCode.data?.length > 0) {
        const exist = existByCode.data[0]
        if (String(exist._id) !== String(this.data.editShopId || '')) {
          util.hideLoading()
          util.showToast('店铺编号已存在')
          return
        }
      }

      const payload = {
        shopCode,
        name: (f.name || '').trim(),
        logo: f.logo || '',
        businessImage: f.businessImage || '',
        phone: (f.phone || '').trim(),
        contact: (f.contact || '').trim(),
        province: currentData.province || '',
        provinceId: currentData.provinceId || '',
        city: currentData.city || '',
        cityId: currentData.cityId || '',
        district: currentData.district || '',
        districtId: currentData.districtId || '',
        detail: currentData.detail || '',        // 详细地址（用户输入或地图返回）
        fullAddress: currentData.fullAddress || '', // 完整地址（省市区+详细地址）
        addressMode: currentData.addressMode,
        businessHours: (f.businessHours || '').trim(),
        sort: Number(f.sort) || 0,
        status: Number(f.status) || 0,
        deliveryRangeMeters: Number(f.deliveryRangeMeters) || 0,
        deliveryFeeCents: Number(f.deliveryFeeCents) || 0,
        minOrderCents: Number(f.minOrderCents) || 0,
        updateTime: db.serverDate()
      }

      // 只有地图模式且有经纬度时才保存经纬度
      if (f.addressMode === 'map' && f.latitude && f.longitude) {
          payload.latitude = currentData.latitude
          payload.longitude = currentData.longitude
      } else {
          payload.latitude = null
          payload.longitude = null
        }

      const isEdit = !!this.data.editShopId
      if (isEdit) {
        await db.collection('shops').doc(this.data.editShopId).update({ data: payload })
      } else {
        payload.userId = openid
        payload.createTime = db.serverDate()
        await db.collection('shops').add({ data: payload })
      }

      util.hideLoading()
      util.showToast('保存成功', 'success')
      this.closeModal()
      this.loadShops()
    } catch (e) {
      util.hideLoading()
      console.warn('保存失败', e)
      util.showToast('保存失败，请重试')
    }
  }
})