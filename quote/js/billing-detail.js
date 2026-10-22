/* 计费与财务 · 计费详情 */
(function () {
  let id = UI.param("id") || Store.list("bills")[0].id;
  let bill = Store.find("bills", id);

  if (!bill) {
    UI.shell({ active: "billing-list", title: "计费详情", content: UI.empty("计费单不存在", "返回列表重新选择") });
    return;
  }

  function build() {
    const c = Q.customer(bill.customer), p = Q.product(bill.product), wh = Q.warehouse(bill.warehouse);
    const msgs = Store.list("messages").filter(m => m.ref === bill.id);
    const total = bill.lines.reduce((s, l) => s + l.amount, 0);
    return `
      ${UI.pageHead({
        title: "计费详情",
        sub: `${bill.id} · ${bill.source} · 更新 ${bill.updated}`,
        actions: `<button class="btn btn-ghost" onclick="location.href='billing-list.html'">${UI.icon("left", 14)} 返回列表</button>
          ${bill.status === "计费失败" ? `<button class="btn btn-soft" onclick="location.href='price-publish.html'">去补价格</button>` : `<button class="btn btn-ghost" data-action="recalc">${UI.icon("refresh", 14)} 重算</button>`}
          <button class="btn btn-primary" data-action="adjust">${UI.icon("edit", 14)} 发起改价/勘误</button>`
      })}

      <section class="card">
        <div class="doc-hd">
          <div class="dh-main">
            <div class="dh-id">${bill.id} ${UI.badge(bill.status)}</div>
            <div class="dh-sub">
              <span>${UI.icon("users", 12)} ${UI.esc(c.name)}</span>
              <span>${UI.icon("box", 12)} ${UI.esc(p.name)}</span>
              <span>${UI.icon("warehouse", 12)} ${UI.esc(wh.name)} · 计费地点 ${UI.esc(bill.billingPoint)}</span>
              <span>${UI.icon("clipboard", 12)} 主单 ${bill.orderId}</span>
            </div>
          </div>
          <div class="dh-amount">
            <b>${bill.amount ? Fmt.money(bill.amount, bill.currency) : "—"}</b>
            <span>计费金额 · ${bill.currency}</span>
          </div>
        </div>
        ${bill.error ? `<div class="card-bd" style="padding-bottom:0"><div class="banner danger">${UI.icon("alert", 15)}<div><b>计费失败：</b>${UI.esc(bill.error)}<br>系统按失败返回，不以 0 元兜底。补齐价格后可重算。</div></div></div>` : ""}
        <div class="card-bd">
          <div class="info-strip">
            <div class="is"><span>实重 / 体积</span><b>${Fmt.num(bill.actualWeight, 1)} kg / ${Fmt.num(bill.volume, 2)} m³</b></div>
            <div class="is"><span>计费重</span><b>${Fmt.num(bill.chargeWeight, 1)} kg</b><em>规则 ${bill.ruleVersion}</em></div>
            <div class="is"><span>命中价格层级</span><b>${UI.esc(bill.priceLayer)}</b><em>${UI.esc(bill.priceVersion)}</em></div>
            <div class="is"><span>回传状态</span><b style="font-size:12px">${["ccos", "oms", "ars"].map(k => `<span class="dot-tag" style="margin-right:8px"><i class="${bill.receipt[k] === "成功" || bill.receipt[k] === "已出账" ? "g" : bill.receipt[k] === "失败" ? "r" : "a"}"></i>${k.toUpperCase()} ${bill.receipt[k]}</span>`).join("")}</b></div>
          </div>
        </div>
      </section>

      <div class="detail-grid mt-16">
        <div class="stack">
          <section class="card">
            <div class="card-hd"><h3>费用明细</h3><span class="sub">${bill.currency}</span>
              <div class="right">${bill.status === "计费失败" ? UI.badge("未生成明细", "b-red") : `<span class="badge b-teal">${bill.lines.length} 项</span>`}</div>
            </div>
            ${bill.lines.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>费用项</th><th>单价 / 规则</th><th>计价数量</th><th class="num">金额</th></tr></thead>
              <tbody>${bill.lines.map(l => `<tr><td class="t-main">${UI.esc(l.fee)}</td><td>${UI.esc(l.unit)}</td><td>${UI.esc(l.qty)}</td><td class="num price-cell">${Fmt.money(l.amount, bill.currency)}</td></tr>`).join("")}
              <tr class="total"><td colspan="3">合计</td><td class="num">${Fmt.money(total, bill.currency)}</td></tr></tbody></table></div>` : `<div class="card-bd"><div class="banner danger">${UI.icon("alert", 15)}<div>没有费用明细：计费失败，未生成任何费用项。</div></div></div>`}
          </section>

          <section class="card">
            <div class="card-hd"><h3>计费重与规则</h3><span class="sub">${bill.ruleVersion}</span></div>
            <div class="card-bd">
              <div class="table-wrap"><table class="table compact"><thead><tr><th>口径</th><th class="num">数值</th><th>说明</th></tr></thead><tbody>
                <tr><td>实重</td><td class="num">${Fmt.num(bill.actualWeight, 1)} kg</td><td class="tiny muted">签入 / PDA 复核</td></tr>
                <tr><td>材积重</td><td class="num">${Fmt.num(bill.volume * 1000000 / (bill.ruleVersion === "WR004" ? 6000 : 6000), 1)} kg</td><td class="tiny muted">体积 ${Fmt.num(bill.volume, 2)} m³ × 1,000,000 ÷ 材积系数</td></tr>
                <tr><td>计费重</td><td class="num price-cell">${Fmt.num(bill.chargeWeight, 1)} kg</td><td class="tiny muted">取大后按整票进位</td></tr>
              </tbody></table></div>
              <div class="divider"></div>
              <div class="trace-list">${bill.traces.map((t, i) => `<div class="trace-item"><span class="tr-n">${i + 1}</span><span>${UI.esc(t)}</span></div>`).join("")}</div>
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>回传状态</h3><span class="sub">CCOS / OMS / ARS</span></div>
            <div class="card-bd"><div class="grid-3">
              ${[["ccos", "CCOS", "计费重/材积重回传"], ["oms", "OMS-B2B", "计费结果与状态"], ["ars", "ARS", "应收账单"]].map(([k, name, desc]) => `<div class="kpi-mini" style="grid-template-columns:1fr"><div class="km">
                <span>${name}</span><b style="font-size:14px;margin-top:6px">${UI.badge(bill.receipt[k], bill.receipt[k] === "成功" || bill.receipt[k] === "已出账" ? "b-green" : bill.receipt[k] === "失败" ? "b-red" : "b-amber")}</b>
                <div class="tiny muted mt-4">${desc}</div>
              </div></div>`).join("")}
            </div>
            <div class="banner mt-12">${UI.icon("info", 15)}<div>回传失败会进入重试队列，不改变计费结果；重复回传按幂等键去重。</div></div>
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>报文日志</h3><span class="sub">${msgs.length} 条</span>
              <div class="right"><a class="btn-text" href="billing-monitor.html">报文监控</a></div>
            </div>
            <div class="table-wrap"><table class="table compact"><thead><tr><th>报文</th><th>类型</th><th>方向</th><th>幂等键</th><th>状态</th><th>耗时</th><th>时间</th></tr></thead>
              <tbody>${msgs.map(m => `<tr><td class="mono tiny">${m.id}</td><td>${m.type} ${UI.esc(m.name)}</td><td class="tiny">${UI.esc(m.direction)}</td><td class="mono tiny">${UI.esc(m.idem.slice(0, 22))}…</td><td>${UI.badge(m.status, m.status === "成功" ? "b-green" : m.status === "失败" ? "b-red" : "b-blue")}</td><td>${m.ms} ms</td><td class="tiny muted">${m.at.slice(5, 19)}</td></tr>`).join("") || `<tr><td colspan="7">${UI.empty("暂无报文")}</td></tr>`}</tbody></table></div>
          </section>
        </div>

        <div class="detail-side">
          <section class="card">
            <div class="card-hd"><h3>计费对象</h3></div>
            <div class="card-bd">
              <dl class="kv tight">
                <dt>主单号</dt><dd class="mono">${bill.orderId}</dd>
                <dt>子单</dt><dd class="tiny">${UI.esc(bill.childIds)}</dd>
                <dt>客户</dt><dd>${UI.esc(c.short || c.name)}</dd>
                <dt>产品</dt><dd>${UI.esc(p.name)}</dd>
                <dt>交货仓</dt><dd>${UI.esc(wh.name)}</dd>
                <dt>计费地点</dt><dd>${UI.esc(bill.billingPoint)}</dd>
                <dt>触发来源</dt><dd>${UI.esc(bill.source)}</dd>
                <dt>更新时间</dt><dd>${bill.updated}</dd>
              </dl>
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>操作</h3></div>
            <div class="card-bd"><div class="stack" style="gap:8px">
              ${bill.status === "计费失败" ? `<button class="btn btn-primary" onclick="location.href='price-publish.html'" style="width:100%">去补价格</button><button class="btn btn-ghost" data-action="recalc" style="width:100%">补价后重算</button>` : `<button class="btn btn-primary" data-action="recalc" style="width:100%">重新计费</button>`}
              <button class="btn btn-ghost" data-action="adjust" style="width:100%">发起改价 / 勘误</button>
              <button class="btn btn-ghost" data-action="raw" style="width:100%">查看原始报文</button>
            </div></div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>状态时间线</h3></div>
            <div class="card-bd">
              <div class="timeline">
                <div class="tl-item done"><div class="tl-title">收到计费触发</div><div class="tl-meta">${bill.updated} · ${UI.esc(bill.source)}</div></div>
                <div class="tl-item ${bill.status === "计费失败" ? "now" : "done"}"><div class="tl-title">${bill.status === "计费失败" ? "计费失败" : "计费完成"}</div><div class="tl-meta">${bill.status === "计费失败" ? "无有效价格，返回失败" : "命中 " + bill.priceLayer + "，金额 " + Fmt.money(bill.amount, bill.currency)}</div></div>
                <div class="tl-item ${bill.status === "待回传" ? "now" : "done"}"><div class="tl-title">回传 CCOS / OMS / ARS</div><div class="tl-meta">CCOS ${bill.receipt.ccos} · OMS ${bill.receipt.oms} · ARS ${bill.receipt.ars}</div></div>
                ${bill.status === "已出账" ? `<div class="tl-item done"><div class="tl-title">已出账</div><div class="tl-meta">后续调整走勘误，不覆盖原账单</div></div>` : ""}
              </div>
            </div>
          </section>
        </div>
      </div>`;
  }

  function refresh() {
    bill = Store.find("bills", id);
    document.querySelector(".page").innerHTML = build();
    bind();
  }

  function bind() {
    document.querySelectorAll("[data-action]").forEach(b => b.onclick = () => {
      const a = b.dataset.action;
      if (a === "recalc") {
        UI.toast("正在重算…");
        Store.update("bills", bill.id, { status: "重算中" });
        Store.log("计费", "发起重算", bill.id, "手工触发");
        refresh();
        setTimeout(() => {
          Store.update("bills", bill.id, { status: "已计费", updated: "2026-10-22 20:00" });
          UI.toast("重算完成"); refresh();
        }, 1500);
      }
      if (a === "adjust") location.href = "billing-adjust.html?bill=" + bill.id;
      if (a === "raw") openRaw();
    });
  }

  function openRaw() {
    const req = {
      messageType: "1003",
      messageId: "MSG202610220001",
      idempotencyKey: "MT20261018001-CHK-20261022091500",
      mainOrderNo: bill.orderId,
      customerCode: bill.customer,
      productCode: bill.product,
      warehouseCode: bill.warehouse,
      billingPoint: bill.billingPoint,
      actualWeight: bill.actualWeight,
      volume: bill.volume,
      chargeWeight: bill.chargeWeight,
      triggerType: bill.source
    };
    const resp = { code: bill.status === "计费失败" ? "NO_VALID_PRICE" : "0", message: bill.status === "计费失败" ? bill.error : "success", billNo: bill.id, amount: bill.amount, currency: bill.currency, priceLayer: bill.priceLayer, priceVersion: bill.priceVersion };
    const json = (o) => `<span class="k">${UI.esc(JSON.stringify(o, null, 2))}</span>`;
    UI.drawer({
      title: "原始报文",
      sub: bill.id + " · 请求 / 响应示例",
      wide: true,
      body: `<div class="stack">
        <div class="msg-grid">
          <div class="msg-card"><div class="mc-hd">请求 · CCOS → B2B PQM</div><div class="mc-bd"><div class="msg-json">${json(req)}</div></div></div>
          <div class="msg-card"><div class="mc-hd">响应 · B2B PQM → CCOS</div><div class="mc-bd"><div class="msg-json">${json(resp)}</div></div></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>报文字段为原型示例，实际契约以接口评审与联调为准；幂等键用于重复触发去重。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button>`,
      onMount(el, close) { el.querySelector("[data-cancel]").onclick = close; }
    });
  }

  UI.shell({ active: "billing-list", title: "计费详情", content: build() });
  bind();
})();
