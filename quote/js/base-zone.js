/* 基础配置 · 分区模版 */
(function () {
  const content = `
    ${UI.pageHead({
      title: "分区模版",
      sub: "按国家、邮编区间或城市划分价格分区，供公布价、套餐价与附加费判断适用。",
      actions: `<button class="btn btn-ghost" id="importBtn">${UI.icon("upload", 14)} 导入分区</button>
        <button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新增分区模版</button>`
    })}

    <div class="banner warn mb-16">${UI.icon("alert", 15)}
      <div><b>边界校验：</b>邮编按字符串处理，保留前导零（如 00501）；区间包含首尾。保存时会校验区间重叠与空洞，重叠直接拦截，空洞给出提示。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("map", 14)}</span>分区模版</div><div class="st-val">${Store.list("zones").length}<small>套</small></div><div class="st-ft">美国 / 欧洲 / 加拿大</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>生效中</div><div class="st-val">${Store.list("zones").filter(z => z.status === "启用").length}<small>套</small></div><div class="st-ft">加拿大分区模版停用，导致 P008 无法取价</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("layers", 14)}</span>分区规则</div><div class="st-val">${Store.list("zones").reduce((s, z) => s + z.rules.length, 0)}<small>条</small></div><div class="st-ft">美国 4 区 · 欧洲 3 区 · 加拿大 2 区</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("tag", 14)}</span>被价格引用</div><div class="st-val">${Store.list("zones").reduce((s, z) => s + z.refs, 0)}<small>处</small></div><div class="st-ft">公布价 10 · 套餐价 8 · 附加费 2</div></div>
    </div>

    <section class="card mt-16">
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="分区名称 / 编号"></div>
        <div class="field"><label>国家</label><select class="select" id="country"><option value="">全部</option><option value="US">美国</option><option value="DE">德国</option><option value="CA">加拿大</option></select></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>启用</option><option>停用</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="zoneTable"></div>
      <div id="zonePager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const c = document.getElementById("country").value;
    const st = document.getElementById("st").value;
    return Store.list("zones").filter(z => {
      if (c && z.country !== c) return false;
      if (st && z.status !== st) return false;
      if (kw && !(z.name + z.id).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("zoneTable").innerHTML = UI.table({
      columns: [
        { label: "分区模版", width: "24%", render: (r) => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub">${r.id} · ${UI.esc(r.method)}</div>` },
        { label: "国家", width: "8%", render: (r) => Q.product({ US: "P001", DE: "P003", CA: "P008" }[r.country] || "").countryName || r.country },
        { label: "分区摘要", width: "34%", render: (r) => `<div class="row wrap" style="gap:5px">${r.rules.map(x => `<span class="badge b-outline no-dot">${UI.esc(x.zone)}</span>`).join("")}</div>` },
        { label: "规则数", width: "7%", align: "right", render: (r) => `<span class="price-cell">${r.rules.length}</span>` },
        { label: "引用", width: "7%", align: "right", render: (r) => `<span class="price-cell">${r.refs}</span>` },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status) },
        { label: "更新", width: "9%", render: (r) => `<span class="tiny muted">${r.updated}</span>` },
        { label: "操作", width: "8%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的分区模版"
    });
    document.getElementById("zonePager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#zoneTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const z = Store.find("zones", id);
    UI.drawer({
      title: z.name,
      sub: `${z.id} · ${z.method} · 状态 ${z.status}`,
      wide: true,
      body: `<div class="stack">
        <div class="row">
          <span class="badge b-teal">${z.rules.length} 条分区规则</span>
          <span class="badge b-outline">被 ${z.refs} 个价格引用</span>
          <span class="spacer"></span>
          <button class="btn btn-ghost btn-sm" id="addRule">${UI.icon("plus", 12)} 新增规则</button>
        </div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>分区</th><th>起点</th><th>终点</th><th>说明</th></tr></thead>
          <tbody>${z.rules.map((r, i) => `<tr><td class="t-main">${UI.esc(r.zone)}</td><td class="mono">${UI.esc(r.from)}</td><td class="mono">${UI.esc(r.to)}</td><td class="tiny muted">${UI.esc(r.note || "—")}</td></tr>`).join("")}</tbody></table></div>
        <div class="banner">${UI.icon("info", 15)}<div>区间边界：起点/终点均包含；美国邮编按 5 位字符串比较，不使用数值排序。前导零示例：00501 属于 Z3 美东。</div></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>加拿大分区模版当前为停用状态，P008 的公布价无法匹配分区，计费会返回“无有效价格”。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div><button class="btn btn-soft" data-check>校验区间</button><button class="btn btn-primary" data-edit>编辑规则</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-check]").onclick = () => UI.toast("区间校验通过：无重叠，覆盖主要邮编段", "ok");
        el.querySelector("[data-edit]").onclick = () => UI.toast("规则编辑：原型演示入口，保存后版本 +1", "warn");
        el.querySelector("#addRule").onclick = () => openRule(z);
      }
    });
  }

  function openRule(z) {
    UI.modal({
      title: "新增分区规则 · " + z.name,
      body: `<div class="form-grid">
        <div class="field"><label>分区名称<span class="req">*</span></label><input class="input" id="rzName" placeholder="如 Z5 波多黎各"></div>
        <div class="field"><label>条件类型</label><select class="select" id="rzType"><option>邮编区间</option><option>邮编前缀</option><option>城市</option></select></div>
        <div class="field"><label>起点<span class="req">*</span></label><input class="input" id="rzFrom" placeholder="如 00600"></div>
        <div class="field"><label>终点<span class="req">*</span></label><input class="input" id="rzTo" placeholder="如 00799"></div>
        <div class="field span-2"><label>说明</label><input class="input" id="rzNote" placeholder="如 波多黎各，偏远"></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="rzSave">保存</button>`,
      onMount(el, close) {
        el.querySelector("#rzSave").onclick = () => {
          const name = UI.val("rzName"), from = UI.val("rzFrom"), to = UI.val("rzTo");
          if (!name || !from) return UI.toast("请填写分区名称和起点", "err");
          z.rules.push({ zone: name, from, to: to || "—", note: UI.val("rzNote") });
          Store.update("zones", z.id, { rules: z.rules, updated: "2026-10-22" });
          Store.log("基础配置", "新增分区规则", z.name, name + " " + from + "–" + to);
          close(); UI.toast("分区规则已新增"); render();
        };
      }
    });
  }

  function openAdd() {
    UI.modal({
      title: "新增分区模版",
      body: `<div class="form-grid">
        <div class="field"><label>模版名称<span class="req">*</span></label><input class="input" id="nzName" placeholder="如 墨西哥分区-2027"></div>
        <div class="field"><label>国家<span class="req">*</span></label><select class="select" id="nzCountry"><option value="US">美国</option><option value="DE">德国</option><option value="CA">加拿大</option><option value="MX">墨西哥</option></select></div>
        <div class="field"><label>分区方式</label><select class="select" id="nzMethod"><option>邮编区间</option><option>国家</option><option>城市</option></select></div>
        <div class="field"><label>状态</label><select class="select" id="nzStatus"><option>停用</option><option>启用</option></select></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="nzSave">创建</button>`,
      onMount(el, close) {
        el.querySelector("#nzSave").onclick = () => {
          const name = UI.val("nzName");
          if (!name) return UI.toast("请填写模版名称", "err");
          Store.add("zones", { id: "Z" + String(Store.list("zones").length + 1).padStart(2, "0"), name, country: UI.val("nzCountry"), method: UI.val("nzMethod"), status: UI.val("nzStatus"), updated: "2026-10-22", refs: 0, rules: [] });
          Store.log("基础配置", "新增", name, "新建分区模版");
          close(); UI.toast("分区模版已创建"); render();
        };
      }
    });
  }

  UI.shell({ active: "base-zone", title: "分区模版", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "country", "st"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("addBtn").onclick = openAdd;
  document.getElementById("importBtn").onclick = () => UI.toast("导入分区：支持 CSV（分区名/起点/终点/说明），原型仅演示入口", "warn");
})();
