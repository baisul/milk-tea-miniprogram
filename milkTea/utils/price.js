// utils/price.js
/**
 * 格式化价格输入
 * @param {string} value - 输入的值
 * @returns {string} 格式化后的价格
 */
function formatPriceInput(value) {
  // 移除开头的0
  if (value.startsWith('0') && !value.startsWith('0.')) {
    value = value.replace(/^0+/, '')
    if (value === '') value = '0'
  }
  
  // 只允许数字和小数点
  value = value.replace(/[^\d.]/g, '')
  
  // 确保只有一个小数点
  const dotCount = (value.match(/\./g) || []).length
  if (dotCount > 1) {
    value = value.substring(0, value.lastIndexOf('.'))
  }
  
  // 限制小数点后两位
  if (value.includes('.')) {
    const parts = value.split('.')
    if (parts[1].length > 2) {
      const rounded = parseFloat(value).toFixed(2)
      value = rounded
    }
  }
  
  return value
}

/**
 * 价格显示格式化
 * @param {number} priceFen - 分
 * @returns {string} 格式化后的元
 */
function formatPriceDisplay(priceFen) {
  if (!priceFen && priceFen !== 0) return '0.00'
  return (priceFen / 100).toFixed(2)
}

/**
 * 价格保存格式化
 * @param {string} priceYuan - 元
 * @returns {number} 分
 */
function formatPriceSave(priceYuan) {
  const priceValue = parseFloat(priceYuan)
  if (isNaN(priceValue)) return 0
  return Math.round(priceValue * 100)
}

module.exports = {
  formatPriceInput,
  formatPriceDisplay,
  formatPriceSave
}