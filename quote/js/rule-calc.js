/* 计重计价 · 计重与计费地点解析 */
(function () {
  let boxes = [
    { l: 120, w: 100, h: 100, kg: 100 },
    { l: 120, w: 100, h: 100, kg: 100 },
    { l: 120, w: 100, h: 100, kg: 100 }
  ];

  const content = `
    ${UI.pageHead({
      title: "计重与计费地点解析",
      sub: "输入子箱尺寸与实重，按客户/产品规则计算材积重、单箱计费重与整票计费重；同时解析邮编分区与计费地点。",
      actions: `<button class="btn btn-ghost" id="resetBtn">${UI.icon("refresh", 14)} 重置示例</button>
        <button class="btn btn-primary" id="applyBtn">${UI.icon("right", 14)} 带条件去试算</button>`
    })}

    <div class="calc-layout">
      <section class="card">
        <div class="card-hd"><h3>输入条件</h3><span class="sub">子箱可增删</span></div>
        <div class="card-bd">
          <div class="form-grid">
            <div class="field"><label>客户</label><select class="select" id="rcCustomer">${UI.options(Store.list("customers"), "code", "short", "C001")}</select></div>
            <div class="field"><label>产品</label><select class="select" id="rcProduct">${UI.options(Store.list("products"), "code", "name", "P001")}</select></div>
            <div class="field"><label>交货仓</label><select class="select" id="rcWh">${Store.list("warehouses").filter(w => w.status === "启用").map(w => `<option value="${w.code}" ${w.code === "WH01" ? "selected" : ""}>${w.name}</option>`).join("")}</select></div>
            <div class="field"><label>收件邮编</label><input class="input" id="rcZip" value="90013"></div>
            <div class="field"><label>地址类型</label><select class="select" id="rcAddr"><option>商业地址</option><option>住宅地址</option></select></div>
            <div class="field"><label>计费重口径</label><input class="input" value="KG（自动）" disabled></div>
          </div>
          <div class="divider"></div>
          <div class="row mb-8"><strong class="small">子箱明细</strong><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="addBox">${UI.icon("plus", 12)} 添加子箱</button></div>
          <div id="boxList"></div>
          <div class="hint mt-8">材积重 = 长 × 宽 × 高 ÷ 材积系数；单箱计费重取实重与材积重较大值。</div>
        </div>
      </section>

      <div class="stack">
        <section class="card">
          <div class="card-hd"><h3>计算结果</h3><span class="sub" id="ruleSource"></span></div>
          <div class="card-bd" id="calcResult"></div>
        </section>
        <section class="card">
          <div class="card-hd"><h3>计费地点解析</h3></div>
          <div class="card-bd" id="locResult"></div>
        </section>
        <section class="card">
          <div class="card-hd"><h3>规则追溯</h3></div>
          <div class="card-bd"><div class="trace-list" id="traceList"></div></div>
        </section>
      </div>
    </div>`;

  function ruleOf() {
    return Q.weightRule(UI.val("rcCustomer"), UI.val("rcProduct")) || { divisor: 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", scope: "默认" };
  }

  function renderBoxes() {
    document.getElementById("boxList").innerHTML = boxes.map((b, i) => `<div class="box-row">
      <div class="field"><label>长 cm</label><input class="input" type="number" data-i="${i}" data-f="l" value="${b.l}"></div>
      <div class="field"><label>宽 cm</label><input class="input" type="number" data-i="${i}" data-f="w" value="${b.w}"></div>
      <div class="field"><label>高 cm</label><input class="input" type="number" data-i="${i}" data-f="h" value="${b.h}"></div>
      <div class="field"><label>实重 kg</label><div class="input-group"><input class="input" type="number" data-i="${i}" data-f="kg" value="${b.kg}">${boxes.length > 1 ? `<button class="btn-icon" data-del="${i}" title="删除">${UI.icon("x", 13)}</button>` : ""}</div></div>
    </div>`).join("");
    document.querySelectorAll("#boxList [data-f]").forEach(inp => inp.addEventListener("input", () => {
      boxes[+inp.dataset.i][inp.dataset.f] = +inp.value || 0;
      calc();
    }));
    document.querySelectorAll("[data-del]").forEach(btn => btn.onclick = () => {
      boxes.splice(+btn.dataset.del, 1); renderBoxes(); calc();
    });
  }

  function calc() {
    const rule = ruleOf();
    const step = rule.round && rule.round.includes("0.5") ? 0.5 : 1;
    const ticketStep = rule.ticketRound && rule.ticketRound.includes("0.5") ? 0.5 : 1;
    const rows = boxes.map((b, i) => {
      const cbm = b.l * b.w * b.h / 1000000;
      const vol = b.l * b.w * b.h / rule.divisor;
      const raw = Math.max(b.kg, vol);
      const rounded = Math.ceil((raw - 1e-9) / step) * step;
      return { ...b, i: i + 1, cbm, vol, raw, rounded };
    });
    const sumKg = rows.reduce((s, r) => s + r.kg, 0);
    const sumCbm = rows.reduce((s, r) => s + r.cbm, 0);
    const sumVol = rows.reduce((s, r) => s + r.vol, 0);
    const sumRounded = rows.reduce((s, r) => s + r.rounded, 0);
    const total = Math.ceil((sumRounded - 1e-9) / ticketStep) * ticketStep;

    document.getElementById("ruleSource").textContent = rule.scope === "客户" ? "客户规则优先" : rule.scope === "产品" ? "产品规则兜底" : "默认规则";
    document.getElementById("calcResult").innerHTML = `
      <div class="calc-result">
        <div><div class="tiny muted">整票计费重</div><div class="cr-num">${Fmt.num(total, 1)}<small>kg</small></div></div>
        <div class="cr-meta">实重 ${Fmt.num(sumKg, 1)} kg<br>材积重 ${Fmt.num(sumVol, 1)} kg<br>${sumVol > sumKg ? "材积重占优，按材积计费" : "实重占优，按实重计费"}</div>
      </div>
      <div class="table-wrap mt-12"><table class="table compact"><thead><tr><th>#</th><th>尺寸</th><th class="num">实重</th><th class="num">材积重</th><th class="num">取大</th><th class="num">进位后</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.i}</td><td class="mono tiny">${r.l}×${r.w}×${r.h}</td><td class="num">${Fmt.num(r.kg, 1)}</td><td class="num">${Fmt.num(r.vol, 1)}</td><td class="num">${Fmt.num(r.raw, 1)}</td><td class="num price-cell">${Fmt.num(r.rounded, 1)}</td></tr>`).join("")}
        <tr class="total"><td colspan="2">合计</td><td class="num">${Fmt.num(sumKg, 1)}</td><td class="num">${Fmt.num(sumVol, 1)}</td><td class="num">—</td><td class="num">${Fmt.num(total, 1)}</td></tr></tbody></table></div>
      <div class="hint mt-8">体积 ${Fmt.num(sumCbm, 2)} m³ · 材积系数 ${rule.divisor} · 单箱 ${rule.round} · 整票 ${rule.ticketRound}</div>`;

    const wh = Q.warehouse(UI.val("rcWh"));
    const country = Q.product(UI.val("rcProduct")).country;
    const zip = UI.val("rcZip");
    const zone = Q.zoneOf(country, zip);
    const remote = Q.isRemote(country, zip);
    document.getElementById("locResult").innerHTML = `
      <div class="info-strip" style="grid-template-columns:1fr 1fr">
        <div class="is"><span>交货仓</span><b>${wh.name}</b><em>${wh.code}</em></div>
        <div class="is"><span>计费地点</span><b>${wh.billing}</b><em>用于取价</em></div>
      </div>
      <div class="info-strip mt-8" style="grid-template-columns:1fr 1fr">
        <div class="is"><span>邮编 / 分区</span><b>${zip}</b><em>${zone}</em></div>
        <div class="is"><span>附加费判定</span><b>${remote ? "偏远" : "非偏远"}</b><em>${UI.val("rcAddr")}</em></div>
      </div>
      <div class="hint mt-8">${wh.transfer === "—" ? "提货仓与计费地点一致，不产生调拨费。" : "调拨费：" + UI.esc(wh.transfer)}</div>`;

    document.getElementById("traceList").innerHTML = [
      `规则来源：<b>${rule.scope === "客户" ? "客户规则（" + Q.customerName(UI.val("rcCustomer")) + " × " + Q.productName(UI.val("rcProduct")) + "）" : "产品规则（" + Q.productName(UI.val("rcProduct")) + "）"}</b>，材积系数 ${rule.divisor}`,
      `逐箱子箱材积重 = 长×宽×高 ÷ ${rule.divisor}；取 max(实重, 材积重) 后按 <b>${rule.round}</b>`,
      `整票合计 ${Fmt.num(sumRounded, 1)} kg，按 <b>${rule.ticketRound}</b> 再进位 → <b>${Fmt.num(total, 1)} kg</b>`,
      `计费地点：${wh.name} → <b>${wh.billing}</b>；邮编 ${zip} → <b>${zone}</b>${remote ? "（偏远，触发偏远附加费）" : ""}`
    ].map((t, i) => `<div class="trace-item"><span class="tr-n">${i + 1}</span><span>${t}</span></div>`).join("");
  }

  UI.shell({ active: "rule-calc", title: "计重与计费地点解析", content });
  renderBoxes(); calc();

  document.querySelectorAll("#rcCustomer,#rcProduct,#rcWh,#rcAddr").forEach(el => el.addEventListener("change", calc));
  document.getElementById("rcZip").addEventListener("input", calc);
  document.getElementById("addBox").onclick = () => { boxes.push({ l: 100, w: 80, h: 80, kg: 50 }); renderBoxes(); calc(); };
  document.getElementById("resetBtn").onclick = () => { boxes = [{ l: 120, w: 100, h: 100, kg: 100 }, { l: 120, w: 100, h: 100, kg: 100 }, { l: 120, w: 100, h: 100, kg: 100 }]; renderBoxes(); calc(); };
  document.getElementById("applyBtn").onclick = () => location.href = "trial.html";
})();
