// pages/cardlist/cardlist.js
Page({
  data: {
    navHeight: 0,
    shopName: '奶茶店',
    loading: false,
    loadingMore: false,
    cartList: [],
    shopGroups: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    allSelected: false,
    selectedTotalPrice: '0.00',
    selectedCount: 0,
    showClearConfirm: false,
    showEditModal: false,
    editCartId: null,
    editProduct: {
      name: '',
      image: '',
      specs: []
    },
    editQuantity: 1,
    editSpecIndex: 0,
    editRemark: '',
    editTemperatureOptions: [
      { value: 'hot', label: '热饮' },
      { value: 'standard_ice', label: '标准冰' },
      { value: 'less_ice', label: '少冰' },
      { value: 'no_ice', label: '去冰' }
    ],
    editTemperatureIndex: 0,
    editTemperatureText: '',
    editSweetnessOptions: [
      { value: 'standard', label: '标准糖' },
      { value: 'less', label: '少糖' },
      { value: 'half', label: '半糖' },
      { value: 'light', label: '微糖' },
      { value: 'none', label: '不额外加糖' }
    ],
    editSweetnessIndex: 2,
    editSweetnessText: '',
    editCupSizes: [],
    editSelectedCupSize: '',
    editSelectedCupPrice: 0,
    editTemperature: '',
    editSweetness: '',
  },

  onLoad() {
    this.loadCartList();
    this.getShopInfo();
  },

  onShow() {
    this.loadCartList(true);
  },

  onNavHeightChange(e) {
    this.setData({
      navHeight: e.detail.totalHeight || e.detail.height || 64
    });
  },

  getShopInfo() {
    const app = getApp();
    this.setData({
      shopName: app.globalData.shopName || '奶茶店'
    });
  },

  /**
   * 调用云函数
   */
  async callCartCloudFunction(action, data = {}) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'cartManager',
        data: { action, data }
      });
      
      console.log(`云函数 ${action} 返回结果:`, res);
      
      if (res.result && res.result.code === 200) {
        return res.result;
      } else {
        wx.showToast({
          title: res.result?.message || '操作失败',
          icon: 'none'
        });
        return null;
      }
    } catch (error) {
      console.error('云函数调用失败', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
      return null;
    }
  },

  /**
   * 加载购物车列表
   */
  async loadCartList(refresh = false) {
    if (this.data.loading) return;
  
    if (refresh) {
      this.setData({
        cartList: [],
        shopGroups: [],
        page: 1,
        hasMore: true,
        loading: true
      });
    } else {
      if (!this.data.hasMore || this.data.loadingMore) return;
      this.setData({ loadingMore: true });
    }
  
    const page = refresh ? 1 : this.data.page;
    const result = await this.callCartCloudFunction('getCartList', {
      page: page,
      pageSize: this.data.pageSize
    });
  
    console.log("云函数返回结果:", result);
  
    this.setData({ loading: false, loadingMore: false });
  
    if (result && result.code === 200 && result.data && result.data.list) {
      const resList = result.data.list;
      
      // 去重并合并数据
      let newList;
      if (refresh) {
        newList = resList;
      } else {
        // 使用 Map 去重，保留最新的
        const itemMap = new Map();
        // 注意：先添加旧数据，再添加新数据，这样新数据会覆盖旧数据（如果需要更新的话）
        [...this.data.cartList, ...resList].forEach(item => {
          if (itemMap.has(item._id)) {
            console.log(`发现重复商品 ID: ${item._id}，已更新为最新数据`);
          }
          itemMap.set(item._id, item);
        });
        newList = Array.from(itemMap.values());
      }
      
      // 确保每个商品都有 selected 属性，默认为 true
      newList = newList.map(item => ({
        ...item,
        selected: true
      }));
      
      // 重新分组
      const shopGroups = this.groupCartByShop(newList);
      
      // 更新数据
      this.setData({
        cartList: newList,
        shopGroups: shopGroups,
        page: page + 1,
        hasMore: result.data.hasMore || false
      }, () => {
        // 计算总价和选中数量
        this.calculateSelectedTotal();
        // 更新全选状态（如果所有商品都选中，allSelected 会变成 true）
        this.updateAllSelectedStatus();
        
        console.log('数据加载完成，当前全选状态:', this.data.allSelected);
        console.log('选中商品数量:', this.data.selectedCount);
        console.log('商品总数:', this.data.cartList.length);
      });
    }
  },

  /**
   * 按店铺分组购物车
   */
  groupCartByShop(cartList) {
    const groups = {};
    cartList.forEach(item => {
      if (!groups[item.shopId]) {
        groups[item.shopId] = {
          shopId: item.shopId,
          shopName: item.shopName || '未知店铺',
          items: []
        };
      }
      groups[item.shopId].items.push(item);
    });
    return Object.values(groups);
  },

  /**
   * 加载更多
   */
  loadMore() {
    if (this.data.hasMore && !this.data.loadingMore && !this.data.loading) {
      this.loadCartList(false);
    }
  },

  /**
   * 计算选中商品的总价和数量
   */
  calculateSelectedTotal() {
    const selectedItems = this.data.cartList.filter(item => item.selected === true);
    const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    const selectedTotalPrice = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    console.log('选中商品数量:', selectedCount);
    console.log('选中商品总价:', selectedTotalPrice);

    this.setData({
      selectedCount,
      selectedTotalPrice: selectedTotalPrice.toFixed(2)
    });
  },

  /**
   * 更新全选状态
   */
  updateAllSelectedStatus() {
    if (this.data.cartList.length === 0) {
      this.setData({ allSelected: false });
      return;
    }
    const allSelected = this.data.cartList.every(item => item.selected === true);
    this.setData({ allSelected });
  },

  /**
   * 单选/取消选中
   */
  async toggleSelect(e) {
    const { id } = e.currentTarget.dataset;
    console.log('切换选中状态, id:', id);
    
    const cartList = this.data.cartList;
    const index = cartList.findIndex(item => item._id === id);
    
    if (index !== -1) {
      const newSelected = !cartList[index].selected;
      
      // 更新本地状态
      cartList[index].selected = newSelected;
      // 同时更新 shopGroups
      const shopGroups = this.groupCartByShop(cartList);
      
      this.setData({ cartList, shopGroups });
      this.calculateSelectedTotal();
      this.updateAllSelectedStatus();
      
      // 更新云数据库
      await this.callCartCloudFunction('selectCheckout', {
        cartIds: [id],
        selected: newSelected
      });
    }
  },

  /**
   * 全选/取消全选
   */
  async toggleSelectAll() {
    const allSelected = !this.data.allSelected;
    const cartIds = this.data.cartList.map(item => item._id);
    const cartList = this.data.cartList.map(item => ({
      ...item,
      selected: allSelected
    }));
    
    // 同时更新 shopGroups
    const shopGroups = this.groupCartByShop(cartList);
    
    this.setData({ cartList, shopGroups, allSelected });
    this.calculateSelectedTotal();
    
    await this.callCartCloudFunction('selectCheckout', {
      cartIds: cartIds,
      selected: allSelected
    });
  },

  /**
   * 增加数量
   */
  async increaseQuantity(e) {
    const { id, index } = e.currentTarget.dataset;
    console.log('增加数量 - id:', id, 'index:', index);
    
    const cartList = this.data.cartList;
    const cartIndex = cartList.findIndex(item => item._id === id);
    
    if (cartIndex === -1) {
      console.error('找不到商品:', id);
      return;
    }
    
    const item = cartList[cartIndex];
    const newQuantity = item.quantity + 1;
    await this.updateCartQuantity(id, newQuantity, cartIndex);
  },

  /**
   * 减少数量
   */
  async decreaseQuantity(e) {
    const { id, index } = e.currentTarget.dataset;
    console.log('减少数量 - id:', id, 'index:', index);
    
    const cartList = this.data.cartList;
    const cartIndex = cartList.findIndex(item => item._id === id);
    
    if (cartIndex === -1) {
      console.error('找不到商品:', id);
      return;
    }
    
    const item = cartList[cartIndex];
    
    if (item.quantity <= 1) {
      this.deleteCartItem(e);
      return;
    }

    const newQuantity = item.quantity - 1;
    await this.updateCartQuantity(id, newQuantity, cartIndex);
  },

  /**
   * 更新购物车数量
   */
  async updateCartQuantity(cartId, quantity, cartIndex) {
    const originalQuantity = this.data.cartList[cartIndex].quantity;
    
    // 立即更新本地数据
    const cartList = this.data.cartList;
    cartList[cartIndex].quantity = quantity;
    const shopGroups = this.groupCartByShop(cartList);
    
    this.setData({ cartList, shopGroups });
    this.calculateSelectedTotal();
    
    try {
      const res = await this.callCartCloudFunction('updateQuantity', { 
        cartId: cartId, 
        quantity: quantity
      });
      
      if (!res || res.code !== 200) {
        // 回滚数据
        cartList[cartIndex].quantity = originalQuantity;
        const rollbackGroups = this.groupCartByShop(cartList);
        this.setData({ cartList, shopGroups: rollbackGroups });
        this.calculateSelectedTotal();
        wx.showToast({ title: res?.message || '更新失败', icon: 'none', duration: 1000 });
      }
    } catch (error) {
      // 回滚数据
      cartList[cartIndex].quantity = originalQuantity;
      const rollbackGroups = this.groupCartByShop(cartList);
      this.setData({ cartList, shopGroups: rollbackGroups });
      this.calculateSelectedTotal();
      wx.showToast({ title: '网络错误', icon: 'none', duration: 1000 });
    }
  },

  /**
   * 删除购物车项
   */
  async deleteCartItem(e) {
    const { id, index } = e.currentTarget.dataset;
    console.log('删除商品 - id:', id, 'index:', index);

    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: async (res) => {
        if (res.confirm) {
          const result = await this.callCartCloudFunction('deleteCartItem', { cartId: id });
          if (result && result.code === 200) {
            const cartList = this.data.cartList.filter(item => item._id !== id);
            const shopGroups = this.groupCartByShop(cartList);
            
            this.setData({ cartList, shopGroups });
            this.calculateSelectedTotal();
            this.updateAllSelectedStatus();
            
            wx.showToast({ title: '删除成功', icon: 'success' });
          }
        }
      }
    });
  },

  /**
   * 显示清空确认弹窗
   */
  showClearDialog() {
    this.setData({ showClearConfirm: true });
  },

  /**
   * 确认清空
   */
  async confirmClear() {
    this.setData({ showClearConfirm: false });
    
    const result = await this.callCartCloudFunction('clearCart');
    if (result && result.code === 200) {
      this.setData({
        cartList: [],
        shopGroups: [],
        selectedCount: 0,
        selectedTotalPrice: '0.00',
        allSelected: false
      });
      wx.showToast({ title: '清空成功', icon: 'success' });
    }
  },

  /**
   * 取消清空
   */
  cancelClear() {
    this.setData({ showClearConfirm: false });
  },

 /**
 * 去结算
 */
