Component({
  properties: {
    drink: { type: Object, value: {} }
  },
  methods: {
    onAddTap() {
      this.triggerEvent('add', { drink: this.data.drink })
    }
  }
})
