# PC 原型 · 开发规范

> 本文件是 `demo/pc/` 目录的开发约定。**在此目录下新增/修改任何页面时,必须遵循以下规范。**
> 由来:首版结构搭建(2026-08-05),对齐 `demo/pda/AGENTS.md` 的分层思路。

---

## 一、硬约束(不可违背)

1. **纯静态、零依赖**:不引入 npm、构建工具、前端框架(Vue/React 等)。页面靠**双击 HTML 即用**,不要求跑服务器。
2. **多 HTML 多页面**:每个功能页一个独立 `.html` 文件,放根目录;页面间用 `location.href` 跳转(不用 SPA)。
3. **禁止 `fetch` 加载本地片段**:`file://` 双击打开会被浏览器安全策略拦截。框架复用只能走 JS 渲染函数(见下)。
4. **主色固定** `#00A99D`(纵腾品牌色,与 PDA 端保持一致);表格选中态 `#E8F0FE`(Office 蓝灰),左侧菜单选中 `#4285F4`。不要擅自改配色。

---

## 二、目录结构(已建立,遵循即可)

```
demo/pc/
├── *.html                   # 页面入口(只放 HTML,一个功能一个文件)
├── css/
│   ├── base.css             # 所有页面共用样式(标题栏/左侧菜单/Tab/表格/状态栏/表单/按钮)
│   └── pages.css            # 各页面专属样式
├── js/
│   ├── layout.js            # 框架复用(Layout 对象:titleBar / leftMenu / tabBar / statusBar)
│   ├── helpers.js           # 共用工具(Helpers 对象:toast / clock / nowTime)
│   └── <页面名>.js          # 各页面专属逻辑(如 b2b-order.js)
└── docs/                    # 设计文档存档
```

**组织规律**:根目录只放页面入口;`css/` 只放样式;`js/` 只放脚本。
> js/css 暂不再下分 `pages/`、`common/` 子层级;待文件多到 7-8 个再细分。

---

## 三、CSS 拆分规则(往哪写)

判断口诀:**这个样式别的页面也会用到吗?**

| 文件 | 放什么 | 判断 |
|------|--------|------|
| `css/base.css` | 标题栏、左侧菜单、Tab 栏、状态栏、查询表单、表格、按钮、输入框、toast | 多个页面共用 → 放这 |
| `css/pages.css` | 某页面专属的业务卡片、特殊布局 | 只有一个页面用 → 放这 |

新增页面专属样式时,追加到 `pages.css` 末尾,用注释分节标明属于哪个页面。

---

## 四、框架复用:Layout 对象(`js/layout.js`)

所有页面都用 `Layout.window()` 套上"桌面应用窗口(标题栏 + 左侧菜单 + Tab + 主区 + 状态栏)",框架结构不要在各页面重复写。

```js
document.getElementById('app').innerHTML = Layout.window({
  title: 'B2B订单管理',
  activeLeft: 'b2b-order',        // 左侧菜单选中项 key
  activeTab: 'b2b-order',         // 顶部 Tab 选中项 key
  tabs: Layout.tabs.standard(),   // 标准 Tab 列表
  content: `<!-- 本页专属内容 -->`
});
```

可用方法:
- `Layout.window(opts)` — 桌面窗口外壳(标题栏 + 左侧菜单 + Tab + 主区 + 状态栏)
- `Layout.titleBar(title)` — 单独标题栏
- `Layout.leftMenu(active)` — 左侧菜单(active: `'b2b-order'` 等 key)
- `Layout.tabBar(active, tabs?)` — 顶部 Tab(active: 当前选中的 key;tabs: Tab 列表,默认标准 Tab)
- `Layout.statusBar()` — 底部状态栏(系统时间/电子秤/网络状态等)
- `Layout.tabs.standard()` — 标准 Tab 列表(B2B订单管理 / 增值服务 / 异常订单等)

**改框架样式只动 `layout.js` / `base.css` 一处,所有页面自动生效。**

---

## 五、共用工具:Helpers 对象(`js/helpers.js`)

页面里需要 toast、时钟、时间格式化时,调 Helpers,不要各页面重写一份:

- `Helpers.toast(msg, duration=1600)` — 居中提示
- `Helpers.startClock(selector='.clock')` — 启动实时时钟(每 30s 刷新)
- `Helpers.nowTime()` — 当前时间 `YYYY-MM-DD HH:mm:ss`
- `Helpers.fmtDate(d)` — 日期对象 → `YYYY-MM-DD HH:mm:ss`

