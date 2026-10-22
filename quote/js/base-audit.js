/* 系统 · 操作日志 */
(function () {
  const modules = [...new Set(Store.list("logs").map(l => l.module))];

  const content = `
    ${UI.pageHead({
      title: "操作日志",
      sub: "价格、审批、客户绑定、报价单发布、计费改价等关键操作留痕；日志只读，不允许编辑或删除。",
      actions: `<button class="btn btn-ghost" id="exportBtn">${UI.icon("download", 14)} 导出</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>记录范围：</b>谁、什么时间、在哪个模块、对哪个对象、做了什么、改前改后是什么。批量操作每单一条；系统自动动作（同步、失效、回传）也记录，操作人记为“系统”。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("list", 14)}</span>今日操作</div><div class="st-val">${Store.list("logs").filter(l => l.at.startsWith("2026-10-22")).length}<small>条</small></div><div class="st-ft">价格 6 · 询价 3 · 计费 4 · 系统 2</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("edit", 14)}</span>价格类变更</div><div class="st-val">${Store.list("logs").filter(l => l.module.includes("价格")).length}<small>条</small></div><div class="st-ft">底价/公布价/客户价/套餐价</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>审批动作</div><div class="st-val">${Store.list("logs").filter(l => l.action.includes("审批")).length}<small>条</small></div><div class="st-ft">提交 5 · 通过 2 · 驳回 1</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("database", 14)}</span>保留周期</div><div class="st-val" style="font-size:18px;letter-spacing:0">3 年</div><div class="st-ft">满足审计与争议回溯要求</div></div>
    </div>

    <section class="card mt-16">
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="对象 / 详情 / 操作人"></div>
        <div class="field"><label>模块</label><select class="select" id="module"><option value="">全部</option>${modules.map(m => `<option>${m}</option>`).join("")}</select></div>
        <div class="field"><label>操作人</label><select class="select" id="user"><option value="">全部</option>${[...new Set(Store.list("logs").map(l => l.user))].map(u => `<option>${u}</option>`).join("")}</select></div>
        <div class="field"><label>开始日期</label><input class="input" id="from" type="date" value="2026-10-18"></div>
        <div class="field"><label>结束日期</label><input class="input" id="to" type="date" value="2026-10-22"></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="logTable"></div>
      <div id="logPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const m = document.getElementById("module").value;
    const u = document.getElementById("user").value;
    const from = document.getElementById("from").value;
    const to = document.getElementById("to").value;
    return Store.list("logs").filter(l => {
      if (m && l.module !== m) return false;
      if (u && l.user !== u) return false;
      if (from && l.at.slice(0, 10) < from) return false;
      if (to && l.at.slice(0, 10) > to) return false;
      if (kw && !(l.object + l.detail + l.user + l.action).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("logTable").innerHTML = UI.table({
      columns: [
        { label: "时间", width: "13%", render: (r) => `<span class="mono">${r.at.slice(5)}</span>` },
        { label: "操作人", width: "9%", render: (r) => r.user === "系统" ? '<span class="badge b-gray no-dot">系统</span>' : `<span class="t-main">${UI.esc(r.user)}</span>` },
        { label: "模块", width: "10%", render: (r) => `<span class="badge b-outline no-dot">${UI.esc(r.module)}</span>` },
        { label: "动作", width: "9%", render: (r) => UI.esc(r.action) },
        { label: "对象", width: "20%", render: (r) => `<span class="t-main">${UI.esc(r.object)}</span>` },
        { label: "详情", width: "29%", render: (r) => `<span class="tiny" style="color:var(--ink-2)">${UI.esc(r.detail)}</span>` },
        { label: "IP", width: "10%", render: (r) => `<span class="mono tiny">${UI.esc(r.ip)}</span>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的日志"
    });
    document.getElementById("logPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("#logTable tbody tr[data-id]").forEach(tr => tr.onclick = () => {
      const l = Store.list("logs").find(x => x.id === tr.dataset.id);
      UI.drawer({
        title: "操作详情",
        sub: l.id,
        body: `<div class="stack">
          <dl class="kv">
            <dt>操作时间</dt><dd>${l.at}</dd>
            <dt>操作人</dt><dd>${UI.esc(l.user)}</dd>
            <dt>模块</dt><dd>${UI.esc(l.module)}</dd>
            <dt>动作</dt><dd>${UI.esc(l.action)}</dd>
            <dt>操作对象</dt><dd>${UI.esc(l.object)}</dd>
            <dt>详情</dt><dd>${UI.esc(l.detail)}</dd>
            <dt>来源 IP</dt><dd><span class="mono">${UI.esc(l.ip)}</span></dd>
          </dl>
          <div class="banner">${UI.icon("info", 15)}<div>日志为追加写入，不提供编辑与删除入口；如需溯源请导出后归档。</div></div>
        </div>`,
        footer: `<button class="btn btn-ghost" data-cancel>关闭</button>`,
        onMount(el, close) { el.querySelector("[data-cancel]").onclick = close; }
      });
    });
  }

  UI.shell({ active: "base-audit", title: "操作日志", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "module", "user"].forEach(id => document.getElementById(id).value = ""); document.getElementById("from").value = "2026-10-18"; document.getElementById("to").value = "2026-10-22"; render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("exportBtn").onclick = () => {
    Store.log("操作日志", "导出", "操作日志", "导出当前筛选结果 " + filtered().length + " 条");
    UI.toast("已导出 " + filtered().length + " 条日志（示例）");
  };
})();
