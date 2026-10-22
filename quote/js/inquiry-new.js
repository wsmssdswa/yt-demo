/* 询价管理 · 新建询价 */
(function () {
  let type = "标准产品";

  const content = `
    ${UI.pageHead({
      title: "新建询价",
      sub: "录入客户、产品与货物信息；标准产品/整柜/X 系列切换字段与计价单位，提交后进入待成本。",
      actions: `<button class="btn btn-ghost" id="aiBtn">${UI.icon("spark", 14)} AI 识别录入</button>
        <button class="btn btn-ghost" id="draftBtn">保存草稿</button>
        <button class="btn btn-primary" id="submitBtn">提交询价</button>`
    })}

    <div class="banner warn mb-16">${UI.icon("alert", 15)}
      <div><b>首期范围待确认：</b>询价是否覆盖全部产品（含 X 系列/整柜）尚未最终拍板。原型保留三种产品类型的字段切换，X 系列标注“无套餐价、按单独询价”，不作为已定规则。</div>
    </div>

    <div class="split">
      <div class="stack">
        <section class="card">
          <div class="form-section">
            <div class="form-section-hd"><span class="no">1</span>客户与产品</div>
            <div class="form-grid">
              <div class="field"><label>客户<span class="req">*</span></label><select class="select" id="fCustomer">${UI.options(Store.list("customers"), "code", "name", "")}</select></div>
              <div class="field"><label>销售产品<span class="req">*</span></label><select class="select" id="fProduct">${UI.options(Store.list("products"), "code", "name", "")}</select></div>
              <div class="field span-2"><label>产品类型</label><div class="radio-row">
                ${["标准产品", "整柜", "X 系列"].map(t => `<label class="radio"><input type="radio" name="fType" value="${t}" ${t === type ? "checked" : ""}> ${t}</label>`).join("")}
              </div></div>
            </div>
            <div class="banner info mt-12" id="typeNote">${UI.icon("info", 15)}<div>标准产品按销售产品价格（公布价/套餐/客户价）取价，计价单位 KG。</div></div>
          </div>

          <div class="form-section">
            <div class="form-section-hd"><span class="no">2</span>货物信息</div>
            <div class="form-grid">
              <div class="field"><label>品名<span class="req">*</span></label><input class="input" id="fCargo" placeholder="如 家具配件"></div>
              <div class="field"><label>件数</label><input class="input" id="fPieces" type="number" placeholder="如 60"></div>
              <div class="field"><label>总重量（kg）<span class="req">*</span></label><input class="input" id="fWeight" type="number" step="0.1" placeholder="如 1200"></div>
              <div class="field"><label>总体积（m³）</label><input class="input" id="fVolume" type="number" step="0.01" placeholder="如 8.6"></div>
              <div class="field" id="fContainerField" style="display:none"><label>柜型</label><select class="select" id="fContainer"><option>40HQ</option><option>40GP</option><option>20GP</option></select></div>
              <div class="field" id="fContainerQtyField" style="display:none"><label>柜量</label><input class="input" id="fContainerQty" type="number" value="1"></div>
              <div class="field span-2"><label>箱规 / 包装说明</label><input class="input" id="fBox" placeholder="如 60×50×40cm，木架包装"></div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-hd"><span class="no">3</span>收件地址</div>
            <div class="form-grid">
              <div class="field"><label>地址类型</label><select class="select" id="fAddrType"><option>商业地址</option><option>住宅地址</option></select></div>
              <div class="field"><label>国家</label><select class="select" id="fCountry"><option value="US">美国</option><option value="DE">德国</option><option value="GB">英国</option><option value="CA">加拿大</option></select></div>
              <div class="field"><label>州 / 省</label><input class="input" id="fState" placeholder="如 CA"></div>
              <div class="field"><label>城市</label><input class="input" id="fCity" placeholder="如 洛杉矶"></div>
              <div class="field"><label>邮编</label><input class="input" id="fZip" placeholder="如 90013"></div>
              <div class="field"><label>详细地址</label><input class="input" id="fAddress" placeholder="街道门牌"></div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-hd"><span class="no">4</span>时效与备注</div>
            <div class="form-grid">
              <div class="field"><label>时效要求</label><select class="select" id="fTransit"><option>7-10 天</option><option>10-12 天</option><option>12-15 天</option><option>25-30 天</option><option>不指定</option></select></div>
              <div class="field"><label>期望报价有效期</label><input class="input" id="fValid" type="date" value="2026-11-05"></div>
              <div class="field span-2"><label>备注</label><textarea class="textarea" id="fNote" placeholder="如 客户要求含尾程、需木架加固、有电池等"></textarea></div>
              <div class="field span-2"><label>附件</label><div class="upload-zone">${UI.icon("upload", 22)}<div>拖入报关资料、箱单或产品图片，或 <b>点击上传</b></div></div></div>
            </div>
          </div>
        </section>
      </div>

      <div class="stack">
        <section class="card">
          <div class="card-hd"><h3>提交后会发生什么</h3></div>
          <div class="card-bd">
            <div class="timeline">
              <div class="tl-item done"><div class="tl-title">1. 提交</div><div class="tl-meta">校验必填与客户可用状态</div></div>
              <div class="tl-item"><div class="tl-title">2. 自动分派</div><div class="tl-meta">按产品+国家路由纵队/港前</div></div>
              <div class="tl-item"><div class="tl-title">3. 纵队录成本</div><div class="tl-meta">SLA 8 小时</div></div>
              <div class="tl-item"><div class="tl-title">4. 港前风控</div><div class="tl-meta">可承运性 + 附加费</div></div>
              <div class="tl-item"><div class="tl-title">5. 销售报价</div><div class="tl-meta">低于底价转审批</div></div>
              <div class="tl-item"><div class="tl-title">6. 绑定订单</div><div class="tl-meta">形成单票订单价并锁价</div></div>
            </div>
            <div class="banner mt-12">${UI.icon("info", 15)}<div>提交后按产品+国家自动分派；无匹配路由时进入公共池，由销售主管手工指派。</div></div>
          </div>
        </section>
        <section class="card">
          <div class="card-hd"><h3>AI 风险提示</h3></div>
          <div class="card-bd">
            <div class="ai-panel">
              <div class="ai-hd"><span class="spark">${UI.icon("spark", 12)}</span>提交后自动识别</div>
              <div class="tiny mt-8" style="line-height:1.7;color:var(--ink-2)">识别品名敏感词、带电/液体/侵权风险，并提示是否需要 MSDS、CPC、熏蒸等资料。提示不阻断提交，由港前确认。</div>
            </div>
          </div>
        </section>
      </div>
    </div>`;

  function applyType() {
    const isFcl = type === "整柜";
    const isX = type === "X 系列";
    document.getElementById("fContainerField").style.display = isFcl ? "" : "none";
    document.getElementById("fContainerQtyField").style.display = isFcl ? "" : "none";
    document.getElementById("fPieces").closest(".field").style.display = isX ? "none" : "";
    document.getElementById("fVolume").closest(".field").style.display = isFcl || isX ? "none" : "";
    const note = document.getElementById("typeNote");
    if (isFcl) note.innerHTML = `${UI.icon("info", 15)}<div><b>整柜：</b>按柜一口价询价，计价单位为“柜”；体积字段不参与计价，仍需填写货重用于配载。</div>`;
    else if (isX) note.innerHTML = `${UI.icon("info", 15)}<div><b>X 系列：</b>无套餐价与公布价，只能按单独询价/成本报价；首期是否纳入询价范围待确认。</div>`;
    else note.innerHTML = `${UI.icon("info", 15)}<div><b>标准产品：</b>按销售产品价格（公布价/套餐/客户价）取价，计价单位 KG。</div>`;
  }

  function collect() {
    return {
      customer: UI.val("fCustomer"), product: UI.val("fProduct"), type, cargo: UI.val("fCargo"),
      pieces: +UI.val("fPieces") || 0, weight: +UI.val("fWeight") || 0, volume: +UI.val("fVolume") || 0,
      box: UI.val("fBox"), addressType: UI.val("fAddrType"), country: UI.val("fCountry"),
      state: UI.val("fState"), city: UI.val("fCity"), zip: UI.val("fZip"), address: UI.val("fAddress"),
      transit: UI.val("fTransit"), validUntil: UI.val("fValid"), note: UI.val("fNote")
    };
  }

  function submit(asDraft) {
    const d = collect();
    if (!asDraft && (!d.customer || !d.product || !d.cargo || !d.weight)) return UI.toast("请填写客户、产品、品名和重量", "err");
    const id = "INQ20261022" + String(Store.list("inquiries").length + 1).padStart(3, "0");
    const route = Store.list("routes").find(r => r.product === d.product && r.country === d.country && r.status === "启用");
    const now = "2026-10-22 20:00";
    const inq = {
      id, customer: d.customer, product: d.product, country: d.country, type: d.type, cargo: d.cargo || "待补充",
      pieces: d.pieces, weight: d.weight, volume: d.volume, addressType: d.addressType,
      city: d.city || "待补充", zip: d.zip || "—", address: d.address || "—", transit: d.transit,
      status: asDraft ? "草稿" : "待成本", owner: asDraft ? "—" : (route ? route.owner : "公共池"),
      sales: Q.customer(d.customer).sales || "张伟", createdAt: now,
      validUntil: d.validUntil || "2026-11-05", slaDue: asDraft ? "—" : "2026-10-23 04:00",
      cost: null, risk: null, quote: null, bind: null,
      aiRisk: { level: "待识别", text: asDraft ? "草稿尚未提交，AI 风险识别在提交后执行。" : "提交后由 AI 识别品名风险；港前确认前不阻断流程。" },
      timeline: [
        { time: now, actor: "杨鑫", action: asDraft ? "保存草稿" : "创建询价", note: d.note || (asDraft ? "未提交" : "手工录入") }
      ]
    };
    if (!asDraft) inq.timeline.push({ time: now, actor: "系统", action: "自动分派", note: `按 ${Q.productName(d.product)} + ${d.country} 路由至 ${route ? route.column + " / " + route.owner + "；港前 / " + route.portOwner : "公共池"}` });
    Store.add("inquiries", inq);
    Store.log("询价管理", asDraft ? "保存草稿" : "创建询价", id, Q.customerName(d.customer) + " · " + Q.productName(d.product));
    UI.toast(asDraft ? "草稿已保存" : "询价已提交，进入待成本");
    setTimeout(() => location.href = "inquiry-detail.html?id=" + id, 500);
  }

  function openAI() {
    UI.modal({
      title: "AI 识别录入",
      size: "lg",
      body: `<div class="stack">
        <div class="field"><label>粘贴客户消息 / 询价内容</label><textarea class="textarea" id="aiInqText" style="min-height:110px">凯琦要发美国海派卡派，家具配件，60 件，1200 公斤，8.6 方，洛杉矶 90013 商业地址，7-10 天。</textarea></div>
        <div class="row"><button class="btn btn-ghost btn-sm" id="aiParse">${UI.icon("spark", 12)} 识别并回填</button><span class="tiny muted">示例数据，识别后仍可修改</span></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">关闭</button>`,
      onMount(el, close) {
        el.querySelector("#aiParse").onclick = () => {
          document.getElementById("fCustomer").value = "C001";
          document.getElementById("fProduct").value = "P001";
          document.getElementById("fCargo").value = "家具配件";
          document.getElementById("fPieces").value = "60";
          document.getElementById("fWeight").value = "1200";
          document.getElementById("fVolume").value = "8.6";
          document.getElementById("fCity").value = "洛杉矶";
          document.getElementById("fZip").value = "90013";
          document.getElementById("fAddress").value = "Los Angeles St 1200";
          document.getElementById("fTransit").value = "7-10 天";
          close(); UI.toast("已识别并回填 9 个字段");
        };
      }
    });
  }

  UI.shell({ active: "inquiry-list", title: "新建询价", content });
  applyType();
  document.querySelectorAll("input[name=fType]").forEach(r => r.onchange = () => { type = r.value; applyType(); });
  document.getElementById("aiBtn").onclick = openAI;
  document.getElementById("draftBtn").onclick = () => submit(true);
  document.getElementById("submitBtn").onclick = () => submit(false);
  document.getElementById("fProduct").addEventListener("change", () => {
    const p = Q.product(UI.val("fProduct"));
    document.getElementById("fCountry").value = p.country;
  });
})();
