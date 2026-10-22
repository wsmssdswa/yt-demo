/* 试算与报价单 · 内部运费试算 */
(function () {
  let result = null;

  const content = `
    ${UI.pageHead({
      title: "内部运费试算",
      sub: "输入交货仓、目的地与货量，实时调用计价引擎。试算仅内部参考，不落正式计费、不进账单。",
      actions: `<span class="badge b-outline no-dot">仅内部可见</span>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>试算口径：</b>先按客户/产品计重规则算计费重，再按“订单价 &gt; 自由价 &gt; 套餐 &gt; 公布价”取价，附加费按杂费模版计算。无价时明确提示，不以 0 元兜底。</div>
    </div>

    <div class="calc-layout">
      <section class="card">
        <div class="card-hd"><h3>试算条件</h3><span class="sub">客户选填</span></div>
        <div class="card-bd">
          <div class="form-grid">
            <div class="field"><label>客户（选填）</label><select class="select" id="tCustomer"><option value="">不指定客户（按公布价）</option>${UI.options(Store.list("customers"), "code", "short", "C002")}</select></div>
            <div class="field"><label>销售产品<span class="req">*</span></label><select class="select" id="tProduct">${UI.options(Store.list("products"), "code", "name", "P001")}</select></div>
            <div class="field"><label>交货仓</label><select class="select" id="tWh">${Store.list("warehouses").filter(w => w.status === "启用").map(w => `<option value="${w.code}" ${w.code === "WH01" ? "selected" : ""}>${w.name}</option>`).join("")}</select></div>
            <div class="field"><label>目的邮编</label><input class="input" id="tZip" value="90013"></div>
            <div class="field"><label>地址类型</label><select class="select" id="tAddr"><option>商业地址</option><option>住宅地址</option></select></div>
            <div class="field"><label>件数</label><input class="input" id="tPieces" type="number" value="60"></div>
            <div class="field"><label>实重（kg）<span class="req">*</span></label><input class="input" id="tWeight" type="number" step="0.1" value="1200"></div>
            <div class="field"><label>体积（m³）</label><input class="input" id="tVolume" type="number" step="0.01" value="8.6"></div>
          </div>
          <button class="btn btn-primary btn-lg mt-16" id="calcBtn" style="width:100%">${UI.icon("calc", 14)} 开始试算</button>
          <div class="row wrap mt-12" style="gap:6px">
            <span class="tiny muted">快速场景：</span>
            <button class="btn btn-ghost btn-sm" data-scene="kaiqi">凯琦 · 美国海派</button>
            <button class="btn btn-ghost btn-sm" data-scene="niuku">纽酷 · 美国快递</button>
            <button class="btn btn-ghost btn-sm" data-scene="noprice">加拿大 · 无价格</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-hd"><h3>试算结果</h3><span class="sub" id="trialSub">等待试算</span></div>
        <div class="card-bd" id="trialBody">
          ${UI.empty("还没有试算结果", "填写左侧条件后点击“开始试算”")}
        </div>
      </section>
    </div>`;

  function run() {
    const customer = UI.val("tCustomer");
    const product = UI.val("tProduct");
    const opts = {
      customer, product, warehouse: UI.val("tWh"), zip: UI.val("tZip"),
      addressType: UI.val("tAddr"), actual: parseFloat(UI.val("tWeight")) || 0,
      volume: parseFloat(UI.val("tVolume")) || 0
    };
    result = Calc.trial(opts);
    result._opts = opts;
    render();
  }

  function render() {
    const body = document.getElementById("trialBody");
    if (!result) return;
    if (!result.ok) {
      document.getElementById("trialSub").textContent = "无有效价格";
      body.innerHTML = `<div class="stack">
        <div class="banner danger">${UI.icon("alert", 15)}<div><b>${UI.esc(result.error)}</b><br>系统按失败返回，不以 0 元兜底。请先补齐价格，或转为询价由纵队单独报价。</div></div>
        <div class="info-strip">
          <div class="is"><span>计费重</span><b>${Fmt.num(result.chargeWeight, 1)} kg</b><em>按产品规则</em></div>
          <div class="is"><span>分区</span><b>${result.zone}</b><em>${result.country}</em></div>
          <div class="is"><span>计费地点</span><b>${result.warehouse.billing || "深圳"}</b><em>${result.warehouse.code}</em></div>
          <div class="is"><span>错误码</span><b class="mono" style="font-size:12px">${result.code}</b><em>NO_VALID_PRICE</em></div>
        </div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>步骤</th><th>结果</th></tr></thead><tbody>
          ${result.traces.map((t, i) => `<tr><td>${i + 1}</td><td>${UI.esc(t)}</td></tr>`).join("")}
        </tbody></table></div>
        <div class="row"><span class="hint">无价转询价会带出当前条件，避免重复录入。</span><span class="spacer"></span><button class="btn btn-primary" id="toInquiry">${UI.icon("clipboard", 14)} 发起询价</button></div>
      </div>`;
      document.getElementById("toInquiry").onclick = createInquiry;
      return;
    }
    document.getElementById("trialSub").textContent = "计价成功 · 仅内部参考";
    body.innerHTML = `<div class="stack">
      <div class="calc-result">
        <div><div class="tiny muted">预估总费用</div><div class="cr-num">${Fmt.money(result.total)}</div></div>
        <div class="cr-meta">计费重 ${Fmt.num(result.chargeWeight, 1)} kg<br>命中 ${result.layer}<br>${result.zone}</div>
      </div>
      <div class="table-wrap"><table class="table compact"><thead><tr><th>费用项</th><th>计价依据</th><th class="num">金额</th></tr></thead>
        <tbody>${result.lines.map(l => `<tr><td class="t-main">${UI.esc(l.fee)}</td><td><span class="tiny">${UI.esc(l.unit)} × ${UI.esc(l.qty)}</span><div class="t-sub">${UI.esc(l.layer || "")}</div></td><td class="num price-cell">${Fmt.money(l.amount)}</td></tr>`).join("")}
        <tr class="total"><td colspan="2">合计</td><td class="num">${Fmt.money(result.total)}</td></tr></tbody></table></div>
      <div class="section-title">规则命中依据</div>
      <div class="trace-list">${result.traces.map((t, i) => `<div class="trace-item"><span class="tr-n">${i + 1}</span><span>${UI.esc(t)}</span></div>`).join("")}</div>
      <div class="row">
        <span class="hint">试算不落正式计费、不进账单；如客户接受，可直接发起询价或生成报价单。</span>
        <span class="spacer"></span>
        <button class="btn btn-ghost" onclick="location.href='cust-query.html'">取价优先级</button>
        <button class="btn btn-soft" id="toInquiry">${UI.icon("clipboard", 14)} 转询价</button>
      </div>
    </div>`;
    document.getElementById("toInquiry").onclick = createInquiry;
  }

  function createInquiry() {
    const product = UI.val("tProduct");
    const country = Q.product(product).country;
    const id = "INQ20261022" + String(Store.list("inquiries").length + 1).padStart(3, "0");
    const now = "2026-10-22 20:00";
    const inq = {
      id, customer: UI.val("tCustomer") || "C004", product, country, type: "标准产品", cargo: "试算转询价（待补充品名）",
      pieces: +UI.val("tPieces") || 0, weight: +UI.val("tWeight") || 0, volume: +UI.val("tVolume") || 0,
      addressType: UI.val("tAddr"), city: "待补充", zip: UI.val("tZip") || "—", address: "待补充",
      transit: "不指定", status: "待成本", owner: "王强", sales: "杨鑫", createdAt: now, validUntil: "2026-11-05", slaDue: "2026-10-23 04:00",
      cost: null, risk: null, quote: null, bind: null,
      aiRisk: { level: "待识别", text: "试算转询价，品名与详细地址待销售补充后由 AI 识别风险。" },
      timeline: [{ time: now, actor: "杨鑫", action: "试算转询价", note: "由内部试算带入客户/产品/货量/邮编；试算结果：" + (result && result.ok ? "命中 " + result.layer + "，预估 " + Fmt.money(result.total) : "无有效价格") }]
    };
    Store.add("inquiries", inq);
    Store.log("询价管理", "试算转询价", id, Q.productName(product) + " · " + country);
    UI.toast("已创建询价 " + id + "，进入待成本");
    setTimeout(() => location.href = "inquiry-detail.html?id=" + id, 500);
  }

  UI.shell({ active: "trial", title: "内部运费试算", content });

  document.getElementById("calcBtn").onclick = run;
  run();

  document.querySelectorAll("[data-scene]").forEach(b => b.onclick = () => {
    const s = b.dataset.scene;
    if (s === "kaiqi") { document.getElementById("tCustomer").value = "C001"; document.getElementById("tProduct").value = "P001"; document.getElementById("tZip").value = "90013"; document.getElementById("tWeight").value = "1200"; document.getElementById("tVolume").value = "8.6"; }
    if (s === "niuku") { document.getElementById("tCustomer").value = "C002"; document.getElementById("tProduct").value = "P002"; document.getElementById("tZip").value = "10001"; document.getElementById("tAddr").value = "住宅地址"; document.getElementById("tWeight").value = "860"; document.getElementById("tVolume").value = "6.2"; }
    if (s === "noprice") { document.getElementById("tCustomer").value = "C005"; document.getElementById("tProduct").value = "P008"; document.getElementById("tZip").value = "M5V 2T6"; document.getElementById("tWeight").value = "1100"; document.getElementById("tVolume").value = "6.6"; }
    run();
  });
})();
