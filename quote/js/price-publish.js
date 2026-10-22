/* 产品价格 · 公布价 A 价 */
(function () {
  let active = "全部";

  const content = `
    ${UI.pageHead({
      title: "公布价 A 价",
      sub: "按销售产品 + 国家 + 计费地点配置对外公布价。强校验：公布价必须高于底价，否则不允许生效。",
      actions: `<button class="btn btn-ghost" id="importBtn">${UI.icon("upload", 14)} 批量导入</button>
        <button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新增公布价</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>取价规则：</b>公布价是套餐价与客户价的基础；同一产品+国家+分区+计费地点在同一时间只有一条生效价格。审批中的价格不参与取价。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("tag", 14)}</span>公布价条目</div><div class="st-val">${Store.list("publishPrices").length}<small>条</small></div><div class="st-ft">覆盖 7 个产品 / 8 个分区</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>生效中</div><div class="st-val">${Store.list("publishPrices").filter(p => p.status === "生效").length}<small>条</small></div><div class="st-ft">全部高于底价，校验通过</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>审批中</div><div class="st-val">${Store.list("publishPrices").filter(p => p.status === "审批中").length}<small>条</small></div><div class="st-ft">P001 Z1 A 价 19.00，11 月生效</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("percent", 14)}</span>平均加价率</div><div class="st-val">42.6<small>%</small></div><div class="st-ft">相对底价，按生效条目计算</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs">
        ${["全部", "生效", "审批中", "已失效"].map(s => `<a class="tab ${s === active ? "active" : ""}" href="javascript:void(0)" data-s="${s}">${s}<span class="count">${s === "全部" ? Store.list("publishPrices").length : Store.list("publishPrices").filter(p => p.status === s).length}</span></a>`).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>国家</label><select class="select" id="country"><option value="">全部</option><option value="US">美国</option><option value="DE">德国</option><option value="GB">英国</option><option value="CA">加拿大</option></select></div>
        <div class="field"><label>分区</label><select class="select" id="zone"><option value="">全部</option>${[...new Set(Store.list("publishPrices").map(p => p.zone))].map(z => `<option>${z}</option>`).join("")}</select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="apTable"></div>
      <div id="apPager"></div>
    </section>`;

  function filtered() {
    const p = document.getElementById("product").value;
    const c = document.getElementById("country").value;
    const z = document.getElementById("zone").value;
    return Store.list("publishPrices").filter(x => {
      if (active !== "全部" && x.status !== active) return false;
      if (p && x.product !== p) return false;
      if (c && x.country !== c) return false;
      if (z && x.zone !== z) return false;
      return true;
    });
  }

  function markup(r) { return ((r.price - r.base) / r.base * 100).toFixed(1) + "%"; }

  function render() {
    const rows = filtered();
    document.getElementById("apTable").innerHTML = UI.table({
      columns: [
        { label: "产品", width: "18%", render: (r) => `<div class="t-main">${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.product} · ${r.country}</div>` },
        { label: "分区", width: "11%", key: "zone" },
        { label: "计费地点", width: "9%", render: (r) => Q.warehouse(r.warehouse).billing || r.warehouse },
        { label: "公布价", width: "12%", render: (r) => `<span class="price-cell" style="font-size:13.5px">${Fmt.num(r.price, 2)}</span> <span class="tiny muted">元/${Q.product(r.product).unit === "柜" ? "柜" : "kg"}</span>` },
        { label: "底价", width: "9%", render: (r) => `<span class="tiny muted">${Fmt.num(r.base, 2)}</span>` },
        { label: "加价率", width: "7%", render: (r) => `<span class="badge b-teal no-dot">${markup(r)}</span>` },
        { label: "有效期", width: "15%", render: (r) => `<span class="tiny">${r.from} ~ ${r.to}</span>` },
        { label: "版本", width: "7%", render: (r) => `<span class="mono">${r.version}</span>` },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status) },
        { label: "操作", width: "5%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的公布价"
    });
    document.getElementById("apPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#apTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const p = Store.find("publishPrices", id);
    UI.drawer({
      title: Q.productName(p.product) + " · " + p.zone,
      sub: `${p.id} · 版本 ${p.version} · 计费地点 ${Q.warehouse(p.warehouse).billing}`,
      body: `<div class="stack">
        <div class="row">
          <div><div class="tiny muted">公布价 A</div><div class="price-big">${Fmt.num(p.price, 2)}<small>元/kg</small></div></div>
          <div style="margin-left:24px"><div class="tiny muted">底价</div><div class="price-big" style="font-size:16px;color:var(--ink-3)">${Fmt.num(p.base, 2)}<small>元/kg</small></div></div>
          <div style="margin-left:24px"><div class="tiny muted">加价率</div><div class="mt-4"><span class="badge b-teal">${markup(p)}</span></div></div>
        </div>
        <div class="divider"></div>
        <dl class="kv">
          <dt>产品 / 国家</dt><dd>${Q.productName(p.product)} / ${p.country}</dd>
          <dt>分区</dt><dd>${p.zone}</dd>
          <dt>计费地点</dt><dd>${Q.warehouse(p.warehouse).name} → ${Q.warehouse(p.warehouse).billing}</dd>
          <dt>有效期</dt><dd>${p.from} ~ ${p.to}</dd>
          <dt>状态</dt><dd>${UI.badge(p.status)}</dd>
          <dt>更新</dt><dd>${p.by} · ${p.updated}</dd>
        </dl>
        <div class="section-title">价格版本</div>
        <div class="timeline">
          <div class="tl-item done"><div class="tl-title">${p.version} · ${Fmt.num(p.price, 2)} 元/kg</div><div class="tl-meta">${p.from} 起 · ${p.by}</div><div class="tl-body">${p.status === "审批中" ? "审批中，尚未参与取价" : "当前生效版本"}</div></div>
          <div class="tl-item"><div class="tl-title">上一版本 · ${Fmt.num(p.price - 0.5, 2)} 元/kg</div><div class="tl-meta">2026-07-01 ~ 2026-09-30 · 已失效</div></div>
        </div>
        <div class="banner ${p.price > p.base ? "success" : "danger"}">${UI.icon(p.price > p.base ? "checkCircle" : "alert", 15)}<div>${p.price > p.base ? "校验通过：公布价高于底价 " + Fmt.num(p.price - p.base, 2) + " 元/kg。" : "校验失败：公布价不得低于或等于底价。"}</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div><button class="btn btn-soft" data-edit>调整价格</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-edit]").onclick = () => { close(); openAdd(p); };
      }
    });
  }

  function openAdd(base) {
    const isEdit = !!base;
    UI.drawer({
      title: isEdit ? "调整公布价 A" : "新增公布价 A",
      sub: "公布价必须高于底价；保存后进入 OA 审批",
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>销售产品<span class="req">*</span></label><select class="select" id="naProduct" ${isEdit ? "disabled" : ""}>${UI.options(Store.list("products"), "code", "name", isEdit ? base.product : "")}</select></div>
          <div class="field"><label>国家<span class="req">*</span></label><select class="select" id="naCountry" ${isEdit ? "disabled" : ""}><option value="US" ${isEdit && base.country === "US" ? "selected" : ""}>美国</option><option value="DE" ${isEdit && base.country === "DE" ? "selected" : ""}>德国</option><option value="GB" ${isEdit && base.country === "GB" ? "selected" : ""}>英国</option><option value="CA" ${isEdit && base.country === "CA" ? "selected" : ""}>加拿大</option></select></div>
          <div class="field"><label>分区<span class="req">*</span></label><input class="input" id="naZone" value="${isEdit ? base.zone : "Z1 美西"}" ${isEdit ? "disabled" : ""}></div>
          <div class="field"><label>计费地点<span class="req">*</span></label><select class="select" id="naWh" ${isEdit ? "disabled" : ""}>${Store.list("warehouses").filter(w => w.status === "启用").map(w => `<option value="${w.code}" ${isEdit && w.code === base.warehouse ? "selected" : ""}>${w.name}（${w.billing}）</option>`).join("")}</select></div>
          <div class="field"><label>底价（只读）</label><input class="input" id="naBase" value="${isEdit ? base.base : 12.5}" disabled></div>
          <div class="field"><label>公布价 A<span class="req">*</span></label><div class="input-group"><input class="input" id="naPrice" type="number" step="0.01" value="${isEdit ? base.price : ""}" placeholder="必须高于底价"><span class="unit">元/kg</span></div></div>
          <div class="field"><label>生效日期<span class="req">*</span></label><input class="input" id="naFrom" type="date" value="${isEdit ? "2026-11-01" : "2026-11-01"}"></div>
          <div class="field"><label>失效日期<span class="req">*</span></label><input class="input" id="naTo" type="date" value="2027-01-31"></div>
        </div>
        <div id="naResult"></div>
        <div class="banner info">${UI.icon("info", 15)}<div>公示价对外可见；客户套餐价会基于 A 价按价差规则生成。底价不随公布价对外展示。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-submit>提交审批</button>`,
      onMount(el, close) {
        const priceEl = el.querySelector("#naPrice");
        const check = () => {
          const baseVal = parseFloat(el.querySelector("#naBase").value);
          const v = parseFloat(priceEl.value);
          const box = el.querySelector("#naResult");
          if (!v) { box.innerHTML = ""; return; }
          if (v <= baseVal) {
            box.innerHTML = `<div class="banner danger">${UI.icon("alert", 15)}<div><b>校验失败：</b>公布价 ${v.toFixed(2)} 元/kg 不高于底价 ${baseVal.toFixed(2)} 元/kg，不允许保存。请提高价格或先调整底价。</div></div>`;
            priceEl.classList.add("err");
          } else {
            box.innerHTML = `<div class="banner success">${UI.icon("checkCircle", 15)}<div>校验通过：高于底价 ${(v - baseVal).toFixed(2)} 元/kg（加价率 ${((v - baseVal) / baseVal * 100).toFixed(1)}%）。</div></div>`;
            priceEl.classList.remove("err");
          }
        };
        priceEl.addEventListener("input", check);
        check();
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-submit]").onclick = () => {
          const v = parseFloat(priceEl.value);
          const b = parseFloat(el.querySelector("#naBase").value);
          if (!v) return UI.toast("请填写公布价", "err");
          if (v <= b) return UI.toast("公布价必须高于底价，不能保存", "err");
          const oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
          const prod = isEdit ? base.product : UI.val("naProduct");
          const ctry = isEdit ? base.country : UI.val("naCountry");
          Store.add("publishPrices", {
            id: "AP" + String(Store.list("publishPrices").length + 1).padStart(3, "0"),
            product: prod, country: ctry, zone: UI.val("naZone"), warehouse: UI.val("naWh"),
            price: v, base: b, from: UI.val("naFrom"), to: UI.val("naTo"), status: "审批中",
            version: "v-draft", updated: "2026-10-22", by: "杨鑫"
          });
          Store.add("approvals", { id: oa, type: "公布价", title: Q.productName(prod) + " 公布价新增/调整", object: `${prod} / ${ctry} / ${UI.val("naZone")}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "价格委员会", oldVal: isEdit ? base.price + " 元/kg" : "—", newVal: v + " 元/kg", reason: "公布价调整", impact: "影响该分区套餐价与客户取价" });
          Store.log("产品价格", isEdit ? "调整公布价" : "新增公布价", Q.productName(prod), `${ctry}/${UI.val("naZone")} ${v} 元/kg，${oa}`);
          close(); UI.toast("已提交审批：" + oa); render();
        };
      }
    });
  }

  function openImport() {
    const sample = "P001,US,Z1 美西,WH01,19.00,2026-11-01,2027-01-31\nP002,US,Z1 美西,WH01,22.00,2026-11-01,2027-01-31\nP008,CA,CA-东,WH01,19.50,2026-11-01,2027-01-31";
    const m = UI.modal({
      title: "批量导入公布价",
      size: "lg",
      body: `<div class="stack">
        <div class="field"><label>粘贴 CSV（产品,国家,分区,仓点,公布价,生效日,失效日）</label><textarea class="textarea" id="csvText" style="min-height:120px;font-family:Consolas,monospace">${sample}</textarea></div>
        <div class="row"><button class="btn btn-ghost btn-sm" id="parseBtn">解析并校验</button><span class="tiny muted">按产品+国家+分区匹配底价，低于底价的行会被拦截</span></div>
        <div id="parseResult"></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="importSave" disabled>导入有效行</button>`,
      onMount(el, close) {
        let validRows = [];
        el.querySelector("#parseBtn").onclick = () => {
          const lines = el.querySelector("#csvText").value.trim().split(/\n+/);
          validRows = [];
          const rows = lines.map((line) => {
            const [p, c, z, wh, price, from, to] = line.split(",").map(s => (s || "").trim());
            const base = Store.list("basePrices").find(b => b.product === p && b.country === c && b.status === "生效");
            const baseVal = base ? base.price : 0;
            const ok = price && parseFloat(price) > baseVal;
            if (ok) validRows.push({ p, c, z, wh, price: parseFloat(price), from, to, base: baseVal });
            return { p, c, z, wh, price, from, to, base: baseVal, ok };
          });
          el.querySelector("#parseResult").innerHTML = `<div class="import-preview">${UI.table({
            compact: true,
            columns: [
              { label: "产品", render: r => r.p }, { label: "国家", render: r => r.c }, { label: "分区", render: r => r.z },
              { label: "底价", render: r => Fmt.num(r.base, 2) }, { label: "公布价", render: r => `<span class="price-cell">${r.price}</span>` },
              { label: "校验", render: r => r.ok ? UI.badge("通过") : UI.badge("低于底价", "b-red") }
            ], rows
          })}</div>`;
          el.querySelector("#importSave").disabled = validRows.length === 0;
          el.querySelector("#importSave").textContent = `导入 ${validRows.length} 条有效行`;
        };
        el.querySelector("#importSave").onclick = () => {
          validRows.forEach(r => Store.add("publishPrices", { id: "AP" + String(Store.list("publishPrices").length + 1).padStart(3, "0"), product: r.p, country: r.c, zone: r.z, warehouse: r.wh || "WH01", price: r.price, base: r.base, from: r.from, to: r.to, status: "审批中", version: "v-draft", updated: "2026-10-22", by: "杨鑫" }));
          Store.log("产品价格", "批量导入", "公布价", "导入 " + validRows.length + " 条，进入审批");
          close(); UI.toast("已导入 " + validRows.length + " 条，进入审批"); render();
        };
      }
    });
  }

  UI.shell({ active: "price-publish", title: "公布价 A 价", content });
  render();
  document.querySelectorAll(".tabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll(".tabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["product", "country", "zone"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("addBtn").onclick = () => openAdd(null);
  document.getElementById("importBtn").onclick = openImport;
})();
