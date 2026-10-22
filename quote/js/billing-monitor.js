/* 计费与财务 · 计费报文监控 */
(function () {
  let active = "全部";

  const content = `
    ${UI.pageHead({
      title: "计费报文监控",
      sub: "查看 CCOS/OMS 计费触发与回传报文、幂等键、耗时与失败原因；失败可重试，契约以联调为准。",
      actions: `<button class="btn btn-ghost" id="refreshBtn">${UI.icon("refresh", 14)} 刷新</button>
        <button class="btn btn-ghost" id="exportBtn">${UI.icon("download", 14)} 导出</button>`
    })}

    <div class="banner warn mb-16">${UI.icon("alert", 15)}
      <div><b>契约说明：</b>代码已验证：CCOS→B2B PQM 的计费报文只有 <b>1003</b>（签入/到齐/勘误/换箱重推）和 <b>1802</b>（增值服务完成）；PQM→CCOS 计费重回传走 MQ + HTTP <b>AddChargeWeight</b>，不是 806。字段与错误码仍以联调为准。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("database", 14)}</span>今日报文</div><div class="st-val">${Store.list("messages").length}<small>条</small></div><div class="st-ft">接收 9 · 回传 1</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>成功率</div><div class="st-val">90<small>%</small></div><div class="st-ft">成功 8 · 幂等返回 1 · 失败 1</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>平均耗时</div><div class="st-val">218<small>ms</small></div><div class="st-ft">P95 412ms · 最慢 412ms</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("refresh", 14)}</span>幂等命中</div><div class="st-val">1<small>条</small></div><div class="st-ft">重复触发按首次结果返回</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="mTabs">
        ${["全部", "失败", "幂等返回", "回传消息"].map(s => {
          let n = Store.list("messages").length;
          if (s === "失败") n = Store.list("messages").filter(m => m.status === "失败").length;
          if (s === "幂等返回") n = Store.list("messages").filter(m => m.status === "幂等返回").length;
          if (s === "回传消息") n = Store.list("messages").filter(m => m.direction.includes("→") && m.direction.startsWith("B2B")).length;
          return `<a class="tab ${s === active ? "active" : ""}" href="javascript:void(0)" data-s="${s}">${s}<span class="count">${n}</span></a>`;
        }).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="报文ID / 幂等键 / 单号"></div>
        <div class="field"><label>类型</label><select class="select" id="type"><option value="">全部</option>${[...new Set(Store.list("messages").map(m => m.type))].map(t => `<option>${t}</option>`).join("")}</select></div>
        <div class="field"><label>方向</label><select class="select" id="dir"><option value="">全部</option>${[...new Set(Store.list("messages").map(m => m.direction))].map(d => `<option>${d}</option>`).join("")}</select></div>
        <div class="field"><label>状态</label><select class="select" id="st"><option value="">全部</option><option>成功</option><option>失败</option><option>幂等返回</option></select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="msgTable"></div>
      <div id="msgPager"></div>
    </section>

    <div class="split mt-16">
      <section class="card">
        <div class="card-hd"><h3>切换与兼容状态</h3><span class="sub">M8 验收相关</span></div>
        <div class="card-bd">
          <div class="table-wrap"><table class="table compact"><thead><tr><th>项目</th><th>状态</th><th>说明</th></tr></thead><tbody>
            <tr><td>旧契约兼容适配层</td><td>${UI.badge("方案待定", "b-amber")}</td><td class="tiny muted">试算/查询可能放门面；落库/报文需调用方改造</td></tr>
            <tr><td>调用方迁移</td><td>${UI.badge("≥ 12 个调用方", "b-red")}</td><td class="tiny muted">BMS 直连 PQM 库 + 消费 MQ，适配层无法覆盖</td></tr>
            <tr><td>新旧结果比对</td><td>${UI.badge("未开始", "b-gray")}</td><td class="tiny muted">需先完成调用方清单与迁移矩阵</td></tr>
            <tr><td>旧 PQM B2B 下线</td><td>${UI.badge("未开始", "b-gray")}</td><td class="tiny muted">灰度稳定并完成在途订单处理后再下线</td></tr>
          </tbody></table></div>
          <div class="banner info mt-12">${UI.icon("info", 15)}<div>调用方清单与代码证据见 <a href="docs/open-questions.md" target="_blank">问题台账</a>；BMS 直连库与 MQ 需单列改造。</div></div>
        </div>
      </section>
      <section class="card">
        <div class="card-hd"><h3>错误分布</h3></div>
        <div class="card-bd">
          <div class="stack" style="gap:12px">
            <div><div class="row" style="margin-bottom:5px"><span class="small">NO_VALID_PRICE</span><span class="spacer"></span><span class="small strong">1 次</span></div><div class="progress red"><i style="width:100%"></i></div></div>
            <div><div class="row" style="margin-bottom:5px"><span class="small">IDEMPOTENT_REPLAY</span><span class="spacer"></span><span class="small strong">1 次</span></div><div class="progress blue"><i style="width:60%"></i></div></div>
            <div><div class="row" style="margin-bottom:5px"><span class="small">其他</span><span class="spacer"></span><span class="small strong">0 次</span></div><div class="progress"><i style="width:2%"></i></div></div>
          </div>
          <div class="hint mt-12">失败集中在“无有效价格”，需先补价再重试；不是接口异常。</div>
        </div>
      </section>
    </div>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const type = document.getElementById("type").value;
    const dir = document.getElementById("dir").value;
    const st = document.getElementById("st").value;
    return Store.list("messages").filter(m => {
      if (active === "失败" && m.status !== "失败") return false;
      if (active === "幂等返回" && m.status !== "幂等返回") return false;
      if (active === "回传消息" && !m.direction.startsWith("B2B")) return false;
      if (type && m.type !== type) return false;
      if (dir && m.direction !== dir) return false;
      if (st && m.status !== st) return false;
      if (kw && !(m.id + m.idem + m.ref + m.name).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("msgTable").innerHTML = UI.table({
      columns: [
        { label: "报文", width: "16%", render: r => `<div class="t-main mono" style="font-size:11px">${r.id}</div><div class="t-sub">${r.at.slice(5, 19)}</div>` },
        { label: "类型", width: "17%", render: r => `<span class="code-tag">${r.type}</span> ${UI.esc(r.name)}` },
        { label: "方向", width: "13%", render: r => `<span class="tiny">${UI.esc(r.direction)}</span>` },
        { label: "关联单", width: "12%", render: r => `<a class="mono tiny" href="billing-detail.html?id=${r.ref}">${r.ref}</a>` },
        { label: "幂等键", width: "16%", render: r => `<span class="mono tiny">${UI.esc(r.idem.slice(0, 26))}…</span>` },
        { label: "状态", width: "8%", render: r => UI.badge(r.status, r.status === "成功" ? "b-green" : r.status === "失败" ? "b-red" : "b-blue") },
        { label: "耗时", width: "6%", align: "right", render: r => `${r.ms} ms` },
        { label: "重试", width: "5%", align: "right", render: r => r.retry },
        { label: "操作", width: "7%", render: r => `<div class="actions"><button class="btn-text" data-view="${r.id}">详情</button>${r.status === "失败" ? `<button class="btn-text" data-retry="${r.id}">重试</button>` : ""}</div>` }
      ],
      rows, rowAttrs: r => `data-id="${r.id}"`, empty: "没有匹配的报文"
    });
    document.getElementById("msgPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = e => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("[data-retry]").forEach(b => b.onclick = e => { e.stopPropagation(); retry(b.dataset.retry); });
    document.querySelectorAll("#msgTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function payload(m) {
    const req = {
      messageType: m.type,
      messageId: m.id,
      idempotencyKey: m.idem,
      mainOrderNo: m.ref,
      triggerType: m.name,
      timestamp: m.at
    };
    const resp = m.status === "失败"
      ? { code: "NO_VALID_PRICE", message: m.error || "计费失败", billNo: m.ref }
      : m.status === "幂等返回"
        ? { code: "0", message: "duplicate request, return first result", billNo: m.ref, idempotent: true }
        : { code: "0", message: "success", billNo: m.ref, amount: Store.find("bills", m.ref)?.amount || 0 };
    return { req, resp };
  }

  function openView(id) {
    const m = Store.find("messages", id);
    const p = payload(m);
    UI.drawer({
      title: m.id,
      sub: `${m.type} ${m.name} · ${m.direction}`,
      wide: true,
      body: `<div class="stack">
        <div class="info-strip" style="grid-template-columns:repeat(4,1fr)">
          <div class="is"><span>状态</span><b style="font-size:12px">${UI.badge(m.status, m.status === "成功" ? "b-green" : m.status === "失败" ? "b-red" : "b-blue")}</b></div>
          <div class="is"><span>耗时</span><b>${m.ms} ms</b><em>重试 ${m.retry}</em></div>
          <div class="is"><span>关联单</span><b class="mono" style="font-size:11px">${m.ref}</b></div>
          <div class="is"><span>时间</span><b style="font-size:11px">${m.at.slice(5)}</b></div>
        </div>
        ${m.error ? `<div class="banner ${m.status === "失败" ? "danger" : "warn"}">${UI.icon("alert", 15)}<div>${UI.esc(m.error)}</div></div>` : ""}
        <div class="msg-grid">
          <div class="msg-card"><div class="mc-hd">请求</div><div class="mc-bd"><div class="msg-json">${UI.esc(JSON.stringify(p.req, null, 2))}</div></div></div>
          <div class="msg-card"><div class="mc-hd">响应</div><div class="mc-bd"><div class="msg-json">${UI.esc(JSON.stringify(p.resp, null, 2))}</div></div></div>
        </div>
        <div class="hint">幂等键：<span class="mono">${UI.esc(m.idem)}</span></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>字段为原型示例；报文类型与回传路径已按代码核对（1003 / 1802 + AddChargeWeight）。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div>${m.status === "失败" ? `<button class="btn btn-primary" data-retry>重试</button>` : ""}`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        const r = el.querySelector("[data-retry]");
        if (r) r.onclick = () => { close(); retry(m.id); };
      }
    });
  }

  function retry(id) {
    const m = Store.find("messages", id);
    if (m.error && m.error.includes("NO_VALID_PRICE")) {
      UI.toast("重试仍失败：仍无有效价格，请先到公布价补价", "err");
      Store.update("messages", id, { retry: m.retry + 1, at: "2026-10-22 20:00" });
      Store.log("计费", "报文重试失败", id, "NO_VALID_PRICE 未消除");
      render();
      return;
    }
    UI.toast("正在重试…");
    setTimeout(() => {
      Store.update("messages", id, { status: "成功", retry: m.retry + 1, at: "2026-10-22 20:00", ms: 180 });
      Store.log("计费", "报文重试成功", id, "重试成功");
      UI.toast("重试成功"); render();
    }, 800);
  }

  UI.shell({ active: "billing-monitor", title: "计费报文监控", content });
  render();
  document.querySelectorAll("#mTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#mTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "type", "dir", "st"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("refreshBtn").onclick = () => { UI.toast("已刷新"); render(); };
  document.getElementById("exportBtn").onclick = () => UI.toast("已导出 " + filtered().length + " 条报文（示例）");
})();
