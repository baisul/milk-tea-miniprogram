// pages/address-edit/address-edit.js - 新增/编辑收货地址页
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    addressId: '',
    isEdit: false,
    form: {
      name: '',
      gender: 'male',
      phone: '',
      province: '',
      provinceId: '',
      city: '',
      cityId: '',
      district: '',
      districtId: '',
      detail: '',
      roomNumber: '',
      tag: 'home',
      latitude: null,
      longitude: null,
      addressMode: 'map' // 'map' 或 'manual'
    },
    tags: [
      { value: 'home', label: '家' },
      { value: 'company', label: '公司' },
      { value: 'school', label: '学校' },
      { value: 'other', label: '其他' }
    ],
    genderOptions: [
      { value: 'male', label: '先生' },
      { value: 'female', label: '女士' }
    ],
    locationText: '',
    submitting: false,
    savedLocation: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ addressId: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑收货地址' })
      this.loadAddress(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '新增收货地址' })
    }
  },

  async loadAddress(id) {
    util.showLoading('加载中...')
    try {
      const db = wx.cloud.database()
      const res = await db.collection('addresses').doc(id).get()
      const addr = res.data
      this.setData({
        form: {
          name: addr.name || '',
          gender: addr.gender || 'male',
          phone: addr.phone || '',
          province: addr.province || '',
          provinceId: addr.provinceId || '',
          city: addr.city || '',
          cityId: addr.cityId || '',
          district: addr.district || '',
          districtId: addr.districtId || '',
          detail: addr.detail || '',
          roomNumber: addr.roomNumber || '',
          tag: addr.tag || 'home',
          latitude: addr.latitude || null,
          longitude: addr.longitude || null,
          addressMode: addr.addressMode || '',
        },
        locationText: addr.detail ? (addr.province + addr.city + addr.district + addr.detail) : ''
      });
       // 准备传递给组件的数据（用于回显）
       const componentData = {
        addressMode: addr.addressMode,
        province: addr.province || '',
        provinceId: addr.provinceId || '',
        city: addr.city || '',
        cityId: addr.cityId || '',
        district: addr.district || '',
        districtId: addr.districtId || '',
        address: addr.detail || '',
        detailAddress: addr.detail || '',
        longitude: addr.longitude || null,
        latitude: addr.latitude || null
      };
      
      this.setData({ componentInitialData: componentData });
      util.hideLoading()
    } catch (e) {
      util.hideLoading()
      console.warn('加载地址失败', e)
      util.showToast('加载失败')
    }
  },

  onNameInput(e) { this.setData({ 'form.name': e.detail.value }) },
  onPhoneInput(e) { this.setData({ 'form.phone': e.detail.value }) },
  onDetailInput(e) { this.setData({ 'form.detail': e.detail.value }) },
  onRoomInput(e) { this.setData({ 'form.roomNumber': e.detail.value }) },
  
  onGenderChange(e) {
    // 添加安全检查
    if (!e || !e.currentTarget || !e.currentTarget.dataset) {
      console.error('事件数据异常', e);
      return;
    }
    
    const value = e.currentTarget.dataset.value;
    
    if (value && (value === 'male' || value === 'female')) {
      this.setData({ 
        'form.gender': value 
      });
      console.log('性别已选择:', value);
    } else {
      console.warn('无效的性别值:', value);
    }
  },

  onTagSelect(e) {
    const { value } = e.currentTarget.dataset
    this.setData({ 'form.tag': value })
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

  // ========== 保留原有的 chooseLocation 方法作为备用 ==========
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const { name, address, latitude, longitude } = res
        const detail = name || address || ''
        this.setData({
          'form.detail': detail,
          'form.latitude': latitude,
          'form.longitude': longitude,
          'form.addressMode': 'map',
          locationText: detail
        })
      },
      fail: (err) => {
        if (err.errMsg !== 'chooseLocation:fail cancel') {
          console.warn('选择位置失败', err)
          util.showToast('选择位置失败，请重试')
        }
      }
    })
  },

  validateForm() {
    const { name, phone } = this.data.form
    
    // 姓名验证
    if (!name || !name.trim()) {
      util.showToast('请输入收货人姓名')
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
  

  onModeChange(e) {
    const { mode } = e.detail;
    console.log('模式切换:', mode);
    
    // 更新 form 中的 addressMode
    this.setData({
      'form.addressMode': mode
    });
    
    // 如果切换到手动模式，清空地图模式的地址显示（可选）
    if (mode === 'manual') {
      // 可以选择清空或保留，这里不清空
    }
  },

  // ========== 保存地址 ==========
  async onSave() {
    if (this.data.submitting) return
    if (!this.validateForm()) return


    this.setData({ submitting: true })
    util.showLoading('保存中...')

    try {
      const db = wx.cloud.database()
      const openid = app.globalData.openid || 'test'
      const form = this.data.form

          // 获取组件当前模式的数据
    const locationPicker = this.selectComponent('#locationPicker');
    const currentData = locationPicker.getCurrentData();
      // 构建保存数据
      const addressData = {
        userId: openid,
        name: form.name.trim(),
        gender: form.gender,
        phone: form.phone.trim(),
        province: currentData.province || '',
        provinceId: currentData.provinceId || '',
        city: currentData.city || '',
        cityId: currentData.cityId || '',
        district: currentData.district || '',
        districtId: currentData.districtId || '',
        detail: currentData.detail || '',        // 详细地址（用户输入或地图返回）
        fullAddress: currentData.fullAddress || '', // 完整地址（省市区+详细地址）
        roomNumber: form.roomNumber ? form.roomNumber.trim() : '',
        tag: form.tag,
        addressMode: currentData.addressMode,
        updateTime: db.serverDate()
      }
      
      // 只有地图模式且有经纬度时才保存经纬度
      if (form.addressMode === 'map' && form.latitude && form.longitude) {
        addressData.latitude = currentData.latitude
        addressData.longitude = currentData.longitude
      } else {
        addressData.latitude = null
        addressData.longitude = null
      }

      if (this.data.isEdit) {
        // 编辑地址
        await db.collection('addresses').doc(this.data.addressId).update({
          data: addressData
        })
      } else {
        // 新增地址
        const countRes = await db.collection('addresses').where({ userId: openid }).count()
        if (countRes.total === 0) {
          addressData.isDefault = true
        }
        addressData.createTime = db.serverDate()
        await db.collection('addresses').add({ data: addressData })
      }

      util.hideLoading()
      this.setData({ submitting: false })
      util.showToast('保存成功')
      
      setTimeout(() => { 
        wx.navigateBack() 
      }, 1500)
      
    } catch (e) {
      util.hideLoading()
      this.setData({ submitting: false })
      console.warn('保存地址失败', e)
      util.showToast('保存失败，请重试')
    }
  }
})