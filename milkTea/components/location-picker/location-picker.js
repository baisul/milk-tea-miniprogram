// 引入省市区数据
const provincesData = require('data/province.js');
const citiesData = require('data/city.js');
const districtsData = require('data/county.js');

Component({
  data: {
    currentMode: 'map', // 'map' 或 'manual'
    
    // 省份数据
    provinceList: [],
    provinceNames: [],
    
    // ========== 地图选点模式数据（独立） ==========
    selectedAddress: '',
    selectedProvince: '',
    selectedProvinceId: '',
    selectedCity: '',
    selectedCityId: '',
    selectedDistrict: '',
    selectedDistrictId: '',
    selectedLongitude: '',
    selectedLatitude: '',
    selectedLocation: null,
    
    // ========== 手动选择模式数据（独立） ==========
    manualProvinceIndex: -1,
    manualProvinceId: '',
    manualProvinceName: '',
    manualCityIndex: -1,
    manualCityId: '',
    manualCityName: '',
    manualDistrictIndex: -1,
    manualDistrictId: '',
    manualDistrictName: '',
    manualCityList: [],
    manualCityNames: [],
    manualDistrictList: [],
    manualDistrictNames: [],
    manualDetailAddress: '',
    manualFullAddress: ''
  },
  
  properties: {
    initialData: {
      type: Object,
      value: null
    }
  },
  
  observers: {
    'initialData': function(newVal) {
      if (newVal && newVal.addressMode) {
        this.setInitialData(newVal);
      }
    }
  },

  lifetimes: {
    attached() {
      this.initProvinceData();
    },
    ready() {
      if (this.properties.initialData && this.properties.initialData.addressMode) {
        this.setInitialData(this.properties.initialData);
      }
    }
  },

  methods: {
    // 设置初始数据（用于编辑回显）
    setInitialData(data) {
      console.log('设置初始数据:', data);
      
      if (data.addressMode === 'map') {
        // 地图模式回显
        this.setData({
          currentMode: 'map',
          selectedAddress: data.address || '',
          selectedProvince: data.province || '',
          selectedProvinceId: data.provinceId || '',
          selectedCity: data.city || '',
          selectedCityId: data.cityId || '',
          selectedDistrict: data.district || '',
          selectedDistrictId: data.districtId || '',
          selectedLongitude: data.longitude || '',
          selectedLatitude: data.latitude || ''
        });
      } else if (data.addressMode === 'manual') {
        // 手动模式回显 - 不清空任何数据，只设置手动模式的数据
        this.setData({
          currentMode: 'manual',
          manualDetailAddress: data.detail || ''
        });
        
        // 查找并设置省份
        if (data.provinceId) {
          const provinceIndex = this.data.provinceList.findIndex(p => p.id === data.provinceId);
          if (provinceIndex !== -1) {
            this.setData({
              manualProvinceIndex: provinceIndex,
              manualProvinceId: data.provinceId,
              manualProvinceName: data.province || ''
            });
            
            // 加载城市列表
            this.loadCitiesForEdit(data.provinceId);
            
            // 设置城市
            setTimeout(() => {
              if (data.cityId) {
                const cityIndex = this.data.manualCityList.findIndex(c => c.id === data.cityId);
                if (cityIndex !== -1) {
                  this.setData({
                    manualCityIndex: cityIndex,
                    manualCityId: data.cityId,
                    manualCityName: data.city || ''
                  });
                  
                  // 加载区县列表
                  this.loadDistrictsForEdit(data.cityId);
                  
                  // 设置区县
                  setTimeout(() => {
                    if (data.districtId) {
                      const districtIndex = this.data.manualDistrictList.findIndex(d => d.id === data.districtId);
                      if (districtIndex !== -1) {
                        this.setData({
                          manualDistrictIndex: districtIndex,
                          manualDistrictId: data.districtId,
                          manualDistrictName: data.district || ''
                        });
                      }
                    }
                    // 设置详细地址
                    this.setData({
                      manualDetailAddress: data.detailAddress || data.address || ''
                    });
                    this.updateManualFullAddress();
                  }, 100);
                }
              }
            }, 100);
          }
        } else if (data.province) {
          // 如果没有 provinceId，尝试通过名称查找
          const provinceIndex = this.data.provinceList.findIndex(p => p.name === data.province);
          if (provinceIndex !== -1) {
            this.setData({
              manualProvinceIndex: provinceIndex,
              manualProvinceId: this.data.provinceList[provinceIndex].id,
              manualProvinceName: data.province
            });
            
            // 加载城市列表
            this.loadCitiesForEdit(this.data.provinceList[provinceIndex].id);
            
            setTimeout(() => {
              if (data.city) {
                const cityIndex = this.data.manualCityList.findIndex(c => c.name === data.city);
                if (cityIndex !== -1) {
                  this.setData({
                    manualCityIndex: cityIndex,
                    manualCityId: this.data.manualCityList[cityIndex].id,
                    manualCityName: data.city
                  });
                  
                  this.loadDistrictsForEdit(this.data.manualCityList[cityIndex].id);
                  
                  setTimeout(() => {
                    if (data.district) {
                      const districtIndex = this.data.manualDistrictList.findIndex(d => d.name === data.district);
                      if (districtIndex !== -1) {
                        this.setData({
                          manualDistrictIndex: districtIndex,
                          manualDistrictId: this.data.manualDistrictList[districtIndex].id,
                          manualDistrictName: data.district
                        });
                      }
                    }
                    this.setData({
                      manualDetailAddress: data.detailAddress || data.address || ''
                    });
                    this.updateManualFullAddress();
                  }, 100);
                }
              }
            }, 100);
          }
        }
      }
    },

    // 初始化省份数据
    initProvinceData() {
      const provinceList = provincesData || [];
      const provinceNames = provinceList.map(p => p.name);
      
      this.setData({
        provinceList,
        provinceNames
      });
    },

    // 编辑回显时加载城市列表
    loadCitiesForEdit(provinceId) {
      const cities = citiesData[provinceId] || [];
      const cityNames = cities.map(c => c.name);
      
      this.setData({
        manualCityList: cities,
        manualCityNames: cityNames
      });
    },

    // 编辑回显时加载区县列表
    loadDistrictsForEdit(cityId) {
      const districts = districtsData[cityId] || [];
      const districtNames = districts.map(d => d.name);
      
      this.setData({
        manualDistrictList: districts,
        manualDistrictNames: districtNames
      });
    },

    // 根据省份ID加载城市列表（用户操作时使用）
    loadCities(provinceId) {
      const cities = citiesData[provinceId] || [];
      const cityNames = cities.map(c => c.name);
      
      this.setData({
        manualCityList: cities,
        manualCityNames: cityNames,
        manualCityIndex: -1,
        manualCityId: '',
        manualCityName: '',
        manualDistrictList: [],
        manualDistrictNames: [],
        manualDistrictIndex: -1,
        manualDistrictId: '',
        manualDistrictName: ''
      });
    },

    // 根据城市ID加载区县列表（用户操作时使用）
    loadDistricts(cityId) {
      const districts = districtsData[cityId] || [];
      const districtNames = districts.map(d => d.name);
      
      this.setData({
        manualDistrictList: districts,
        manualDistrictNames: districtNames,
        manualDistrictIndex: -1,
        manualDistrictId: '',
        manualDistrictName: ''
      });
    },

    // 切换模式 - 只切换显示，不清空任何数据
    switchMode(e) {
      const mode = e.currentTarget.dataset.mode;
      this.setData({ currentMode: mode });
      
      // 切换时触发事件，传递当前模式对应的数据
      if (mode === 'manual') {
        this.triggerEvent('change', {
          mode: 'manual',
          province: this.data.manualProvinceName,
          provinceId: this.data.manualProvinceId,
          city: this.data.manualCityName,
          cityId: this.data.manualCityId,
          district: this.data.manualDistrictName,
          districtId: this.data.manualDistrictId,
          detail: this.data.manualDetailAddress,
          fullAddress: this.data.manualFullAddress
        });
      } else {
        const fullAddress = [this.data.selectedProvince, this.data.selectedCity, this.data.selectedDistrict, this.data.selectedAddress].filter(v => v).join('');
        this.triggerEvent('change', {
          mode: 'map',
          province: this.data.selectedProvince,
          provinceId: this.data.selectedProvinceId,
          city: this.data.selectedCity,
          cityId: this.data.selectedCityId,
          district: this.data.selectedDistrict,
          districtId: this.data.selectedDistrictId,
          detail: this.data.selectedAddress,
          fullAddress: fullAddress,
          longitude: this.data.selectedLongitude,
          latitude: this.data.selectedLatitude
        });
      }
    },

    // ========== 地图选点模式 ==========
    chooseLocation() {
      const that = this;
      
      wx.chooseLocation({
        success(res) {
          that.parseLocationAddress(res);
        },
        fail(err) {
          console.error('选择位置失败', err);
          wx.showToast({
            title: '选择位置失败',
            icon: 'none'
          });
        }
      });
    },

    // 解析地址，提取省市区
    parseLocationAddress(location) {
      const address = location.address || location.name;
      let province = '', city = '', district = '';
      let provinceId = '', cityId = '', districtId = '';
      
      // 遍历省份匹配
      for (const provinceItem of this.data.provinceList) {
        if (address.includes(provinceItem.name)) {
          province = provinceItem.name;
          provinceId = provinceItem.id;
          
          const cities = citiesData[provinceId] || [];
          for (const cityItem of cities) {
            if (address.includes(cityItem.name)) {
              city = cityItem.name;
              cityId = cityItem.id;
              
              const districts = districtsData[cityId] || [];
              for (const districtItem of districts) {
                if (address.includes(districtItem.name)) {
                  district = districtItem.name;
                  districtId = districtItem.id;
                  break;
                }
              }
              break;
            }
          }
          break;
        }
      }
        // 拼接完整地址
        const fullAddress = [province, city, district, address].filter(v => v).join('');
      
      this.setData({
        selectedAddress: address,
        selectedProvince: province,
        selectedProvinceId: provinceId,
        selectedCity: city,
        selectedCityId: cityId,
        selectedDistrict: district,
        selectedDistrictId: districtId,
        selectedLongitude: location.longitude,
        selectedLatitude: location.latitude,
        selectedLocation: location
      });
      
      // 触发外部事件
      this.triggerEvent('change', {
        mode: 'map',
        province: province,
        provinceId: provinceId,
        city: city,
        cityId: cityId,
        district: district,
        districtId: districtId,
        detail: address,
        fullAddress: fullAddress,
        longitude: location.longitude,
        latitude: location.latitude
      });
    },

    // ========== 手动选择模式 ==========
    onManualProvinceChange(e) {
      const index = e.detail.value;
      const province = this.data.provinceList[index];
      
      this.setData({
        manualProvinceIndex: index,
        manualProvinceId: province.id,
        manualProvinceName: province.name,
        manualCityIndex: -1,
        manualCityId: '',
        manualCityName: '',
        manualDistrictIndex: -1,
        manualDistrictId: '',
        manualDistrictName: '',
        manualFullAddress: ''
      });
      
      this.loadCities(province.id);
    },

    onManualCityChange(e) {
      const index = e.detail.value;
      const city = this.data.manualCityList[index];
      
      this.setData({
        manualCityIndex: index,
        manualCityId: city.id,
        manualCityName: city.name,
        manualDistrictIndex: -1,
        manualDistrictId: '',
        manualDistrictName: ''
      });
      
      if (city) {
        this.loadDistricts(city.id);
      }
      this.updateManualFullAddress();
    },

    onManualDistrictChange(e) {
      const index = e.detail.value;
      const district = this.data.manualDistrictList[index];
      
      this.setData({
        manualDistrictIndex: index,
        manualDistrictId: district.id,
        manualDistrictName: district.name
      });
      
      this.updateManualFullAddress();
    },

    onManualAddressInput(e) {
      this.setData({ manualDetailAddress: e.detail.value });
      this.updateManualFullAddress();
    },

    updateManualFullAddress() {
      const province = this.data.manualProvinceName || '';
      const city = this.data.manualCityName || '';
      const district = this.data.manualDistrictName || '';
      const detail = this.data.manualDetailAddress;
      
      const fullAddress = [province, city, district, detail].filter(v => v).join('');
      
      this.setData({ manualFullAddress: fullAddress });
      
      this.triggerEvent('change', {
        mode: 'manual',
        province: province,
        provinceId: this.data.manualProvinceId,
        city: city,
        cityId: this.data.manualCityId,
        district: district,
        districtId: this.data.manualDistrictId,
        detail: detail ,
        fullAddress: fullAddress  
      });
    },

    // 获取当前模式的数据（用于保存）
    getCurrentData() {
      if (this.data.currentMode === 'map') {
        return {
          mode: 'map',
          province: this.data.selectedProvince,
          provinceId: this.data.selectedProvinceId,
          city: this.data.selectedCity,
          cityId: this.data.selectedCityId,
          district: this.data.selectedDistrict,
          districtId: this.data.selectedDistrictId,
          detail: this.data.selectedAddress,
          fullAddress: this.data.selectedAddress,
          longitude: this.data.selectedLongitude,
          latitude: this.data.selectedLatitude,
          addressMode: this.data.currentMode
        };
      } else {
        return {
          mode: 'manual',
          province: this.data.manualProvinceName,
          provinceId: this.data.manualProvinceId,
          city: this.data.manualCityName,
          cityId: this.data.manualCityId,
          district: this.data.manualDistrictName,
          districtId: this.data.manualDistrictId,
          detail: this.data.manualDetailAddress,
          fullAddress: this.data.manualFullAddress,
          addressMode: this.data.currentMode
        };
      }
    },
    
    // 验证当前模式是否完整
    validateCurrentMode() {
      if (this.data.currentMode === 'map') {
        const hasAddress = !!this.data.selectedAddress;
        if (!hasAddress) {
          wx.showToast({ title: '请点击选择地图位置', icon: 'none' });
        }
        return hasAddress;
      } else {
        const hasProvince = !!this.data.manualProvinceName;
        const hasCity = !!this.data.manualCityName;
        const hasDistrict = !!this.data.manualDistrictName;
        const hasDetail = this.data.manualDetailAddress && this.data.manualDetailAddress.trim().length > 0;
        
        if (!hasProvince) {
          wx.showToast({ title: '请选择省份', icon: 'none' });
          return false;
        }
        if (!hasCity) {
          wx.showToast({ title: '请选择城市', icon: 'none' });
          return false;
        }
        if (!hasDistrict) {
          wx.showToast({ title: '请选择区县', icon: 'none' });
          return false;
        }
        if (!hasDetail) {
          wx.showToast({ title: '请输入详细地址', icon: 'none' });
          return false;
        }
        return true;
      }
    }
  }
});