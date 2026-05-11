// pages/login/login.js - 授权注册页
const app = getApp()
const { isValidPhone, showToast } = require('../../utils/util')

Page({
  data: {
    nickname: '',
    genderIndex: -1,
    genderArray: ['男', '女'],
    phone: '',
    submitting: false
  },

  onLoad(options) {
    // redirect 可能是 encodeURIComponent 过的值；统一解码避免跳转失败
    this._redirectUrl = options.redirect ? decodeURIComponent(options.redirect) : ''
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value.trim() })
  },

  // 性别选择
  onGenderChange(e) {
    this.setData({ genderIndex: Number(e.detail.value) })
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() })
  },

  // 提交注册
  async onSubmit() {
    const { nickname, genderIndex, genderArray, phone } = this.data

    if (!nickname) return showToast('请输入昵称')
    if (genderIndex < 0) return showToast('请选择性别')
    if (!phone) return showToast('请输入手机号')
    if (!isValidPhone(phone)) return showToast('手机号格式不正确')

    this.setData({ submitting: true })

    try {
      // 调用云函数注册
      const res = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'register',
          nickname,
          gender: genderIndex === 0 ? 'male' : 'female',
          phone
        }
      })

      if (res.result && res.result.code === 0) {
        // 注册成功后，走“登录/获取用户信息”接口，确保 mine 页展示的用户信息是最新的
        try {
          const infoRes = await wx.cloud.callFunction({
            name: 'userManager',
            data: { action: 'getUserInfo' }
          })

          if (infoRes.result && infoRes.result.code === 0 && infoRes.result.data) {
            const doc = infoRes.result.data
            // 兼容字段命名：nickname / nickName
            const nicknameFromDb = doc.nickname || doc.nickName || nickname

            app.globalData.userInfo = {
              nickname: nicknameFromDb,
              gender: doc.gender || (genderIndex === 0 ? 'male' : 'female'),
              phone: doc.phone || phone,
              openid: doc.openid || res.result.openid
            }
            wx.setStorageSync('userInfo', app.globalData.userInfo)
          }
        } catch (e) {
          // 不影响注册成功流程；mine 页返回后会再次拉取用户信息
          console.warn('获取用户信息失败', e)
        }

        // 统一把 openid 放到全局，避免“我的/结算页”误判未注册
        if (res.result.openid) {
          app.globalData.openid = res.result.openid
          wx.setStorageSync('openid', res.result.openid)
        }

        const userInfo = {
          nickname,
          gender: genderIndex === 0 ? 'male' : 'female',
          phone,
          openid: res.result.openid
        }

        // 本地缓存
        wx.setStorageSync('isRegistered', true)
        wx.setStorageSync('userInfo', userInfo)

        // 更新全局状态
        app.globalData.isRegistered = true
        app.globalData.userInfo = userInfo

        showToast('注册成功', 'success')

        setTimeout(() => {
          const target = this._redirectUrl
          const tabPages = ['/pages/home/home', '/pages/order/order', '/pages/mine/mine']
          const isTabPage = !!(target && tabPages.some(p => target.indexOf(p) === 0))
          if (isTabPage) {
            wx.switchTab({ url: target })
          } else if (target) {
            wx.redirectTo({ url: target })
          } else {
            wx.navigateBack()
          }
        }, 1200)
      } else {
        // 云函数失败时降级为本地注册
        const fallbackOpenid = (res.result && res.result.openid) ? res.result.openid : await app.getOpenId()
        if (fallbackOpenid) {
          app.globalData.openid = fallbackOpenid
          wx.setStorageSync('openid', fallbackOpenid)
        }

        const userInfo = {
          nickname,
          gender: genderIndex === 0 ? 'male' : 'female',
          phone,
          openid: fallbackOpenid
        }
        wx.setStorageSync('isRegistered', true)
        wx.setStorageSync('userInfo', userInfo)
        app.globalData.isRegistered = true
        app.globalData.userInfo = userInfo

        showToast('注册成功', 'success')
        setTimeout(() => {
          const target = this._redirectUrl
          const tabPages = ['/pages/home/home', '/pages/order/order', '/pages/mine/mine']
          const isTabPage = !!(target && tabPages.some(p => target.indexOf(p) === 0))
          if (isTabPage) {
            wx.switchTab({ url: target })
          } else if (target) {
            wx.redirectTo({ url: target })
          } else {
            wx.navigateBack()
          }
        }, 1200)
      }
    } catch (err) {
      console.error('注册失败:', err)
      // 云函数调用失败时降级为本地注册
      const fallbackOpenid = await app.getOpenId()
      if (fallbackOpenid) {
        app.globalData.openid = fallbackOpenid
        wx.setStorageSync('openid', fallbackOpenid)
      }

      const userInfo = {
        nickname,
        gender: genderIndex === 0 ? 'male' : 'female',
        phone,
        openid: fallbackOpenid
      }
      wx.setStorageSync('isRegistered', true)
      wx.setStorageSync('userInfo', userInfo)
      app.globalData.isRegistered = true
      app.globalData.userInfo = userInfo

      showToast('注册成功', 'success')
      setTimeout(() => {
        const target = this._redirectUrl
        const tabPages = ['/pages/home/home', '/pages/order/order', '/pages/mine/mine']
        const isTabPage = !!(target && tabPages.some(p => target.indexOf(p) === 0))
        if (isTabPage) {
          wx.switchTab({ url: target })
        } else if (target) {
          wx.redirectTo({ url: target })
        } else {
          wx.navigateBack()
        }
      }, 1200)
    } finally {
      this.setData({ submitting: false })
    }
  }
})