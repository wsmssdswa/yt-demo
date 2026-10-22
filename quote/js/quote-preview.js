/* 试算与报价单 · 报价单预览与交付 */
(function () {
  let id = UI.param("id") || "Q20261002";
  let q = Store.find("quotes", id) || Store.list("quotes")[0];

  function rowsForQuote() {
    const out = [];
    const tier = ["0–21kg", "21–45kg", "45–100kg", "100–300kg", "300–500kg", "500kg+"];
    const pushProduct = (pid, pkgLevel) => {
      const p = Q.product(pid);
      const list = Store.list("packages").filter(x => x.product === pid && x.status === "生效");
      if (!list.length) {
        const pub = Store.list("publishPrices").find(x => x.product === pid && x.status === "生效");
        if (pub) out.push({ product: p.name, zone: pub.zone, tier: p.unit === "柜" ? "40HQ" : "按方/按重", price: pub.price, unit: "元/" + (p.unit === "柜" ? "柜" : "kg"), from: pub.from, to: pub.to });
        return;
      }
      list.forEach(pk => {
        const price = pkgLevel ? pk[pkgLevel] : pk.A;
        out.push({ product: p.name, zone: pk.zone, tier: p.unit === "柜" ? "40HQ" : "按重量段", price, unit: "元/kg", from: "2026-10-01", to: "2026-12-31" });
      });
    };
    if (q.id === "Q20261001") { ["P001", "P002", "P006"].forEach(p => pushProduct(p, null)); }
    else if (q.id === "Q20261002") { pushProduct("P001", "E"); pushProduct("P003", "D"); }
    else if (q.id === "Q20261003") { pushProduct("P001", "D"); pushProduct("P002", "C"); }
    else if (q.id === "Q20261004") { pushProduct("P003", null); pushProduct("P004", null); pushProduct("P007", null); }
    else if (q.id === "Q20261005") { pushProduct("P001", "C"); pushProduct("P003", "D"); }
    else if (q.id === "Q20261007") {
      const p = Q.product("P001");
      out.push({ product: p.name, zone: "Z1 美西", tier: "按重量段", price: 2.68, unit: "USD/kg", from: "2026-10-01", to: "2026-12-31" });
    }
    return out;
  }

  function buildSheet() {
    const rows = rowsForQuote();
    const custName = q.customer ? Q.customerFull(q.customer) : "全体客户";
    const valid = q.id === "Q20261002" ? "2026-10-01 ~ 2026-12-31" : "2026-11-01 ~ 2027-01-31";
    return `<div class="quote-sheet" id="quoteSheet">
      <div class="qs-top">
        <div class="qs-brand"><span class="mk">Q</span><div><h2>云途物流 · B2B 大货</h2><p>YUNTU LOGISTICS · B2B QUOTATION</p></div></div>
        <div class="qs-title"><h1>${q.type === "客户价" ? "客户专属报价单" : "产品报价单"}</h1><p>${UI.esc(q.name)} · ${q.version}</p></div>
      </div>
      <div class="qs-meta">
        <div class="m"><span>报价单号</span><strong>${q.id}</strong></div>
        <div class="m"><span>客户</span><strong>${UI.esc(custName)}</strong></div>
        <div class="m"><span>适用国家</span><strong>${UI.esc(q.countries)}</strong></div>
        <div class="m"><span>有效期</span><strong>${valid}</strong></div>
        <div class="m"><span>币种</span><strong>${q.id === "Q20261007" ? "USD" : "CNY"}</strong></div>
        <div class="m"><span>报价人</span><strong>${UI.esc(q.owner)} · 2026-10-22</strong></div>
      </div>

      <div class="qs-sec">
        <h4>价格表</h4>
        ${rows.length ? `<table class="qs-table"><thead><tr><th>产品</th><th>分区</th><th>计费方式</th><th class="num">单价</th><th>有效期</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${UI.esc(r.product)}</td><td>${UI.esc(r.zone)}</td><td>${UI.esc(r.tier)}</td><td class="num">${Fmt.num(r.price, 2)} ${r.unit}</td><td>${r.from} ~ ${r.to}</td></tr>`).join("")}</tbody></table>` : `<div class="banner danger">该报价单生成失败，暂无价格数据：${UI.esc(q.failure || "缺少生效价格")}</div>`}
      </div>

      <div class="qs-sec">
        <h4>附加费说明</h4>
        <ul class="qs-notes">
          <li>燃油附加费：按基础运费 12% 收取（欧洲海派 10%，美森 14%）。</li>
          <li>偏远附加费：350 元/票；住宅地址附加费：120 元/票；偏远与住宅取高收取。</li>
          <li>超长超重：单件超 1.5m 或超 30kg，200 元/件；旺季附加费 11-12 月 1.20 元/kg。</li>
          <li>报关费 180 元/票；保价费按申报价值 0.3%，最低 20 元/票。</li>
        </ul>
      </div>

      <div class="qs-sec">
        <h4>计费规则</h4>
        <ul class="qs-notes">
          <li>计费重取实重与材积重较大值；材积重 = 长×宽×高 ÷ 6000（cm/kg）。</li>
          <li>单箱按 0.5kg 进位，整票按 1kg 进位；客户另有箱规的按客户规则优先。</li>
          <li>计费地点以交货仓对应的计费地点为准；提货仓与计费地点不一致时产生调拨费。</li>
        </ul>
      </div>

      <div class="qs-sec">
        <h4>参考时效</h4>
        <ul class="qs-notes">
          <li>美国海派：开船后 14-18 天到港，提柜后 3-5 天派送；旺季顺延 3-5 天。</li>
          <li>欧洲海派：开船后 25-30 天到港；欧洲空派：5-7 天。</li>
          <li>时效为参考值，不含查验、天气、港口拥堵等不可控因素。</li>
        </ul>
      </div>

      <div class="qs-sec">
        <h4>理赔与免责</h4>
        <ul class="qs-notes">
          <li>未保价货物按运费 3 倍赔偿；保价货物按申报价值赔付，最高 50 万元/票。</li>
          <li>易碎品、液体、带电产品需提前申报；未申报导致的扣关、退件由发货方承担。</li>
          <li>本报价单不构成运输合同，正式合作以双方签署的协议为准。</li>
        </ul>
      </div>

      <div class="qs-foot">
        <span>云途物流 · B2B 大货事业部</span><span>400-***-****</span><span>b2b@yuntu.example</span>
        <span class="qs-stamp">${q.status === "已发布" ? "已发布" : "预览版"}</span>
      </div>
    </div>`;
  }

  const content = `
    ${UI.pageHead({
      title: "报价单预览",
      sub: `${q.name} · ${q.version} · ${q.status}`,
      actions: `<button class="btn btn-ghost" onclick="location.href='quote-list.html'">${UI.icon("left", 14)} 返回列表</button>
        <button class="btn btn-ghost" id="printBtn">${UI.icon("printer", 14)} 打印</button>
        <button class="btn btn-ghost" id="downloadBtn">${UI.icon("download", 14)} 下载 PDF</button>
        ${q.status === "待发布" ? `<button class="btn btn-primary" id="publishBtn">发布到用户中心</button>` : q.status === "已发布" ? `<button class="btn btn-primary" id="sendBtn">${UI.icon("send", 14)} 企微发送</button>` : ""}`
    })}

    <div class="banner ${q.status === "生成失败" ? "danger" : "info"} mb-16">${UI.icon(q.status === "生成失败" ? "alert" : "info", 15)}
      <div>${q.status === "生成失败" ? "生成失败：" + UI.esc(q.failure) : q.status === "已发布" ? "已发布到用户中心，客户可按权限查询与下载；当前为发布版本快照。" : "待发布：确认版式与价格后发布到用户中心，发布后不可修改。"} <b>报价单不展示底价与成本价。</b></div>
    </div>

    <div class="quote-stage print-stage">
      <div class="quote-toolbar no-print">
        <div class="left"><span class="badge ${q.status === "已发布" ? "b-green" : q.status === "生成失败" ? "b-red" : "b-amber"}">${q.status}</span><span class="tiny muted">版本 ${q.version} · 共 ${rowsForQuote().length} 个价格项</span></div>
        <span class="spacer"></span>
        <select class="select sm" style="width:130px" id="verSelect"><option>${q.version}（当前）</option><option>历史版本</option></select>
      </div>
      ${buildSheet()}
    </div>`;

  UI.shell({ active: "quote-list", title: "报价单预览", content });

  document.getElementById("printBtn").onclick = () => window.print();
  document.getElementById("downloadBtn").onclick = () => UI.toast("已生成 PDF（示例）");
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.onclick = openSend;
  const pubBtn = document.getElementById("publishBtn");
  if (pubBtn) pubBtn.onclick = () => {
    UI.confirm("发布报价单", `将 <b>${UI.esc(q.name)} ${q.version}</b> 发布到用户中心，发布后不可修改。`, () => {
      q.status = "已发布"; q.publishedAt = "2026-10-22 20:00"; q.deliveries.push({ channel: "用户中心", to: q.customer ? Q.customerName(q.customer) : "全部客户", at: "2026-10-22 20:00", status: "已送达" });
      Store.save(); Store.log("报价单", "发布", q.name + " " + q.version, "发布到用户中心");
      UI.toast("已发布"); setTimeout(() => location.reload(), 600);
    });
  };

  function openSend() {
    UI.modal({
      title: "企微发送报价单",
      size: "sm",
      body: `<div class="stack">
        <div class="field"><label>接收对象<span class="req">*</span></label><input class="input" id="sendTo" value="${q.customer ? Q.customer(q.customer).contact : "客户联系人"}"></div>
        <div class="field"><label>发送渠道</label><select class="select"><option>企业微信</option><option>用户中心站内信</option><option>邮件</option></select></div>
        <div class="field"><label>附言</label><textarea class="textarea" id="sendNote">您好，这是最新的 ${q.name} ${q.version}，有效期至 2026-12-31，请查收。</textarea></div>
        <div class="banner info">${UI.icon("info", 15)}<div>发送记录会写入报价单交付记录；失败可重试，不改变报价单状态。</div></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="sendGo">发送</button>`,
      onMount(el, close) {
        el.querySelector("#sendGo").onclick = () => {
          if (!UI.val("sendTo")) return UI.toast("请填写接收对象", "err");
          q.deliveries.push({ channel: "企业微信", to: UI.val("sendTo"), at: "2026-10-22 20:00", status: "已送达" });
          Store.save(); Store.log("报价单", "企微发送", q.name, UI.val("sendTo"));
          close(); UI.toast("已发送（示例）");
        };
      }
    });
  }
})();
