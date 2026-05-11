// components/nav-bar/nav-bar.js - 更准确的方案
Component({
  options: {
    multipleSlots: true
  },
  
  properties: {
    title: {
      type: String,
      value: ''
    },
    titleColor: {
      type: String,
      value: '#333333'
    },
    backgroundColor: {
      type: String,
      value: '#F7F8FA'
    },
    showBack: {
      type: Boolean,
      value: false
    },
    backIconUrl: {
      type: String,
      value: ''
    },
    isFixed: {
      type: Boolean,
      value: true
    }
  },

  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    totalHeight: 64
  },

  lifetimes: {
    attached() {
      this.getNavBarInfo();
    }
  },


  methods: {
    // 获取导航栏信息（更准确的方法）
    getNavBarInfo() {
      try {
        // 获取微信胶囊按钮位置信息
        const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
        
        // 获取系统信息
        const systemInfo = wx.getSystemInfoSync();
        
        // 计算状态栏高度
        // 胶囊按钮顶部位置 = 状态栏高度 + 8px（苹果设计规范）
        let statusBarHeight = menuButtonInfo.top - 8;
        
        // 确保状态栏高度在合理范围内
        if (statusBarHeight < 15) statusBarHeight = 20;
        if (statusBarHeight > 50) statusBarHeight = 44;
        
        // 导航栏内容高度（通常 44px）
        const navBarHeight = 44;
        
        // 总高度
        const totalHeight = statusBarHeight + navBarHeight;
        
        console.log('导航栏信息:', {
          menuButtonInfo: menuButtonInfo,
          statusBarHeight: statusBarHeight,
          totalHeight: totalHeight
        });
        
        this.setData({
          statusBarHeight: statusBarHeight,
          navBarHeight: navBarHeight,
          totalHeight: totalHeight
        });
        
        this.triggerEvent('heightChange', { totalHeight });
        
      } catch (e) {
        console.error('获取导航栏信息失败', e);
        // 降级方案
        this.getSystemInfo();
      }
    },


    // 降级方案
    getSystemInfo() {
      const systemInfo = wx.getSystemInfoSync();
      let statusBarHeight = systemInfo.statusBarHeight || 20;
      
      // 限制高度范围
      if (statusBarHeight > 35) {
        const model = systemInfo.model || '';
        const isNotchScreen = model.includes('iPhone X') || 
                              model.includes('iPhone 11') || 
                              model.includes('iPhone 12') || 
                              model.includes('iPhone 13') || 
                              model.includes('iPhone 14') || 
                              model.includes('iPhone 15');
        statusBarHeight = isNotchScreen ? 44 : 20;
      }
      if (statusBarHeight < 15) statusBarHeight = 20;
      
      const totalHeight = statusBarHeight + 44;
      
      this.setData({
        statusBarHeight: statusBarHeight,
        totalHeight: totalHeight
      });
    },

    onBackTap() {
      this.triggerEvent('back');
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    }
  }
});