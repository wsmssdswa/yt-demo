/* 产品价格 · 产品底价 */
(function () {
  let active = "全部";

  const content = `
    ${UI.pageHead({
      title: "产品底价",
      sub: "按销售产品 + 国家 + 费用项维护底价与有效期。底价只配自动计费的费用项，人工加收项不配底价。",
      actions: `<button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新增底价</button>`
    })}

    <div class="banner danger mb-16">${UI.icon("lock", 15)}
      <div><b>底价仅内部可见：</b>客户侧、报价单、导出文件均不输出底价。底价新增或下调触发 OA 审批，审批中的底价不参与价格校验与取价。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("tag", 14)}</span>底价条目</div><div class="st-val">${Store.list("basePrices").length}<small>条</small></div><div class="st-ft">覆盖 8 个产品 / 4 个国家</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>生效中</div><div class="st-val">${Store.list("basePrices").filter(p => p.status === "生效").length}<small>条</small></div><div class="st-ft">最近生效 2026-09-12</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>审批中</div><div class="st-val">${Store.list("basePrices").filter(p => p.status === "审批中").length}<small>条</small></div><div class="st-ft">P008 加拿大底价待审，暂不可取价</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("xCircle", 14)}</span>已驳回 / 失效</div><div class="st-val">${Store.list("basePrices").filter(p => ["已驳回", "已失效"].includes(p.status)).length}<small>条</small></div><div class="st-ft">P007 下调被驳回：成本未同步下降</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs">
        ${["全部", "生效", "审批中", "已驳回", "已失效"].map(s => `<a class="tab ${s === active ? "active" : ""}" href="javascript:void(0)" data-s="${s}">${s}<span class="count">${s === "全部" ? Store.list("basePrices").length : Store.list("basePrices").filter(p => p.status === s).length}</span></a>`).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>国家</label><select class="select" id="country"><option value="">全部</option><option value="US">美国</option><option value="DE">德国</option><option value="GB">英国</option><option value="CA">加拿大</option></select></div>
        <div class="field"><label>费用项</label><select class="select" id="fee"><option value="">全部</option>${UI.options(Store.list("feeItems"), "code", "name", "")}</select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="bpTable"></div>
      <div id="bpPager"></div>
    </section>`;

  function filtered() {
    const p = document.getElementById("product").value;
    const c = document.getElementById("country").value;
    const f = document.getElementById("fee").value;
    return Store.list("basePrices").filter(x => {
      if (active !== "全部" && x.status !== active) return false;
      if (p && x.product !== p) return false;
      if (c && x.country !== c) return false;
      if (f && x.fee !== f) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("bpTable").innerHTML = UI.table({
      columns: [
        { label: "产品", width: "20%", render: (r) => `<div class="t-main">${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.product} · ${r.country}</div>` },
        { label: "费用项", width: "13%", render: (r) => Q.feeName(r.fee) },
        { label: "底价", width: "14%", render: (r) => `<span class="price-big" style="font-size:16px">${Fmt.num(r.price, 2)}</span> <span class="tiny muted">元/${r.unit}</span>` },
        { label: "币种", width: "6%", key: "currency" },
        { label: "有效期", width: "17%", render: (r) => `<span class="tiny">${r.from} ~ ${r.to}</span>` },
        { label: "状态", width: "8%", render: (r) => UI.badge(r.status) },
        { label: "OA 审批", width: "10%", render: (r) => r.approval === "—" ? "—" : `<span class="mono tiny">${r.approval}</span>` },
        { label: "更新人", width: "7%", render: (r) => `<span class="tiny">${r.by}<br><span class="muted">${r.updated}</span></span>` },
        { label: "操作", width: "5%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的底价"
    });
    document.getElementById("bpPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#bpTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const b = Store.find("basePrices", id);
    const history = Store.list("priceHistory").filter(h => h.object === "产品底价" && h.product === b.product).slice(0, 4);
    UI.drawer({
      title: Q.productName(b.product) + " · " + Q.feeName(b.fee),
      sub: `${b.id} · ${b.country} · 有效期 ${b.from} ~ ${b.to}`,
      wide: true,
      body: `<div class="stack">
        <div class="row">
          <div><div class="tiny muted">当前底价</div><div class="price-big">${Fmt.num(b.price, 2)}<small>元/${b.unit}</small></div></div>
          <div style="margin-left:24px"><div class="tiny muted">状态</div><div class="mt-4">${UI.badge(b.status)}</div></div>
          <div style="margin-left:24px"><div class="tiny muted">审批单</div><div class="mt-4 mono small">${b.approval}</div></div>
          <span class="spacer"></span>
          <button class="btn btn-soft" id="adjust">发起调价</button>
        </div>
        <div class="divider"></div>
        <div class="form-grid">
          <div class="field"><label>产品</label><input class="input" value="${Q.productName(b.product)}" disabled></div>
          <div class="field"><label>国家</label><input class="input" value="${b.country}" disabled></div>
          <div class="field"><label>费用项</label><input class="input" value="${Q.feeName(b.fee)}" disabled></div>
          <div class="field"><label>有效期</label><input class="input" value="${b.from} ~ ${b.to}" disabled></div>
        </div>
        <div class="section-title">变更历史</div>
        <div class="timeline">
          ${history.length ? history.map(h => `<div class="tl-item done"><div class="tl-title">${h.oldVal} → ${h.newVal}</div><div class="tl-meta">${h.at} · ${h.operator} · ${h.approval}</div><div class="tl-body">${UI.esc(h.reason)}</div></div>`).join("") : '<div class="muted small">暂无变更记录</div>'}
        </div>
        <div class="banner">${UI.icon("info", 15)}<div>底价只用于校验公布价/客户价，不直接对外。人工加收项（报关、查验）不配底价。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("#adjust").onclick = () => { close(); openAdjust(b); };
      }
    });
  }

  function openAdjust(b) {
    UI.drawer({
      title: "调整底价 · " + Q.productName(b.product),
      sub: `${Q.feeName(b.fee)} · 当前 ${Fmt.num(b.price, 2)} 元/${b.unit}`,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>新底价<span class="req">*</span></label><div class="input-group"><input class="input" id="adjPrice" type="number" step="0.01" value="${b.price}"><span class="unit">元/${b.unit}</span></div></div>
          <div class="field"><label>生效日期<span class="req">*</span></label><input class="input" id="adjFrom" type="date" value="2026-11-01"></div>
          <div class="field"><label>失效日期<span class="req">*</span></label><input class="input" id="adjTo" type="date" value="2026-12-31"></div>
          <div class="field"><label>变更原因<span class="req">*</span></label><input class="input" id="adjReason" placeholder="如 成本上涨 / 竞品调价"></div>
        </div>
        <div class="banner warn" id="adjWarn">${UI.icon("alert", 15)}<div>下调底价或新增底价将触发 OA 审批；审批中的底价不参与公布价校验与取价。</div></div>
        <div class="banner info">${UI.icon("info", 15)}<div>审批完成晚于拟生效时间时，从审批完成时点生效，不追溯已计费账单。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-submit>提交 OA 审批</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-submit]").onclick = () => {
          const price = parseFloat(UI.val("adjPrice"));
          const reason = UI.val("adjReason");
          if (!price || !reason) return UI.toast("请填写新底价和变更原因", "err");
          const oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
          Store.update("basePrices", b.id, { price, from: UI.val("adjFrom"), to: UI.val("adjTo"), status: "审批中", approval: oa, updated: "2026-10-22" });
          Store.add("approvals", { id: oa, type: "产品底价", title: Q.productName(b.product) + " 底价调整", object: `${b.product} / ${b.country} / ${Q.feeName(b.fee)}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "价格委员会", oldVal: b.price + " 元/" + b.unit, newVal: price + " 元/" + b.unit, reason, impact: "影响该产品在 " + b.country + " 的公布价校验" });
          Store.log("产品价格", "提交底价审批", Q.productName(b.product), Q.feeName(b.fee) + " " + b.price + " → " + price + "，" + oa);
          close(); UI.toast("已提交 OA 审批：" + oa); render();
        };
      }
    });
  }

  function openAdd() {
    UI.drawer({
      title: "新增产品底价",
      sub: "按产品 + 国家 + 费用项唯一",
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>销售产品<span class="req">*</span></label><select class="select" id="nbProduct">${UI.options(Store.list("products"), "code", "name", "")}</select></div>
          <div class="field"><label>国家<span class="req">*</span></label><select class="select" id="nbCountry"><option value="US">美国</option><option value="DE">德国</option><option value="GB">英国</option><option value="CA">加拿大</option></select></div>
          <div class="field"><label>费用项<span class="req">*</span></label><select class="select" id="nbFee">${UI.options(Store.list("feeItems").filter(f => f.code === "BASE_FREIGHT" || f.code === "FUEL"), "code", "name", "")}</select></div>
          <div class="field"><label>底价<span class="req">*</span></label><div class="input-group"><input class="input" id="nbPrice" type="number" step="0.01"><span class="unit">元/KG</span></div></div>
          <div class="field"><label>生效日期<span class="req">*</span></label><input class="input" id="nbFrom" type="date" value="2026-11-01"></div>
          <div class="field"><label>失效日期<span class="req">*</span></label><input class="input" id="nbTo" type="date" value="2027-06-30"></div>
          <div class="field span-2"><label>说明</label><textarea class="textarea" id="nbNote" placeholder="如：补齐加拿大底价，配合 11 月价格发布"></textarea></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>新增底价默认进入 OA 审批，审批通过后才生效；同一产品+国家+费用项只能有一条生效底价。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-submit>提交审批</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-submit]").onclick = () => {
          const p = UI.val("nbProduct"), c = UI.val("nbCountry"), f = UI.val("nbFee"), price = parseFloat(UI.val("nbPrice"));
          if (!price) return UI.toast("请填写底价", "err");
          const exists = Store.list("basePrices").find(x => x.product === p && x.country === c && x.fee === f && ["生效", "审批中"].includes(x.status));
          if (exists) return UI.toast("该产品/国家/费用项已有生效或审批中的底价", "err");
          const oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
          Store.add("basePrices", { id: "BP" + String(Store.list("basePrices").length + 1).padStart(3, "0"), product: p, country: c, fee: f, price, unit: "KG", currency: "CNY", from: UI.val("nbFrom"), to: UI.val("nbTo"), status: "审批中", approval: oa, updated: "2026-10-22", by: "杨鑫" });
          Store.add("approvals", { id: oa, type: "产品底价", title: Q.productName(p) + " 底价新增", object: `${p} / ${c} / ${Q.feeName(f)}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "价格委员会", oldVal: "—", newVal: price + " 元/KG", reason: UI.val("nbNote") || "新增底价", impact: "影响该产品在 " + c + " 的公布价校验" });
          Store.log("产品价格", "新增底价", Q.productName(p), `${c}/${Q.feeName(f)} ${price} 元/kg，${oa}`);
          close(); UI.toast("底价已新增并提交审批"); render();
        };
      }
    });
  }

  UI.shell({ active: "price-base", title: "产品底价", content });
  render();
  document.querySelectorAll(".tabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll(".tabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["product", "country", "fee"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("addBtn").onclick = openAdd;
})();
