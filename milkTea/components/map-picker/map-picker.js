// components/map-picker/map-picker.js - 地图选点组件（经纬度 + 地址）
Component({
  properties: {
    latitude: { type: Number, value: null },
    longitude: { type: Number, value: null },
    address: { type: String, value: '' }
  },

  data: {
    displayingText: ''
  },

  lifetimes: {
    attached() {
      this.refreshDisplay()
    }
  },

  observers: {
    'latitude,longitude,address': function () {
      this.refreshDisplay()
    }
  },

  methods: {
    refreshDisplay() {
      const { latitude, longitude, address } = this.properties
      if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        this.setData({ displayingText: '' })
        return
      }
      const coord = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      this.setData({ displayingText: address ? address + '（' + coord + '）' : coord })
    },

    chooseLocation() {
      wx.chooseLocation({
        success: (res) => {
          const latitude = res.latitude
          const longitude = res.longitude
          const address = res.address || res.name || ''
          this.triggerEvent('change', { latitude, longitude, address })
        },
        fail: (err) => {
          wx.showToast({ title: '选择位置失败', icon: 'none' })
          console.warn('chooseLocation fail', err)
        }
      })
    }
  }
})

