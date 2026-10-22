/* 客户价格 · 客户自由价 */
(function () {
  const presetCustomer = UI.param("customer") || "";

  const content = `
    ${UI.pageHead({
      title: "客户自由价",
      sub: "按客户 + 产品 + 费用项维护自由价，带有效期；自由价与套餐价分别维护，不覆盖公布价。低于底价时进入审批。",
      actions: `<button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新增自由价</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>与套餐的关系：</b>同一客户同一产品可以既绑套餐又有自由价，取价时自由价优先；自由价只覆盖指定费用项，未配置的费用项仍按套餐/公布价计算。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("edit", 14)}</span>自由价条目</div><div class="st-val">${Store.list("custPrices").length}<small>条</small></div><div class="st-ft">覆盖 5 家客户 / 4 个产品</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>生效中</div><div class="st-val">${Store.list("custPrices").filter(p => p.status === "生效").length}<small>条</small></div><div class="st-ft">最近更新 2026-10-08</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>审批中</div><div class="st-val">${Store.list("custPrices").filter(p => p.status === "审批中").length}<small>条</small></div><div class="st-ft">盈和 C004 低于底价 0.50 元/kg</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("alert", 14)}</span>低于底价</div><div class="st-val">${Store.list("custPrices").filter(p => /低于底价/.test(p.check)).length}<small>条</small></div><div class="st-ft">审批通过前不生效、不参与取价</div></div>
    </div>

    <section class="card mt-16">
      <div class="filterbar">
        <div class="field"><label>客户</label><select class="select" id="customer"><option value="">全部</option>${UI.options(Store.list("customers"), "code", "short", presetCustomer)}</select></div>
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>生效</option><option>审批中</option><option>已驳回</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="cpTable"></div>
      <div id="cpPager"></div>
    </section>`;

  function baseOf(product, fee) {
    const country = Q.product(product).country || "US";
    return Store.list("basePrices").find(b => b.product === product && b.country === country && b.fee === fee && b.status === "生效");
  }

  function filtered() {
    const c = document.getElementById("customer").value;
    const p = document.getElementById("product").value;
    const s = document.getElementById("st").value;
    return Store.list("custPrices").filter(x => (!c || x.customer === c) && (!p || x.product === p) && (!s || x.status === s));
  }

  function render() {
    const rows = filtered();
    document.getElementById("cpTable").innerHTML = UI.table({
      columns: [
        { label: "客户", width: "18%", render: (r) => `<div class="t-main">${UI.esc(Q.customerName(r.customer))}</div><div class="t-sub">${r.customer}</div>` },
        { label: "产品", width: "20%", render: (r) => `<div>${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.product}</div>` },
        { label: "费用项", width: "10%", render: (r) => Q.feeName(r.fee) },
        { label: "自由价", width: "11%", render: (r) => `<span class="price-cell" style="font-size:13.5px">${Fmt.num(r.price, 2)}</span> <span class="tiny muted">元/${r.unit}</span>` },
        { label: "底价对比", width: "15%", render: (r) => {
          if (r.check === "美元价目表") return UI.badge("美元价目表", "b-blue");
          const b = baseOf(r.product, r.fee);
          if (!b) return '<span class="muted">—</span>';
          return r.price < b.price ? UI.badge("低于底价 " + (b.price - r.price).toFixed(2), "b-red") : UI.badge("高于底价 " + (r.price - b.price).toFixed(2), "b-green");
        }},
        { label: "有效期", width: "15%", render: (r) => `<span class="tiny">${r.from} ~ ${r.to}</span>` },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status) },
        { label: "审批单", width: "9%", render: (r) => r.approval === "—" ? "—" : `<span class="mono tiny">${r.approval}</span>` },
        { label: "操作", width: "5%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的自由价"
    });
    document.getElementById("cpPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#cpTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const c = Store.find("custPrices", id);
    const b = baseOf(c.product, c.fee);
    UI.drawer({
      title: Q.customerName(c.customer) + " · " + Q.feeName(c.fee),
      sub: `${c.id} · ${Q.productName(c.product)} · ${c.from} ~ ${c.to}`,
      body: `<div class="stack">
        <div class="row">
          <div><div class="tiny muted">客户自由价</div><div class="price-big">${Fmt.num(c.price, 2)}<small>元/${c.unit}</small></div></div>
          ${b ? `<div style="margin-left:24px"><div class="tiny muted">产品底价</div><div class="price-big" style="font-size:16px;color:var(--ink-3)">${Fmt.num(b.price, 2)}<small>元/${b.unit}</small></div></div>` : ""}
          <div style="margin-left:24px"><div class="tiny muted">状态</div><div class="mt-4">${UI.badge(c.status)}</div></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>自由价<span class="req">*</span></label><div class="input-group"><input class="input" id="cfPrice" type="number" step="0.01" value="${c.price}"><span class="unit">元/${c.unit}</span></div></div>
          <div class="field"><label>状态</label><select class="select" id="cfStatus"><option ${c.status === "生效" ? "selected" : ""}>生效</option><option ${c.status === "审批中" ? "selected" : ""}>审批中</option><option ${c.status === "已驳回" ? "selected" : ""}>已驳回</option></select></div>
          <div class="field"><label>生效日期</label><input class="input" id="cfFrom" type="date" value="${c.from}"></div>
          <div class="field"><label>失效日期</label><input class="input" id="cfTo" type="date" value="${c.to}"></div>
          <div class="field span-2"><label>备注</label><input class="input" id="cfNote" value="${UI.esc(c.note)}"></div>
        </div>
        <div id="cfCheck"></div>
        <div class="section-title">审批记录</div>
        <div class="timeline">
          <div class="tl-item done"><div class="tl-title">录入自由价</div><div class="tl-meta">${c.by} · ${c.updated}</div><div class="tl-body">${UI.esc(c.note || "—")}</div></div>
          ${c.approval !== "—" ? `<div class="tl-item ${c.status === "审批中" ? "now" : "done"}"><div class="tl-title">${c.status === "审批中" ? "审批中" : c.status}</div><div class="tl-meta">${c.approval} · 销售总监</div></div>` : ""}
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>自由价低于底价时必须审批；审批通过前不生效、不参与取价，客户仍按套餐/公布价计费。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        const priceEl = el.querySelector("#cfPrice");
        const check = () => {
          const v = parseFloat(priceEl.value);
          const box = el.querySelector("#cfCheck");
          if (!v || !b) { box.innerHTML = ""; return; }
          if (v < b.price) {
            box.innerHTML = `<div class="banner danger">${UI.icon("alert", 15)}<div><b>低于底价 ${(b.price - v).toFixed(2)} 元/${c.unit}。</b>保存后将进入 OA 审批，审批通过前不生效、不参与取价。</div></div>`;
            priceEl.classList.add("err");
          } else {
            box.innerHTML = `<div class="banner success">${UI.icon("checkCircle", 15)}<div>高于底价 ${(v - b.price).toFixed(2)} 元/${c.unit}，保存后直接生效。</div></div>`;
            priceEl.classList.remove("err");
          }
        };
        priceEl.addEventListener("input", check); check();
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const v = parseFloat(priceEl.value);
          if (!v) return UI.toast("请填写自由价", "err");
          const below = b && v < b.price;
          let oa = c.approval;
          if (below) {
            oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
            Store.add("approvals", { id: oa, type: "客户自由价", title: Q.customerName(c.customer) + " " + Q.feeName(c.fee) + " 自由价", object: `${c.customer} / ${c.product} / ${Q.feeName(c.fee)}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "销售总监", oldVal: c.price + " 元/" + c.unit, newVal: v + " 元/" + c.unit, reason: UI.val("cfNote") || "客户协议价", impact: "低于底价 " + (b.price - v).toFixed(2) + " 元/" + c.unit + "，审批通过前不生效" });
          }
          Store.update("custPrices", c.id, { price: v, from: UI.val("cfFrom"), to: UI.val("cfTo"), note: UI.val("cfNote"), status: below ? "审批中" : UI.val("cfStatus"), check: below ? "低于底价 " + (b.price - v).toFixed(2) : "高于底价", approval: below ? oa : c.approval, updated: "2026-10-22", by: "杨鑫" });
          Store.log("客户价格", below ? "提交自由价审批" : "更新自由价", Q.customerName(c.customer), Q.feeName(c.fee) + " " + v + " 元/" + c.unit + (below ? "，" + oa : ""));
          close(); UI.toast(below ? "已提交审批：" + oa : "自由价已保存"); render();
        };
      }
    });
  }

  function openAdd() {
    UI.drawer({
      title: "新增客户自由价",
      sub: "按客户 + 产品 + 费用项唯一",
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>客户<span class="req">*</span></label><select class="select" id="ncCustomer">${UI.options(Store.list("customers"), "code", "short", presetCustomer)}</select></div>
          <div class="field"><label>产品<span class="req">*</span></label><select class="select" id="ncProduct">${UI.options(Store.list("products"), "code", "name", "P001")}</select></div>
          <div class="field"><label>费用项<span class="req">*</span></label><select class="select" id="ncFee"><option value="BASE_FREIGHT">基础运费</option><option value="FUEL">燃油附加费</option></select></div>
          <div class="field"><label>自由价<span class="req">*</span></label><div class="input-group"><input class="input" id="ncPrice" type="number" step="0.01"><span class="unit">元/kg</span></div></div>
          <div class="field"><label>生效日期</label><input class="input" id="ncFrom" type="date" value="2026-11-01"></div>
          <div class="field"><label>失效日期</label><input class="input" id="ncTo" type="date" value="2027-03-31"></div>
          <div class="field span-2"><label>备注</label><input class="input" id="ncNote" placeholder="如 客户承诺月出货量"></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>保存时自动对比产品底价：低于底价转 OA 审批，高于底价直接生效。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const cust = UI.val("ncCustomer"), p = UI.val("ncProduct"), f = UI.val("ncFee"), v = parseFloat(UI.val("ncPrice"));
          if (!v) return UI.toast("请填写自由价", "err");
          if (Store.list("custPrices").find(x => x.customer === cust && x.product === p && x.fee === f)) return UI.toast("该客户/产品/费用项已有自由价", "err");
          const b = baseOf(p, f);
          const below = b && v < b.price;
          const oa = below ? "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0") : "—";
          Store.add("custPrices", { id: "CP" + String(Store.list("custPrices").length + 1).padStart(3, "0"), customer: cust, product: p, fee: f, price: v, unit: "KG", from: UI.val("ncFrom"), to: UI.val("ncTo"), status: below ? "审批中" : "生效", check: below ? "低于底价 " + (b.price - v).toFixed(2) : "高于底价", approval: oa, updated: "2026-10-22", by: "杨鑫", note: UI.val("ncNote") });
          if (below) Store.add("approvals", { id: oa, type: "客户自由价", title: Q.customerName(cust) + " " + Q.feeName(f) + " 自由价", object: `${cust} / ${p} / ${Q.feeName(f)}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "销售总监", oldVal: "—", newVal: v + " 元/kg", reason: UI.val("ncNote") || "客户协议价", impact: "低于底价 " + (b.price - v).toFixed(2) + " 元/kg" });
          Store.log("客户价格", below ? "新增自由价（待审批）" : "新增自由价", Q.customerName(cust), Q.productName(p) + " " + Q.feeName(f) + " " + v + " 元/kg");
          close(); UI.toast(below ? "低于底价，已提交审批" : "自由价已生效"); render();
        };
      }
    });
  }

  UI.shell({ active: "cust-free", title: "客户自由价", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { document.getElementById("customer").value = ""; document.getElementById("product").value = ""; document.getElementById("st").value = ""; render(); };
  document.getElementById("addBtn").onclick = openAdd;
})();
