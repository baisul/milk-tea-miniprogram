# 云开发部署说明

## 一、初始化云开发环境

1. 在微信开发者工具中打开本项目
2. 点击「云开发」按钮，开通云开发并创建环境
3. 在 `app.js` 中将 `env: 'your-env-id'` 替换为你的云环境ID

## 二、创建数据库集合

在云开发控制台 > 数据库中，创建以下8个集合：

| 集合名 | 说明 |
|--------|------|
| shops | 店铺 |
| categories | 饮品分类 |
| drinks | 饮品 |
| orders | 订单 |
| addresses | 收货地址 |
| favorites | 店铺收藏 |
| hotDrinks | 热门饮品 |
| users | 用户信息 |
| shopping_cart | 购物车信息 |

## 三、设置数据库权限

在云开发控制台 > 数据库 > 每个集合 > 权限设置：

- **shops / categories / drinks / hotDrinks**：选择「自定义安全规则」，设置为：
  ```json
  {
    "read": true,
    "write": "doc.userId == auth.openid"
  }
  ```

- **orders / addresses / favorites**：选择「自定义安全规则」，设置为：
  ```json
  {
    "read": "doc.userId == auth.openid",
    "write": "doc.userId == auth.openid"
  }
  ```

- **users**：选择「自定义安全规则」，设置为：
  ```json
  {
    "read": "doc._openid == auth.openid",
    "write": "doc._openid == auth.openid"
  }
  ```

> 前端页面通过云函数操作数据库（自带 openid 鉴权），安全规则为兜底保护。

## 四、部署云函数

1. 在微信开发者工具中，右键点击 `cloudfunctions` 目录下的每个云函数文件夹
2. 选择「上传并部署：云端安装依赖」
3. 依次部署以下8个云函数：
   - `addressManager` - 地址管理
   - `cartManager` - 购物车管理
   - `drinkManager` - 饮品管理（含分类管理）
   - `favoriteManager` - 收藏管理
   - `initData` - 初始化数据
   - `orderManager` - 订单管理
   - `shopManager` - 店铺管理
   - `userManager` - 用户管理

## 五、初始化示例数据

部署完 `initData` 云函数后，调用以下命令初始化示例数据：

```javascript
wx.cloud.callFunction({
  name: 'initData',
  data: { action: 'initAll' },
  success(res) {
    console.log('初始化结果:', res.result)
  }
})
```

也可以在「云开发 > 云函数」控制台中手动测试 `initData` 函数。

初始化数据包含：
- 3个示例店铺（科技园店、福田店、罗湖店）
- 5个饮品分类（经典奶茶、水果茶、纯茶、奶盖系列、特调饮品）
- 18个示例饮品

## 六、云函数接口说明

### shopManager
| action | 说明 | 参数 |
|--------|------|------|
| getList | 获取店铺列表 | page, pageSize, status(=open/all/0/1/2), mine(可选，true=只取当前用户店铺) |
| search | 搜索店铺 | keyword, page, pageSize |
| getDetail | 获取店铺详情 | shopId |
| getNearby | 获取附近店铺（仅营业中，按距离升序+分页） | latitude, longitude, page(默认1), pageSize(默认10), maxDistance(米，可选), province(可选), keyword(可选) |
| create | 创建店铺 | shopId(主键，可选), shopCode(唯一), name, logo(或image), phone, contact, province, city, district, detailAddress(或address), latitude, longitude, businessHours, sort, status(0/1/2), deliveryRangeMeters, deliveryFeeCents, minOrderCents |
| update | 更新店铺 | shopId(文档ID), 以及要更新的字段（同 create） |
| delete | 删除店铺 | shopId |

