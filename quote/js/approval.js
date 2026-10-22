/* 系统 · 审批中心 */
(function () {
  let active = "审批中";
  const effects = {
    "OA-2026-1022-01": (ok) => Store.update("basePrices", "BP008", { status: ok ? "生效" : "已驳回" }),
    "OA-2026-1022-04": (ok) => Store.update("custPrices", "CP003", { status: ok ? "生效" : "已驳回", check: ok ? "审批通过（低于底价）" : "审批驳回" }),
    "OA-2026-1022-05": (ok) => {
      Store.update("adjustments", "ADJ20261022001", { status: ok ? "已通过" : "已驳回" });
      if (ok) Store.update("bills", "B202610220005", { status: "已计费", amount: 47846.4, updated: "2026-10-22 20:00" });
    },
    "OA-2026-1022-06": (ok) => Store.update("packages", "PK008", { status: ok ? "生效" : "已驳回" })
  };

  const content = `
    ${UI.pageHead({
      title: "审批中心",
      sub: "底价、套餐价、客户自由价、单票改价统一走 OA 审批；审批中的价格不参与取价，避免半成品价格被命中。",
      actions: `<button class="btn btn-ghost" id="ruleBtn">${UI.icon("sliders", 14)} 审批规则</button>`
    })}

    <div class="stat-grid">
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>待审批</div><div class="st-val">${Store.list("approvals").filter(a => a.status === "审批中").length}<small>条</small></div><div class="st-ft">底价 1 · 客户价 1 · 套餐价 1 · 改价 1</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>本月已通过</div><div class="st-val">${Store.list("approvals").filter(a => a.status === "已通过").length}<small>条</small></div><div class="st-ft">平均审批时长 3.2 小时</div></div>
      <div class="stat alert"><div class="st-hd"><span class="st-ico">${UI.icon("xCircle", 14)}</span>已驳回</div><div class="st-val">${Store.list("approvals").filter(a => a.status === "已驳回").length}<small>条</small></div><div class="st-ft">主因：成本未同步下降</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("percent", 14)}</span>驳回率</div><div class="st-val">12.5<small>%</small></div><div class="st-ft">近 30 天 8 条审批</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="apTabs">
        ${[{ l: "待审批", s: "审批中" }, { l: "已通过", s: "已通过" }, { l: "已驳回", s: "已驳回" }, { l: "全部", s: "全部" }].map(t => {
          const n = t.s === "全部" ? Store.list("approvals").length : Store.list("approvals").filter(a => a.status === t.s).length;
          return `<a class="tab ${t.s === active ? "active" : ""}" href="javascript:void(0)" data-s="${t.s}">${t.l}<span class="count">${n}</span></a>`;
        }).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="审批单号 / 标题 / 对象"></div>
        <div class="field"><label>类型</label><select class="select" id="type"><option value="">全部</option>${[...new Set(Store.list("approvals").map(a => a.type))].map(t => `<option>${t}</option>`).join("")}</select></div>
        <div class="field"><label>申请人</label><select class="select" id="applicant"><option value="">全部</option>${[...new Set(Store.list("approvals").map(a => a.applicant))].map(u => `<option>${u}</option>`).join("")}</select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="apTable"></div>
      <div id="apPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const type = document.getElementById("type").value;
    const applicant = document.getElementById("applicant").value;
    return Store.list("approvals").filter(a => {
      if (active !== "全部" && a.status !== active) return false;
      if (type && a.type !== type) return false;
      if (applicant && a.applicant !== applicant) return false;
      if (kw && !(a.id + a.title + a.object + a.reason).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("apTable").innerHTML = UI.table({
      columns: [
        { label: "审批单", width: "15%", render: (r) => `<div class="t-main mono" style="font-size:11.5px">${r.id}</div><div class="t-sub">${UI.esc(r.type)}</div>` },
        { label: "标题", width: "24%", render: (r) => `<div class="t-main">${UI.esc(r.title)}</div><div class="t-sub">${UI.esc(r.object)}</div>` },
        { label: "申请人", width: "8%", key: "applicant" },
        { label: "提交时间", width: "12%", render: (r) => `<span class="tiny muted">${r.submittedAt}</span>` },
        { label: "变更", width: "13%", render: (r) => `<span class="tiny muted">${UI.esc(r.oldVal)} →</span> <span class="small strong">${UI.esc(r.newVal)}</span>` },
        { label: "状态", width: "8%", render: (r) => UI.badge(r.status) },
        { label: "审批人", width: "8%", key: "approver" },
        { label: "操作", width: "12%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button>${r.status === "审批中" ? `<button class="btn-text" data-pass="${r.id}">通过</button><button class="btn-text" style="color:var(--red)" data-reject="${r.id}">驳回</button>` : ""}</div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的审批单"
    });
    document.getElementById("apPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("[data-pass]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.pass); });
    document.querySelectorAll("[data-reject]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.reject); });
    document.querySelectorAll("#apTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const a = Store.find("approvals", id);
    const pending = a.status === "审批中";
    const d = UI.drawer({
      title: a.title,
      sub: `${a.id} · ${a.type} · 申请人 ${a.applicant}`,
      wide: true,
      body: `<div class="stack">
        <div class="row">
          ${UI.badge(a.status)}
          <span class="badge b-outline">${UI.esc(a.type)}</span>
          <span class="spacer"></span>
          <span class="tiny muted">提交 ${a.submittedAt}</span>
        </div>
        <div class="approval-diff">
          <div class="diff-old"><div class="d-lbl">原值</div><div class="d-val">${UI.esc(a.oldVal)}</div></div>
          <div class="diff-new"><div class="d-lbl">新值</div><div class="d-val" style="color:var(--brand-deep)">${UI.esc(a.newVal)}</div></div>
        </div>
        <dl class="kv">
          <dt>审批对象</dt><dd>${UI.esc(a.object)}</dd>
          <dt>变更原因</dt><dd>${UI.esc(a.reason)}</dd>
          <dt>影响范围</dt><dd>${UI.esc(a.impact)}</dd>
          <dt>审批人</dt><dd>${UI.esc(a.approver)}</dd>
        </dl>
        <div class="divider"></div>
        <div class="section-title">审批流</div>
        <div class="timeline">
          <div class="tl-item done"><div class="tl-title">提交申请</div><div class="tl-meta">${a.applicant} · ${a.submittedAt}</div><div class="tl-body">${UI.esc(a.reason)}</div></div>
          <div class="tl-item ${pending ? "now" : "done"}"><div class="tl-title">${pending ? "审批中" : a.status}</div><div class="tl-meta">${a.approver}${pending ? " · 等待处理" : ""}</div>${pending ? "" : `<div class="tl-body">审批结论：${a.status}${a.status === "已驳回" ? "，原因见变更说明" : "，价格已按新值生效"}</div>`}</div>
          ${pending ? "" : `<div class="tl-item done"><div class="tl-title">生效/回写</div><div class="tl-meta">系统 · 自动</div><div class="tl-body">审批结果回写价格对象；审批中的价格不参与取价。</div></div>`}
        </div>
        ${pending ? `<div class="field"><label>审批意见</label><textarea class="textarea" id="apComment" placeholder="通过/驳回原因（驳回必填）"></textarea></div>` : ""}
        <div class="banner ${pending ? "warn" : "info"}">${UI.icon(pending ? "alert" : "info", 15)}<div>${pending ? "审批中的价格不参与取价；通过后按生效时间生效，驳回保留原值。" : "审批已结束，价格对象状态已回写；如需再次变更请重新发起审批。"}</div></div>
      </div>`,
      footer: pending
        ? `<button class="btn btn-danger" data-reject>驳回</button><div class="spacer"></div><button class="btn btn-ghost" data-cancel>取消</button><button class="btn btn-primary" data-pass>通过并生效</button>`
        : `<div class="spacer"></div><button class="btn btn-ghost" data-cancel>关闭</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        const pass = el.querySelector("[data-pass]");
        const reject = el.querySelector("[data-reject]");
        if (pass) pass.onclick = () => {
          const comment = (document.getElementById("apComment")?.value || "").trim();
          a.status = "已通过"; Store.save();
          if (effects[a.id]) effects[a.id](true);
          Store.log("审批中心", "审批通过", a.id, a.title + "；" + (comment || "同意"));
          close(); UI.toast("审批已通过，价格对象已生效"); render();
        };
        if (reject) reject.onclick = () => {
          const comment = (document.getElementById("apComment")?.value || "").trim();
          if (!comment) return UI.toast("驳回必须填写原因", "err");
          a.status = "已驳回"; Store.save();
          if (effects[a.id]) effects[a.id](false);
          Store.log("审批中心", "审批驳回", a.id, a.title + "；" + comment);
          close(); UI.toast("已驳回，原值保留"); render();
        };
      }
    });
    return d;
  }

  UI.shell({ active: "approval", title: "审批中心", content });
  render();
  document.querySelectorAll("#apTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#apTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "type", "applicant"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("ruleBtn").onclick = () => UI.modal({
    title: "审批规则",
    size: "sm",
    body: `<div class="stack small" style="line-height:1.8">
      <div class="row"><span>底价新增/下调</span><span class="spacer"></span><span class="badge b-blue">价格委员会</span></div>
      <div class="row"><span>客户价低于底价</span><span class="spacer"></span><span class="badge b-blue">销售总监</span></div>
      <div class="row"><span>单票改价/勘误</span><span class="spacer"></span><span class="badge b-blue">财务经理</span></div>
      <div class="row"><span>套餐价调整</span><span class="spacer"></span><span class="badge b-blue">价格委员会</span></div>
      <div class="divider"></div>
      <p class="muted">审批通过后按拟生效时间生效；审批完成晚于拟生效时间时，从审批完成时点生效，不追溯已计费账单。</p>
    </div>`,
    footer: `<div class="spacer"></div><button class="btn btn-primary" onclick="UI.closeModal()">知道了</button>`
  });
})();
