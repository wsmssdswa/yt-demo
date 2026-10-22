/* 客户价格 · 客户套餐绑定 */
(function () {
  const content = `
    ${UI.pageHead({
      title: "客户套餐绑定",
      sub: "按客户绑定套餐，不同产品可绑不同套餐；绑定关系带有效期，到期自动回落公布价。",
      actions: `<button class="btn btn-primary" id="batchBtn">${UI.icon("users", 14)} 批量绑定</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>取价顺序：</b>订单价 &gt; 客户自由价 &gt; 客户套餐（E &gt; D &gt; C &gt; B）&gt; 公布价 A。绑定只影响基础运费；附加费仍按杂费模版与客户自由价计算。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("link", 14)}</span>绑定关系</div><div class="st-val">${Store.list("custBindings").length}<small>条</small></div><div class="st-ft">覆盖 5 家客户 / 4 个产品</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>生效中</div><div class="st-val">${Store.list("custBindings").filter(b => b.status === "生效").length}<small>条</small></div><div class="st-ft">最近更新 2026-10-08</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>待生效</div><div class="st-val">${Store.list("custBindings").filter(b => b.status === "待生效").length}<small>条</small></div><div class="st-ft">锦联欧洲线 11-01 生效</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("percent", 14)}</span>平均套餐层级</div><div class="st-val">D<small>档</small></div><div class="st-ft">E 2 家 · D 3 家 · C 2 家 · B 1 家</div></div>
    </div>

    <section class="card mt-16">
      <div class="filterbar">
        <div class="field"><label>客户</label><select class="select" id="customer"><option value="">全部</option>${UI.options(Store.list("customers"), "code", "short", "")}</select></div>
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>生效</option><option>待生效</option><option>已失效</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="bindTable"></div>
      <div id="bindPager"></div>
    </section>`;

  function filtered() {
    const c = document.getElementById("customer").value;
    const p = document.getElementById("product").value;
    const s = document.getElementById("st").value;
    return Store.list("custBindings").filter(b => (!c || b.customer === c) && (!p || b.product === p) && (!s || b.status === s));
  }

  function render() {
    const rows = filtered();
    document.getElementById("bindTable").innerHTML = UI.table({
      columns: [
        { label: "客户", width: "22%", render: (r) => `<div class="t-main">${UI.esc(Q.customerName(r.customer))}</div><div class="t-sub">${r.customer} · ${Q.customer(r.customer).sales}</div>` },
        { label: "产品", width: "24%", render: (r) => `<div>${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.product}</div>` },
        { label: "绑定套餐", width: "12%", render: (r) => `<span class="badge b-teal">${r.package} 套餐</span>` },
        { label: "套餐单价", width: "11%", render: (r) => {
          const pkg = Store.list("packages").find(p => p.product === r.product && p.status === "生效");
          return pkg ? `<span class="price-cell">${Fmt.num(pkg[r.package], 2)}</span> <span class="tiny muted">元/kg</span>` : "—";
        }},
        { label: "有效期", width: "17%", render: (r) => `<span class="tiny">${r.from} ~ ${r.to}</span>` },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status) },
        { label: "更新", width: "11%", render: (r) => `<span class="tiny muted">${r.by} · ${r.updated}</span>` },
        { label: "操作", width: "12%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">变更</button><button class="btn-text" style="color:var(--red)" data-unbind="${r.id}">解绑</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的绑定关系"
    });
    document.getElementById("bindPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("[data-unbind]").forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      const r = Store.find("custBindings", b.dataset.unbind);
      UI.confirm("解绑套餐", `将解除 <b>${Q.customerName(r.customer)}</b> 在 <b>${Q.productName(r.product)}</b> 上的套餐 ${r.package} 绑定，之后按公布价取价。`, () => {
        Store.update("custBindings", r.id, { status: "已失效", updated: "2026-10-22" });
        Store.log("客户价格", "解绑套餐", Q.customerName(r.customer), Q.productName(r.product) + " 套餐 " + r.package + " 解绑");
        UI.toast("已解绑，客户回落公布价"); render();
      }, { danger: true, okText: "确认解绑" });
    });
    document.querySelectorAll("#bindTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const b = Store.find("custBindings", id);
    const pkg = Store.list("packages").find(p => p.product === b.product && p.status === "生效");
    const pub = Store.list("publishPrices").find(p => p.product === b.product && p.status === "生效");
    UI.drawer({
      title: Q.customerName(b.customer) + " · " + Q.productName(b.product),
      sub: `${b.id} · 当前套餐 ${b.package} · ${b.from} ~ ${b.to}`,
      body: `<div class="stack">
        <div class="row">
          <div><div class="tiny muted">当前套餐单价</div><div class="price-big">${pkg ? Fmt.num(pkg[b.package], 2) : "—"}<small>元/kg</small></div></div>
          <div style="margin-left:24px"><div class="tiny muted">公布价 A</div><div class="price-big" style="font-size:16px;color:var(--ink-3)">${pub ? Fmt.num(pub.price, 2) : "—"}<small>元/kg</small></div></div>
          <div style="margin-left:24px"><div class="tiny muted">状态</div><div class="mt-4">${UI.badge(b.status)}</div></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>套餐<span class="req">*</span></label><select class="select" id="ebPackage">${pkg ? ["B", "C", "D", "E"].map(x => `<option ${x === b.package ? "selected" : ""}>${x}</option>`).join("") : ""}</select></div>
          <div class="field"><label>状态</label><select class="select" id="ebStatus"><option ${b.status === "生效" ? "selected" : ""}>生效</option><option ${b.status === "待生效" ? "selected" : ""}>待生效</option><option ${b.status === "已失效" ? "selected" : ""}>已失效</option></select></div>
          <div class="field"><label>生效日期</label><input class="input" id="ebFrom" type="date" value="${b.from}"></div>
          <div class="field"><label>失效日期</label><input class="input" id="ebTo" type="date" value="${b.to}"></div>
        </div>
        <div class="section-title">套餐与公布价对比</div>
        <div class="price-matrix-wrap"><table class="price-matrix"><thead><tr><th>层级</th><th>B</th><th>C</th><th>D</th><th>E</th><th>A</th></tr></thead>
          <tbody><tr><td>单价</td>${["B", "C", "D", "E"].map(k => `<td class="${k === b.package ? "col-hit" : ""}">${pkg ? Fmt.num(pkg[k], 2) : "—"}</td>`).join("")}<td>${pub ? Fmt.num(pub.price, 2) : "—"}</td></tr></tbody></table></div>
        <div class="banner">${UI.icon("info", 15)}<div>到期后自动回落公布价，不产生“失效价”；如客户需要续价，请延长有效期或重新绑定。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          Store.update("custBindings", b.id, { package: UI.val("ebPackage"), status: UI.val("ebStatus"), from: UI.val("ebFrom"), to: UI.val("ebTo"), updated: "2026-10-22", by: "杨鑫" });
          Store.log("客户价格", "变更套餐绑定", Q.customerName(b.customer), Q.productName(b.product) + " → " + UI.val("ebPackage") + " 套餐");
          close(); UI.toast("套餐绑定已保存"); render();
        };
      }
    });
  }

  function openBatch() {
    UI.modal({
      title: "批量绑定客户套餐",
      size: "lg",
      body: `<div class="stack">
        <div class="field"><label>选择客户（可多选）</label>
          <div class="row wrap" style="gap:10px">
            ${Store.list("customers").map(c => `<label class="check"><input type="checkbox" class="bbCust" value="${c.code}"> ${c.short}（${c.name.slice(0, 8)}…）</label>`).join("")}
          </div>
        </div>
        <div class="form-grid cols-3">
          <div class="field"><label>产品<span class="req">*</span></label><select class="select" id="bbProduct">${UI.options(Store.list("products"), "code", "name", "P001")}</select></div>
          <div class="field"><label>套餐<span class="req">*</span></label><select class="select" id="bbPackage"><option>B</option><option>C</option><option selected>D</option><option>E</option></select></div>
          <div class="field"><label>状态</label><select class="select" id="bbStatus"><option>生效</option><option>待生效</option></select></div>
          <div class="field"><label>生效日期</label><input class="input" id="bbFrom" type="date" value="2026-11-01"></div>
          <div class="field"><label>失效日期</label><input class="input" id="bbTo" type="date" value="2027-06-30"></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>批量绑定会覆盖所选客户在同一产品上的现有套餐；不同产品可分别绑定。已有订单价不受影响。</div></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="bbSave">确认绑定</button>`,
      onMount(el, close) {
        el.querySelector("#bbSave").onclick = () => {
          const custs = [...el.querySelectorAll(".bbCust:checked")].map(x => x.value);
          if (!custs.length) return UI.toast("请至少选择一个客户", "err");
          const p = UI.val("bbProduct"), pk = UI.val("bbPackage");
          custs.forEach(code => {
            const existing = Store.list("custBindings").find(b => b.customer === code && b.product === p);
            if (existing) Store.update("custBindings", existing.id, { package: pk, status: UI.val("bbStatus"), from: UI.val("bbFrom"), to: UI.val("bbTo"), updated: "2026-10-22", by: "杨鑫" });
            else Store.add("custBindings", { id: "CB" + String(Store.list("custBindings").length + 1).padStart(3, "0"), customer: code, product: p, package: pk, from: UI.val("bbFrom"), to: UI.val("bbTo"), status: UI.val("bbStatus"), updated: "2026-10-22", by: "杨鑫" });
          });
          Store.log("客户价格", "批量绑定套餐", custs.join("、"), Q.productName(p) + " → " + pk + " 套餐");
          close(); UI.toast("已绑定 " + custs.length + " 家客户"); render();
        };
      }
    });
  }

  UI.shell({ active: "cust-bind", title: "客户套餐绑定", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["customer", "product", "st"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("batchBtn").onclick = openBatch;
})();
