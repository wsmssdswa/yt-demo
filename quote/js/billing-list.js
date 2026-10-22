/* 计费与财务 · 计费单列表 */
(function () {
  let active = "全部";

  const content = `
    ${UI.pageHead({
      title: "计费单",
      sub: "签入/到齐/重量勘误/增值变更触发计费；计费单展示计费重、金额、来源与回传状态。",
      actions: `<button class="btn btn-ghost" id="exportBtn">${UI.icon("download", 14)} 导出</button>
        <button class="btn btn-ghost" onclick="location.href='billing-monitor.html'">${UI.icon("database", 14)} 报文监控</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>计费口径：</b>计价失败返回明确错误，不以 0 元兜底；已出账账单不回溯，改价/勘误走审批。订单价由 PQM 计算回写；CCOS 重量勘误会覆盖成交价（不校验出账），属于待确认风险。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("activity", 14)}</span>本月计费单</div><div class="st-val">${Store.list("bills").length}<small>张</small></div><div class="st-ft">CNY 7 张 · USD 1 张</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("wallet", 14)}</span>计费金额</div><div class="st-val">21.2<small>万</small></div><div class="st-ft">CNY 21.20 万 + USD 2,041.09</div></div>
      <div class="stat alert"><div class="st-hd"><span class="st-ico">${UI.icon("alert", 14)}</span>计费异常</div><div class="st-val">${Store.list("bills").filter(b => b.status === "计费失败").length}<small>张</small></div><div class="st-ft">P008/加拿大无生效公布价</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("refresh", 14)}</span>待回传 / 重算</div><div class="st-val">${Store.list("bills").filter(b => ["待回传", "重算中"].includes(b.status)).length}<small>张</small></div><div class="st-ft">OMS 回传 1 · 重量勘误重算 1</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="bTabs">
        ${["全部", "待计费", "待回传", "重算中", "已计费", "已出账", "计费失败"].map(s => {
          const n = s === "全部" ? Store.list("bills").length : Store.list("bills").filter(b => b.status === s).length;
          return `<a class="tab ${s === active ? "active" : ""}" href="javascript:void(0)" data-s="${s}">${s}<span class="count">${n}</span></a>`;
        }).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="计费单号 / 主单号"></div>
        <div class="field"><label>客户</label><select class="select" id="customer"><option value="">全部</option>${UI.options(Store.list("customers"), "code", "short", "")}</select></div>
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>来源</label><select class="select" id="source"><option value="">全部</option>${[...new Set(Store.list("bills").map(b => b.source))].map(s => `<option>${s}</option>`).join("")}</select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="bTable"></div>
      <div id="bPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const c = document.getElementById("customer").value;
    const p = document.getElementById("product").value;
    const src = document.getElementById("source").value;
    return Store.list("bills").filter(b => {
      if (active !== "全部" && b.status !== active) return false;
      if (c && b.customer !== c) return false;
      if (p && b.product !== p) return false;
      if (src && b.source !== src) return false;
      if (kw && !(b.id + b.orderId + Q.customerName(b.customer)).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("bTable").innerHTML = UI.table({
      columns: [
        { label: "计费单", width: "15%", render: r => `<div class="t-main mono" style="font-size:11.5px">${r.id}</div><div class="t-sub">${r.updated}</div>` },
        { label: "主单 / 客户", width: "17%", render: r => `<div class="t-main mono" style="font-size:11.5px">${r.orderId}</div><div class="t-sub">${Q.customerName(r.customer)}</div>` },
        { label: "产品", width: "16%", render: r => Q.productName(r.product) },
        { label: "计费重", width: "9%", align: "right", render: r => `<span class="price-cell">${Fmt.num(r.chargeWeight, 1)}</span> <span class="tiny muted">kg</span>` },
        { label: "金额", width: "12%", align: "right", render: r => r.amount ? `<span class="price-cell">${Fmt.money(r.amount, r.currency)}</span>` : `<span class="red small">计费失败</span>` },
        { label: "状态", width: "8%", render: r => UI.badge(r.status) },
        { label: "来源", width: "9%", render: r => `<span class="tiny">${UI.esc(r.source)}</span>` },
        { label: "回传", width: "8%", render: r => r.receipt ? `<div class="row" style="gap:4px">${["ccos", "oms", "ars"].map(k => `<span class="dot-tag"><i class="${r.receipt[k] === "成功" || r.receipt[k] === "已出账" ? "g" : r.receipt[k] === "失败" ? "r" : "a"}"></i>${k.toUpperCase()}</span>`).join("")}</div>` : "—" },
        { label: "操作", width: "10%", render: r => `<div class="actions"><button class="btn-text" data-view="${r.id}">详情</button>${r.status !== "已出账" ? `<button class="btn-text" data-recalc="${r.id}">重算</button>` : ""}</div>` }
      ],
      rows, rowAttrs: r => `data-id="${r.id}"`, empty: "没有匹配的计费单"
    });
    document.getElementById("bPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = e => { e.stopPropagation(); location.href = "billing-detail.html?id=" + b.dataset.view; });
    document.querySelectorAll("[data-recalc]").forEach(b => b.onclick = e => { e.stopPropagation(); recalc(b.dataset.recalc); });
    document.querySelectorAll("#bTable tbody tr[data-id]").forEach(tr => tr.onclick = () => location.href = "billing-detail.html?id=" + tr.dataset.id);
  }

  function recalc(id) {
    const b = Store.find("bills", id);
    UI.toast("正在重算 " + id + "…");
    Store.update("bills", id, { status: "重算中", updated: "2026-10-22 20:00" });
    Store.log("计费", "发起重算", id, "手工触发重算");
    render();
    setTimeout(() => {
      Store.update("bills", id, { status: "已计费", updated: "2026-10-22 20:00" });
      UI.toast("重算完成：" + id); render();
    }, 1500);
  }

  UI.shell({ active: "billing-list", title: "计费单", content });
  render();
  document.querySelectorAll("#bTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#bTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "customer", "product", "source"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("exportBtn").onclick = () => UI.toast("已导出 " + filtered().length + " 张计费单（示例）");
})();
