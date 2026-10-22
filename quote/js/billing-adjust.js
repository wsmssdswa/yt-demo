/* 计费与财务 · 改价与费用勘误 */
(function () {
  const presetBill = UI.param("bill") || "";
  let active = "全部";

  const content = `
    ${UI.pageHead({
      title: "改价与费用勘误",
      sub: "未出账可改单价/总价，已出账走勘误审批；支持零元费用与多币种，审批通过后落应收并留痕。",
      actions: `<button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 发起调整</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>边界：</b>改价/勘误不覆盖原账单，保留原值、新值、审批人与原因；已出账账单即使驳回也保持原应收。ARS 允许负数与零元，但 BMS 落流水会丢弃零元；已出账单的改价在 ARS 会被硬拦截，只能作废重出，原型不做该操作。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("edit", 14)}</span>调整单</div><div class="st-val">${Store.list("adjustments").length}<small>张</small></div><div class="st-ft">改价 3 · 勘误 2</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>审批中</div><div class="st-val">${Store.list("adjustments").filter(a => a.status === "审批中").length}<small>张</small></div><div class="st-ft">B202610220005 基础运费 -120</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>已通过</div><div class="st-val">${Store.list("adjustments").filter(a => a.status === "已通过").length}<small>张</small></div><div class="st-ft">含零元减免 1 张 · USD 1 张</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("xCircle", 14)}</span>已驳回</div><div class="st-val">${Store.list("adjustments").filter(a => a.status === "已驳回").length}<small>张</small></div><div class="st-ft">客户主张未超长，证据不足</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="adjTabs">
        ${["全部", "审批中", "已通过", "已驳回"].map(s => {
          const n = s === "全部" ? Store.list("adjustments").length : Store.list("adjustments").filter(a => a.status === s).length;
          return `<a class="tab ${s === active ? "active" : ""}" href="javascript:void(0)" data-s="${s}">${s}<span class="count">${n}</span></a>`;
        }).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="调整单号 / 计费单 / 客户"></div>
        <div class="field"><label>类型</label><select class="select" id="type"><option value="">全部</option><option>单票改价</option><option>费用勘误</option></select></div>
        <div class="field"><label>币种</label><select class="select" id="cur"><option value="">全部</option><option>CNY</option><option>USD</option><option>EUR</option></select></div>
        <div class="field"><label>计费单</label><input class="input" id="billFilter" value="${presetBill}" placeholder="按计费单筛选"></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="adjTable"></div>
      <div id="adjPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const type = document.getElementById("type").value;
    const cur = document.getElementById("cur").value;
    const bill = document.getElementById("billFilter").value.trim();
    return Store.list("adjustments").filter(a => {
      if (active !== "全部" && a.status !== active) return false;
      if (type && a.type !== type) return false;
      if (cur && a.currency !== cur) return false;
      if (bill && a.billId !== bill) return false;
      if (kw && !(a.id + a.billId + Q.customerName(a.customer) + a.reason).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("adjTable").innerHTML = UI.table({
      columns: [
        { label: "调整单", width: "14%", render: r => `<div class="t-main mono" style="font-size:11.5px">${r.id}</div><div class="t-sub">${r.submittedAt}</div>` },
        { label: "计费单 / 客户", width: "16%", render: r => `<div class="mono small">${r.billId}</div><div class="t-sub">${Q.customerName(r.customer)}</div>` },
        { label: "类型", width: "9%", render: r => UI.badge(r.type, r.type === "费用勘误" ? "b-purple" : "b-blue") },
        { label: "费用项", width: "11%", render: r => Q.feeName(r.fee) },
        { label: "原金额 → 新金额", width: "22%", render: r => `<span class="tiny muted">${Fmt.money(r.oldAmount, r.currency)}</span> <span class="muted">→</span> <span class="small strong" style="${r.newAmount === 0 ? "color:var(--amber)" : ""}">${Fmt.money(r.newAmount, r.currency)}</span>${r.newAmount === 0 ? ' <span class="badge b-amber">零元</span>' : ""}` },
        { label: "差额", width: "9%", align: "right", render: r => `<span class="${r.diff > 0 ? "red" : "green"}">${r.diff > 0 ? "+" : ""}${Fmt.money(r.diff, r.currency)}</span>` },
        { label: "币种", width: "6%", render: r => r.currency },
        { label: "状态", width: "8%", render: r => UI.badge(r.status) },
        { label: "操作", width: "5%", render: r => `<div class="actions"><button class="btn-text" data-view="${r.id}">查看</button></div>` }
      ],
      rows, rowAttrs: r => `data-id="${r.id}"`, empty: "没有匹配的调整单"
    });
    document.getElementById("adjPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = e => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#adjTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const a = Store.find("adjustments", id);
    UI.drawer({
      title: a.id + " · " + a.type,
      sub: `${a.billId} · ${Q.customerName(a.customer)} · 申请人 ${a.applicant}`,
      body: `<div class="stack">
        <div class="approval-diff">
          <div class="diff-old"><div class="d-lbl">原金额</div><div class="d-val">${Fmt.money(a.oldAmount, a.currency)}</div></div>
          <div class="diff-new"><div class="d-lbl">新金额</div><div class="d-val" style="color:${a.newAmount === 0 ? "var(--amber)" : "var(--brand-deep)"}">${Fmt.money(a.newAmount, a.currency)}</div></div>
        </div>
        <dl class="kv tight">
          <dt>计费单</dt><dd class="mono">${a.billId}</dd>
          <dt>费用项</dt><dd>${Q.feeName(a.fee)}</dd>
          <dt>差额</dt><dd class="${a.diff > 0 ? "red" : "green"}">${a.diff > 0 ? "+" : ""}${Fmt.money(a.diff, a.currency)}</dd>
          <dt>币种</dt><dd>${a.currency}</dd>
          <dt>账单状态</dt><dd>${a.billStatus}</dd>
          <dt>调整原因</dt><dd>${UI.esc(a.reason)}</dd>
          <dt>审批单</dt><dd class="mono">${a.approval}</dd>
          <dt>状态</dt><dd>${UI.badge(a.status)}</dd>
        </dl>
        <div class="banner ${a.billStatus === "已出账" ? "warn" : "info"}">${UI.icon(a.billStatus === "已出账" ? "alert" : "info", 15)}<div>${a.billStatus === "已出账" ? "已出账账单走勘误：生成差额应收，不覆盖原账单。" : "未出账改价：审批通过后重新计费，原费用明细被新结果替换。"}</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div>${a.status === "审批中" ? `<a class="btn btn-primary" href="approval.html">去审批</a>` : ""}`,
      onMount(el, close) { el.querySelector("[data-cancel]").onclick = close; }
    });
  }

  function openAdd() {
    const bills = Store.list("bills").filter(b => b.status !== "计费失败");
    const defaultBill = presetBill ? Store.find("bills", presetBill) : bills[0];
    UI.drawer({
      title: "发起改价 / 费用勘误",
      sub: "未出账→改价；已出账→勘误；支持零元与多币种",
      wide: true,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>计费单<span class="req">*</span></label><select class="select" id="abBill">${bills.map(b => `<option value="${b.id}" ${defaultBill && b.id === defaultBill.id ? "selected" : ""}>${b.id} · ${Q.customerName(b.customer)} · ${b.currency}</option>`).join("")}</select></div>
          <div class="field"><label>调整类型</label><input class="input" id="abType" value="${defaultBill && defaultBill.status === "已出账" ? "费用勘误" : "单票改价"}" disabled></div>
          <div class="field"><label>费用项<span class="req">*</span></label><select class="select" id="abFee">${defaultBill ? defaultBill.lines.map(l => `<option>${l.fee}</option>`).join("") : ""}</select></div>
          <div class="field"><label>币种<span class="req">*</span></label><select class="select" id="abCur"><option>CNY</option><option>USD</option><option>EUR</option></select></div>
          <div class="field"><label>原金额</label><input class="input" id="abOld" value="${defaultBill && defaultBill.lines[0] ? defaultBill.lines[0].amount : 0}" disabled></div>
          <div class="field"><label>新金额<span class="req">*</span></label><input class="input" id="abNew" type="number" step="0.01" placeholder="允许填 0"></div>
          <div class="field span-2"><label>调整原因<span class="req">*</span></label><textarea class="textarea" id="abReason" placeholder="如 客户协议折扣 / 地址类型录错 / 燃油费率调整"></textarea></div>
          <div class="field span-2"><label>附件</label><div class="upload-zone">${UI.icon("upload", 20)}<div>上传客户确认、协议或证明（示例）</div></div></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>提交后进入 OA 审批；审批通过才落应收。零元费用允许提交，但 BMS 会丢弃零元流水，需人工确认对账影响。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>提交审批</button>`,
      onMount(el, close) {
        const billSel = el.querySelector("#abBill");
        const feeSel = el.querySelector("#abFee");
        const oldInput = el.querySelector("#abOld");
        const typeInput = el.querySelector("#abType");
        const curSel = el.querySelector("#abCur");
        const syncBill = () => {
          const b = Store.find("bills", billSel.value);
          typeInput.value = b.status === "已出账" ? "费用勘误" : "单票改价";
          curSel.value = b.currency;
          feeSel.innerHTML = b.lines.map(l => `<option>${l.fee}</option>`).join("");
          oldInput.value = b.lines[0] ? b.lines[0].amount : 0;
        };
        billSel.onchange = syncBill;
        feeSel.onchange = () => {
          const b = Store.find("bills", billSel.value);
          const line = b.lines.find(l => l.fee === feeSel.value);
          oldInput.value = line ? line.amount : 0;
        };
        syncBill();
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const bill = Store.find("bills", billSel.value);
          const newAmount = parseFloat(el.querySelector("#abNew").value);
          const reason = UI.val("abReason");
          if (isNaN(newAmount) || newAmount < 0) return UI.toast("请填写有效的新金额（≥0）", "err");
          if (!reason) return UI.toast("请填写调整原因", "err");
          const line = bill.lines.find(l => l.fee === feeSel.value);
          const oldAmount = line ? line.amount : 0;
          const oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
          const adj = {
            id: "ADJ202610" + String(2200 + Store.list("adjustments").length).slice(-4),
            billId: bill.id, customer: bill.customer, type: typeInput.value, fee: feeSel.value,
            oldAmount, newAmount, diff: +(newAmount - oldAmount).toFixed(2), currency: UI.val("abCur"),
            status: "审批中", applicant: "杨鑫", submittedAt: "2026-10-22 20:00", reason,
            approval: oa, billStatus: bill.status === "已出账" ? "已出账" : "未出账"
          };
          Store.add("adjustments", adj);
          Store.add("approvals", { id: oa, type: adj.type, title: bill.id + " " + feeSel.value + " 调整", object: `${bill.id} / ${feeSel.value}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "财务经理", oldVal: Fmt.money(oldAmount, adj.currency), newVal: Fmt.money(newAmount, adj.currency), reason, impact: adj.billStatus === "已出账" ? "已出账，走勘误不覆盖原账单" : "未出账，审批后重新计费" });
          Store.log("费用调整", "提交", adj.id, bill.id + " " + feeSel.value + " " + oldAmount + " → " + newAmount + "，" + oa);
          close(); UI.toast("已提交审批：" + oa); render();
        };
      }
    });
  }

  UI.shell({ active: "billing-adjust", title: "改价与费用勘误", content });
  render();
  document.querySelectorAll("#adjTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#adjTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "type", "cur", "billFilter"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("addBtn").onclick = openAdd;
})();
