Component({
  properties: {
    show: { type: Boolean, value: false },
    drink: { type: Object, value: {} },
    shopId: { type: String, value: '' },
    shopName: { type: String, value: '' }
  },

  data: {
    // 选中的规格
    cupSize: null,
    temperature: null,
    sweetness: null,
    quantity: 1,
    displayPrice: '0.00',
    
    // 实际显示的规格选项（根据饮品过滤后）
    cupSizes: [],
    temperatures: [],
    sweetnesses: [],
    
    // 编辑模式相关
    isEditMode: false,
    editCartId: null
  },

  observers: {
    'show': function(val) {
      if (val && this.data.drink) {
        this.initSpecOptions();
        if (!this.data.isEditMode) {
          this.setData({ quantity: 1 });
        }
        this._calcPrice();
      }
    },
    'drink': function(drink) {
      if (this.data.show && drink) {
        this.initSpecOptions();
        this._calcPrice();
      }
    }
  },

  methods: {
    // 阻止事件冒泡，防止点击弹窗内容时关闭
    preventTap() {
      return;
    },
    
    // 外部调用的显示方法（新增模式）
    show(drink, shopId, shopName) {
      console.log('spec-picker show 被调用:', drink);
      console.log('店铺信息:', shopId, shopName);
      
      this.setData({
        show: true,
        drink: drink,
        shopId: shopId || this.properties.shopId,
        shopName: shopName || this.properties.shopName,
        isEditMode: false,
        editCartId: null,
        quantity: 1
      });
    },
    
    // 新增：编辑模式的显示方法
    showForEdit(drink, shopId, shopName, editItem) {
      console.log('spec-picker showForEdit 被调用:', editItem);
      console.log('编辑商品信息:', editItem);
      
      // 获取当前商品当前的规格索引
      let cupSizeIndex = 0;
      let temperatureIndex = 0;
      let sweetnessIndex = 0;
      
      if (drink.cupSizes && drink.cupSizes.length > 0) {
        cupSizeIndex = drink.cupSizes.findIndex(c => 
          (c.key === editItem.specId) || (c.size === editItem.specId)
        );
        if (cupSizeIndex === -1) cupSizeIndex = 0;
      }
      
      if (drink.temperatures && drink.temperatures.length > 0) {
        temperatureIndex = drink.temperatures.findIndex(t => 
          (t.value === editItem.temperature) || (t.key === editItem.temperature)
        );
        if (temperatureIndex === -1) temperatureIndex = 0;
      }
      
      if (drink.sweetnesses && drink.sweetnesses.length > 0) {
        sweetnessIndex = drink.sweetnesses.findIndex(s => 
          (s.value === editItem.sweetness) || (s.key === editItem.sweetness)
        );
        if (sweetnessIndex === -1) sweetnessIndex = 0;
      }
      
      // 获取默认规格的 key
      const defaultCupSize = drink.cupSizes && drink.cupSizes[cupSizeIndex] 
        ? (drink.cupSizes[cupSizeIndex].key || drink.cupSizes[cupSizeIndex].size) 
        : 'medium';
      const defaultTemperature = drink.temperatures && drink.temperatures[temperatureIndex] 
        ? (drink.temperatures[temperatureIndex].value || drink.temperatures[temperatureIndex].key) 
        : 'standard_ice';
      const defaultSweetness = drink.sweetnesses && drink.sweetnesses[sweetnessIndex] 
        ? (drink.sweetnesses[sweetnessIndex].value || drink.sweetnesses[sweetnessIndex].key) 
        : 'standard';
      
      this.setData({
        show: true,
        drink: drink,
        shopId: shopId || this.properties.shopId,
        shopName: shopName || this.properties.shopName,
        isEditMode: true,
        editCartId: editItem._id,
        quantity: editItem.quantity,
        cupSize: defaultCupSize,
        temperature: defaultTemperature,
        sweetness: defaultSweetness
      });
      
      // 重新初始化规格选项
      this.initSpecOptions(() => {
        // 回调中重新设置选中的规格
        this.setData({
          cupSize: defaultCupSize,
          temperature: defaultTemperature,
          sweetness: defaultSweetness
        });
        this._calcPrice();
      });
    },
    
    // 初始化规格选项（根据饮品的配置过滤）
    initSpecOptions(callback) {
      const drink = this.data.drink;
      if (!drink) {
        console.error('initSpecOptions: drink 为空');
        if (callback) callback();
        return;
      }
      
      console.log('========== initSpecOptions 开始 ==========');
      console.log('饮品名称:', drink.name);
      console.log('饮品的 cupSizes 原始数据:', drink.cupSizes);
      console.log('饮品的 temperatures 原始数据:', drink.temperatures);
      console.log('饮品的 sweetnesses 原始数据:', drink.sweetnesses);
      
      // ========== 处理杯型数据（支持对象数组格式） ==========
      let cupSizes = [];
      if (drink.cupSizes && Array.isArray(drink.cupSizes) && drink.cupSizes.length > 0) {
        if (typeof drink.cupSizes[0] === 'object') {
          console.log('杯型数据是对象数组格式，进行转换');
          cupSizes = drink.cupSizes.map(item => ({
            key: item.size || item.key,
            text: item.name,
            extra: item.extraPrice > 0 ? `+¥${item.extraPrice}` : '',
            extraPrice: item.extraPrice || 0
          }));
        } else {
          cupSizes = drink.cupSizes.map(key => ({
            key: key,
            text: this.getCupSizeText(key),
            extra: this.getCupSizeExtra(key),
            extraPrice: this.getCupSizeExtraPrice(key)
          }));
        }
      }
      
      if (cupSizes.length === 0) {
        console.log('使用默认杯型数据');
        cupSizes = [
          { key: 'small', text: '小杯', extra: '', extraPrice: 0 },
          { key: 'medium', text: '中杯', extra: '', extraPrice: 0 },
          { key: 'large', text: '大杯', extra: '+¥2', extraPrice: 2 }
        ];
      }
      
      // ========== 处理温度数据 ==========
      let temperatures = [];
      if (drink.temperatures && Array.isArray(drink.temperatures) && drink.temperatures.length > 0) {
        if (typeof drink.temperatures[0] === 'object') {
          temperatures = drink.temperatures.map(item => ({
            key: item.value || item.key,
            text: item.name || item.label
          }));
        } else {
          temperatures = drink.temperatures.map(key => ({
            key: key,
            text: this.getTemperatureText(key)
          }));
        }
      }
      
      if (temperatures.length === 0) {
        temperatures = [
          { key: 'standard_ice', text: '标准冰' },
          { key: 'less_ice', text: '少冰' },
          { key: 'no_ice', text: '去冰' },
          { key: 'hot', text: '热' }
        ];
      }
      
      // ========== 处理甜度数据 ==========
      let sweetnesses = [];
      if (drink.sweetnesses && Array.isArray(drink.sweetnesses) && drink.sweetnesses.length > 0) {
        if (typeof drink.sweetnesses[0] === 'object') {
          sweetnesses = drink.sweetnesses.map(item => ({
            key: item.value || item.key,
            text: item.name || item.label
          }));
        } else {
          sweetnesses = drink.sweetnesses.map(key => ({
            key: key,
            text: this.getSweetnessText(key)
          }));
        }
      }
      
      if (sweetnesses.length === 0) {
        sweetnesses = [
          { key: 'standard', text: '标准糖' },
          { key: 'less', text: '少糖' },
          { key: 'half', text: '半糖' },
          { key: 'light', text: '微糖' },
          { key: 'none', text: '不额外加糖' }
        ];
      }
      
      console.log('转换后的 cupSizes:', cupSizes);
      console.log('转换后的 temperatures:', temperatures);
      console.log('转换后的 sweetnesses:', sweetnesses);
      
      // 设置默认选中的规格（第一个可选项）
      const defaultCupSize = cupSizes.length > 0 ? cupSizes[0].key : null;
      const defaultTemperature = temperatures.length > 0 ? temperatures[0].key : null;
      const defaultSweetness = sweetnesses.length > 0 ? sweetnesses[0].key : null;
      
      this.setData({
        cupSizes,
        temperatures,
        sweetnesses,
        cupSize: this.data.cupSize || defaultCupSize,
        temperature: this.data.temperature || defaultTemperature,
        sweetness: this.data.sweetness || defaultSweetness
      }, () => {
        console.log('setData 完成，当前 cupSizes:', this.data.cupSizes);
        if (callback) callback();
      });
    },
    
    // 获取杯型显示文本（辅助方法）
    getCupSizeText(key) {
      const map = { small: '小杯', medium: '中杯', large: '大杯' };
      return map[key] || key;
    },
    
    getCupSizeExtra(key) {
      const map = { small: '', medium: '', large: '+¥2' };
      return map[key] || '';
    },
    
    getCupSizeExtraPrice(key) {
      const map = { small: 0, medium: 0, large: 2 };
      return map[key] || 0;
    },
    
    getTemperatureText(key) {
      const map = {
        standard_ice: '标准冰',
        less_ice: '少冰',
        no_ice: '去冰',
        hot: '热'
      };
      return map[key] || key;
    },
    
    getSweetnessText(key) {
      const map = {
        standard: '标准糖',
        less: '少糖',
        half: '半糖',
        light: '微糖',
        none: '不额外加糖'
      };
      return map[key] || key;
    },
    
    // 计算价格
    _calcPrice() {
      const drink = this.data.drink;
      if (!drink || !drink.price) return;
      
      const basePrice = Number(drink.price) || 0;
      
      let cupExtra = 0;
      const selectedCup = this.data.cupSizes.find(opt => opt.key === this.data.cupSize);
      if (selectedCup && selectedCup.extraPrice) {
        cupExtra = selectedCup.extraPrice;
      }

      console.log("规格：" + this.data.cupSizes)
      console.log("额外价格：" + cupExtra);
      
      const unitPrice = basePrice + cupExtra;
      const total = unitPrice * this.data.quantity;
      this.setData({ displayPrice: total.toFixed(2) });
    },
    
    // 选择杯型
    selectCupSize(e) { 
      const key = e.currentTarget.dataset.key;
      console.log('选择杯型:', key);
      this.setData({ cupSize: key }, () => this._calcPrice());
    },
    
    // 选择温度
    selectTemperature(e) { 
      const key = e.currentTarget.dataset.key;
      console.log('选择温度:', key);
      this.setData({ temperature: key });
    },
    
    // 选择甜度
    selectSweetness(e) { 
      const key = e.currentTarget.dataset.key;
      console.log('选择甜度:', key);
      this.setData({ sweetness: key });
    },
    
    // 减少数量
    minus() {
      if (this.data.quantity > 1) {
        this.setData({ quantity: this.data.quantity - 1 }, () => this._calcPrice());
      }
    },
    
    // 增加数量
    plus() {
      this.setData({ quantity: this.data.quantity + 1 }, () => this._calcPrice());
    },
    
    // 关闭弹窗
    onClose() { 
      console.log('关闭弹窗');
      this.setData({ 
        show: false,
        isEditMode: false,
        editCartId: null
      });
      this.triggerEvent('close');
    },
    
    // 调用云函数
    async callCartCloudFunction(action, data = {}) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'cartManager',
          data: { action, data }
        });
        return res.result;
      } catch (error) {
        console.error(`云函数调用失败 [${action}]:`, error);
        return { code: 500, message: error.message };
      }
    },
    
    // 更新购物车商品（编辑模式）
    async updateCartItem() {
      const { 
        editCartId, shopId, drink, 
        cupSize, temperature, sweetness, quantity 
      } = this.data;
      
      const cupSizeOption = this.data.cupSizes.find(opt => opt.key === cupSize);
      const temperatureOption = this.data.temperatures.find(opt => opt.key === temperature);
      const sweetnessOption = this.data.sweetnesses.find(opt => opt.key === sweetness);
      
      const cupSizeLabel = cupSizeOption?.text || '';
      const temperatureLabel = temperatureOption?.text || '';
      const sweetnessLabel = sweetnessOption?.text || '';
      
      const basePrice = Number(drink.price) || 0;
      const cupExtra = cupSizeOption?.extraPrice || 0;
      const unitPrice = basePrice + cupExtra;
      
      wx.showLoading({ title: '更新中...' });
      
      // 更新规格
      if (cupSizeOption) {
        await this.callCartCloudFunction('updateSpec', {
          cartId: editCartId,
          cupSize: cupSize,
          cupSizeLabel: cupSizeLabel,
          price: unitPrice
        });
      }
      
      // 更新数量
      await this.callCartCloudFunction('updateQuantity', {
        cartId: editCartId,
        quantity: quantity
      });
      
      // 更新温度
      if (temperature) {
        await this.callCartCloudFunction('updateTemperature', {
          cartId: editCartId,
          temperature: temperature,
          temperatureText: temperatureLabel
        });
      }
      
      // 更新甜度
      if (sweetness) {
        await this.callCartCloudFunction('updateSweetness', {
          cartId: editCartId,
          sweetness: sweetness,
          sweetnessText: sweetnessLabel
        });
      }
      
      wx.hideLoading();
      wx.showToast({ title: '更新成功', icon: 'success' });
      
      this.triggerEvent('add', { success: true, shopId: shopId });
      this.triggerEvent('close');
      this.setData({ show: false, isEditMode: false });
    },
    
    // 加入购物车（新增模式）
    async addToCart() {
      const { drink, shopId, shopName, cupSize, temperature, sweetness, quantity } = this.data;
      
      if (!shopId) {
        wx.showToast({ title: '店铺信息错误', icon: 'none' });
        return;
      }
      
      const cupSizeOption = this.data.cupSizes.find(opt => opt.key === cupSize);
      const temperatureOption = this.data.temperatures.find(opt => opt.key === temperature);
      const sweetnessOption = this.data.sweetnesses.find(opt => opt.key === sweetness);
      
      const cupSizeLabel = cupSizeOption?.text || '';
      const temperatureLabel = temperatureOption?.text || '';
      const sweetnessLabel = sweetnessOption?.text || '';
      
      const basePrice = Number(drink.price) || 0;
      const cupExtra = cupSizeOption?.extraPrice || 0;
      const unitPrice = basePrice + cupExtra;
      
      wx.showLoading({ title: '添加中...' });
      
      const result = await this.callCartCloudFunction('addToCart', {
        shopId: shopId,
        shopName: shopName,
        productId: drink._id,
        productName: drink.name,
        productImage: drink.image || '/images/drink-placeholder.png',
        cupSize: cupSize,
        cupSizeLabel: cupSizeLabel,
        price: unitPrice,
        temperature: temperature,
        temperatureText: temperatureLabel,
        sweetness: sweetness,
        sweetnessText: sweetnessLabel,
        quantity: quantity,
        remark: ''
      });
      
      wx.hideLoading();
      
      if (result && result.code === 200) {
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        this.triggerEvent('add', { success: true, shopId: shopId });
        this.triggerEvent('close');
        this.setData({ show: false });
      } else {
        wx.showToast({ title: result?.message || '添加失败', icon: 'none' });
      }
    },
    
    // 加入购物车入口（根据模式选择方法）
    async onAdd() {
      if (this.data.isEditMode) {
        await this.updateCartItem();
      } else {
        await this.addToCart();
      }
    }
  }
});