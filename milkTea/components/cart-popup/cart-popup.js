// components/cart-popup/cart-popup.js
Component({
  properties: {
    shopId: { type: String, value: '' },
    shopName: { type: String, value: '' },
    deliveryFee: { type: String, value: '0.00' }
  },

  data: {
    show: false,
    loading: false,
    loadingMore: false,
    cartList: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    allSelected: false,
    selectedTotalPrice: '0.00',
    selectedCount: 0
  },

  methods: {
    // 显示弹框
    show() {
      this.setData({ show: true });
      this.loadCartList(true);
    },

    // 关闭弹框
    hide() {
      this.setData({ show: false });
    },

    onClose() {
      this.hide();
    },

    preventTap() {},

    /**
     * 调用云函数
     */
    async callCartCloudFunction(action, data = {}) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'cartManager',
          data: { action, data }
        });
        console.log(`云函数 ${action} 返回:`, res);
        if (res.result && res.result.code === 200) {
          return res.result;  // 返回完整的 result，包含 code 和 message
        }
        return null;
      } catch (error) {
        console.error('云函数调用失败', error);
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
        pageSize: this.data.pageSize,
        shopId: this.properties.shopId
      });

      this.setData({ loading: false, loadingMore: false });

      if (result && result.code === 200 && result.data.list) {
        const resList = result.data.list;
        let newList = refresh ? resList : [...this.data.cartList, ...resList];
        newList = newList.map(item => ({
          ...item,
          selected: item.selected !== undefined ? item.selected : true
        }));

        this.setData({
          cartList: newList,
          page: page + 1,
          hasMore: result.hasMore || false
        });

        this.calculateSelectedTotal();
        this.updateAllSelectedStatus();
      }
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
      const cartList = this.data.cartList;
      const index = cartList.findIndex(item => item._id === id);

      if (index !== -1) {
        cartList[index].selected = !cartList[index].selected;
        this.setData({ cartList });
        this.calculateSelectedTotal();
        this.updateAllSelectedStatus();

        await this.callCartCloudFunction('selectCheckout', {
          cartIds: [id],
          selected: cartList[index].selected
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

      this.setData({ cartList, allSelected });
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
      console.log('=== 增加数量开始 ===');
      console.log('原始 quantity:', this.data.cartList[index]?.quantity);
      const item = this.data.cartList[index];
      const newQuantity = item.quantity + 1;

      await this.updateCartQuantity(id, newQuantity, index);
    },

    /**
     * 减少数量
     */
    async decreaseQuantity(e) {
      const { id, index } = e.currentTarget.dataset;
      const item = this.data.cartList[index];

      if (item.quantity <= 1) {
        this.deleteCartItem(e);
        return;
      }

      const newQuantity = item.quantity - 1;
      await this.updateCartQuantity(id, newQuantity, index);
    },

    /**
     * 删除购物车项
     */
    async deleteCartItem(e) {
      const { id, index } = e.currentTarget.dataset;

      wx.showModal({
        title: '提示',
        content: '确定要删除该商品吗？',
        success: async (res) => {
          if (res.confirm) {
            const result = await this.callCartCloudFunction('deleteCartItem', { cartId: id });
            if (result) {
              const cartList = this.data.cartList;
              cartList.splice(index, 1);
              this.setData({ cartList });
              this.calculateSelectedTotal();
              this.updateAllSelectedStatus();

              if (cartList.length === 0) {
                this.hide();
              }

              this.triggerEvent('refresh');
              wx.showToast({ title: '删除成功', icon: 'success' });
            }
          }
        }
      });
    },

/**
 * 更新购物车数量（乐观更新，无 loading）
 */
async updateCartQuantity(cartId, quantity, index) {
  // 1. 先保存原始数量（用于失败回滚）
  const originalQuantity = this.data.cartList[index].quantity;
  
  // 2. 立即更新本地数据（无 loading）
  const cartList = this.data.cartList;
  cartList[index].quantity = quantity;
  
  // 更新总价
  const totalPrice = cartList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  this.setData({
    cartList: cartList,
    selectedTotalPrice: totalPrice.toFixed(2)
  });
  
  this.calculateSelectedTotal();
  
  // 3. 后台静默调用云函数（不显示 loading）
  try {
    const res = await this.callCartCloudFunction('updateQuantity', { 
      cartId: cartId, 
      quantity: quantity
    });
    
    if (res && res.code === 200) {
      // 更新成功，刷新父组件数量
      this.triggerEvent('refresh');
    } else {
      // 更新失败，回滚数据
      cartList[index].quantity = originalQuantity;
      const rollbackPrice = cartList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      this.setData({
        cartList: cartList,
        selectedTotalPrice: rollbackPrice.toFixed(2)
      });
      this.calculateSelectedTotal();
      wx.showToast({ title: res?.message || '更新失败', icon: 'none', duration: 1000 });
    }
  } catch (error) {
    // 网络错误，回滚数据
    cartList[index].quantity = originalQuantity;
    const rollbackPrice = cartList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.setData({
      cartList: cartList,
      selectedTotalPrice: rollbackPrice.toFixed(2)
    });
    this.calculateSelectedTotal();
    wx.showToast({ title: '网络错误', icon: 'none', duration: 1000 });
  }
},
    /**
     * 清空购物车
     */
    async clearCart() {
      wx.showModal({
        title: '提示',
        content: '确定要清空购物车吗？',
        success: async (res) => {
          if (res.confirm) {
            const result = await this.callCartCloudFunction('clearCart');
            if (result) {
              this.setData({ cartList: [], selectedCount: 0, selectedTotalPrice: '0.00', allSelected: false });
              this.hide();
              this.triggerEvent('refresh');
              wx.showToast({ title: '清空成功', icon: 'success' });
            }
          }
        }
      });
    },

    /**
     * 编辑商品（点击图片或名称）
     */
    editCartItem(e) {
      const item = e.currentTarget.dataset.item;
      this.triggerEvent('edit', { item });
    },

/**
 * 去结算
 */
  onCheckout() {
  console.log('========== 购物车弹框去结算 ==========');
  const selectedItems = this.data.cartList.filter(item => item.selected === true);
  console.log('选中的商品数量:', selectedItems.length);
  
  if (selectedItems.length === 0) {
    wx.showToast({ title: '请选择要结算的商品', icon: 'none' });
    return;
  }
  
  // 触发父组件的 checkout 事件
  this.triggerEvent('checkout', { items: selectedItems });
  this.hide();
},

    /**
     * 刷新购物车（外部调用）
     */
    refresh() {
      this.loadCartList(true);
    }
  }
});