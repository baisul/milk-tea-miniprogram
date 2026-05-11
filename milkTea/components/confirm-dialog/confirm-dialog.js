Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '提示' },
    content: { type: String, value: '' },
    confirmText: { type: String, value: '确定' },
    cancelText: { type: String, value: '取消' },
    confirmColor: { type: String, value: '#FF7A2E' },
    danger: { type: Boolean, value: false }
  },
  methods: {
    onConfirm() { this.triggerEvent('confirm') },
    onCancel() { this.triggerEvent('cancel') }
  }
})
