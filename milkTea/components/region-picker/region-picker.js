// components/region-picker/region-picker.js - 省/市/区 级联下
const provinces = require('./data/province.js')
const citiesByProvince = require('./data/city.js')
const countiesByCity = require('./data/county.js')

// 添加调试日志
console.log('========== region-picker 组件加载 ==========')
console.log('省份数据:', provinces)
console.log('省份数量:', provinces ? provinces.length : 0)
console.log('城市数据:', citiesByProvince)
console.log('城市数据 keys:', citiesByProvince ? Object.keys(citiesByProvince).length : 0)
console.log('区县数据 keys:', countiesByCity ? Object.keys(countiesByCity).length : 0)

function toNameArray(list) {
  return (list || []).map(item => item.name)
}

// components/region-picker/region-picker.js
Component({
  properties: {
    province: { type: String, value: '' },
    city: { type: String, value: '' },
    district: { type: String, value: '' }
  },

  data: {
    provinceNames: [],
    provinceList: [],
    cities: [],
    citiesNames: [],
    districts: [],
    districtsNames: [],
    provinceIndex: 0,
    cityIndex: 0,
    districtIndex: 0
  },

  lifetimes: {
    attached() {
      console.log('region-picker attached')
      this.initData()
    }
  },

  observers: {
    'province, city, district': function(province, city, district) {
      console.log('observers 触发:', { province, city, district })
      this.updateFromProps()
    }
  },

  methods: {
    initData() {
      if (provinces && provinces.length) {
        const provinceNames = ['请选择省份'].concat(provinces.map(p => p.name))
        this.setData({
          provinceList: provinces,
          provinceNames: provinceNames,
          citiesNames: ['请选择市'],
          districtsNames: ['请选择区/县']
        })
      }
      this.updateFromProps()
    },
    
    updateFromProps() {
      const { province, city, district } = this.properties
      console.log('updateFromProps:', { province, city, district })
      
      if (!province || !this.data.provinceList.length) {
        return
      }
      
      const provinceItem = this.data.provinceList.find(p => p.name === province)
      if (!provinceItem) return
      
      const provinceIndex = this.data.provinceList.findIndex(p => p.id === provinceItem.id) + 1
      const cities = citiesByProvince[provinceItem.id] || []
      const citiesNames = ['请选择市'].concat(cities.map(c => c.name))
      
      let cityIndex = 0
      let cityItem = null
      let districts = []
      let districtsNames = ['请选择区/县']
      let districtIndex = 0
      
      if (city && cities.length) {
        cityItem = cities.find(c => c.name === city)
        if (cityItem) {
          cityIndex = cities.findIndex(c => c.id === cityItem.id) + 1
          districts = countiesByCity[cityItem.id] || []
          districtsNames = ['请选择区/县'].concat(districts.map(d => d.name))
          
          if (district && districts.length) {
            const districtItem = districts.find(d => d.name === district)
            if (districtItem) {
              districtIndex = districts.findIndex(d => d.id === districtItem.id) + 1
            }
          }
        }
      }
      
      this.setData({
        provinceIndex: provinceIndex,
        cities: cities,
        citiesNames: citiesNames,
        cityIndex: cityIndex,
        districts: districts,
        districtsNames: districtsNames,
        districtIndex: districtIndex
      })
    },
    
    // 省份选择
    onProvinceChange(e) {
      const idx = Number(e.detail.value)
      if (idx <= 0) {
        this.setData({
          provinceIndex: 0,
          cities: [],
          citiesNames: ['请选择市'],
          districts: [],
          districtsNames: ['请选择区/县'],
          cityIndex: 0,
          districtIndex: 0
        })
        this.triggerEvent('change', { province: '', city: '', district: '' })
        return
      }
      
      const provinceItem = this.data.provinceList[idx - 1]
      const cities = citiesByProvince[provinceItem.id] || []
      const citiesNames = ['请选择市'].concat(cities.map(c => c.name))
      
      this.setData({
        provinceIndex: idx,
        cities: cities,
        citiesNames: citiesNames,
        districts: [],
        districtsNames: ['请选择区/县'],
        cityIndex: 0,
        districtIndex: 0
      })
      
      this.triggerEvent('change', {
        province: provinceItem.name,
        city: '',
        district: ''
      })
    },
    
    // 城市选择
    onCityChange(e) {
      const idx = Number(e.detail.value)
      if (idx <= 0) {
        const provinceItem = this.getSelectedProvinceItem()
        this.setData({
          cityIndex: 0,
          districts: [],
          districtsNames: ['请选择区/县'],
          districtIndex: 0
        })
        this.triggerEvent('change', {
          province: provinceItem ? provinceItem.name : '',
          city: '',
          district: ''
        })
        return
      }
      
      const cityItem = this.data.cities[idx - 1]
      if (!cityItem) return
      
      const districts = countiesByCity[cityItem.id] || []
      const districtsNames = ['请选择区/县'].concat(districts.map(d => d.name))
      
      this.setData({
        cityIndex: idx,
        districts: districts,
        districtsNames: districtsNames,
        districtIndex: 0
      })
      
      const provinceItem = this.getSelectedProvinceItem()
      this.triggerEvent('change', {
        province: provinceItem ? provinceItem.name : '',
        city: cityItem.name,
        district: ''
      })
    },
    
    // 区县选择
    onDistrictChange(e) {
      const idx = Number(e.detail.value)
      if (idx <= 0) {
        const provinceItem = this.getSelectedProvinceItem()
        const cityItem = this.data.cities[this.data.cityIndex - 1]
        this.setData({ districtIndex: 0 })
        this.triggerEvent('change', {
          province: provinceItem ? provinceItem.name : '',
          city: cityItem ? cityItem.name : '',
          district: ''
        })
        return
      }
      
      const districtItem = this.data.districts[idx - 1]
      if (!districtItem) return
      
      const provinceItem = this.getSelectedProvinceItem()
      const cityItem = this.data.cities[this.data.cityIndex - 1]
      
      this.setData({ districtIndex: idx })
      this.triggerEvent('change', {
        province: provinceItem ? provinceItem.name : '',
        city: cityItem ? cityItem.name : '',
        district: districtItem.name
      })
    },
    
    getSelectedProvinceItem() {
      const idx = this.data.provinceIndex
      if (idx <= 0) return null
      return this.data.provinceList[idx - 1]
    }
  }
})



