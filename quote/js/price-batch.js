/* 产品价格 · 批量调价 */
(function () {
  let step = 1;
  const state = { products: ["P001"], country: "US", zone: "", warehouse: "WH01", effective: "2026-11-01", mode: "固定金额", direction: "上调", value: 0.5, link: true, reason: "" };

  const content = `
    ${UI.pageHead({
      title: "批量调价",
      sub: "按产品、国家、分区或仓点批量调整公布价；联动生成套餐价前先预览影响范围。",
      actions: `<button class="btn btn-ghost" onclick="location.href='price-history.html'">${UI.icon("clock", 14)} 调价历史</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>审批边界：</b>批量调价提交后进入 OA 审批；审批中的价格不参与取价。已有订单价不受影响，已出账账单不回溯。</div>
    </div>

    <section class="card">
      <div class="card-bd" style="padding-bottom:6px">
        <div class="steps">
          <div class="step ${step >= 1 ? (step === 1 ? "active" : "done") : ""}"><span class="n">${step > 1 ? "✓" : "1"}</span><span class="lbl">选择范围</span></div>
          <span class="step-line ${step > 1 ? "done" : ""}"></span>
          <div class="step ${step >= 2 ? (step === 2 ? "active" : "done") : ""}"><span class="n">${step > 2 ? "✓" : "2"}</span><span class="lbl">设置调整</span></div>
          <span class="step-line ${step > 2 ? "done" : ""}"></span>
          <div class="step ${step >= 3 ? "active" : ""}"><span class="n">3</span><span class="lbl">预览影响</span></div>
        </div>
      </div>
      <div id="stepBody"></div>
      <div class="card-ft">
        <span class="tiny muted" id="stepHint"></span>
        <span class="spacer"></span>
        <button class="btn btn-ghost" id="prevBtn" ${step === 1 ? "disabled" : ""}>上一步</button>
        <button class="btn btn-primary" id="nextBtn">${step === 3 ? "提交审批" : "下一步"}</button>
      </div>
    </section>`;

  function renderStep() {
    const body = document.getElementById("stepBody");
    if (step === 1) {
      body.innerHTML = `<div class="form-section">
        <div class="form-section-hd"><span class="no">1</span>选择调价范围</div>
        <div class="form-grid">
          <div class="field span-2"><label>产品（可多选）</label>
            <div class="row wrap" style="gap:10px">
              ${Store.list("products").map(p => `<label class="check"><input type="checkbox" class="bpProd" value="${p.code}" ${state.products.includes(p.code) ? "checked" : ""}> ${p.name}</label>`).join("")}
            </div>
          </div>
          <div class="field"><label>国家</label><select class="select" id="bpCountry"><option value="US" ${state.country === "US" ? "selected" : ""}>美国</option><option value="DE" ${state.country === "DE" ? "selected" : ""}>德国</option><option value="GB" ${state.country === "GB" ? "selected" : ""}>英国</option><option value="CA" ${state.country === "CA" ? "selected" : ""}>加拿大</option></select></div>
          <div class="field"><label>分区（留空=全部分区）</label><input class="input" id="bpZone" value="${state.zone}" placeholder="如 Z1 美西"></div>
          <div class="field"><label>计费地点</label><select class="select" id="bpWh">${Store.list("warehouses").filter(w => w.status === "启用").map(w => `<option value="${w.code}" ${w.code === state.warehouse ? "selected" : ""}>${w.name}（${w.billing}）</option>`).join("")}</select></div>
          <div class="field"><label>拟生效日期</label><input class="input" id="bpEffective" type="date" value="${state.effective}"></div>
        </div>
        <div class="banner mt-12">${UI.icon("info", 15)}<div>先选范围，下一步再设置调价方式；当前范围预计影响 <b id="scopeCount">0</b> 条生效公布价。</div></div>
      </div>`;
      const update = () => {
        state.products = [...document.querySelectorAll(".bpProd:checked")].map(x => x.value);
        state.country = UI.val("bpCountry"); state.zone = UI.val("bpZone"); state.warehouse = UI.val("bpWh"); state.effective = UI.val("bpEffective");
        document.getElementById("scopeCount").textContent = scopeRows().length;
      };
      body.querySelectorAll("input,select").forEach(x => x.addEventListener("change", update));
      update();
      document.getElementById("stepHint").textContent = "选择要调价的产品与国家/分区";
    } else if (step === 2) {
      body.innerHTML = `<div class="form-section">
        <div class="form-section-hd"><span class="no">2</span>设置调整方式</div>
        <div class="form-grid">
          <div class="field"><label>调整方式</label><div class="radio-row">
            <label class="radio"><input type="radio" name="bpMode" value="固定金额" ${state.mode === "固定金额" ? "checked" : ""}> 固定金额</label>
            <label class="radio"><input type="radio" name="bpMode" value="百分比" ${state.mode === "百分比" ? "checked" : ""}> 百分比</label>
          </div></div>
          <div class="field"><label>调整方向</label><div class="radio-row">
            <label class="radio"><input type="radio" name="bpDir" value="上调" ${state.direction === "上调" ? "checked" : ""}> 上调</label>
            <label class="radio"><input type="radio" name="bpDir" value="下调" ${state.direction === "下调" ? "checked" : ""}> 下调</label>
          </div></div>
          <div class="field"><label>调整值<span class="req">*</span></label><div class="input-group"><input class="input" id="bpValue" type="number" step="0.01" value="${state.value}"><span class="unit" id="bpUnit">元/kg</span></div></div>
          <div class="field"><label>套餐价联动</label><label class="switch"><input type="checkbox" id="bpLink" ${state.link ? "checked" : ""}><span class="track"></span><span class="sw-label">按价差规则同步生成 B–E</span></label></div>
          <div class="field span-2"><label>调价原因<span class="req">*</span></label><input class="input" id="bpReason" value="${state.reason}" placeholder="如 11 月成本上涨，统一上调 0.50 元/kg"></div>
        </div>
        <div class="banner warn mt-12">${UI.icon("alert", 15)}<div>下调后若低于底价将被拦截；上调/下调都会进入 OA 审批，审批通过后按拟生效日期生效。</div></div>
      </div>`;
      const mode = body.querySelectorAll("input[name=bpMode]");
      mode.forEach(x => x.addEventListener("change", () => {
        state.mode = x.value;
        document.getElementById("bpUnit").textContent = state.mode === "固定金额" ? "元/kg" : "%";
      }));
      body.querySelectorAll("input[name=bpDir]").forEach(x => x.addEventListener("change", () => state.direction = x.value));
      body.querySelectorAll("input").forEach(x => x.addEventListener("change", () => {
        state.value = parseFloat(document.getElementById("bpValue").value) || 0;
        state.link = document.getElementById("bpLink").checked;
        state.reason = UI.val("bpReason");
      }));
      document.getElementById("stepHint").textContent = "设置调整方式与联动规则";
    } else {
      const rows = scopeRows().map(r => {
        const delta = state.mode === "固定金额" ? state.value : r.price * state.value / 100;
        const np = +(state.direction === "上调" ? r.price + delta : r.price - delta).toFixed(2);
        return { ...r, np, diff: +(np - r.price).toFixed(2), below: np <= r.base };
      });
      const affected = rows.length;
      const below = rows.filter(r => r.below).length;
      body.innerHTML = `<div class="form-section">
        <div class="form-section-hd"><span class="no">3</span>预览影响范围</div>
        <div class="info-strip mb-16">
          <div class="is"><span>影响价格条目</span><b>${affected}</b><em>条</em></div>
          <div class="is"><span>预计上调/下调</span><b>${state.direction}</b><em>${state.mode === "固定金额" ? state.value + " 元/kg" : state.value + "%"}</em></div>
          <div class="is"><span>低于底价</span><b style="color:${below ? "var(--red)" : "var(--green)"}">${below}</b><em>条</em></div>
          <div class="is"><span>套餐联动</span><b>${state.link ? "是" : "否"}</b><em>B–E</em></div>
        </div>
        ${affected ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>产品</th><th>分区</th><th class="num">原价</th><th class="num">新价</th><th class="num">差额</th><th class="num">底价</th><th>校验</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${Q.productName(r.product)}</td><td>${r.zone}</td><td class="num">${Fmt.num(r.price, 2)}</td><td class="num price-cell">${Fmt.num(r.np, 2)}</td><td class="num ${r.diff < 0 ? "green" : "red"}">${r.diff > 0 ? "+" : ""}${r.diff.toFixed(2)}</td><td class="num muted">${Fmt.num(r.base, 2)}</td><td>${r.below ? UI.badge("低于底价", "b-red") : UI.badge("通过")}</td></tr>`).join("")}</tbody></table></div>` : UI.empty("当前范围没有生效中的公布价", "调整产品/国家/分区后重试")}
        <div class="banner ${below ? "danger" : "success"} mt-12">${UI.icon(below ? "alert" : "checkCircle", 15)}<div>${below ? `有 ${below} 条新价低于底价，提交会被拦截；请下调幅度或先调整底价。` : "全部新价高于底价，可提交审批。"}</div></div>
      </div>`;
      document.getElementById("stepHint").textContent = below ? "存在低于底价的条目，无法提交" : "确认无误后提交 OA 审批";
      document.getElementById("nextBtn").disabled = below > 0 || affected === 0;
    }
  }

  function scopeRows() {
    return Store.list("publishPrices").filter(p => state.products.includes(p.product) && p.country === state.country && p.status === "生效" && (!state.zone || p.zone === state.zone));
  }

  UI.shell({ active: "price-batch", title: "批量调价", content });
  renderStep();

  document.getElementById("prevBtn").onclick = () => { if (step > 1) { step--; renderStep(); } };
  document.getElementById("nextBtn").onclick = () => {
    if (step < 3) {
      if (step === 1 && !state.products.length) return UI.toast("请至少选择一个产品", "err");
      step++; renderStep(); return;
    }
    const reason = state.reason || "批量调价";
    const oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
    Store.add("approvals", { id: oa, type: "批量调价", title: "批量调价 · " + (state.zone || "全部分区"), object: state.products.join("、") + " / " + state.country, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "价格委员会", oldVal: "当前生效价", newVal: (state.direction === "上调" ? "+" : "-") + (state.mode === "固定金额" ? state.value + " 元/kg" : state.value + "%"), reason, impact: `影响 ${scopeRows().length} 条公布价${state.link ? "，并联动套餐价" : ""}` });
    Store.log("产品价格", "批量调价", state.products.join("、"), `${state.direction} ${state.mode === "固定金额" ? state.value + " 元/kg" : state.value + "%"}，${oa}`);
    UI.toast("已提交审批：" + oa); step = 1; renderStep();
  };
})();