async checkout() {
  console.log('========== 开始结算 ==========');
  console.log('当前 cartList 数据:', this.data.cartList);
  
  const selectedItems = this.data.cartList.filter(item => item.selected === true);
  
  console.log('选中的商品数量:', selectedItems.length);
  console.log('选中的商品:', selectedItems);
  
  // 1. 检查是否选中了商品
  if (selectedItems.length === 0) {
    wx.showToast({
      title: '请选择要结算的商品',
      icon: 'none'
    });
    return;
  }
  
  // 2. 检查是否选择了多个不同店铺的商品
  const shopIds = [...new Set(selectedItems.map(item => item.shopId))];
  
  if (shopIds.length > 1) {
    wx.showToast({
      title: '只能选择一个店铺的商品结算',
      icon: 'none',
      duration: 2000
    });
    console.log('选中了多个店铺，shopIds:', shopIds);
    return;
  }
  
  // 3. 获取选中的店铺信息
  const selectedShopId = shopIds[0];
  const selectedShop = selectedItems[0];
  
  console.log('选中的店铺ID:', selectedShopId);
  console.log('选中的店铺名称:', selectedShop.shopName);
  
  // 4. 存储选中的商品到全局
  const app = getApp();
  if (!app.globalData) {
    app.globalData = {};
  }
  
  app.globalData.checkoutList = selectedItems;
  app.globalData.orderType = 'delivery';  // 外卖配送
  app.globalData.currentShop = {
    name: selectedShop.shopName,
    id: selectedShop.shopId
  };
  
  console.log('存储后 app.globalData.checkoutList:', app.globalData.checkoutList);
  
  // 5. 跳转到结算页面，传递 shopId 和 orderType
  wx.navigateTo({
    url: `/pages/checkout/checkout?shopId=${selectedShopId}&orderType=delivery`,
    fail: (err) => {
      console.error('跳转失败:', err);
      // 跳转失败时使用备用方案
      this.checkoutWithUrlParams(selectedItems, selectedShopId);
    }
  });
},
  /**
   * 备用方案：通过 URL 参数传递
   */
  checkoutWithUrlParams(selectedItems) {
    const data = encodeURIComponent(JSON.stringify(selectedItems));
    wx.navigateTo({
      url: `/pages/checkout/checkout?cartData=${data}`
    });
  },

  /**
   * 编辑购物车商品
   */
  onEditCartItem(e) {
    const item = e.currentTarget.dataset.item;
    console.log('编辑商品', item);
    
    const specPicker = this.selectComponent('#specPicker');
    
    if (!specPicker) {
      console.error('❌ 找不到 specPicker 组件');
      wx.showToast({ title: '组件未找到', icon: 'none' });
      return;
    }
    
    const drink = {
      _id: item.productId,
      name: item.productName,
      image: item.productImage,
      price: item.price,
      cupSizes: item.cupSizes || ['small', 'medium', 'large'],
      temperatures: item.temperatures || ['standard_ice', 'less_ice', 'no_ice', 'hot'],
      sweetnesses: item.sweetnesses || ['standard', 'less', 'half', 'light', 'none']
    };
    
    specPicker.showForEdit(drink, item.shopId, item.shopName, item);
  },

  onSpecClose() {
    console.log('规格选择器关闭');
  },

  onSpecAdd(e) {
    console.log('添加成功', e.detail);
    this.loadCartList(true);
  },

  async updateCartInfo() {
    try {
      const result = await this.callCartCloudFunction('getCartCount', {
        shopId: this.data.shopId
      });
      if (result && result.code === 200) {
        const { count, total } = result.data;
        this.setData({ 
          cartCount: count, 
          cartTotal: total.toFixed(2) 
        });
      }
    } catch (error) {
      console.error('获取购物车信息失败', error);
    }
  },

  async getProductDetail(productId) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('drinks').doc(productId).get();
      return res.data || {};
    } catch (error) {
      console.error('获取商品详情失败', error);
      return {};
    }
  },

  onEditCupSizeChange(e) {
    const { key, price } = e.currentTarget.dataset;
    this.setData({
      editSelectedCupSize: key,
      editSelectedCupPrice: parseFloat(price)
    });
  },

  onEditTemperatureChange(e) {
    const { value, label } = e.currentTarget.dataset;
    this.setData({
      editTemperature: value,
      editTemperatureText: label
    });
  },

  onEditSweetnessChange(e) {
    const { value, label } = e.currentTarget.dataset;
    this.setData({
      editSweetness: value,
      editSweetnessText: label
    });
  },

  async saveEditCart() {
    const { 
      editCartId, editQuantity, editSelectedCupSize, editSelectedCupPrice,
      editTemperature, editTemperatureText, editSweetness, editSweetnessText, editRemark
    } = this.data;
    
    wx.showLoading({ title: '保存中...' });
    
    const cupSizeOption = this.data.editCupSizes.find(c => c.key === editSelectedCupSize);
    
    if (cupSizeOption) {
      await this.callCartCloudFunction('updateSpec', {
        cartId: editCartId,
        specId: editSelectedCupSize,
        specName: cupSizeOption.name,
        price: editSelectedCupPrice
      });
    }
    
    await this.callCartCloudFunction('updateQuantity', {
      cartId: editCartId,
      quantity: editQuantity
    });
    
    if (editTemperature) {
      await this.callCartCloudFunction('updateTemperature', {
        cartId: editCartId,
        temperature: editTemperature,
        temperatureText: editTemperatureText || ''
      });
    }
    
    if (editSweetness) {
      await this.callCartCloudFunction('updateSweetness', {
        cartId: editCartId,
        sweetness: editSweetness,
        sweetnessText: editSweetnessText || ''
      });
    }
    
    if (editRemark !== undefined) {
      await this.callCartCloudFunction('updateRemark', {
        cartId: editCartId,
        remark: editRemark
      });
    }
    
    wx.hideLoading();
    wx.showToast({ title: '保存成功', icon: 'success' });
    
    this.setData({ showEditModal: false });
    this.loadCartList(true);
  },

  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  editIncreaseQuantity() {
    this.setData({ editQuantity: this.data.editQuantity + 1 });
  },

  editDecreaseQuantity() {
    if (this.data.editQuantity <= 1) return;
    this.setData({ editQuantity: this.data.editQuantity - 1 });
  },

  onEditSpecChange(e) {
    this.setData({ editSpecIndex: e.detail.value });
  },

  onEditRemarkInput(e) {
    this.setData({ editRemark: e.detail.value });
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  preventTap() {}
});