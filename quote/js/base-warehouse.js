/* 基础配置 · 仓点与计费地点 */
(function () {
  const content = `
    ${UI.pageHead({
      title: "仓点与计费地点",
      sub: "建立交货仓、仓点与计费地点的匹配关系；不同起运区域可用不同价格，调拨费按计费地点差异产生。",
      actions: `<button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新增仓点</button>`
    })}

    <div class="info-strip mb-16">
      <div class="is"><span>提货仓</span><b>深圳宝安仓</b><em>WH01</em></div>
      <div class="is"><span>仓点 / 网点</span><b>SZ01</b><em>华南</em></div>
      <div class="is"><span>计费地点</span><b>深圳</b><em>用于取价</em></div>
      <div class="is"><span>价格与分区</span><b>美国 Z1 美西</b><em>公布价 v12</em></div>
    </div>

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>规则：</b>计费地点决定用哪一套公布价/套餐价；提货仓与计费地点不一致时，按仓点配置产生调拨费。仓点变更后只影响之后触发的计费，不回溯历史账单。</div>
    </div>

    <section class="card">
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="仓点名称 / 城市 / 编码"></div>
        <div class="field"><label>区域</label><select class="select" id="region"><option value="">全部</option><option>华南</option><option>华东</option></select></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>启用</option><option>停用</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="whTable"></div>
      <div id="whPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const region = document.getElementById("region").value;
    const st = document.getElementById("st").value;
    return Store.list("warehouses").filter(w => {
      if (region && w.region !== region) return false;
      if (st && w.status !== st) return false;
      if (kw && !(w.name + w.city + w.code + w.address).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("whTable").innerHTML = UI.table({
      columns: [
        { label: "仓点", width: "24%", render: (r) => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub">${r.code} · ${UI.esc(r.address)}</div>` },
        { label: "城市", width: "8%", key: "city" },
        { label: "计费地点", width: "10%", render: (r) => `<span class="badge b-teal no-dot">${UI.esc(r.billing)}</span>` },
        { label: "区域", width: "7%", key: "region" },
        { label: "网点编码", width: "9%", render: (r) => `<span class="mono">${r.org}</span>` },
        { label: "调拨费", width: "25%", render: (r) => r.transfer === "—" ? '<span class="muted">—</span>' : `<span class="small">${UI.esc(r.transfer)}</span>` },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status) },
        { label: "操作", width: "10%", render: (r) => `<div class="actions"><button class="btn-text" data-edit="${r.code}">编辑</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.code}"`, empty: "没有匹配的仓点"
    });
    document.getElementById("whPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-edit]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openEdit(b.dataset.edit); });
    document.querySelectorAll("#whTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openEdit(tr.dataset.id));
  }

  function openEdit(code) {
    const w = Store.find("warehouses", code);
    UI.drawer({
      title: w.name,
      sub: `${w.code} · 网点 ${w.org} · ${w.region}`,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>仓点名称</label><input class="input" value="${UI.esc(w.name)}" disabled></div>
          <div class="field"><label>城市</label><input class="input" value="${UI.esc(w.city)}" disabled></div>
          <div class="field span-2"><label>地址</label><input class="input" value="${UI.esc(w.address)}" disabled></div>
          <div class="field"><label>计费地点<span class="req">*</span></label><select class="select" id="ewBilling">${["深圳", "广州", "宁波", "上海", "厦门"].map(c => `<option ${c === w.billing ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>区域</label><select class="select" id="ewRegion">${["华南", "华东"].map(r => `<option ${r === w.region ? "selected" : ""}>${r}</option>`).join("")}</select></div>
          <div class="field span-2"><label>调拨费规则</label><input class="input" id="ewTransfer" value="${UI.esc(w.transfer)}"></div>
          <div class="field span-2"><label>状态</label><label class="switch"><input type="checkbox" id="ewStatus" ${w.status === "启用" ? "checked" : ""}><span class="track"></span><span class="sw-label">启用该仓点</span></label></div>
        </div>
        <div class="banner">${UI.icon("info", 15)}<div>计费地点不是物理仓，而是价格取数维度。例如义乌集货仓的计费地点是宁波，取价按宁波价目表执行。</div></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>修改计费地点会影响该仓点后续所有签入计费；在途订单已生成的计费结果不回溯。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          Store.update("warehouses", w.code, { billing: UI.val("ewBilling"), region: UI.val("ewRegion"), transfer: UI.val("ewTransfer"), status: document.getElementById("ewStatus").checked ? "启用" : "停用" });
          Store.log("基础配置", "更新仓点", w.name, "计费地点/调拨费/状态变更");
          close(); UI.toast("仓点已保存"); render();
        };
      }
    });
  }

  function openAdd() {
    UI.modal({
      title: "新增仓点",
      body: `<div class="form-grid">
        <div class="field"><label>仓点名称<span class="req">*</span></label><input class="input" id="nwName" placeholder="如 青岛前湾仓"></div>
        <div class="field"><label>城市<span class="req">*</span></label><input class="input" id="nwCity" placeholder="如 青岛"></div>
        <div class="field"><label>计费地点<span class="req">*</span></label><input class="input" id="nwBilling" placeholder="如 青岛"></div>
        <div class="field"><label>网点编码</label><input class="input" id="nwOrg" placeholder="如 QD01"></div>
        <div class="field span-2"><label>调拨费规则</label><input class="input" id="nwTransfer" placeholder="如 0.10 元/kg（提货仓=华南）"></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="nwSave">创建</button>`,
      onMount(el, close) {
        el.querySelector("#nwSave").onclick = () => {
          const name = UI.val("nwName");
          if (!name || !UI.val("nwCity")) return UI.toast("请填写仓点名称和城市", "err");
          Store.add("warehouses", { code: "WH" + String(Store.list("warehouses").length + 1).padStart(2, "0"), name, city: UI.val("nwCity"), billing: UI.val("nwBilling") || UI.val("nwCity"), region: "华东", address: "—", transfer: UI.val("nwTransfer") || "—", status: "启用", org: UI.val("nwOrg") || "—" });
          Store.log("基础配置", "新增仓点", name, "新增交货仓与计费地点");
          close(); UI.toast("仓点已新增"); render();
        };
      }
    });
  }

  UI.shell({ active: "base-warehouse", title: "仓点与计费地点", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "region", "st"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("addBtn").onclick = openAdd;
})();
