/* 基础配置 · 销售产品与报价映射 */
(function () {
  const content = `
    ${UI.pageHead({
      title: "销售产品与报价映射",
      sub: "SPMS 是产品主数据源，本系统只维护“报价维度映射”：国家、计费单位、分区模版、价格模版。",
      actions: `<button class="btn btn-ghost" id="syncBtn">${UI.icon("refresh", 14)} 同步 SPMS</button>
        <button class="btn btn-ghost" id="mapBtn">${UI.icon("link", 14)} 批量映射</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>同步口径：</b>产品编码、名称、国家/线路、运输方式、末端派送、适用范围由 SPMS 下发（SPMS 无产品版本字段，原型用“同步批次”展示）；产品新增/停用/变更时，本系统同步失效对应报价配置。产品主数据不在本系统重复维护。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("box", 14)}</span>销售产品</div><div class="st-val">${Store.list("products").length}<small>个</small></div><div class="st-ft">美国 4 · 欧洲 2 · 英国 1 · 加拿大 1</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>已完成映射</div><div class="st-val">${Store.list("products").filter(p => p.mapped === "已映射").length}<small>个</small></div><div class="st-ft">全部产品已绑定分区/价格模版</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("alert", 14)}</span>映射待补齐</div><div class="st-val">${Store.list("products").filter(p => p.mapped !== "已映射").length}<small>个</small></div><div class="st-ft">P008 加拿大：缺有效分区价格</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>最近同步</div><div class="st-val" style="font-size:18px;letter-spacing:0">10-21 02:10</div><div class="st-ft">SPMS 下发 8 个产品 · 同步批次 2026-10-21</div></div>
    </div>

    <section class="card mt-16">
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="产品名称 / 编码"></div>
        <div class="field"><label>国家</label><select class="select" id="country"><option value="">全部</option><option value="US">美国</option><option value="DE">德国</option><option value="GB">英国</option><option value="CA">加拿大</option></select></div>
        <div class="field"><label>映射状态</label><select class="select" id="mapped"><option value="">全部</option><option>已映射</option><option>待补齐</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="prodTable"></div>
      <div id="prodPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const c = document.getElementById("country").value;
    const m = document.getElementById("mapped").value;
    return Store.list("products").filter((p) => {
      if (c && p.country !== c) return false;
      if (m && p.mapped !== m) return false;
      if (kw && !(p.name + p.code + p.desc).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("prodTable").innerHTML = UI.table({
      columns: [
        { label: "销售产品", width: "23%", render: (r) => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub"><span class="code-tag">${r.code}</span> ${UI.esc(r.desc)}</div>` },
        { label: "国家", width: "7%", render: (r) => UI.esc(r.countryName) },
        { label: "运输方式", width: "9%", key: "transport" },
        { label: "末端派送", width: "9%", key: "lastMile" },
        { label: "计费单位", width: "7%", key: "unit" },
        { label: "同步批次", width: "8%", render: (r) => `<span class="mono">${UI.esc(r.version)}</span>` },
        { label: "映射状态", width: "8%", render: (r) => UI.badge(r.mapped, r.mapped === "已映射" ? "b-green" : "b-amber") },
        { label: "引用模版", width: "12%", render: (r) => r.templates.map(t => `<span class="code-tag">${t}</span>`).join(" ") },
        { label: "更新", width: "8%", render: (r) => `<span class="tiny muted">${r.updated}</span>` },
        { label: "操作", width: "9%", render: (r) => `<div class="actions"><button class="btn-text" data-edit="${r.code}">映射配置</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.code}"`, empty: "没有匹配的产品"
    });
    document.getElementById("prodPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-edit]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openMap(b.dataset.edit); });
    document.querySelectorAll("#prodTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openMap(tr.dataset.id));
  }

  function openMap(code) {
    const p = Store.find("products", code);
    const templates = Store.list("templates").filter(t => t.product === p.code || t.product === "通用");
    UI.drawer({
      title: p.name,
      sub: `${p.code} · SPMS 同步批次 ${p.version} · 最近同步 2026-10-21 02:10`,
      body: `<div class="stack">
        <div class="banner">${UI.icon("info", 15)}<div>以下产品字段由 SPMS 下发，只读；本页只维护报价映射。</div></div>
        <div class="form-grid">
          <div class="field"><label>产品编码</label><input class="input" value="${p.code}" disabled></div>
          <div class="field"><label>产品名称</label><input class="input" value="${UI.esc(p.name)}" disabled></div>
          <div class="field"><label>国家/线路</label><input class="input" value="${UI.esc(p.countryName)}" disabled></div>
          <div class="field"><label>运输方式</label><input class="input" value="${UI.esc(p.transport)}" disabled></div>
          <div class="field"><label>末端派送</label><input class="input" value="${UI.esc(p.lastMile)}" disabled></div>
          <div class="field"><label>同步批次</label><input class="input" value="${p.version}" disabled></div>
        </div>
        <div class="divider"></div>
        <div class="section-title">报价维度映射</div>
        <div class="form-grid">
          <div class="field"><label>适用国家<span class="req">*</span></label><select class="select" id="mpCountry"><option value="US" ${p.country === "US" ? "selected" : ""}>美国</option><option value="DE" ${p.country === "DE" ? "selected" : ""}>德国</option><option value="GB" ${p.country === "GB" ? "selected" : ""}>英国</option><option value="CA" ${p.country === "CA" ? "selected" : ""}>加拿大</option></select></div>
          <div class="field"><label>计费单位<span class="req">*</span></label><select class="select" id="mpUnit"><option ${p.unit === "KG" ? "selected" : ""}>KG</option><option ${p.unit === "CBM" ? "selected" : ""}>CBM</option><option ${p.unit === "柜" ? "selected" : ""}>柜</option></select></div>
          <div class="field"><label>分区模版</label><select class="select" id="mpZone">${UI.options(Store.list("zones"), "id", "name", p.zone === "Z01" ? "Z01" : p.zone === "Z02" ? "Z02" : "Z03")}</select></div>
          <div class="field"><label>映射状态</label><select class="select" id="mpMapped"><option ${p.mapped === "已映射" ? "selected" : ""}>已映射</option><option ${p.mapped === "待补齐" ? "selected" : ""}>待补齐</option></select></div>
        </div>
        <div class="field"><label>引用价格模版</label>
          <div class="stack" style="gap:8px">
            ${templates.map(t => `<label class="check"><input type="checkbox" class="mpTpl" value="${t.id}" ${p.templates.includes(t.id) ? "checked" : ""}> ${t.name} <span class="code-tag">${t.id}</span> <span class="tiny muted">${t.type}</span></label>`).join("")}
          </div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>产品停用或版本失效时，关联的公布价、套餐价将同步失效；已有客户绑定需要人工确认回落策略。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存映射</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const tpls = [...el.querySelectorAll(".mpTpl:checked")].map(x => x.value);
          Store.update("products", p.code, {
            country: UI.val("mpCountry"), unit: UI.val("mpUnit"), zone: UI.val("mpZone"),
            mapped: UI.val("mpMapped"), templates: tpls, updated: "2026-10-22"
          });
          Store.log("基础配置", "更新映射", p.name, "报价维度与国家/模版映射变更");
          close(); UI.toast("报价映射已保存"); render();
        };
      }
    });
  }

  UI.shell({ active: "base-product", title: "销售产品与报价映射", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { document.getElementById("kw").value = ""; document.getElementById("country").value = ""; document.getElementById("mapped").value = ""; render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("syncBtn").onclick = () => {
    Store.log("基础配置", "同步", "SPMS 销售产品", "同步 8 个产品，批次 2026-10-21，无变化");
    UI.toast("SPMS 同步完成：8 个产品，无变化");
  };
  document.getElementById("mapBtn").onclick = () => UI.toast("批量映射：请先在 SPMS 确认产品同步批次，原型仅演示入口", "warn");
})();
