/* 询价管理 · 询价单列表 */
(function () {
  let active = "全部";

  const content = `
    ${UI.pageHead({
      title: "询价单",
      sub: "线上询价全流程：提交 → 纵队成本 → 港前风控 → 销售报价 → 绑定订单。列表按 SLA 与状态驱动处理。",
      actions: `<button class="btn btn-ghost" id="exportBtn">${UI.icon("download", 14)} 导出</button>
        <button class="btn btn-primary" onclick="location.href='inquiry-new.html'">${UI.icon("plus", 14)} 新建询价</button>`
    })}

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clipboard", 14)}</span>询价单</div><div class="st-val">${Store.list("inquiries").length}<small>条</small></div><div class="st-ft">本月新建 12 · 绑定 2</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>待处理</div><div class="st-val">${Store.list("inquiries").filter(i => ["待成本", "待风控", "待报价"].includes(i.status)).length}<small>条</small></div><div class="st-ft">待成本 2 · 待风控 2 · 待报价 2</div></div>
      <div class="stat alert"><div class="st-hd"><span class="st-ico">${UI.icon("alert", 14)}</span>已超时</div><div class="st-val">${Store.list("inquiries").filter(i => ["待成本", "待风控", "待报价"].includes(i.status) && Fmt.hoursUntil(i.slaDue) < 0).length}<small>条</small></div><div class="st-ft">INQ20261022007 待成本超 5 小时</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("link", 14)}</span>已绑定订单</div><div class="st-val">${Store.list("inquiries").filter(i => i.status === "已绑定").length}<small>条</small></div><div class="st-ft">订单价锁定，后续计费优先取订单价</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="inqTabs">
        ${["全部", "草稿", "待成本", "待风控", "待报价", "已报价", "已绑定", "已失效"].map(s => {
          const n = s === "全部" ? Store.list("inquiries").length : Store.list("inquiries").filter(i => i.status === s).length;
          return `<a class="tab ${s === active ? "active" : ""}" href="javascript:void(0)" data-s="${s}">${s}<span class="count">${n}</span></a>`;
        }).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="询价单号 / 品名 / 客户"></div>
        <div class="field"><label>客户</label><select class="select" id="customer"><option value="">全部</option>${UI.options(Store.list("customers"), "code", "short", "")}</select></div>
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>负责人</label><select class="select" id="owner"><option value="">全部</option>${[...new Set(Store.list("inquiries").map(i => i.owner))].map(o => `<option>${o}</option>`).join("")}</select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="inqTable"></div>
      <div id="inqPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const c = document.getElementById("customer").value;
    const p = document.getElementById("product").value;
    const o = document.getElementById("owner").value;
    return Store.list("inquiries").filter(i => {
      if (active !== "全部" && i.status !== active) return false;
      if (c && i.customer !== c) return false;
      if (p && i.product !== p) return false;
      if (o && i.owner !== o) return false;
      if (kw && !(i.id + i.cargo + Q.customerName(i.customer) + Q.productName(i.product)).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("inqTable").innerHTML = UI.table({
      columns: [
        { label: "询价单", width: "13%", render: (r) => `<div class="t-main mono" style="font-size:11.5px">${r.id}</div><div class="t-sub">${r.createdAt.slice(5, 16)}</div>` },
        { label: "客户", width: "14%", render: (r) => `<div class="t-main">${UI.esc(Q.customerName(r.customer))}</div><div class="t-sub">${r.customer} · ${UI.esc(r.sales)}</div>` },
        { label: "产品 / 目的地", width: "19%", render: (r) => `<div>${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.country} · ${UI.esc(r.city)} ${UI.esc(r.zip)}</div>` },
        { label: "货量", width: "14%", render: (r) => `<span class="small">${Fmt.num(r.weight)} kg</span> / <span class="small">${Fmt.num(r.volume, 2)} m³</span><div class="t-sub">${r.pieces} 件 · ${UI.esc(r.cargo)}</div>` },
        { label: "状态", width: "8%", render: (r) => UI.badge(r.status) },
        { label: "SLA", width: "9%", render: (r) => { if (["已报价", "已绑定"].includes(r.status)) return `<span class="badge b-gray">已完成</span>`; if (r.status === "已失效") return `<span class="badge b-gray">已失效</span>`; if (r.status === "草稿") return `<span class="badge b-gray">未提交</span>`; const s = Fmt.sla(r.slaDue); return `<span class="badge ${s.cls}">${s.text}</span>`; } },
        { label: "负责人", width: "8%", render: (r) => `${UI.esc(r.owner)}<div class="t-sub">${UI.esc(r.sales)}</div>` },
        { label: "操作", width: "15%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button><button class="btn-text" data-copy="${r.id}">复制</button></div>` }
      ],
      rows,
      rowAttrs: (r) => `data-id="${r.id}"`,
      rowHref: (r) => "inquiry-detail.html?id=" + r.id,
      empty: "没有匹配的询价单"
    });
    document.getElementById("inqPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("#inqTable tbody tr[data-id]").forEach(tr => tr.onclick = () => location.href = "inquiry-detail.html?id=" + tr.dataset.id);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); location.href = "inquiry-detail.html?id=" + b.dataset.view; });
    document.querySelectorAll("[data-copy]").forEach(b => b.onclick = (e) => { e.stopPropagation(); copyInquiry(b.dataset.copy); });
  }

  function copyInquiry(id) {
    const src = Store.find("inquiries", id);
    UI.confirm("复制询价单", `以 <b>${src.id}</b> 为基础创建新询价，保留客户、地址、产品与货量，可修改后提交。`, () => {
      const newId = "INQ20261022" + String(Store.list("inquiries").length + 1).padStart(3, "0");
      const copy = JSON.parse(JSON.stringify(src));
      Object.assign(copy, { id: newId, status: "草稿", createdAt: "2026-10-22 20:00", slaDue: "—", cost: null, risk: null, quote: null, bind: null, timeline: [{ time: "2026-10-22 20:00", actor: "杨鑫", action: "复制询价", note: "复制自 " + src.id }] });
      Store.add("inquiries", copy);
      Store.log("询价管理", "复制询价", newId, "复制自 " + src.id);
      UI.toast("已复制为新询价 " + newId);
      setTimeout(() => location.href = "inquiry-detail.html?id=" + newId, 500);
    });
  }

  UI.shell({ active: "inquiry-list", title: "询价单", content });
  render();
  document.querySelectorAll("#inqTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#inqTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "customer", "product", "owner"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("exportBtn").onclick = () => UI.toast("已导出 " + filtered().length + " 条询价单（示例）");
})();