### drinkManager
| action | 说明 | 参数 |
|--------|------|------|
| getCategoryList | 获取分类列表 | shopId |
| createCategory | 创建分类 | name, sort, shopId |
| updateCategory | 更新分类 | categoryId, name, sort |
| deleteCategory | 删除分类（级联删除饮品） | categoryId |
| getDrinkList | 获取饮品列表 | categoryId, shopId, isOnShelf, page, pageSize |
| searchDrinks | 搜索饮品 | keyword, shopId |
| getRecommend | 获取推荐饮品 | limit |
| createDrink | 创建饮品 | categoryId, name, price, image, description, cupSizes, temperatures, sweetnesses, stock, isOnShelf |
| updateDrink | 更新饮品 | drinkId, 以及要更新的字段 |
| deleteDrink | 删除饮品 | drinkId |
| toggleShelf | 上下架切换 | drinkId, isOnShelf |

### orderManager
| action | 说明 | 参数 |
|--------|------|------|
| create | 创建订单 | shopId, shopName, orderType, items, totalPrice, contactPhone, remark, pickupTime, deliveryTime, addressId, addressInfo |
| getList | 获取订单列表 | status, page, pageSize |
| getDetail | 获取订单详情 | orderId |
| cancel | 取消订单 | orderId |
| complete | 完成订单 | orderId |
| getStats | 获取订单统计 | - |
| rebuy | 再次购买 | orderId |

### 配送计费与校验（delivery）
订单类型为 `delivery` 时，`pages/checkout/checkout.js` 会在写入订单前完成：
- 读取当前店铺的 `deliveryRangeMeters`、`deliveryFeeCents`、`minOrderCents`
- 校验配送距离（店铺坐标到收货地址坐标）不超过 `deliveryRangeMeters`
- 校验商品金额（不含配送费）达到 `minOrderCents`
- 订单金额 `totalPrice = 商品金额(元) + deliveryFeeCents/100`

### addressManager
| action | 说明 | 参数 |
|--------|------|------|
| getList | 获取地址列表 | page, pageSize |
| getDetail | 获取地址详情 | addressId |
| create | 创建地址 | name, gender, phone, province, city, district, detail, roomNumber, tag, latitude, longitude |
| update | 更新地址 | addressId, 以及要更新的字段 |
| delete | 删除地址 | addressId |
| setDefault | 设置默认地址 | addressId |

### favoriteManager
| action | 说明 | 参数 |
|--------|------|------|
| getList | 获取收藏列表 | page, pageSize |
| add | 添加收藏 | shopId |
| remove | 取消收藏 | shopId |
| toggle | 切换收藏 | shopId |
| check | 检查收藏状态 | shopId |
| getOpenId | 获取用户openid | - |

### userManager
| action | 说明 | 参数 |
|--------|------|------|
| register | 用户注册 | nickname, gender, phone |
| getUserInfo | 获取用户信息 | - |
| listHotDrinks | 获取热门饮品列表 | - |
| addHotDrink | 添加热门饮品 | drinkId, drinkCategoryId, sort |
| updateHotDrink | 更新热门饮品 | id, drinkId, drinkCategoryId, sort |
| deleteHotDrink | 删除热门饮品 | id |

### initData
| action | 说明 | 参数 |
|--------|------|------|
| getOpenId | 获取用户openid | - |
| initAll | 初始化全部示例数据 | - |
| initShops | 初始化店铺数据 | - |
| initCategories | 初始化分类数据 | - |
| initDrinks | 初始化饮品数据 | - |
| clearAll | 清空当前用户的所有数据 | - |

---

## 九、注意事项

1. **云环境ID**：记得将 `app.js` 中的 `env: 'your-env-id'` 替换为实际的云环境ID

2. **云存储权限**：确保用户可以上传头像，需要设置合适的存储权限

3. **数据库权限**：安全规则已配置，云函数会自动进行 openid 鉴权

4. **初始化数据**：首次部署建议运行 `initAll` 初始化示例数据，便于测试

5. **用户头像**：头像文件会保存在云存储，注意控制文件大小，建议不超过 2MB

6. **测试账号**：开发测试时可使用小程序测试账号，模拟用户注册、下单等流程

