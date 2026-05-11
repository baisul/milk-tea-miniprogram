Component({
  data: {
    messages: [{ role: 'assistant', content: '你好！我是奶茶店AI助手，有什么可以帮你的吗？' }],
    inputText: '',
    isTyping: false,
    scrollTop: 0,
    scrollIntoView: '',
    modelName: '腾讯混元',
    modelType: 'hunyuan-exp',
    modelId: 'hunyuan-2.0-instruct-20251111',
    isAutoScrolling: false  // 是否自动滚动中
  },
    // 添加实例变量
    isManualScrolling: false,
    lastScrollTop: 0,
      // 添加防抖定时器
    scrollTimer: null,
    // 添加时间戳记录
    lastAutoScrollTime: 0,

  methods: {
    // 监听滚动事件，判断是否为手动滚动
    onScroll(e) {
      // 如果是自动滚动，不处理
      if (this.data.isAutoScrolling) {
        return;
      }
      
        // 记录手动滚动
        var scrollTop = e.detail.scrollTop;
        if (this.lastScrollTop !== undefined) {
          var delta = Math.abs(scrollTop - this.lastScrollTop);
          if (delta > 5) {
            this.isManualScrolling = true;
          }
        }
        this.lastScrollTop = scrollTop;
    },

    // 滚动到底部时触发
    onScrollToLower(e) {
      var now = Date.now();
      
      // 如果最近1秒内有过自动滚动，则不提示
      if (now - this.lastAutoScrollTime < 1000) {
        console.log('自动滚动后1秒内，跳过提示');
        return;
      }
      
      // 自动滚动时，不显示提示
      if (this.data.isAutoScrolling) {
        console.log('自动滚动中，跳过提示');
        return;
      }

        // 使用防抖，避免多次触发
        if (this.scrollTimer) {
          clearTimeout(this.scrollTimer);
        }

        this.scrollTimer = setTimeout(function() {
          wx.showToast({ title: '已到底部', icon: 'none', duration: 1000 });
        }, 100);
        this.isManualScrolling = false;
    },

    // 滚动到顶部时触发
    onScrollToUpper(e) {
      var now = Date.now();
      
      // 如果最近1秒内有过自动滚动，则不提示
      if (now - this.lastAutoScrollTime < 1000) {
        console.log('自动滚动后1秒内，跳过提示');
        return;
      }
      
      if (this.data.isAutoScrolling) {
        console.log('自动滚动中，跳过提示');
        return;
      }
      
      console.log('手动滚动到顶部，显示提示');
      
      this.scrollTimer = setTimeout(function() {
        wx.showToast({ title: '已到顶部', icon: 'none', duration: 1000 });
      }, 100);
      this.isManualScrolling = false;
    },

    // 手动点击置顶按钮
    scrollToTop() {
      this.setData({ 
        scrollTop: 0,
        scrollIntoView: 'chat-top',
        isAutoScrolling: false
      });
      wx.showToast({ title: '已置顶', icon: 'none', duration: 1000 });
    },

    // 手动点击置底按钮
    scrollToBottom() {
      this.setData({ 
        scrollTop: 99999,
        scrollIntoView: 'chat-bottom',
        isAutoScrolling: false
      });
      wx.showToast({ title: '已置底', icon: 'none', duration: 1000 });
    },

    // 自动滚动到底部
    autoScrollToBottom() {
      var that = this;
       // 记录自动滚动时间
       that.lastAutoScrollTime = Date.now();
      
       // 设置自动滚动标记
       that.setData({ isAutoScrolling: true });
       console.log('开始自动滚动');
       
       setTimeout(function() {
         that.setData({ 
           scrollTop: 99999,
           scrollIntoView: 'chat-bottom'
         });
         
         // 延迟恢复标记
         setTimeout(function() {
           that.setData({ isAutoScrolling: false });
           console.log('自动滚动结束');
         }, 500);
       }, 50);
     },

    // 发送消息
    async sendMessage() {
      const userMsg = this.data.inputText;
      if (!userMsg) return;

      const newMessages = [...this.data.messages, { role: 'user', content: userMsg }];
      this.setData({ messages: newMessages, inputText: '', isTyping: true });
      this.autoScrollToBottom();

      try {
        const model = wx.cloud.extend.AI.createModel(this.data.modelType);
        const res = await model.streamText({
          data: {
            model: this.data.modelId,
            messages: newMessages.map(m => ({ role: m.role, content: m.content }))
          }
        });

        this.setData({ messages: [...newMessages, { role: 'assistant', content: '' }], isTyping: false });

        let fullText = '';
        for await (let chunk of res.textStream) {
          fullText += chunk;
          const updatedMessages = [...this.data.messages];
          updatedMessages[updatedMessages.length - 1].content = fullText;
          this.setData({ messages: updatedMessages });
          this.autoScrollToBottom();
        }
      } catch (err) {
        console.error(err);
        wx.showToast({ title: 'AI出错了', icon: 'none' });
        this.setData({ isTyping: false });
      }
    },

    // 清空聊天
    clearAllChat() {
      wx.showModal({
        title: '提示',
        content: '确定要清空所有聊天记录吗？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ 
              messages: [{ role: 'assistant', content: '你好！我是奶茶店AI助手，有什么可以帮你的吗？' }],
              isAutoScrolling: false
            });
            wx.showToast({ title: '已清空聊天记录', icon: 'none' });
          }
        }
      });
    },

    // 清空输入框
    clearInput() {
      this.setData({ inputText: '' });
    },

    // 输入框变化
    onInput(e) {
      this.setData({ inputText: e.detail.value });
    },

    // 切换模型
    switchModel() {
      wx.showActionSheet({
        itemList: ['腾讯混元 - 中文理解好', 'DeepSeek - 推理能力强'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.setData({ 
              modelName: '腾讯混元', 
              modelType: 'hunyuan-exp', 
              modelId: 'hunyuan-2.0-instruct-20251111'
            });
          } else {
            this.setData({ 
              modelName: 'DeepSeek', 
              modelType: 'deepseek', 
              modelId: 'deepseek-v3.2'
            });
          }
          wx.showToast({ title: `切换到${this.data.modelName}`, icon: 'none' });
        }
      });
    }
  }
});