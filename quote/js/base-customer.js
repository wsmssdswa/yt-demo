/* 基础配置 · 客户与销售归属 */
(function () {
  const content = `
    ${UI.pageHead({
      title: "客户主数据与销售归属",
      sub: "CRM 同步客户代码、可用状态与销售归属，作为按客户配价、报价单生成与数据权限的依据。",
      actions: `<button class="btn btn-ghost" id="syncBtn">${UI.icon("refresh", 14)} 同步 CRM</button>
        <button class="btn btn-primary" id="priceBtn">${UI.icon("tag", 14)} 查看客户价格</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>权限口径：</b>销售只能看到本人名下客户的价格与报价单；价格管理员按价格组授权。客户新增、变更、失效以 CRM 为准，本系统不手工建档。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("users", 14)}</span>客户总数</div><div class="st-val">${Store.list("customers").length}<small>家</small></div><div class="st-ft">VIP 2 · 重点 2 · 普通 2</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>启用中</div><div class="st-val">${Store.list("customers").filter(c => c.status === "启用").length}<small>家</small></div><div class="st-ft">无冻结/失效客户</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("link", 14)}</span>已绑定套餐</div><div class="st-val">${Store.list("custBindings").filter(b => b.status === "生效").length}<small>条</small></div><div class="st-ft">覆盖 5 家客户 / 4 个产品</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>最近同步</div><div class="st-val" style="font-size:18px;letter-spacing:0">10-22 06:00</div><div class="st-ft">CRM 增量同步成功</div></div>
    </div>

    <section class="card mt-16">
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="客户名称 / 代码 / 联系人"></div>
        <div class="field"><label>销售归属</label><select class="select" id="sales"><option value="">全部</option>${[...new Set(Store.list("customers").map(c => c.sales))].map(s => `<option>${s}</option>`).join("")}</select></div>
        <div class="field"><label>等级</label><select class="select" id="level"><option value="">全部</option><option>VIP</option><option>重点</option><option>普通</option></select></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>启用</option><option>停用</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="custTable"></div>
      <div id="custPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const sales = document.getElementById("sales").value;
    const level = document.getElementById("level").value;
    const st = document.getElementById("st").value;
    return Store.list("customers").filter((c) => {
      if (sales && c.sales !== sales) return false;
      if (level && c.level !== level) return false;
      if (st && c.status !== st) return false;
      if (kw && !(c.name + c.code + c.contact + c.sales).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("custTable").innerHTML = UI.table({
      columns: [
        { label: "客户", width: "26%", render: (r) => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub"><span class="code-tag">${r.code}</span> ${UI.esc(r.contact)}</div>` },
        { label: "销售归属", width: "10%", render: (r) => `<div>${UI.esc(r.sales)}</div><div class="t-sub">${UI.esc(r.group)}</div>` },
        { label: "等级", width: "7%", render: (r) => UI.badge(r.level, r.level === "VIP" ? "b-purple" : r.level === "重点" ? "b-blue" : "b-gray") },
        { label: "价格条数", width: "8%", align: "right", render: (r) => `<span class="price-cell">${r.priceCount}</span>` },
        { label: "信用政策", width: "11%", key: "credit" },
        { label: "合作起始", width: "9%", key: "joined" },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status) },
        { label: "操作", width: "16%", render: (r) => `<div class="actions"><button class="btn-text" data-edit="${r.code}">编辑归属</button><button class="btn-text" data-price="${r.code}">客户价格</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.code}"`, empty: "没有匹配的客户"
    });
    document.getElementById("custPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-edit]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openEdit(b.dataset.edit); });
    document.querySelectorAll("[data-price]").forEach(b => b.onclick = (e) => { e.stopPropagation(); location.href = "cust-free.html?customer=" + b.dataset.price; });
    document.querySelectorAll("#custTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openEdit(tr.dataset.id));
  }

  function openEdit(code) {
    const c = Store.find("customers", code);
    UI.drawer({
      title: c.name,
      sub: `${c.code} · 合作起始 ${c.joined} · CRM 同步`,
      body: `<div class="stack">
        <div class="banner">${UI.icon("info", 15)}<div>客户名称、联系方式、可用状态来自 CRM；销售归属变更会影响客户价格与报价单的可见范围。</div></div>
        <div class="form-grid">
          <div class="field"><label>客户代码</label><input class="input" value="${c.code}" disabled></div>
          <div class="field"><label>客户简称</label><input class="input" value="${UI.esc(c.short)}" disabled></div>
          <div class="field span-2"><label>客户全称</label><input class="input" value="${UI.esc(c.name)}" disabled></div>
          <div class="field"><label>销售归属<span class="req">*</span></label><select class="select" id="ecSales">${[...new Set(Store.list("customers").map(x => x.sales))].map(s => `<option ${s === c.sales ? "selected" : ""}>${s}</option>`).join("")}</select></div>
          <div class="field"><label>价格组<span class="req">*</span></label><select class="select" id="ecGroup">${["华东一组", "华东二组", "华南一组", "华南二组", "海外组"].map(g => `<option ${g === c.group ? "selected" : ""}>${g}</option>`).join("")}</select></div>
          <div class="field"><label>客户等级</label><select class="select" id="ecLevel">${["VIP", "重点", "普通"].map(l => `<option ${l === c.level ? "selected" : ""}>${l}</option>`).join("")}</select></div>
          <div class="field"><label>状态</label><select class="select" id="ecStatus"><option ${c.status === "启用" ? "selected" : ""}>启用</option><option ${c.status === "停用" ? "selected" : ""}>停用</option></select></div>
        </div>
        <div class="divider"></div>
        <div class="section-title">当前生效的价格关系</div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>产品</th><th>套餐绑定</th><th>自由价</th><th>有效期</th></tr></thead><tbody>
          ${["P001", "P002", "P003", "P006"].map(pid => {
            const b = Store.list("custBindings").find(x => x.customer === c.code && x.product === pid && x.status === "生效");
            const f = Store.list("custPrices").filter(x => x.customer === c.code && x.product === pid && x.status === "生效");
            if (!b && !f.length) return "";
            return `<tr><td>${Q.productName(pid)}</td><td>${b ? "套餐 " + b.package : "—"}</td><td>${f.length ? f.map(x => Q.feeName(x.fee) + " " + x.price + " 元").join("，") : "—"}</td><td>${b ? b.from + " ~ " + b.to : f[0].from + " ~ " + f[0].to}</td></tr>`;
          }).join("") || `<tr><td colspan="4" class="muted">暂无客户价，取公布价</td></tr>`}
        </tbody></table></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>停用客户后，未绑定订单的报价将不可用；已绑定订单的订单价仍按原价执行。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          Store.update("customers", c.code, {
            sales: UI.val("ecSales"), group: UI.val("ecGroup"), level: UI.val("ecLevel"), status: UI.val("ecStatus")
          });
          Store.log("基础配置", "更新客户归属", c.name, "销售/价格组/等级变更");
          close(); UI.toast("客户归属已保存"); render();
        };
      }
    });
  }

  UI.shell({ active: "base-customer", title: "客户与销售归属", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "sales", "level", "st"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("syncBtn").onclick = () => {
    Store.log("基础配置", "同步", "CRM 客户", "增量同步 6 个客户，无变化");
    UI.toast("CRM 同步完成：6 个客户，无变化");
  };
  document.getElementById("priceBtn").onclick = () => location.href = "cust-free.html";
})();
