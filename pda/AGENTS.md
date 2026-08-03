# PDA 原型 · 开发规范

> 本文件是 `demo/pda/` 目录的开发约定。**在此目录下新增/修改任何页面时,必须遵循以下规范。**
> 由来:2026-07-27 结构重构(设计文档见 `docs/2026-07-27-pda-structure-refactor-design.md`)。

---

## 一、硬约束(不可违背)

1. **纯静态、零依赖**:不引入 npm、构建工具、前端框架(Vue/React 等)。页面靠**双击 HTML 即用**,不要求跑服务器。
2. **多 HTML 多页面**:每个功能页一个独立 `.html` 文件,放根目录;页面间用 `location.href` 跳转(不用 SPA)。
3. **禁止 `fetch` 加载本地片段**:`file://` 双击打开会被浏览器安全策略拦截。框架复用只能走 JS 渲染函数(见下)。
4. **主色固定** `#00A99D`;背景 `#F5F5F5`;卡片白底。不要擅自改配色。

---

## 二、目录结构(已建立,遵循即可)

```
demo/pda/
├── *.html                  # 页面入口(只放 HTML,一个功能一个文件)
├── css/
│   ├── base.css            # 所有页面共用样式(设备外壳/状态栏/导航/Tab/toast)
│   └── pages.css           # 各页面专属样式
├── js/
│   ├── layout.js           # 框架复用(Layout 对象)
│   ├── helpers.js          # 共用工具(Helpers 对象)
│   └── <页面名>.js          # 各页面专属逻辑(如 workbench.js)
└── docs/                   # 设计文档存档
```

**组织规律**:根目录只放页面入口;`css/` 只放样式;`js/` 只放脚本。
> js/css 暂不再下分 `pages/`、`common/` 子层级;待文件多到 7-8 个再细分。

---

## 三、CSS 拆分规则(往哪写)

判断口诀:**这个样式别的页面也会用到吗?**

| 文件 | 放什么 | 判断 |
|------|--------|------|
| `css/base.css` | 设备外壳、状态栏、导航栏、Tab 栏、toast、主色变量 | 多个页面共用 → 放这 |
| `css/pages.css` | 工作台宫格、退仓扫描记录条目、登记态等 | 只有一个页面用 → 放这 |

新增页面专属样式时,追加到 `pages.css` 末尾,用注释分节标明属于哪个页面。

---

## 四、框架复用:Layout 对象(`js/layout.js`)

所有页面都用 `Layout.shell()` 套上"设备外壳 + 状态栏",框架结构不要在各页面重复写。

```js
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('页面标题')}      <!-- 详情页用:带返回的标题栏 -->
  <!-- 本页专属内容 -->
  ${Layout.tabBar('workbench')}     <!-- 主页用:底部 Tab,active 指定高亮项 -->
`);
```

可用方法:
- `Layout.shell(inner)` — 设备外壳 + 状态栏 + 你的内容
- `Layout.navBar(title, backHref?)` — 带返回的标题栏(详情页)
- `Layout.tabBar(active)` — 底部 Tab(active: `'task'|'workbench'|'me'`)
- `Layout.statusBar()` — 单独的状态栏(一般不用,shell 已包含)

**改框架样式只动 `layout.js` / `base.css` 一处,所有页面自动生效。**

---

## 五、共用工具:Helpers 对象(`js/helpers.js`)

页面里需要 toast、时钟、时间格式化时,调 Helpers,不要各页面重写一份:

- `Helpers.toast(msg, duration=1600)` — 居中提示
- `Helpers.startClock(selector='.clock')` — 启动实时时钟(页面初始化时调一次)
- `Helpers.nowTime()` — 当前时间 `YYYY-MM-DD HH:mm:ss`(扫描记录等用)

---

## 六、HTML 骨架(每个页面固定这样写)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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

以"上架作业"为例:

1. **建页面入口** `shelf.html`:复制上方 HTML 骨架,改 `<title>` 和最后一个 `<script src>`
2. **建页面逻辑** `js/shelf.js`:
   ```js
   document.getElementById('app').innerHTML = Layout.shell(`
     ${Layout.navBar('上架作业')}
     <!-- 上架页专属内容 -->
   `);
   Helpers.startClock();
   // 本页交互逻辑...
   ```
3. **加专属样式**(如有):追加到 `css/pages.css` 末尾,注释标明 `/* === 上架作业页 === */`
4. **加跳转入口**(如需):在工作台 `js/workbench.js` 的 `MENUS` 数组里,把对应项的 `go` 填上 `'./shelf.html'`
5. **验证**:浏览器打开,确认状态栏、导航、功能正常

---

## 八、PDA 适配注意

- 视口设计宽度 ~390px(瘦长屏),样式按移动端优先写
- 适配**实体键 PDA**:关键操作尽量支持键盘(Enter 提交、Esc 取消、数字键快捷选择),参考退仓扫描页的 `document.addEventListener('keydown', ...)`
- 设备外壳在桌面端显示(带黑边圆角)、移动端(<420px)自动全屏,无需各页面处理
- 触屏点击反馈用 `:active` 状态,不用 hover

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
| **子单号 / 箱号**(PDA 扫描的主要对象) | 主单号 + `U` + **3 位序号** | `YT2621000070480962U001` |
| 客户单号 | `CST-` + 主单号数字部分 | `CST-2621000070480962` |

### 生成规则

- **主单号**:`YT` 后**正好 16 位数字**(位数不能多不能少)。数字部分可任意编造。
- **子单号**:在主单号后拼 `U` + 3 位序号,**从 `U001` 起**按箱累加(**没有 `U000`**);序号补零到 3 位(`U001`/`U012`/`U003`,不是 `U1`/`U12`)。
- **一票多件**:同一票货的多个子单共享同一主单号,仅尾部序号递增——造数据时刻意体现这种关联(如某主单下挂 `...U001`/`...U002`/`...U003` 三箱)。
- 超过 999 箱时序号才扩到 4-5 位,常规演示用 3 位即可。

### 一票多件示例(可直接复用)

```
主单: YT2621000070480962
  ├─ YT2621000070480962U001   (第1箱)
  ├─ YT2621000070480962U002   (第2箱)
  └─ YT2621000070480962U003   (第3箱)
```

### 各页面应用

- **退仓扫描页**(`outbound-scan.js`):扫描对象 = 子单号,演示面板直接放真实格式子单号。
- **B2B工作台**(`b2b-workbench.js`):任务列表/增值卡片的单号列填子单号;换单/退仓等同主单的不同子单可挂同一主单号,体现一票多件分别进入不同作业。
- 其他涉及单号的页面同此规则。

> 格式来源:飞书《YT单号生成规则》(刘波)方案一。完整规则与字段说明见 `rules/需求文档(PRD)编写规范.md §3.4d`。
