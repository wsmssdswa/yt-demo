# PDA 原型代码结构重构 · 设计文档

- **日期**:2026-07-27
- **背景**:CCOS PDA 原型(工作台 + 退仓扫描)目前 CSS 已外置,但 JS 全内联在 HTML 里,且状态栏/导航/Tab 等框架结构靠复制粘贴。随着后续页面增多,需要解决两个问题:
  1. HTML 文件膨胀(内联 JS 越堆越多)
  2. 页面框架无法复用(每加一页都要重抄一遍状态栏等)
- **目标用户**:PM(作者)仅用作原型演示,不部署线上。
- **硬约束**:**纯静态、零依赖、双击 HTML 即用**(不能引入 npm/构建工具,不能要求跑 HTTP 服务器才能打开)。

---

## 一、技术路线(已确认)

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 是否引入构建工具 | **否** | 原型要双击即开、随时分享,构建会挡路 |
| 组件复用方式 | **JS 渲染函数** | 唯一能同时满足"复用彻底"+"双击即用"的方案(`fetch` 加载片段会被 `file://` 安全策略拦截,排除) |
| 页面组织 | **多 HTML 多页面** | 每个 URL 可收藏、刷新不丢状态、结构清晰 |

---

## 二、目录结构

```
demo/pda/
├── index.html              # 工作台(页面入口)
├── outbound-scan.html      # 退仓扫描(页面入口)
├── css/
│   ├── base.css            # 所有页面共用:重置/变量/设备外壳/状态栏/导航/Tab/toast
│   └── pages.css           # 各页面专属:工作台宫格、退仓扫描记录条目等
├── js/
│   ├── layout.js           # 框架复用:Layout 对象(shell/statusBar/navBar/tabBar)
│   ├── helpers.js          # 共用工具:Helpers 对象(toast/startClock)
│   ├── workbench.js        # 工作台页逻辑
│   └── outbound-scan.js    # 退仓扫描页逻辑(含扫描校验)
└── docs/
    └── 2026-07-27-pda-structure-refactor-design.md   # 本文档
```

**组织规律**:根目录只放"页面入口(HTML)";`css/` 只放样式;`js/` 只放脚本。
新增页面时:HTML 加根目录、专属逻辑加 `js/`、专属样式加进 `pages.css`。
> js/css 暂不再下分 `pages/`、`common/` 子层级,2 个页面平铺够用;待文件多到 7-8 个再细分。

---

## 三、组件复用设计:`Layout` 对象(`js/layout.js`)

把每个页面都重复的"骨架"提成函数,页面只填中间内容。

```js
const Layout = {
  shell(innerHTML) { ... },   // 设备外壳 + 状态栏 + 传入的内容
  statusBar() { ... },        // 状态栏(时间/信号/电池)
  navBar(title) { ... },      // 带返回的标题栏(详情页用)
  tabBar(active) { ... },     // 底部 Tab 栏(主页用,active 指定高亮项)
};
```

**新页面用法**(以退仓扫描为例):
```html
<!-- HTML 只剩骨架 -->
<body>
  <div id="app"></div>
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/pages.css">
  <script src="js/layout.js"></script>
  <script src="js/helpers.js"></script>
  <script src="js/outbound-scan.js"></script>
</body>
```
```js
// js/outbound-scan.js
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('退仓扫描')}
  <!-- 本页专属内容 -->
`);
```

**收益**:状态栏等改一处,所有页面同步生效;新增页面无需复制粘贴框架。

---

## 四、CSS 拆分规则

按"**谁用**"分,而非按区块分:

| 文件 | 放什么 | 判断口诀 |
|------|--------|----------|
| `base.css` | 所有页面共用的样式(设备外壳、状态栏、导航、Tab、toast、主色变量) | 别的页面也会用到? → 放这 |
| `pages.css` | 只某页面用的样式(工作台宫格、退仓扫描记录条目) | 只有这一页用? → 放这 |

---

## 五、共用工具:`Helpers` 对象(`js/helpers.js`)

收拢跨页面重复逻辑:
```js
const Helpers = {
  toast(msg, duration = 1600) { ... },
  startClock(selector) { ... },
};
```

---

## 六、加载顺序约束(关键,踩坑点)

每个 HTML 底部引用必须**按顺序**:
1. `css/base.css` → `css/pages.css`(先有样式)
2. `js/layout.js` → `js/helpers.js`(先加载框架/工具对象)
3. `js/本页逻辑.js`(最后加载,会用到上面两个)

顺序错(如本页逻辑排在 layout 前)→ JS 报 `Layout is not defined`、页面空白。
**实现时由我保证正确,PM 无需操心。**

---

## 七、迁移步骤

1. 建 `css/`、`js/`、`docs/` 子文件夹
2. 拆现有 `styles.css` → `css/base.css` + `css/pages.css`,删旧文件
3. 写 `js/layout.js`(提框架)、`js/helpers.js`(提工具)
4. 改造两个 HTML:清空内联 `<script>`,只留 `<div id="app">` + 引用;逻辑搬进 `js/workbench.js`、`js/outbound-scan.js`
5. 验证:逐页打开,确认功能与外观**与重构前完全一致**

---

## 八、不变量(重构边界)

- **纯重构,不改外观**:颜色、间距、字号、布局全部不变
- **功能不变**:扫描校验(无效/有效/重复三种)、toast、宫格跳转、设备外壳,行为完全一致
- **双击即用不变**:零依赖,不引入任何 npm 包或构建步骤
