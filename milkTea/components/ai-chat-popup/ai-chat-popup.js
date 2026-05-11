Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(newVal, oldVal) {
        console.log('弹窗状态变化:', oldVal, '->', newVal);
        // 通知父组件弹窗状态变化
        this.triggerEvent('stateChange', { show: newVal });
      }
    }
  },

  methods: {
    // 点击遮罩层关闭
    onMaskClick() {
      console.log('点击遮罩层关闭');
      this.triggerEvent('close');
    },
    
    // 点击关闭按钮关闭 - 使用 catchtap 阻止冒泡
    onCloseClick() {
      console.log('点击关闭按钮');
      this.triggerEvent('close');
      // 阻止事件冒泡
      return false;
    },

    // 阻止事件冒泡，点击弹窗内容时不关闭
    preventClose() {
      // 什么都不做，只是阻止冒泡到遮罩层
      return false;
    }
  }
});