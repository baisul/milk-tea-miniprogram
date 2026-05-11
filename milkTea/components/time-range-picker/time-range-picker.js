// components/time-range-picker/time-range-picker.js - 营业时间范围选择器（半小时步进）
function pad2(n) {
  return String(n).padStart(2, '0')
}

function minutesToHHmm(m) {
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${pad2(hh)}:${pad2(mm)}`
}

function hhmmToMinutes(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim())
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  return hh * 60 + mm
}

function parseBusinessHours(v) {
  const str = String(v || '').trim()
  const parts = str.split('-')
  if (parts.length !== 2) return null
  const start = hhmmToMinutes(parts[0])
  const end = hhmmToMinutes(parts[1])
  if (start === null || end === null) return null
  return { start, end }
}

Component({
  properties: {
    value: { type: String, value: '' },
    // 最小区间（分钟）
    minMinutes: { type: Number, value: 30 }
  },

  data: {
    timeOptions: [],
    startIndex: 0,
    endTimeOptions: [],
    endIndex: 0,

    startMinutes: 9 * 60,
    endMinutes: 22 * 60
  },

  lifetimes: {
    attached() {
      const stepMinutes = 30
      const allMinutes = []
      for (let m = 0; m < 24 * 60; m += stepMinutes) allMinutes.push(m)

      this.setData({
        timeOptions: allMinutes.map(minutesToHHmm)
      })

      this.syncFromValue()
    }
  },

  observers: {
    value: function () {
      this.syncFromValue()
    }
  },

  methods: {
    syncFromValue() {
      const stepMinutes = 30
      const parsed = parseBusinessHours(this.properties.value)

      let start = parsed ? parsed.start : (9 * 60)
      let end = parsed ? parsed.end : (22 * 60)

      // 强制对齐到半小时
      start = Math.round(start / stepMinutes) * stepMinutes
      end = Math.round(end / stepMinutes) * stepMinutes

      // 保证 end > start 且满足 minMinutes
      const min = Number(this.properties.minMinutes) || 30
      if (end < start + min) {
        end = start + min
      }
      if (end >= 24 * 60) end = 24 * 60 - stepMinutes

      const allMinutes = this.getAllMinutes()
      const startIndex = Math.max(0, allMinutes.findIndex(m => m === start))

      this.setData({
        startMinutes: start,
        endMinutes: end,
        startIndex
      })
      this.rebuildEndOptions()
    },

    getAllMinutes() {
      const arr = []
      for (let m = 0; m < 24 * 60; m += 30) arr.push(m)
      return arr
    },

    rebuildEndOptions() {
      const min = Number(this.properties.minMinutes) || 30
      const stepMinutes = 30
      const allMinutes = this.getAllMinutes()
      const minEnd = this.data.startMinutes + min
      const endMinutesList = allMinutes.filter(m => m >= minEnd)

      const endTimeOptions = endMinutesList.map(minutesToHHmm)
      let endIndex = endMinutesList.findIndex(m => m === this.data.endMinutes)
      if (endIndex < 0) {
        endIndex = 0
        this.setData({ endMinutes: endMinutesList[0] })
      }

      this.setData({
        endTimeOptions,
        endIndex
      })
      this.emitChange()
    },

    onStartChange(e) {
      const idx = Number(e.detail.value)
      const allMinutes = this.getAllMinutes()
      const nextStart = allMinutes[idx]
      const min = Number(this.properties.minMinutes) || 30

      let nextEnd = this.data.endMinutes
      if (nextEnd < nextStart + min) nextEnd = nextStart + min
      if (nextEnd >= 24 * 60) nextEnd = 24 * 60 - 30

      const startIndex = Math.max(0, allMinutes.findIndex(m => m === nextStart))
      this.setData({
        startIndex,
        startMinutes: nextStart,
        endMinutes: nextEnd
      })

      this.rebuildEndOptions()
    },

    onEndChange(e) {
      const idx = Number(e.detail.value)
      const min = Number(this.properties.minMinutes) || 30
      const endMinutesList = this.getAllMinutes().filter(m => m >= this.data.startMinutes + min)
      const nextEnd = endMinutesList[idx] ?? endMinutesList[0]

      if (nextEnd < this.data.startMinutes + min) {
        wx.showToast({ title: '结束时间需至少间隔半小时', icon: 'none' })
        return
      }

      this.setData({
        endIndex: idx,
        endMinutes: nextEnd
      })
      this.emitChange()
    },

    emitChange() {
      const start = minutesToHHmm(this.data.startMinutes)
      const end = minutesToHHmm(this.data.endMinutes)
      this.triggerEvent('change', {
        businessHours: `${start}-${end}`,
        start,
        end
      })
    }
  }
})