---

## 六、HTML 骨架(每个页面固定这样写)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>页面标题</title>
  <link rel="stylesheet" href="./css/base.css" />
  <link rel="stylesheet" href="./css/pages.css" />
</head>
<body>
  <div id="app"></div>

  <script src="./js/layout.js"></script>      <!-- 顺序1:先框架 -->
  <script src="./js/helpers.js"></script>     <!-- 顺序2:再工具 -->
  <script src="./js/本页逻辑.js"></script>    <!-- 顺序3:最后本页逻辑 -->
</body>
</html>
```

**加载顺序不能乱**:base.css → pages.css → layout.js → helpers.js → 本页.js。
顺序错(如本页逻辑排在 layout 前)→ JS 报 `Layout is not defined`、页面空白。

---

## 七、新增一个页面的标准步骤

以"增值服务操作"为例:

1. **建页面入口** `vas-operate.html`:复制上方 HTML 骨架,改 `<title>` 和最后一个 `<script src>`
2. **建页面逻辑** `js/vas-operate.js`:
   ```js
   document.getElementById('app').innerHTML = Layout.window({
     title: '增值服务操作',
     activeLeft: 'vas',
     activeTab: 'vas-operate',
     tabs: Layout.tabs.standard(),
     content: `<!-- 增值服务操作页专属内容 -->`
   });
   Helpers.startClock();
   // 本页交互逻辑...
   ```
3. **加专属样式**(如有):追加到 `css/pages.css` 末尾,注释标明 `/* === 增值服务操作页 === */`
4. **验证**:浏览器打开,确认标题栏、左侧菜单、Tab、功能正常

---

## 八、PC 适配注意

- **视口设计宽度 1280px+**(WinForms 桌面应用),最低缩放不小于 1024×720
- 表格列宽固定,内容超出显示省略号 + `title` 悬浮提示
- 状态栏右侧的"系统时间"每 30s 刷新(用 `Helpers.startClock` 即可)
- 不要做移动端适配(PC 端不对应实体手持设备)

---

## 九、修改既有页面时的红线

- **重构已有页面时,功能与外观必须保持一致**——先读完整源码,1:1 搬迁逻辑,不得丢功能或改交互
- 改 `base.css`/`layout.js`/`helpers.js` 前,想清楚是否会影响所有页面;改完要回归测试其他页面
- 不要把页面专属的样式/逻辑塞进 `base.css`/`layout.js`/`helpers.js`(会污染共用层)

---

## 十、示例数据规范(单号格式)

页面里的演示/示例单号,**必须用 B2B 大货真实格式**,不得用 `SUB123`/`TEST001` 等占位假号(显得不专业,评审时会被质疑)。

### 单号格式

| 单号 | 格式 | 示例 |
|------|------|------|
| **主单号**(订单号 / `shipper_hawb_code`) | `YT` + **16 位数字** | `YT2621000070480962` |
| **子单号 / 箱号** | 主单号 + `U` + **3 位序号** | `YT2621000070480962U001` |
| **客户单号** | `CST` + 6位数字 + 6位数字 | `CST2621601300101272` |
| **跟踪号** | 16 位数字 | `20260804185331460` |
| **平台单号** | `PH` + 数字 | `PH2608030000051` |
| **FBA 编号** | `FBA` + 数字 | `FBA1234567890` |

### 生成规则

- **主单号**:`YT` 后**正好 16 位数字**(位数不能多不能少)。数字部分可任意编造。
- **子单号**:在主单号后拼 `U` + 3 位序号,**从 `U001` 起**按箱累加(**没有 `U000`**);序号补零到 3 位(`U001`/`U012`/`U003`,不是 `U1`/`U12`)。
- **客户单号**:沿用截图原格式 `CST` + 6位 + 6位(如 `CST2621601300101272`)。
- **一票多件**:同一票货的多个子单共享同一主单号,仅尾部序号递增——造数据时刻意体现这种关联。

### 一票多件示例(可直接复用)

```
主单: YT2621000070480962
  ├─ YT2621000070480962U001   (第1箱)
  ├─ YT2621000070480962U002   (第2箱)
  └─ YT2621000070480962U003   (第3箱)
```

> 格式来源:飞书《YT单号生成规则》(刘波)方案一。完整规则与字段说明见 `rules/需求文档(PRD)编写规范.md §3.4d`。
