const app = getApp()
Component({
  data: {
    selected: 0,  // 确保这个初始值存在
    list: [
      {
        pagePath: "/pages/home/home",
        text: "首页",
        iconPath: "/images/tab-home.png",
        selectedIconPath: "/images/tab-home-active.png"
      },
      {
        pagePath: "/pages/order/order",
        text: "点单",
        iconPath: "/images/tab-order.png",
        selectedIconPath: "/images/tab-order-active.png"
      },
      {
        pagePath: "/pages/cart-list/cart-list",
        text: "购物车",
        iconPath: "/images/cart-icon.png",
        selectedIconPath: "/images/cart-icon.png"
      },
      {
        pagePath: "/pages/mine/mine",  // 注意你的路径是 mine
        text: "我的",
        iconPath: "/images/tab-mine.png",
        selectedIconPath: "/images/tab-mine-active.png"
      }
    ]
  },
  lifetimes: {
    attached() {
      console.log('TabBar 组件加载');
      // 注册组件到全局
      app.registerTabBarComponent(this);
      
      // 根据当前页面设置选中状态
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage) {
        const currentRoute = currentPage.route;
        const selectedIndex = this.data.list.findIndex(item => 
          item.pagePath.includes(currentRoute)
        );
        if (selectedIndex !== -1) {
          this.setData({ selected: selectedIndex });
          app.globalData.tabBarSelected = selectedIndex;
        }
      }
    },
    
    detached() {
      // 组件销毁时注销
      if (app.globalData.tabBarComponent === this) {
        app.globalData.tabBarComponent = null;
      }
    }
  },

  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      
      console.log('点击 Tab，索引:', index, '路径:', path);
      
      // 更新全局状态
      app.globalData.tabBarSelected = index;
      
      // 跳转页面
      wx.switchTab({
        url: path,
        success: () => {
          console.log('跳转成功');
        },
        fail: (err) => {
          console.error('跳转失败:', err);
        }
      });
    },
     // 隐藏 TabBar
     hide() {
      this.setData({ isHidden: true });
    },

    // 显示 TabBar
    show() {
      this.setData({ isHidden: false });
    },
      // 供外部调用的更新方法
      updateSelected(index) {
        console.log('updateSelected 被调用，目标索引:', index, '当前索引:', this.data.selected);
        
        // 强制更新，即使索引相同也更新
        this.setData({
          selected: index
        }, () => {
          console.log('setData 完成，当前 selected:', this.data.selected);
          // 强制重新渲染组件
          this.setData({});
        });
      }
  }
});