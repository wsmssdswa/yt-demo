/* 产品价格 · 价格版本与快照 */
(function () {
  const content = `
    ${UI.pageHead({
      title: "价格版本与快照",
      sub: "每次价格变更保留版本与生效区间，支持按业务发生时点还原当时生效价格，供账单核对与争议回溯。",
      actions: `<button class="btn btn-ghost" id="compareBtn">${UI.icon("branch", 14)} 版本对比</button>
        <button class="btn btn-ghost" id="exportBtn">${UI.icon("download", 14)} 导出</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>快照口径：</b>快照按“业务发生时点”取当时生效的版本，不取当前最新版本。已出账账单永远按计费时点的版本复现，后续调价不覆盖历史。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>价格变更记录</div><div class="st-val">${Store.list("priceHistory").length}<small>条</small></div><div class="st-ft">底价/公布价/套餐价/客户价</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>已生效</div><div class="st-val">${Store.list("priceHistory").filter(h => h.status === "已生效").length}<small>条</small></div><div class="st-ft">最近 60 天 6 条</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>待生效</div><div class="st-val">${Store.list("priceHistory").filter(h => h.status === "待生效").length}<small>条</small></div><div class="st-ft">11-01 生效，审批中</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("database", 14)}</span>保留周期</div><div class="st-val" style="font-size:18px;letter-spacing:0">永久</div><div class="st-ft">按生效区间归档，支持任意时点还原</div></div>
    </div>

    <section class="card mt-16">
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="产品 / 变更内容"></div>
        <div class="field"><label>价格对象</label><select class="select" id="obj"><option value="">全部</option>${[...new Set(Store.list("priceHistory").map(h => h.object))].map(o => `<option>${o}</option>`).join("")}</select></div>
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>已生效</option><option>待生效</option><option>已失效</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="phTable"></div>
      <div id="phPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const obj = document.getElementById("obj").value;
    const p = document.getElementById("product").value;
    const st = document.getElementById("st").value;
    return Store.list("priceHistory").filter(h => {
      if (obj && h.object !== obj) return false;
      if (p && h.product !== p) return false;
      if (st && h.status !== st) return false;
      if (kw && !(h.object + h.field + h.reason + Q.productName(h.product)).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("phTable").innerHTML = UI.table({
      columns: [
        { label: "变更时间", width: "12%", render: (r) => `<span class="mono tiny">${r.at.slice(0, 16)}</span>` },
        { label: "价格对象", width: "9%", render: (r) => `<span class="badge b-outline no-dot">${r.object}</span>` },
        { label: "产品 / 国家", width: "16%", render: (r) => `<div class="t-main">${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.country}</div>` },
        { label: "变更项", width: "16%", render: (r) => `<span class="small">${UI.esc(r.field)}</span>` },
        { label: "变更前 → 变更后", width: "22%", render: (r) => `<span class="tiny muted">${UI.esc(r.oldVal)}</span> <span class="muted">→</span> <span class="small strong">${UI.esc(r.newVal)}</span>` },
        { label: "版本 / 生效", width: "11%", render: (r) => `<span class="mono tiny">${r.version}</span><div class="t-sub">${r.effective}</div>` },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status, r.status === "已生效" ? "b-green" : r.status === "待生效" ? "b-amber" : "b-gray") },
        { label: "审批单", width: "10%", render: (r) => `<span class="mono tiny">${r.approval}</span>` },
        { label: "操作", width: "6%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">快照</button></div>` }
      ],
      rows, rowAttrs: (r) => `data-id="${r.id}"`, empty: "没有匹配的变更记录"
    });
    document.getElementById("phPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#phTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const h = Store.find("priceHistory", id);
    UI.drawer({
      title: h.field + " · 版本快照",
      sub: `${h.id} · ${h.at} · ${h.operator}`,
      body: `<div class="stack">
        <div class="approval-diff">
          <div class="diff-old"><div class="d-lbl">变更前</div><div class="d-val">${UI.esc(h.oldVal)}</div></div>
          <div class="diff-new"><div class="d-lbl">变更后</div><div class="d-val" style="color:var(--brand-deep)">${UI.esc(h.newVal)}</div></div>
        </div>
        <dl class="kv">
          <dt>价格对象</dt><dd>${h.object}</dd>
          <dt>产品 / 国家</dt><dd>${Q.productName(h.product)} / ${h.country}</dd>
          <dt>版本</dt><dd><span class="mono">${h.version}</span></dd>
          <dt>生效日期</dt><dd>${h.effective}</dd>
          <dt>状态</dt><dd>${UI.badge(h.status)}</dd>
          <dt>审批单</dt><dd><span class="mono">${h.approval}</span></dd>
          <dt>变更原因</dt><dd>${UI.esc(h.reason)}</dd>
        </dl>
        <div class="section-title">快照还原</div>
        <div class="banner success">${UI.icon("checkCircle", 15)}<div>按业务发生时点还原：若计费发生在 ${h.effective} 之后，取版本 <b>${h.version}</b>；之前的账单取上一版本。</div></div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>时点</th><th>适用版本</th><th>基础运费</th></tr></thead><tbody>
          <tr><td>${h.effective} 起</td><td class="mono">${h.version}</td><td>${UI.esc(h.newVal)}</td></tr>
          <tr><td>${h.effective} 前</td><td class="mono">上一版本</td><td>${UI.esc(h.oldVal)}</td></tr>
        </tbody></table></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>快照只读；如需恢复历史价格，必须重新发起价格变更与审批，不能直接回滚。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div><button class="btn btn-soft" data-restore>按此版本发起变更</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-restore]").onclick = () => { close(); UI.toast("已按历史版本创建价格变更草稿", "ok"); };
      }
    });
  }

  UI.shell({ active: "price-history", title: "价格版本与快照", content });
  render();
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "obj", "product", "st"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("compareBtn").onclick = () => UI.modal({
    title: "版本对比",
    size: "sm",
    body: `<div class="form-grid">
      <div class="field"><label>版本 A</label><select class="select"><option>v12（2026-10-01 生效）</option><option>v11（2026-07-01 生效）</option></select></div>
      <div class="field"><label>版本 B</label><select class="select"><option>v13-draft（待生效）</option><option>v12（2026-10-01 生效）</option></select></div>
    </div>
    <div class="banner info mt-12">${UI.icon("info", 15)}<div>原型演示入口：对比结果按基础运费列展示差异与影响客户数。</div></div>`,
    footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" onclick="UI.closeModal();UI.toast('版本对比已生成（示例）')">对比</button>`
  });
  document.getElementById("exportBtn").onclick = () => UI.toast("已导出 " + filtered().length + " 条价格变更记录");
})();
