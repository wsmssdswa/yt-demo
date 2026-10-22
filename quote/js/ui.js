/* ============================================================
   公共 UI：导航外壳、图标、表格、抽屉、弹窗、Toast
   ============================================================ */
(function () {
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    map: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    warehouse: '<path d="M3 21V9l9-6 9 6v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    tag: '<path d="M20.6 13.4L12 22l-9-9V4h9l8.6 8.6a1.4 1.4 0 0 1 0 2z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M16 14h0M8 18h2M12 18h2M16 18h0"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 11h8M8 15h8M8 19h5"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    refresh: '<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h0"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>',
    truck: '<rect x="1" y="3" width="14" height="13" rx="1"/><path d="M15 8h4l4 5v5h-8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    branch: '<circle cx="6" cy="4" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12M18 8v3a4 4 0 0 1-4 4H8"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    lock: '<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    play: '<path d="M5 3l14 9-14 9V3z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h0M3 12h0M3 18h0"/>'
  };

  const NAV = [
    { group: "总览", items: [
      { key: "dashboard", label: "工作台", href: "index.html", icon: "grid" }
    ]},
    { group: "基础配置", items: [
      { key: "base-fee", label: "费用项与额外服务", href: "base-fee.html", icon: "receipt" },
      { key: "base-product", label: "销售产品与映射", href: "base-product.html", icon: "box" },
      { key: "base-customer", label: "客户与销售归属", href: "base-customer.html", icon: "users" },
      { key: "base-template", label: "价格模版", href: "base-template.html", icon: "layers" },
      { key: "base-zone", label: "分区模版", href: "base-zone.html", icon: "map" },
      { key: "base-surcharge", label: "杂费模版", href: "base-surcharge.html", icon: "percent" },
      { key: "base-warehouse", label: "仓点与计费地点", href: "base-warehouse.html", icon: "warehouse" },
      { key: "base-role", label: "角色与数据权限", href: "base-role.html", icon: "shield" }
    ]},
    { group: "产品价格", items: [
      { key: "price-base", label: "产品底价", href: "price-base.html", icon: "tag" },
      { key: "price-publish", label: "公布价 A 价", href: "price-publish.html", icon: "tag" },
      { key: "price-package", label: "套餐价 B–E", href: "price-package.html", icon: "layers" },
      { key: "price-batch", label: "批量调价", href: "price-batch.html", icon: "sliders" },
      { key: "price-history", label: "价格版本与快照", href: "price-history.html", icon: "clock" }
    ]},
    { group: "客户价格", items: [
      { key: "cust-bind", label: "客户套餐绑定", href: "cust-bind.html", icon: "link" },
      { key: "cust-free", label: "客户自由价", href: "cust-free.html", icon: "edit" },
      { key: "cust-query", label: "取价优先级", href: "cust-query.html", icon: "branch" },
      { key: "cust-ai", label: "AI 快速配置", href: "cust-ai.html", icon: "spark" }
    ]},
    { group: "计重计价", items: [
      { key: "rule-weight", label: "计重规则", href: "rule-weight.html", icon: "calc" },
      { key: "rule-calc", label: "计重与地点解析", href: "rule-calc.html", icon: "map" }
    ]},
    { group: "询价管理", items: [
      { key: "inquiry-list", label: "询价单", href: "inquiry-list.html", icon: "clipboard" },
      { key: "inquiry-config", label: "路由与时效", href: "inquiry-config.html", icon: "settings" },
      { key: "inquiry-bind", label: "订单绑定", href: "inquiry-bind.html", icon: "link" }
    ]},
    { group: "试算与报价单", items: [
      { key: "trial", label: "内部运费试算", href: "trial.html", icon: "calc" },
      { key: "quote-list", label: "报价单", href: "quote-list.html", icon: "file" },
      { key: "quote-template", label: "报价单模板", href: "quote-template.html", icon: "layout" },
      { key: "quote-material", label: "报价单资料", href: "quote-material.html", icon: "book" }
    ]},
    { group: "计费与财务", items: [
      { key: "billing-list", label: "计费单", href: "billing-list.html", icon: "activity" },
      { key: "billing-adjust", label: "改价与勘误", href: "billing-adjust.html", icon: "edit" },
      { key: "billing-monitor", label: "计费报文监控", href: "billing-monitor.html", icon: "database" }
    ]},
    { group: "系统", items: [
      { key: "approval", label: "审批中心", href: "approval.html", icon: "checkCircle" },
      { key: "base-audit", label: "操作日志", href: "base-audit.html", icon: "list" }
    ]}
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function icon(name, size) {
    const p = ICONS[name] || ICONS.info;
    return `<svg width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  }

  function findNav(key) {
    for (const g of NAV) {
      const it = g.items.find((i) => i.key === key);
      if (it) return { group: g.group, item: it };
    }
    return { group: "", item: { label: "" } };
  }

  function pendingCount() {
    const ap = Store.list("approvals").filter((a) => a.status === "审批中").length;
    const inq = Store.list("inquiries").filter((i) => ["待成本", "待风控", "待报价"].includes(i.status)).length;
    return ap + inq;
  }

  function navHTML(active) {
    return NAV.map((g) => `
      <div class="nav-group" data-group="${esc(g.group)}">
        <div class="nav-group-label">${esc(g.group)}</div>
        ${g.items.map((it) => {
          const badge = it.key === "approval" ? Store.list("approvals").filter((a) => a.status === "审批中").length
            : it.key === "inquiry-list" ? Store.list("inquiries").filter((i) => ["待成本", "待风控", "待报价"].includes(i.status)).length : 0;
          return `<a class="nav-item ${it.key === active ? "active" : ""}" href="${it.href}" data-key="${it.key}" data-label="${esc(it.label)}">
            ${icon(it.icon, 15)}<span>${esc(it.label)}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ""}
          </a>`;
        }).join("")}
      </div>`).join("");
  }

  function shell(opts) {
    const nav = findNav(opts.active);
    const crumbs = opts.crumbs || [nav.group, nav.item.label].filter(Boolean);
    const crumbHTML = crumbs.map((c, i) => i === crumbs.length - 1
      ? `<span class="cur">${esc(c)}</span>`
      : `<span>${esc(c)}</span><span class="sep">/</span>`).join("");
    const todos = Store.list("approvals").filter((a) => a.status === "审批中").length
      + Store.list("inquiries").filter((i) => ["待成本", "待风控", "待报价"].includes(i.status)).length
      + Store.list("bills").filter((b) => b.status === "计费失败").length;

    document.title = (opts.title ? opts.title + " · " : "") + "B2B 报价系统";
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="logo">
            <span class="logo-mark">Q</span>
            <span class="logo-text"><strong>B2B 报价系统</strong><span>QUOTATION CENTER</span></span>
          </div>
          <div class="nav-search">
            ${icon("search", 14)}
            <input id="navSearch" placeholder="搜索菜单" autocomplete="off">
          </div>
          <nav class="nav" id="navRoot">${navHTML(opts.active)}</nav>
          <div class="sidebar-foot">
            <div class="sf-title"><span class="sf-dot"></span>演示环境 · UAT</div>
            <div class="sf-sub">数据均为示例，交互可点击<br>价格与计费口径以评审结论为准</div>
          </div>
        </aside>
        <div class="main">
          <header class="topbar">
            <div class="crumbs">${crumbHTML}</div>
            <div class="topbar-spacer"></div>
            <div class="global-search">
              ${icon("search", 14)}
              <input id="globalSearch" placeholder="搜索客户、产品、单号…" autocomplete="off">
            </div>
            <span class="env-chip">UAT</span>
            <button class="top-icon" id="bellBtn" title="待办">${icon("bell", 17)}${todos ? '<span class="dot"></span>' : ""}</button>
            <button class="top-icon" id="helpBtn" title="演示说明">${icon("info", 17)}</button>
            <div class="user-chip" id="userChip">
              <span class="avatar">杨</span>
              <span class="user-meta"><strong>杨鑫</strong><span>价格管理员</span></span>
              ${icon("down", 12)}
            </div>
          </header>
          <main class="content"><div class="page">${opts.content || ""}</div></main>
        </div>
      </div>
      <div id="overlayRoot"></div>
      <div class="toast-wrap" id="toastWrap"></div>`;

    const search = document.getElementById("navSearch");
    if (search) {
      search.addEventListener("input", () => {
        const q = search.value.trim().toLowerCase();
        document.querySelectorAll("#navRoot .nav-item").forEach((el) => {
          el.style.display = !q || el.dataset.label.toLowerCase().includes(q) ? "" : "none";
        });
        document.querySelectorAll("#navRoot .nav-group").forEach((g) => {
          const visible = [...g.querySelectorAll(".nav-item")].some((el) => el.style.display !== "none");
          g.style.display = visible ? "" : "none";
        });
      });
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const first = [...document.querySelectorAll("#navRoot .nav-item")].find((el) => el.style.display !== "none");
          if (first) location.href = first.getAttribute("href");
        }
      });
    }

    const gs = document.getElementById("globalSearch");
    if (gs) {
      gs.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const q = gs.value.trim().toLowerCase();
          if (!q) return;
          const hit = NAV.flatMap((g) => g.items).find((i) => i.label.toLowerCase().includes(q));
          if (hit) location.href = hit.href;
          else UI.toast("原型内未找到“" + gs.value + "”，可到对应列表页搜索", "warn");
        }
      });
    }

    document.getElementById("bellBtn").addEventListener("click", showTodos);
    document.getElementById("helpBtn").addEventListener("click", showHelp);
    document.getElementById("userChip").addEventListener("click", showUserMenu);
    bindRowLinks();
    return document.querySelector(".content");
  }

  function showTodos() {
    const ap = Store.list("approvals").filter((a) => a.status === "审批中");
    const inq = Store.list("inquiries").filter((i) => ["待成本", "待风控", "待报价"].includes(i.status));
    const fails = Store.list("bills").filter((b) => b.status === "计费失败");
    const body = `
      <div class="stack">
        <div>
          <div class="row mb-8"><strong>待审批</strong><span class="badge b-amber">${ap.length}</span></div>
          <div class="todo-list card">
            ${ap.slice(0, 4).map((a) => `<div class="todo" data-href="approval.html">
              <span class="tico a">${icon("checkCircle", 15)}</span>
              <span class="tt"><strong>${esc(a.title)}</strong><span>${esc(a.applicant)} · ${esc(a.submittedAt)}</span></span>
              <span class="tm">${esc(a.type)}</span></div>`).join("") || '<div class="empty"><span>暂无</span></div>'}
          </div>
        </div>
        <div>
          <div class="row mb-8"><strong>待处理询价</strong><span class="badge b-amber">${inq.length}</span></div>
          <div class="todo-list card">
            ${inq.slice(0, 4).map((i) => {
              const s = Fmt.sla(i.slaDue);
              return `<div class="todo" data-href="inquiry-detail.html?id=${i.id}">
                <span class="tico t">${icon("clipboard", 15)}</span>
                <span class="tt"><strong>${esc(i.id)} · ${esc(Q.customerName(i.customer))}</strong><span>${esc(i.status)} · ${esc(Q.productName(i.product))}</span></span>
                <span class="badge ${s.cls}">${s.text}</span></div>`;
            }).join("") || '<div class="empty"><span>暂无</span></div>'}
          </div>
        </div>
        <div>
          <div class="row mb-8"><strong>计费异常</strong><span class="badge b-red">${fails.length}</span></div>
          <div class="todo-list card">
            ${fails.map((b) => `<div class="todo" data-href="billing-detail.html?id=${b.id}">
              <span class="tico r">${icon("alert", 15)}</span>
              <span class="tt"><strong>${esc(b.id)} · ${esc(Q.customerName(b.customer))}</strong><span>${esc(b.error || "计费失败")}</span></span>
              <span class="tm">${esc(b.updated)}</span></div>`).join("") || '<div class="empty"><span>暂无</span></div>'}
          </div>
        </div>
      </div>`;
    const d = drawer({ title: "待办中心", sub: "审批、询价与计费异常", body, width: 480 });
    d.el.querySelectorAll("[data-href]").forEach((el) => el.addEventListener("click", () => location.href = el.dataset.href));
  }

  function showHelp() {
    modal({
      title: "演示说明",
      size: "sm",
      body: `<div class="stack small" style="line-height:1.8">
        <p>这是 <b>B2B 报价系统</b> 的交互原型，按《B2B 客户报价 WBS》91 个包整理，共 36 个页面。</p>
        <p>所有数据均为示例。可点击左侧菜单、列表行、按钮，走通“主数据 → 产品价格 → 客户价格 → 询价 → 试算/报价单 → 计费”的主链路。</p>
        <p>演示数据保存在浏览器本地，右上角头像菜单可重置。</p>
        <p class="muted">页面清单与 WBS 映射见 <a href="docs/page-map.md" target="_blank">docs/page-map.md</a>。</p>
      </div>`,
      footer: `<button class="btn btn-primary" onclick="UI.closeModal()">知道了</button>`
    });
  }

  function showUserMenu() {
    const old = document.querySelector(".user-pop");
    if (old) { old.remove(); return; }
    const chip = document.getElementById("userChip");
    const pop = document.createElement("div");
    pop.className = "user-pop";
    pop.innerHTML = `
      <div class="up-hd"><span class="avatar">杨</span><div><strong>杨鑫</strong><span>价格管理员 · 全部价格组</span></div></div>
      <button data-act="reset">${icon("refresh", 14)} 重置演示数据</button>
      <button data-act="help">${icon("info", 14)} 演示说明</button>
      <button data-act="map">${icon("book", 14)} 页面清单</button>`;
    chip.appendChild(pop);
    pop.addEventListener("click", (e) => {
      const act = e.target.closest("button")?.dataset.act;
      if (!act) return;
      pop.remove();
      if (act === "reset") confirmDialog("重置演示数据", "将清除本地改动，恢复到初始示例数据。", () => { Store.reset(); location.reload(); });
      if (act === "help") showHelp();
      if (act === "map") location.href = "docs/page-map.md";
    });
    setTimeout(() => document.addEventListener("click", function h(ev) {
      if (!pop.contains(ev.target) && !chip.contains(ev.target)) { pop.remove(); document.removeEventListener("click", h); }
    }), 0);
  }

  /* ---------- 通用片段 ---------- */
  function pageHead(o) {
    return `<div class="page-hd">
      <div><h1>${esc(o.title)}</h1>${o.sub ? `<div class="sub">${o.sub}</div>` : ""}</div>
      ${o.actions ? `<div class="actions">${o.actions}</div>` : ""}
    </div>`;
  }

  function card(o) {
    return `<section class="card ${o.cls || ""}">
      ${o.title ? `<div class="card-hd"><h3>${esc(o.title)}</h3>${o.sub ? `<span class="sub">${o.sub}</span>` : ""}${o.right ? `<div class="right">${o.right}</div>` : ""}</div>` : ""}
      <div class="card-bd ${o.flush ? "flush" : ""}">${o.body || ""}</div>
      ${o.footer ? `<div class="card-ft">${o.footer}</div>` : ""}
    </section>`;
  }

  function badge(text, cls) {
    return `<span class="badge ${cls || statusCls(text)}">${esc(text)}</span>`;
  }

  function statusCls(s) {
    const map = {
      "生效": "b-green", "启用": "b-green", "已生效": "b-green", "已通过": "b-green", "已发布": "b-green",
      "成功": "b-green", "已送达": "b-green", "已计费": "b-green", "已绑定": "b-teal", "已报价": "b-teal",
      "审批中": "b-amber", "待成本": "b-amber", "待风控": "b-amber", "待报价": "b-amber", "待发布": "b-amber",
      "待回传": "b-amber", "生成中": "b-amber", "重算中": "b-amber", "待生效": "b-amber", "待锁价": "b-amber",
      "待计费": "b-amber", "待补齐": "b-amber", "待识别": "b-amber",
      "已失效": "b-gray", "停用": "b-gray", "草稿": "b-gray", "未出账": "b-gray", "—": "b-gray",
      "已出账": "b-blue", "幂等返回": "b-blue", "待发布": "b-amber",
      "已驳回": "b-red", "计费失败": "b-red", "生成失败": "b-red", "失败": "b-red"
    };
    return map[s] || "b-gray";
  }

  function table(o) {
    const cols = o.columns || [];
    const rows = o.rows || [];
    const head = cols.map((c) => `<th class="${c.align === "right" ? "num" : c.align === "center" ? "center" : ""}" ${c.width ? `style="width:${c.width}"` : ""}>${c.label}</th>`).join("");
    const body = rows.length ? rows.map((r, idx) => {
      const href = typeof o.rowHref === "function" ? o.rowHref(r) : "";
      const attrs = o.rowAttrs ? o.rowAttrs(r) : "";
      return `<tr class="${href ? "click" : ""} ${o.rowClass ? o.rowClass(r) : ""}" ${href ? `data-href="${esc(href)}"` : ""} ${attrs}>
        ${cols.map((c) => {
          const v = c.render ? c.render(r, idx) : esc(r[c.key] == null ? "—" : r[c.key]);
          return `<td class="${c.align === "right" ? "num" : c.align === "center" ? "center" : ""} ${c.cls || ""}">${v}</td>`;
        }).join("")}
      </tr>`;
    }).join("") : `<tr><td colspan="${cols.length}">${empty(o.empty || "暂无数据", o.emptySub || "调整筛选条件后再试")}</td></tr>`;
    return `<div class="table-wrap"><table class="table ${o.compact ? "compact" : ""} ${o.className || ""}">
      <thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function empty(text, sub) {
    return `<div class="empty"><div class="ico">${icon("receipt", 21)}</div><strong>${esc(text)}</strong><span>${esc(sub || "")}</span></div>`;
  }

  function pager(total, page, size) {
    page = page || 1; size = size || 20;
    const pages = Math.max(1, Math.ceil(total / size));
    let btns = "";
    for (let i = 1; i <= Math.min(pages, 5); i++) btns += `<button class="${i === page ? "active" : ""}">${i}</button>`;
    return `<div class="pager"><span class="info">共 ${total} 条 · 每页 ${size} 条</span>
      <button disabled>${icon("left", 12)}</button>${btns}<button ${pages <= 1 ? "disabled" : ""}>${icon("right", 12)}</button></div>`;
  }

  function tabs(items, active) {
    return `<div class="tabs">${items.map((t) => `<a class="tab ${t.key === active ? "active" : ""}" href="${t.href || "javascript:void(0)"}" data-tab="${t.key}">${esc(t.label)}${t.count != null ? `<span class="count">${t.count}</span>` : ""}</a>`).join("")}</div>`;
  }

  function options(list, valueKey, labelKey, selected, placeholder) {
    const ph = placeholder ? `<option value="">${esc(placeholder)}</option>` : "";
    return ph + list.map((x) => `<option value="${esc(x[valueKey])}" ${String(x[valueKey]) === String(selected) ? "selected" : ""}>${esc(x[labelKey])}</option>`).join("");
  }

  function bindRowLinks(scope) {
    (scope || document).querySelectorAll("[data-href]").forEach((el) => {
      if (el.dataset.bound) return;
      el.dataset.bound = "1";
      el.addEventListener("click", (e) => {
        if (e.target.closest("button, a, input, select")) return;
        location.href = el.dataset.href;
      });
    });
  }

  /* ---------- 浮层 ---------- */
  function overlay(kind) {
    const el = document.createElement("div");
    el.className = "overlay" + (kind === "center" ? " center" : "");
    document.getElementById("overlayRoot").appendChild(el);
    return el;
  }

  let openCount = 0;

  function drawer(o) {
    const ov = overlay("right");
    ov.innerHTML = `<div class="drawer ${o.wide ? "wide" : ""}" style="${o.width ? `width:${o.width}px` : ""}">
      <div class="drawer-hd"><div><h3>${esc(o.title)}</h3>${o.sub ? `<div class="sub">${o.sub}</div>` : ""}</div>
        <button class="btn-icon x" data-close>${icon("x", 17)}</button></div>
      <div class="drawer-bd">${o.body || ""}</div>
      ${o.footer ? `<div class="drawer-ft">${o.footer}</div>` : ""}
    </div>`;
    openCount++;
    const close = () => { ov.remove(); openCount = Math.max(0, openCount - 1); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.querySelector("[data-close]").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    if (o.onMount) o.onMount(ov.querySelector(".drawer"), close);
    return { el: ov, close };
  }

  let modalCtx = null;
  function modal(o) {
    const ov = overlay("center");
    ov.innerHTML = `<div class="modal ${o.size || ""}">
      <div class="modal-hd"><h3>${esc(o.title)}</h3><button class="btn-icon x" data-close>${icon("x", 17)}</button></div>
      <div class="modal-bd">${o.body || ""}</div>
      ${o.footer ? `<div class="modal-ft">${o.footer}</div>` : ""}</div>`;
    openCount++;
    modalCtx = ov;
    const close = () => { ov.remove(); modalCtx = null; openCount = Math.max(0, openCount - 1); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.querySelector("[data-close]").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    if (o.onMount) o.onMount(ov.querySelector(".modal"), close);
    return { el: ov, close };
  }
  function closeModal() { if (modalCtx) { modalCtx.remove(); modalCtx = null; } }

  function confirmDialog(title, message, onOk, opts) {
    const o = opts || {};
    const m = modal({
      title, size: "sm",
      body: `<div class="small" style="line-height:1.7;color:var(--ink-2)">${message}</div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" data-cancel>取消</button>
        <button class="btn ${o.danger ? "btn-danger-solid" : "btn-primary"}" data-ok>${esc(o.okText || "确认")}</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-ok]").onclick = () => { close(); if (onOk) onOk(); };
      }
    });
    return m;
  }

  function toast(msg, type) {
    const wrap = document.getElementById("toastWrap");
    if (!wrap) return;
    const t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    const ic = type === "err" ? "xCircle" : type === "warn" ? "alert" : "checkCircle";
    t.innerHTML = `<span class="ti">${icon(ic, 11)}</span><span class="tx">${msg}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(-4px)"; t.style.transition = ".2s"; setTimeout(() => t.remove(), 220); }, 2800);
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function go(url) { location.href = url; }

  /* 表单读取 */
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }
  function checked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  }

  window.UI = {
    NAV, icon, shell, pageHead, card, badge, statusCls, table, empty, pager, tabs,
    options, bindRowLinks, drawer, modal, closeModal, confirm: confirmDialog, toast, param, go, val, checked, esc,
    closeCount: () => openCount
  };
})();
