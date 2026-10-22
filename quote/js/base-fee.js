/* 基础配置 · 费用项与额外服务 */
(function () {
  const groups = ["基础运费", "附加费", "增值服务"];
  let activeGroup = "全部";

  const content = `
    ${UI.pageHead({
      title: "费用项与额外服务",
      sub: "SYS 同步费用项枚举；本系统维护计费单位、计费方式与适用关系。费用项只做“字典”，不在这里配价格。",
      actions: `<button class="btn btn-ghost" id="syncBtn">${UI.icon("refresh", 14)} 同步 SYS</button>
        <button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新增费用项</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>SYS 实际同步范围：</b>费用项代码、中英文名、分组、税率、启停状态。计费单位、计费方式、适用产品/国家、产品版本由价格模版与规则层维护；SYS 不提供这些字段，原型不假设 SYS 有能力下发。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("receipt", 14)}</span>费用项总数</div><div class="st-val">${Store.list("feeItems").length}<small>项</small></div><div class="st-ft">基础运费 2 · 附加费 6 · 增值服务 6</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>启用中</div><div class="st-val">${Store.list("feeItems").filter(f => f.status === "启用").length}<small>项</small></div><div class="st-ft">停用 1 项（旺季附加费待 11 月启用）</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("spark", 14)}</span>额外服务</div><div class="st-val">7<small>项</small></div><div class="st-ft">贴标 · 换箱 · 托盘 · 查验 · 保价 · 仓储</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>最近同步</div><div class="st-val" style="font-size:18px;letter-spacing:0">10-20 03:00</div><div class="st-ft">自动同步成功 · 新增 0 / 更新 1</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="feeTabs">
        ${["全部", ...groups].map(g => `<a class="tab ${g === "全部" ? "active" : ""}" href="javascript:void(0)" data-g="${g}">${g}<span class="count">${g === "全部" ? Store.list("feeItems").length : Store.list("feeItems").filter(f => f.group === g).length}</span></a>`).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="费用项名称 / 代码"></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>启用</option><option>停用</option></select></div>
        <div class="field"><label>来源</label><select class="select" id="src"><option value="">全部</option><option>SYS</option><option>手工</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="feeTable"></div>
      <div id="feePager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").trim().toLowerCase();
    const st = document.getElementById("st").value;
    const src = document.getElementById("src").value;
    return Store.list("feeItems").filter((f) => {
      if (activeGroup !== "全部" && f.group !== activeGroup) return false;
      if (st && f.status !== st) return false;
      if (src && f.source !== src) return false;
      if (kw && !(f.name + f.code + f.en).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("feeTable").innerHTML = UI.table({
      columns: [
        { label: "费用项", width: "21%", render: (r) => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub"><span class="code-tag">${UI.esc(r.code)}</span> ${UI.esc(r.en)}</div>` },
        { label: "分组", width: "9%", render: (r) => UI.badge(r.group, r.group === "增值服务" ? "b-purple" : r.group === "附加费" ? "b-blue" : "b-teal") },
        { label: "计费单位", width: "9%", key: "unit" },
        { label: "计费方式", width: "16%", render: (r) => `<span class="small">${UI.esc(r.mode)}</span>` },
        { label: "状态", width: "8%", render: (r) => UI.badge(r.status) },
        { label: "来源", width: "7%", render: (r) => r.source === "SYS" ? `<span class="badge b-outline no-dot">SYS</span>` : `<span class="badge b-outline no-dot">手工</span>` },
        { label: "OA 审批", width: "9%", render: (r) => UI.badge(r.oa, r.oa === "已生效" ? "b-green" : "b-gray") },
        { label: "更新时间", width: "12%", render: (r) => `<span class="tiny muted">${UI.esc(r.syncAt)}</span>` },
        { label: "操作", width: "9%", render: (r) => `<div class="actions"><button class="btn-text" data-edit="${r.code}">编辑</button><button class="btn-text" data-toggle="${r.code}">${r.status === "启用" ? "停用" : "启用"}</button></div>` }
      ],
      rows,
      rowAttrs: (r) => `data-id="${r.code}"`,
      empty: "没有匹配的费用项"
    });
    document.getElementById("feePager").innerHTML = UI.pager(rows.length, 1, 20);
    bind();
  }

  function bind() {
    document.querySelectorAll("[data-edit]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); openEdit(b.dataset.edit); });
    document.querySelectorAll("[data-toggle]").forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const f = Store.find("feeItems", b.dataset.toggle);
      const next = f.status === "启用" ? "停用" : "启用";
      UI.confirm("确认" + next, `费用项 <b>${UI.esc(f.name)}</b> 将被${next}，${next === "停用" ? "已引用该费用项的价格不再新增，历史价格仍可复现。" : "启用后可用于新价格配置。"}`, () => {
        Store.update("feeItems", f.code, { status: next });
        Store.log("基础配置", next, f.name, "费用项状态变更");
        UI.toast("费用项已" + next);
        render();
      });
    });
    document.querySelectorAll("#feeTable tbody tr[data-id]").forEach((tr) => tr.onclick = () => openEdit(tr.dataset.id));
  }

  function openEdit(code) {
    const f = Store.find("feeItems", code);
    const d = UI.drawer({
      title: f.name,
      sub: `${f.code} · 来源 ${f.source} · 最近同步 ${f.syncAt}`,
      body: `<div class="stack">
        <div class="banner">${UI.icon("info", 15)}<div>费用项基础信息由 SYS 维护；本页只维护本系统的计费单位与计费方式。SYS 不提供“适用产品/国家”字段。</div></div>
        <div class="form-grid">
          <div class="field"><label>费用项代码</label><input class="input" value="${UI.esc(f.code)}" disabled></div>
          <div class="field"><label>英文名</label><input class="input" value="${UI.esc(f.en)}" disabled></div>
          <div class="field"><label>费用项名称<span class="req">*</span></label><input class="input" id="efName" value="${UI.esc(f.name)}"></div>
          <div class="field"><label>分组<span class="req">*</span></label><select class="select" id="efGroup">${UI.options(groups.map(g => ({ g })), "g", "g", f.group)}</select></div>
          <div class="field"><label>计费单位<span class="req">*</span></label><input class="input" id="efUnit" value="${UI.esc(f.unit)}"></div>
          <div class="field"><label>计费方式<span class="req">*</span></label><input class="input" id="efMode" value="${UI.esc(f.mode)}"></div>
          <div class="field span-2"><label>说明</label><textarea class="textarea" id="efRemark">${UI.esc(f.remark)}</textarea></div>
          <div class="field span-2"><label>状态</label><label class="switch"><input type="checkbox" id="efStatus" ${f.status === "启用" ? "checked" : ""}><span class="track"></span><span class="sw-label">启用该费用项</span></label></div>
        </div>
        <div class="divider"></div>
        <div class="kv tight"><dt>OA 审批</dt><dd>${UI.badge(f.oa, f.oa === "已生效" ? "b-green" : "b-gray")}</dd><dt>更新时间</dt><dd>${f.syncAt}</dd></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          Store.update("feeItems", f.code, {
            name: document.getElementById("efName").value.trim(),
            group: document.getElementById("efGroup").value,
            unit: document.getElementById("efUnit").value.trim(),
            mode: document.getElementById("efMode").value.trim(),
            remark: document.getElementById("efRemark").value.trim(),
            status: document.getElementById("efStatus").checked ? "启用" : "停用"
          });
          Store.log("基础配置", "更新", f.name, "维护计费单位/计费方式");
          close(); UI.toast("费用项已保存"); render();
        };
      }
    });
    return d;
  }

  function openAdd() {
    UI.modal({
      title: "新增费用项",
      body: `<div class="form-grid">
        <div class="field"><label>费用项代码<span class="req">*</span></label><input class="input" id="nfCode" placeholder="如 PACKING"></div>
        <div class="field"><label>名称<span class="req">*</span></label><input class="input" id="nfName" placeholder="如 打包费"></div>
        <div class="field"><label>分组</label><select class="select" id="nfGroup">${groups.map(g => `<option>${g}</option>`).join("")}</select></div>
        <div class="field"><label>计费单位</label><input class="input" id="nfUnit" placeholder="件 / 票 / KG"></div>
        <div class="field"><label>计费方式</label><input class="input" id="nfMode" placeholder="固定金额 / 比例费率"></div>
        <div class="field"><label>状态</label><select class="select" id="nfStatus"><option>启用</option><option>停用</option></select></div>
      </div>
      <div class="hint mt-8">手工新增的费用项不会回写 SYS；若需全局生效，仍需在 SYS 建档后同步。</div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="nfSave">保存</button>`,
      onMount(el, close) {
        el.querySelector("#nfSave").onclick = () => {
          const code = UI.val("nfCode").toUpperCase(), name = UI.val("nfName");
          if (!code || !name) return UI.toast("请填写代码和名称", "err");
          if (Store.find("feeItems", code)) return UI.toast("费用项代码已存在", "err");
          Store.add("feeItems", { code, name, en: name, group: UI.val("nfGroup"), unit: UI.val("nfUnit") || "件", mode: UI.val("nfMode") || "固定金额", status: UI.val("nfStatus"), source: "手工", oa: "—", syncAt: "2026-10-22 20:00", remark: "" });
          Store.log("基础配置", "新增", name, "手工新增费用项 " + code);
          close(); UI.toast("费用项已新增"); render();
        };
      }
    });
  }

  UI.shell({ active: "base-fee", title: "费用项与额外服务", content });
  render();

  document.querySelectorAll("#feeTabs .tab").forEach((t) => t.onclick = () => {
    document.querySelectorAll("#feeTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); activeGroup = t.dataset.g; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => {
    document.getElementById("kw").value = ""; document.getElementById("st").value = ""; document.getElementById("src").value = ""; render();
  };
  document.getElementById("kw").addEventListener("keydown", (e) => { if (e.key === "Enter") render(); });
  document.getElementById("syncBtn").onclick = () => {
    const btn = document.getElementById("syncBtn");
    btn.disabled = true; btn.innerHTML = "同步中…";
    setTimeout(() => {
      btn.disabled = false; btn.innerHTML = UI.icon("refresh", 14) + " 同步 SYS";
      Store.log("基础配置", "同步", "SYS 费用项", "同步 14 个费用项，新增 0、更新 0");
      UI.toast("SYS 同步完成：14 个费用项，无变化");
    }, 700);
  };
  document.getElementById("addBtn").onclick = openAdd;
})();
