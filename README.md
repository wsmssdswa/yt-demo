# CCOS 原型集

> 纵腾集团 CCOS(集运作业系统)**多端原型仓库**。每端一个子目录,纯静态 HTML+CSS+JS,双击即用。

## 各端原型

| 端 | 目录 | 在线预览 | 说明 |
|----|------|----------|------|
| PDA 手持终端 | [`pda/`](./pda) | [wsmssdswa.github.io/yt-demo/pda](https://wsmssdswa.github.io/yt-demo/pda/) | 仓库作业:PDA 工作台、退仓扫描、增值服务等 |
| PC 桌面端 | [`pc/`](./pc) | — | 仓库作业后台:B2B 订单管理(WinForms 风格) |

## 本地预览

直接双击各子目录的 `index.html` 即可,无需服务器、无需安装任何依赖。

## 目录结构

```
demo/
├── pda/                 # PDA 手持终端原型
│   ├── *.html           # 页面入口(工作台/退仓扫描/增值服务…)
│   ├── css/             # 样式(base.css 共用 / pages.css 各页专属)
│   ├── js/              # 脚本(layout.js / helpers.js / 各页逻辑)
│   ├── docs/            # 设计文档与截图存档
│   └── AGENTS.md        # PDA 开发规范(改 PDA 原型必读)
└── pc/                  # PC 桌面端原型
    ├── *.html           # 页面入口(B2B 订单管理 …)
    ├── css/             # 样式(base.css 共用 / pages.css 各页专属)
    ├── js/              # 脚本(layout.js / helpers.js / 各页逻辑)
    ├── docs/            # 设计文档存档
    └── AGENTS.md        # PC 开发规范(改 PC 原型必读)
```

## 开发规范

- 改 PDA 原型 → 先读 [`pda/AGENTS.md`](./pda/AGENTS.md)
- 改 PC 原型 → 先读 [`pc/AGENTS.md`](./pc/AGENTS.md)
- 新增一端 → 在仓库根新建子目录,放该端的 `index.html` 与资源

---

> 本仓库为产品原型演示用途,页面数据均为示例。
