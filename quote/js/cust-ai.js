/* 客户价格 · AI 快速配置 */
(function () {
  let parsed = false;

  const sample = "凯琦，美国海派卡派，基础运费做到 16.7 元/kg，11 月 1 日起到 12 月 31 日，燃油按 10% 固定。";

  const content = `
    ${UI.pageHead({
      title: "AI 快速配置",
      sub: "支持一段文字或价格截图识别客户、产品、费用项与价格，生成配置草稿；人工复核后仍走底价校验与审批。",
      actions: `<span class="badge b-purple no-dot">AI 辅助 · 不直接生效</span>`
    })}

    <div class="banner warn mb-16">${UI.icon("alert", 15)}
      <div><b>边界：</b>AI 只负责“把信息填进表单”，不替代价格决策。识别不确定时提示人工确认；低于底价仍触发 OA 审批，审批通过前不生效。</div>
    </div>

    <div class="split">
      <section class="card">
        <div class="card-hd"><h3>输入</h3><span class="sub">文字或截图</span></div>
        <div class="card-bd">
          <div class="field">
            <label>客户询价内容</label>
            <textarea class="textarea" id="aiText" style="min-height:130px">${sample}</textarea>
          </div>
          <div class="row mt-8">
            <button class="btn btn-ghost btn-sm" data-sample="0">示例：文字报价</button>
            <button class="btn btn-ghost btn-sm" data-sample="1">示例：多费用项</button>
            <span class="spacer"></span>
            <span class="tiny muted">支持中文 / 中英混合</span>
          </div>
          <div class="upload-zone mt-12" id="dropZone">
            ${UI.icon("upload", 24)}
            <div>拖入价格截图，或 <b>点击上传</b></div>
            <div class="tiny muted mt-4">支持 PNG / JPG，单张 ≤ 5MB</div>
          </div>
          <button class="btn btn-primary btn-lg mt-12" id="parseBtn" style="width:100%">${UI.icon("spark", 14)} 识别并生成草稿</button>
          <div class="hint mt-8">识别结果只回填字段，不会自动保存；提交前必须人工确认。</div>
        </div>
      </section>

      <section class="card" id="resultCard">
        <div class="card-hd"><h3>识别结果</h3><span class="sub" id="resultSub">等待识别</span></div>
        <div class="card-bd" id="resultBody">
          ${UI.empty("还没有识别结果", "在左侧粘贴客户消息或上传截图，点击识别")}
        </div>
      </section>
    </div>

    <section class="card mt-16">
      <div class="card-hd"><h3>最近 AI 生成</h3><span class="sub">需人工复核后才进入生效链路</span></div>
      <div id="aiRecent"></div>
    </section>`;

  function emptyResult() {
    document.getElementById("resultBody").innerHTML = UI.empty("还没有识别结果", "在左侧粘贴客户消息或上传截图，点击识别");
    document.getElementById("resultSub").textContent = "等待识别";
  }

  function doParse(text) {
    document.getElementById("resultSub").textContent = "识别中…";
    document.getElementById("resultBody").innerHTML = `<div class="stack">
      <div class="progress"><i style="width:35%"></i></div>
      <div class="hint">正在抽取客户、产品、费用项与价格…</div>
    </div>`;
    setTimeout(() => {
      const fields = [
        { k: "客户", v: "深圳凯琦供应链有限公司（C001）", c: 97 },
        { k: "产品", v: "美国海派卡派-普货（P001）", c: 94 },
        { k: "费用项", v: "基础运费 + 燃油附加费", c: 91 },
        { k: "基础运费", v: "16.70 元/kg", c: 96 },
        { k: "燃油附加费", v: "10%（固定单价，按基础运费）", c: 82 },
        { k: "有效期", v: "2026-11-01 ~ 2026-12-31", c: 93 }
      ];
      const low = fields.filter(f => f.c < 90);
      document.getElementById("resultSub").textContent = "识别完成 · 整体置信度 92%";
      document.getElementById("resultBody").innerHTML = `<div class="stack">
        <div class="ai-panel">
          <div class="ai-hd"><span class="spark">${UI.icon("spark", 12)}</span>已识别 6 个字段<span class="spacer"></span><span class="badge b-purple">置信度 92%</span></div>
          <div class="tiny mt-8" style="color:var(--ink-2);line-height:1.7">客户“凯琦”匹配到 1 个客户；产品按“美国海派卡派”匹配到 P001；价格 16.70 元/kg 高于底价 12.50，不触发底价审批。</div>
        </div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>字段</th><th>识别值</th><th style="width:150px">置信度</th></tr></thead>
          <tbody>${fields.map(f => `<tr><td class="t-main">${f.k}</td><td>${UI.esc(f.v)}</td><td><div class="row"><span class="progress" style="flex:1"><i style="width:${f.c}%;background:${f.c < 90 ? "var(--amber)" : "var(--brand)"}"></i></span><span class="tiny muted">${f.c}%</span></div></td></tr>`).join("")}</tbody></table></div>
        ${low.length ? `<div class="banner warn">${UI.icon("alert", 15)}<div>${low.map(f => f.k).join("、")} 置信度低于 90%，请人工核对后再提交。</div></div>` : ""}
        <div class="form-grid">
          <div class="field"><label>客户（可改）</label><select class="select" id="aiCustomer"><option value="C001" selected>深圳凯琦供应链有限公司</option><option value="C002">宁波纽酷进出口有限公司</option><option value="C003">广州锦联国际物流有限公司</option><option value="C004">上海盈和贸易有限公司</option></select></div>
          <div class="field"><label>产品（可改）</label><select class="select" id="aiProduct"><option value="P001" selected>美国海派卡派-普货</option><option value="P002">美国海派快递-普货</option><option value="P003">欧洲海派-普货</option></select></div>
          <div class="field"><label>基础运费（可改）</label><div class="input-group"><input class="input" id="aiPrice" type="number" step="0.01" value="16.70"><span class="unit">元/kg</span></div></div>
          <div class="field"><label>生效日期</label><input class="input" id="aiFrom" type="date" value="2026-11-01"></div>
        </div>
        <div class="row">
          <span class="hint">保存后进入客户自由价，状态为“审批中”，人工复核提交后才生效。</span>
          <span class="spacer"></span>
          <button class="btn btn-primary" id="saveAi">生成配置草稿</button>
        </div>
      </div>`;
      parsed = true;
      document.getElementById("saveAi").onclick = () => {
        const cust = UI.val("aiCustomer"), prod = UI.val("aiProduct"), price = parseFloat(UI.val("aiPrice"));
        if (!price) return UI.toast("请填写基础运费", "err");
        if (Store.list("custPrices").find(x => x.customer === cust && x.product === prod && x.fee === "BASE_FREIGHT")) return UI.toast("该客户/产品已有基础运费自由价", "err");
        Store.add("custPrices", { id: "CP" + String(Store.list("custPrices").length + 1).padStart(3, "0"), customer: cust, product: prod, fee: "BASE_FREIGHT", price, unit: "KG", from: UI.val("aiFrom"), to: "2026-12-31", status: "审批中", check: "AI 识别 · 待复核", approval: "待复核", updated: "2026-10-22", by: "杨鑫", note: "AI 快速配置草稿，来源：" + (document.getElementById("aiText").value.slice(0, 40) || "截图") });
        Store.log("客户价格", "AI 生成草稿", Q.customerName(cust), Q.productName(prod) + " 基础运费 " + price + " 元/kg（待复核）");
        UI.toast("配置草稿已生成，请在客户自由价复核");
        renderRecent();
      };
    }, 900);
  }

  function renderRecent() {
    const rows = Store.list("custPrices").filter(p => /AI|待复核/.test(p.check) || p.check === "AI 识别 · 待复核");
    document.getElementById("aiRecent").innerHTML = UI.table({
      columns: [
        { label: "客户", width: "18%", render: r => Q.customerName(r.customer) },
        { label: "产品", width: "22%", render: r => Q.productName(r.product) },
        { label: "费用项", width: "12%", render: r => Q.feeName(r.fee) },
        { label: "价格", width: "12%", render: r => `<span class="price-cell">${Fmt.num(r.price, 2)}</span> 元/${r.unit}` },
        { label: "识别依据", width: "18%", render: r => `<span class="tiny muted">${UI.esc(r.check)}</span>` },
        { label: "状态", width: "9%", render: r => UI.badge(r.status) },
        { label: "操作", width: "9%", render: r => `<button class="btn-text" onclick="location.href='cust-free.html'">去复核</button>` }
      ],
      rows: rows,
      empty: "暂无 AI 生成的草稿，识别后在这里查看"
    });
  }

  UI.shell({ active: "cust-ai", title: "AI 快速配置", content });
  renderRecent();

  document.getElementById("parseBtn").onclick = () => doParse(document.getElementById("aiText").value);
  document.querySelectorAll("[data-sample]").forEach(b => b.onclick = () => {
    document.getElementById("aiText").value = b.dataset.sample === "0" ? sample : "纽酷，美国海派快递，基础运费 18.2 元/kg，住宅地址附加费 100 元/票，12 月 1 日起生效。";
    emptyResult();
  });
  document.getElementById("dropZone").onclick = () => {
    UI.toast("已读取截图，开始识别（示例）", "ok");
    doParse("截图：客户报价表");
  };
})();
