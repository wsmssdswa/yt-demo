/* 计重计价 · 计重规则 */
(function () {
  let active = "产品规则";

  const content = `
    ${UI.pageHead({
      title: "计重规则",
      sub: "按产品/客户配置箱规、材积系数、进位规则与重泡优惠。客户规则优先，产品规则兜底；变更留痕。",
      actions: `<button class="btn btn-ghost" onclick="location.href='rule-calc.html'">${UI.icon("calc", 14)} 去模拟计算</button>
        <button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新增规则</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>计重顺序：</b>单箱材积重 = 长×宽×高 ÷ 材积系数；单箱计费重取实重与材积重较大值并按规则进位；整票汇总后按整票进位规则再进位。客户箱规缺失时降级到产品规则，并在计费明细中记录降级原因。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("calc", 14)}</span>计重规则</div><div class="st-val">${Store.list("weightRules").length}<small>条</small></div><div class="st-ft">产品规则 5 · 客户规则 2</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("box", 14)}</span>客户箱规</div><div class="st-val">${Store.list("weightRules").filter(r => r.box !== "—").length}<small>条</small></div><div class="st-ft">凯琦 60×50×40 · 纽酷 70×50×50</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("percent", 14)}</span>重泡优惠</div><div class="st-val">${Store.list("discounts").length}<small>条</small></div><div class="st-ft">客户优先，产品兜底</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>审批中</div><div class="st-val">${Store.list("weightRules").filter(r => r.status === "审批中").length}<small>条</small></div><div class="st-ft">盈和 C004 箱规待审，暂按产品规则</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="rwTabs">
        ${["产品规则", "客户规则", "重泡优惠"].map(t => `<a class="tab ${t === active ? "active" : ""}" href="javascript:void(0)" data-t="${t}">${t}</a>`).join("")}
      </div>
      <div id="rwBody"></div>
    </section>`;

  function render() {
    if (active === "产品规则") {
      document.getElementById("rwBody").innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>产品</th><th>材积系数</th><th>单箱进位</th><th>整票进位</th><th>状态</th><th>更新</th><th>操作</th></tr></thead>
        <tbody>${Store.list("weightRules").filter(r => r.scope === "产品").map(r => `<tr>
          <td><div class="t-main">${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.product}</div></td>
          <td><span class="mono">${r.divisor}</span> <span class="tiny muted">cm³/kg</span></td>
          <td>${r.round}</td><td>${r.ticketRound}</td><td>${UI.badge(r.status)}</td>
          <td><span class="tiny muted">${r.updated}</span></td>
          <td><button class="btn-text" data-edit="${r.id}">编辑</button></td>
        </tr>`).join("")}</tbody></table></div>`;
    } else if (active === "客户规则") {
      document.getElementById("rwBody").innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>客户</th><th>产品</th><th>箱规</th><th>材积系数</th><th>单箱 / 整票进位</th><th>重泡优惠</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${Store.list("weightRules").filter(r => r.scope === "客户").map(r => `<tr>
          <td><div class="t-main">${UI.esc(Q.customerName(r.customer))}</div><div class="t-sub">${r.customer}</div></td>
          <td>${UI.esc(Q.productName(r.product))}</td>
          <td><span class="code-tag">${UI.esc(r.box)}</span></td>
          <td><span class="mono">${r.divisor}</span></td>
          <td>${r.round} / ${r.ticketRound}</td>
          <td>${UI.esc(r.bubble)}</td>
          <td>${UI.badge(r.status)}</td>
          <td><button class="btn-text" data-edit="${r.id}">编辑</button></td>
        </tr>`).join("")}</tbody></table></div>`;
    } else {
      document.getElementById("rwBody").innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>范围</th><th>客户 / 产品</th><th>门槛</th><th>优惠</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${Store.list("discounts").map(r => `<tr>
          <td>${UI.badge(r.scope, r.scope === "客户" ? "b-teal" : "b-blue")}</td>
          <td><div class="t-main">${r.customer !== "—" ? Q.customerName(r.customer) : Q.productName(r.product)}</div><div class="t-sub">${r.customer !== "—" ? Q.productName(r.product) : r.product}</div></td>
          <td>${UI.esc(r.threshold)}</td>
          <td><span class="badge b-green no-dot">${UI.esc(r.rate)}</span></td>
          <td>${UI.esc(r.priority)}</td>
          <td>${UI.badge(r.status)}</td>
          <td><button class="btn-text" data-discount="${r.id}">编辑</button></td>
        </tr>`).join("")}</tbody></table></div>`;
    }
    document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openEdit(b.dataset.edit));
    document.querySelectorAll("[data-discount]").forEach(b => b.onclick = () => openDiscount(b.dataset.discount));
  }

  function openEdit(id) {
    const r = Store.find("weightRules", id);
    UI.drawer({
      title: (r.scope === "客户" ? Q.customerName(r.customer) : Q.productName(r.product)) + " · 计重规则",
      sub: `${r.id} · ${r.scope}规则 · 状态 ${r.status}`,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>规则范围</label><input class="input" value="${r.scope}规则" disabled></div>
          <div class="field"><label>产品</label><input class="input" value="${Q.productName(r.product)}" disabled></div>
          ${r.scope === "客户" ? `<div class="field span-2"><label>客户箱规（长×宽×高 cm）</label><input class="input" id="wrBox" value="${UI.esc(r.box)}"></div>` : ""}
          <div class="field"><label>材积系数<span class="req">*</span></label><input class="input" id="wrDiv" type="number" value="${r.divisor}"></div>
          <div class="field"><label>单箱进位<span class="req">*</span></label><select class="select" id="wrRound"><option ${r.round.includes("0.5") ? "selected" : ""}>0.5kg 进位</option><option ${r.round.includes("1kg") ? "selected" : ""}>1kg 进位</option></select></div>
          <div class="field"><label>整票进位<span class="req">*</span></label><select class="select" id="wrTicket"><option ${r.ticketRound.includes("0.5") ? "selected" : ""}>0.5kg 进位</option><option ${r.ticketRound.includes("1kg") ? "selected" : ""}>1kg 进位</option></select></div>
          <div class="field"><label>状态</label><select class="select" id="wrStatus"><option ${r.status === "生效" ? "selected" : ""}>生效</option><option ${r.status === "审批中" ? "selected" : ""}>审批中</option><option ${r.status === "停用" ? "selected" : ""}>停用</option></select></div>
          ${r.scope === "客户" ? `<div class="field span-2"><label>重泡优惠</label><input class="input" id="wrBubble" value="${UI.esc(r.bubble)}"></div>` : ""}
        </div>
        <div class="banner">${UI.icon("info", 15)}<div>客户规则优先于产品规则；客户规则停用/审批中时自动降级到产品规则，并在计费明细记录“规则降级”。</div></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>修改进位规则只影响之后触发的计费，不回溯已出账账单。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const patch = { divisor: +UI.val("wrDiv"), round: UI.val("wrRound"), ticketRound: UI.val("wrTicket"), status: UI.val("wrStatus"), updated: "2026-10-22" };
          if (r.scope === "客户") { patch.box = UI.val("wrBox"); patch.bubble = UI.val("wrBubble"); }
          Store.update("weightRules", r.id, patch);
          Store.log("计重规则", "更新", r.scope === "客户" ? Q.customerName(r.customer) : Q.productName(r.product), "材积系数/进位规则变更");
          close(); UI.toast("计重规则已保存"); render();
        };
      }
    });
  }

  function openDiscount(id) {
    const d = Store.find("discounts", id);
    UI.drawer({
      title: "重泡优惠 · " + (d.scope === "客户" ? Q.customerName(d.customer) : Q.productName(d.product)),
      sub: `${d.id} · ${d.scope}维度 · ${d.priority}`,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>优惠门槛</label><input class="input" id="dcThreshold" value="${UI.esc(d.threshold)}"></div>
          <div class="field"><label>优惠力度</label><input class="input" id="dcRate" value="${UI.esc(d.rate)}"></div>
          <div class="field"><label>优先级</label><input class="input" value="${d.priority}" disabled></div>
          <div class="field"><label>状态</label><select class="select" id="dcStatus"><option ${d.status === "生效" ? "selected" : ""}>生效</option><option ${d.status === "停用" ? "selected" : ""}>停用</option></select></div>
        </div>
        <div class="banner info">${UI.icon("info", 15)}<div>只有实重大于材积重的“重货”才触发重货优惠；泡货按材积重计费，不重复打折。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          Store.update("discounts", d.id, { threshold: UI.val("dcThreshold"), rate: UI.val("dcRate"), status: UI.val("dcStatus"), updated: "2026-10-22" });
          Store.log("计重规则", "更新重泡优惠", d.id, UI.val("dcThreshold") + " → " + UI.val("dcRate"));
          close(); UI.toast("重泡优惠已保存"); render();
        };
      }
    });
  }

  function openAdd() {
    if (active === "重泡优惠") {
      UI.modal({
        title: "新增重泡优惠",
        body: `<div class="form-grid">
          <div class="field"><label>范围</label><select class="select" id="ndScope"><option value="客户">客户</option><option value="产品">产品</option></select></div>
          <div class="field"><label>客户 / 产品</label><select class="select" id="ndTarget">${UI.options(Store.list("customers"), "code", "short", "")}</select></div>
          <div class="field"><label>门槛</label><input class="input" id="ndThreshold" placeholder="如 计费重 ≥ 100kg"></div>
          <div class="field"><label>优惠力度</label><input class="input" id="ndRate" placeholder="如 95 折"></div>
        </div>`,
        footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="ndSave">保存</button>`,
        onMount(el, close) {
          el.querySelector("#ndSave").onclick = () => {
            if (!UI.val("ndThreshold") || !UI.val("ndRate")) return UI.toast("请填写门槛和优惠力度", "err");
            Store.add("discounts", { id: "DS" + String(Store.list("discounts").length + 1).padStart(3, "0"), scope: UI.val("ndScope"), customer: UI.val("ndScope") === "客户" ? UI.val("ndTarget") : "—", product: "P001", threshold: UI.val("ndThreshold"), rate: UI.val("ndRate"), priority: UI.val("ndScope") === "客户" ? "客户优先" : "产品兜底", status: "生效", updated: "2026-10-22" });
            Store.log("计重规则", "新增重泡优惠", UI.val("ndTarget"), UI.val("ndThreshold") + " " + UI.val("ndRate"));
            close(); UI.toast("重泡优惠已新增"); render();
          };
        }
      });
      return;
    }
    UI.modal({
      title: "新增计重规则",
      body: `<div class="form-grid">
        <div class="field"><label>规则范围</label><select class="select" id="nwScope"><option value="客户">客户规则</option><option value="产品">产品规则</option></select></div>
        <div class="field"><label>客户</label><select class="select" id="nwCustomer">${UI.options(Store.list("customers"), "code", "short", "")}</select></div>
        <div class="field"><label>产品</label><select class="select" id="nwProduct">${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>材积系数</label><input class="input" id="nwDiv" type="number" value="6000"></div>
        <div class="field span-2"><label>客户箱规（客户规则填写）</label><input class="input" id="nwBox" placeholder="如 60×50×40cm"></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="nwSave">保存</button>`,
      onMount(el, close) {
        el.querySelector("#nwSave").onclick = () => {
          const scope = UI.val("nwScope");
          Store.add("weightRules", { id: "WR" + String(Store.list("weightRules").length + 1).padStart(3, "0"), scope, product: UI.val("nwProduct"), customer: scope === "客户" ? UI.val("nwCustomer") : "—", box: scope === "客户" ? (UI.val("nwBox") || "—") : "—", divisor: +UI.val("nwDiv") || 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", bubble: "—", status: "生效", updated: "2026-10-22" });
          Store.log("计重规则", "新增", scope + "规则", "新增计重规则");
          close(); UI.toast("计重规则已新增"); render();
        };
      }
    });
  }

  UI.shell({ active: "rule-weight", title: "计重规则", content });
  render();
  document.querySelectorAll("#rwTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#rwTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.t; render();
  });
  document.getElementById("addBtn").onclick = openAdd;
})();
