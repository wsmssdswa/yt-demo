/* 基础配置 · 价格模版 */
(function () {
  const types = ["重量段", "按方", "首续重", "比例费率", "固定金额"];
  let activeType = "全部";

  const content = `
    ${UI.pageHead({
      title: "价格模版",
      sub: "把计价结构抽成模版：重量段/按方、首续重、比例费率、固定金额。价格本身在底价、公布价、套餐价中维护。",
      actions: `<button class="btn btn-ghost" id="copyBtn">${UI.icon("copy", 14)} 复制模版</button>
        <button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新建模版</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>引用关系：</b>模版被产品、公布价、套餐价引用；停用模版不影响历史价格复现，但新价格不能再引用。重量段支持区间开闭与无限上界，按方支持起收门槛。</div>
    </div>

    <section class="card">
      <div class="tabs" id="tplTabs">
        ${["全部", ...types].map(t => `<a class="tab ${t === "全部" ? "active" : ""}" href="javascript:void(0)" data-t="${t}">${t}<span class="count">${t === "全部" ? Store.list("templates").length : Store.list("templates").filter(x => x.type === t).length}</span></a>`).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="模版名称 / 编号"></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>启用</option><option>停用</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="tplTable"></div>
      <div id="tplPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const st = document.getElementById("st").value;
    return Store.list("templates").filter(t => {
      if (activeType !== "全部" && t.type !== activeType) return false;
      if (st && t.status !== st) return false;
      if (kw && !(t.name + t.id + t.country).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function summary(t) {
    if (t.type === "首续重") return t.params.map(p => p.from + " " + p.price + " 元").join(" / ");
    if (t.type === "比例费率") return t.params[0] ? t.params[0].price + "，最低 " + (t.params[0].note || "—") : "—";
    return t.params.map(p => `${p.from}${p.to === "∞" ? "+" : "–" + p.to}${p.unit === "CBM" ? "m³" : "kg"}: ${p.price}`).slice(0, 3).join("；") + (t.params.length > 3 ? " …" : "");
  }

  function render() {
    const rows = filtered();
    document.getElementById("tplTable").innerHTML = UI.table({
      columns: [
        { label: "模版", width: "22%", render: (r) => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub">${r.id} · ${UI.esc(r.type)}</div>` },
        { label: "适用产品", width: "16%", render: (r) => r.product === "通用" ? '<span class="badge b-purple">通用</span>' : `${Q.productName(r.product)}<div class="t-sub">${r.product}</div>` },
        { label: "国家", width: "7%", render: (r) => r.country === "全部" ? "全部" : (Q.product(r.product).countryName || r.country) },
        { label: "参数摘要", width: "30%", render: (r) => `<span class="tiny" style="color:var(--ink-2)">${UI.esc(summary(r))}</span>` },
        { label: "引用", width: "6%", align: "right", render: (r) => `<span class="price-cell">${r.refs}</span>` },
        { label: "版本", width: "7%", render: (r) => `<span class="mono">${r.version}</span>` },
        { label: "状态", width: "6%", render: (r) => UI.badge(r.status) },
        { label: "更新", width: "7%", render: (r) => `<span class="tiny muted">${r.updated}</span>` },
        { label: "操作", width: "9%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的模版"
    });
    document.getElementById("tplPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#tplTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const t = Store.find("templates", id);
    UI.drawer({
      title: t.name,
      sub: `${t.id} · ${t.type} · 版本 ${t.version} · 引用 ${t.refs} 处`,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>模版类型</label><input class="input" value="${t.type}" disabled></div>
          <div class="field"><label>适用产品</label><input class="input" value="${t.product === "通用" ? "通用" : Q.productName(t.product)}" disabled></div>
          <div class="field"><label>国家/线路</label><input class="input" value="${t.country}" disabled></div>
          <div class="field"><label>状态</label><input class="input" value="${t.status}" disabled></div>
        </div>
        <div class="divider"></div>
        <div class="section-title">参数</div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>起点</th><th>终点</th><th class="num">价格</th><th>单位</th><th>说明</th></tr></thead>
          <tbody>${t.params.map(p => `<tr><td>${UI.esc(p.from)}</td><td>${UI.esc(p.to)}</td><td class="num price-cell">${UI.esc(p.price)}</td><td>${UI.esc(p.unit)}</td><td class="tiny muted">${UI.esc(p.note || "—")}</td></tr>`).join("")}</tbody></table></div>
        <div class="section-title">引用该模版的价格</div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>价格对象</th><th>产品</th><th>版本</th><th>状态</th></tr></thead><tbody>
          ${t.refs ? `<tr><td>公布价 A</td><td>${t.product === "通用" ? "多个产品" : Q.productName(t.product)}</td><td>${t.version}</td><td>${UI.badge("生效")}</td></tr>
            <tr><td>套餐价 B–E</td><td>${t.product === "通用" ? "多个产品" : Q.productName(t.product)}</td><td>${t.version}</td><td>${UI.badge("生效")}</td></tr>` : `<tr><td colspan="4" class="muted">暂无引用</td></tr>`}
        </tbody></table></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>模版停用后，已生效价格的计算口径不变；新价格不能引用停用模版。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div><button class="btn btn-soft" data-calc>去模拟计费</button><button class="btn btn-primary" data-edit>编辑参数</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-calc]").onclick = () => location.href = "rule-calc.html";
        el.querySelector("[data-edit]").onclick = () => UI.toast("模版参数编辑：原型演示入口，保存后版本号 +1", "warn");
      }
    });
  }

  function openAdd() {
    UI.modal({
      title: "新建价格模版",
      body: `<div class="form-grid">
        <div class="field"><label>模版名称<span class="req">*</span></label><input class="input" id="ntName" placeholder="如 加拿大重量段-2027"></div>
        <div class="field"><label>模版类型<span class="req">*</span></label><select class="select" id="ntType">${types.map(t => `<option>${t}</option>`).join("")}</select></div>
        <div class="field"><label>适用产品</label><select class="select" id="ntProduct"><option value="通用">通用</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>国家/线路</label><input class="input" id="ntCountry" value="全部"></div>
      </div>
      <div class="banner info mt-12">${UI.icon("info", 15)}<div>新建后默认为草稿，需补齐参数并至少被一个价格对象引用后才能生效。</div></div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="ntSave">创建草稿</button>`,
      onMount(el, close) {
        el.querySelector("#ntSave").onclick = () => {
          const name = UI.val("ntName");
          if (!name) return UI.toast("请填写模版名称", "err");
          const p = UI.val("ntProduct");
          Store.add("templates", {
            id: "T" + String(Store.list("templates").length + 1).padStart(2, "0"),
            name, type: UI.val("ntType"), product: p, country: UI.val("ntCountry"),
            status: "停用", version: "v0.1", updated: "2026-10-22", refs: 0,
            params: [{ from: "0", to: "∞", price: "—", unit: p === "P003" ? "CBM" : "KG", note: "草稿，待补参数" }]
          });
          Store.log("基础配置", "新增", name, "新建价格模版草稿");
          close(); UI.toast("模版草稿已创建"); render();
        };
      }
    });
  }

  UI.shell({ active: "base-template", title: "价格模版", content });
  render();
  document.querySelectorAll("#tplTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#tplTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); activeType = t.dataset.t; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { document.getElementById("kw").value = ""; document.getElementById("st").value = ""; render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("addBtn").onclick = openAdd;
  document.getElementById("copyBtn").onclick = () => UI.toast("请选择要复制的模版：原型仅演示入口", "warn");
})();
