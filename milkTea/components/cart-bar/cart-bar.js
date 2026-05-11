Component({
  properties: {
    count: { type: Number, value: 0 },
    total: { type: Number, value: 0 }
  },
  observers: {
    'total': function(val) {
      this.setData({ displayTotal: Number(val || 0).toFixed(2) })
    }
  },
  methods: {
    onCartTap() { this.triggerEvent('cart') },
    onCheckoutTap() { this.triggerEvent('checkout') }
  }
})
