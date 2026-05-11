---
name: auth-register-feature
overview: 新增授权注册登录功能：用户需填写昵称、性别、手机号（全部必填）完成注册。在选择店铺前和"我的"页面点击任意菜单时进行登录拦截，未注册则跳转注册页。
design:
  fontSystem:
    fontFamily: system-ui
    heading:
      size: 40rpx
      weight: 700
    subheading:
      size: 30rpx
      weight: 500
    body:
      size: 28rpx
      weight: 400
  colorSystem:
    primary:
      - "#FF7A2E"
      - "#FF9A56"
      - "#FF6B1A"
    background:
      - "#FFFFFF"
      - "#FFF5EE"
      - "#F7F8FA"
    text:
      - "#333333"
      - "#666666"
      - "#999999"
    functional:
      - "#52C41A"
      - "#FF4D4F"
      - "#FF7A2E"
todos:
  - id: create-login-page
    content: 创建 pages/login/ 注册页面（4个文件：js/json/wxml/wxss）
    status: completed
  - id: create-user-manager-cloud
    content: 创建 cloudfunctions/userManager/ 云函数（register + getUserInfo）
    status: completed
  - id: modify-app-js
    content: 修改 app.js 新增 checkAuth() 方法和 isRegistered 状态管理
    status: completed
  - id: modify-interception-points
    content: 修改三个拦截点（order.js/mine.js/select-shop.js）增加登录守卫
    status: completed
    dependencies:
      - create-login-page
      - create-user-manager-cloud
      - modify-app-js
---

## 用户需求

增加授权注册登录功能。用户需填写昵称、性别、手机号（全部必填），完成注册后才能使用核心功能。

## 触发拦截的场景

1. **点单Tab页**：点击任意店铺进入菜单前，拦截跳转
2. **我的Tab页**：点击任意菜单项（收货地址、饮品分类、饮品信息、订单管理）前，拦截跳转
3. **店铺选择页**（select-shop）：选择店铺确认前，拦截返回操作

## 核心规则

- 昵称、性别、手机号三个字段全部必填
- 注册成功后返回来源页面，自动继续被拦截的操作
- 注册信息需持久化存储（本地缓存 + 云数据库）

## 技术方案

### 实现策略

采用"注册页 + 全局登录检查"模式：新建 `pages/login/login` 注册页面，在 `app.js` 新增 `checkAuth()` 方法作为统一登录守卫，在三个拦截点调用该方法，未注册时跳转注册页并通过 `redirectUrl` 参数回传来源路径。

### 数据流

用户操作触发拦截点 -> `app.checkAuth()` 检查 `globalData.isRegistered` -> 未注册时 `wx.navigateTo({ url: '/pages/login/login?redirect=...' })` -> 用户填写昵称/性别/手机号 -> 调用 `userManager` 云函数注册写入 `users` 集合 -> 本地缓存 `isRegistered=true` + 用户信息 -> `wx.navigateBack()` 返回来源页 -> 拦截点自动重试

### 关键技术决策

1. **注册数据双写**：`wx.setStorageSync('isRegistered', true)` + `wx.setStorageSync('userInfo', {...})` 用于快速判断；云数据库 `users` 集合存储完整用户资料（openid + 昵称 + 性别 + 手机号 + 注册时间），便于后台管理
2. **新建 `userManager` 云函数**：独立于 `initData`，职责单一，支持 `register`（注册）和 `getUserInfo`（查询）两个 action
3. **拦截参数传递**：使用 `redirectUrl` + `redirectData` query 参数传递回跳路径和携带数据（如 shopId、菜单url 等），注册完成后 `wx.navigateBack()` 回到来源页，来源页在 `onShow` 中检查注册状态并自动重试操作
4. **避免重复拦截**：来源页在 `onShow` 中用 `this._pendingAction` 标记待执行操作，注册返回后执行并清除标记，避免无限循环

### 性能与兼容

- 登录检查走本地缓存（同步读取），零延迟
- 云函数注册失败时降级为仅本地缓存，不阻塞用户流程
- `checkAuth()` 返回 Promise，支持 async/await 调用

## 目录结构

```
d:\milkTea\
├── app.js                          # [MODIFY] 新增 checkAuth() 方法、isRegistered 状态管理
├── app.json                        # [MODIFY] pages 数组新增 login 页面路由
├── pages/
│   ├── login/
│   │   ├── login.js                # [NEW] 注册页逻辑：表单输入、性别选择、手机号校验、调用云函数注册、回跳
│   │   ├── login.json              # [NEW] 页面配置
│   │   ├── login.wxml              # [NEW] 注册页模板：Logo、昵称输入、性别选择、手机号输入、注册按钮
│   │   └── login.wxss              # [NEW] 注册页样式：与项目主色调 #FF7A2E 一致
│   ├── order/
│   │   └── order.js                # [MODIFY] selectShop 方法增加 checkAuth 拦截
│   ├── mine/
│   │   └── mine.js                 # [MODIFY] onMenuTap 方法增加 checkAuth 拦截
│   └── select-shop/
│       └── select-shop.js          # [MODIFY] onSelectShop 方法增加 checkAuth 拦截
├── cloudfunctions/
│   └── userManager/
│       ├── index.js                # [NEW] 云函数：register + getUserInfo
│       └── package.json            # [NEW] 云函数依赖配置
└── utils/
    └── util.js                     # [MODIFY] 新增 checkAuth 工具函数（可选，也可放 app.js）
```

## 实现注意事项

- `login` 页面路由必须放在 `app.json` pages 数组中（不作为 tabBar 页面）
- 性别选择使用 Picker 组件（男/女），不使用 radio-group，保持与小程序原生体验一致
- 手机号使用 `type="number" maxlength="11"` 输入，复用 `util.isValidPhone()` 校验
- `onShow` 中的自动重试需清除 `_pendingAction` 标记防止循环
- 云函数 `userManager` 需在 `cloud/deploy-guide.md` 中补充部署说明

## 设计方案

### 视觉风格

延续项目主色调 #FF7A2E 橙色系，简洁温暖的注册体验。顶部装饰性波浪背景 + 居中表单卡片 + 渐变按钮。

### 页面结构（单页面：注册登录页）

自上而下分为四个区块：

1. **顶部装饰区**：橙色渐变背景弧形装饰，居中显示奶茶杯 Logo 图标和"欢迎注册"标题
2. **表单卡片**：白色圆角卡片，包含昵称输入框（带用户图标）、性别 Picker 选择器（带性别图标）、手机号输入框（带电话图标）
3. **注册按钮**：橙色渐变圆角按钮"立即注册"
4. **底部提示**：灰色小字"注册即表示同意相关服务条款"

### 交互细节

- 输入框聚焦时下划线变为橙色
- 性别默认显示"请选择性别"，选中后显示"男/女"
- 注册按钮点击时有缩放反馈，提交中显示 loading 状态
- 注册成功后 Toast 提示"注册成功"并自动返回

## Agent Extensions

- **RAG_search (微信小程序)**
- Purpose: 查询微信小程序最新 API 和最佳实践，确保注册流程中云函数调用、页面跳转、Storage API 等符合最新规范
- Expected outcome: 确认 `wx.cloud.callFunction`、`wx.setStorageSync`、`wx.navigateTo` 等核心 API 用法正确