// utils/util.js - 通用工具函数

/**
 * 格式化时间
 * @param {Date|number|string} date 
 * @param {string} fmt 格式，默认 yyyy-MM-dd HH:mm:ss
 */
function formatTime(date, fmt = 'yyyy-MM-dd HH:mm:ss') {
  if (!date) return ''
  const d = new Date(date)
  const o = {
    'M+': d.getMonth() + 1,
    'd+': d.getDate(),
    'H+': d.getHours(),
    'm+': d.getMinutes(),
    's+': d.getSeconds()
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (d.getFullYear() + '').substr(4 - RegExp.$1.length))
  }
  for (const k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
    }
  }
  return fmt
}

/**
 * 格式化价格（保留两位小数）
 */
function formatPrice(price) {
  return Number(price).toFixed(2)
}

/**
 * 生成订单号
 */
function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `MT${y}${m}${d}${h}${min}${s}${rand}`
}

/**
 * 计算两点距离（千米）
 */
function getDistance(lat1, lng1, lat2, lng2) {
  const radLat1 = lat1 * Math.PI / 180.0
  const radLat2 = lat2 * Math.PI / 180.0
  const a = radLat1 - radLat2
  const b = (lng1 * lng1) * Math.PI / 180.0 - (lng2 * lng2) * Math.PI / 180.0
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
  s = s * 6378.137
  s = Math.round(s * 10000) / 10000
  return s
}

/**
 * 格式化距离
 */
function formatDistance(km) {
  if (km < 1) {
    return Math.round(km * 1000) + 'm'
  }
  return km.toFixed(1) + 'km'
}

/**
 * 显示Toast提示
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

/**
 * 显示加载中
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

/**
 * 隐藏加载
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 确认弹窗
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#FF7A2E',
      success: (res) => resolve(res.confirm)
    })
  })
}

/**
 * 手机号验证
 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 获取状态文字
 */
function getStatusText(status) {
  const map = {
    'pending': '待确认',
    'confirmed': '已确认',
    'making': '制作中',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return map[status] || status
}

/**
 * 获取状态样式类
 */
function getStatusClass(status) {
  const map = {
    'pending': 'tag-warning',
    'confirmed': 'tag',
    'making': 'tag',
    'completed': 'tag-success',
    'cancelled': 'tag-danger'
  }
  return map[status] || 'tag'
}

/**
 * 获取地址标签文字
 */
function getTagText(tag) {
  const map = {
    'home': '家',
    'company': '公司',
    'school': '学校',
    'other': '其他'
  }
  return map[tag] || '其他'
}

/**
 * 获取杯型文字
 */
function getCupSizeText(size) {
  const map = {
    'large': '大杯',
    'medium': '中杯',
    'small': '小杯'
  }
  return map[size] || size
}

/**
 * 获取温度文字
 */
function getTemperatureText(temp) {
  const map = {
    'standard_ice': '标准冰',
    'less_ice': '少冰',
    'no_ice': '去冰',
    'hot': '热'
  }
  return map[temp] || temp
}

/**
 * 获取甜度文字
 */
function getSweetnessText(sweet) {
  const map = {
    'standard': '标准糖',
    'less': '少糖',
    'half': '半糖',
    'light': '微糖',
    'none': '不额外加糖'
  }
  return map[sweet] || sweet
}

/**
 * 获取性别文字
 */
function getGenderText(gender) {
  return gender === 'male' ? '先生' : '女士'
}

module.exports = {
  formatTime,
  formatPrice,
  generateOrderNo,
  getDistance,
  formatDistance,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  isValidPhone,
  getStatusText,
  getStatusClass,
  getTagText,
  getCupSizeText,
  getTemperatureText,
  getSweetnessText,
  getGenderText
}
