/* 询价管理 · 订单绑定 */
(function () {
  let active = "待绑定";

  const content = `
    ${UI.pageHead({
      title: "订单绑定",
      sub: "有效期内按客户 + 产品 + 品名 + 货量匹配订单，单一明确命中才自动绑定；多候选/条件不一致转人工。",
      actions: `<button class="btn btn-ghost" id="matchBtn">${UI.icon("refresh", 14)} 重新匹配</button>
        <button class="btn btn-primary" id="manualBtn">${UI.icon("link", 14)} 手工绑定</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>订单价：</b>绑定后按本次销售报价形成单票订单价并锁价，取价优先级最高。订单价由 PQM 计算并回写；CCOS 重量勘误会自动覆盖成交价（不校验出账），属于待确认风险。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clipboard", 14)}</span>待绑定询价</div><div class="st-val">${Store.list("inquiries").filter(i => i.status === "已报价").length}<small>条</small></div><div class="st-ft">报价有效期内可绑定</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("link", 14)}</span>已绑定</div><div class="st-val">${Store.list("inquiries").filter(i => i.status === "已绑定").length}<small>条</small></div><div class="st-ft">订单价已锁定</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("alert", 14)}</span>多候选 / 不一致</div><div class="st-val">1<small>条</small></div><div class="st-ft">需人工确认后绑定</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>自动匹配率</div><div class="st-val">62<small>%</small></div><div class="st-ft">近 30 天，单一命中占比</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="bindTabs">
        ${["待绑定", "已绑定", "全部"].map(t => {
          const n = t === "全部" ? Store.list("inquiries").filter(i => ["已报价", "已绑定"].includes(i.status)).length : Store.list("inquiries").filter(i => t === "待绑定" ? i.status === "已报价" : i.status === "已绑定").length;
          return `<a class="tab ${t === active ? "active" : ""}" href="javascript:void(0)" data-t="${t}">${t}<span class="count">${n}</span></a>`;
        }).join("")}
      </div>
      <div id="bindBody"></div>
    </section>`;

  function candidatesOf(inq) {
    return Store.list("orders").filter(o => o.customer === inq.customer && o.product === inq.product);
  }

  function render() {
    let rows = Store.list("inquiries").filter(i => active === "全部" ? ["已报价", "已绑定"].includes(i.status) : active === "待绑定" ? i.status === "已报价" : i.status === "已绑定");
    if (active === "已绑定") {
      document.getElementById("bindBody").innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>询价单</th><th>客户</th><th>产品</th><th>订单号</th><th class="num">订单价</th><th>绑定时间</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${rows.map(i => `<tr>
          <td><a class="t-main" href="inquiry-detail.html?id=${i.id}">${i.id}</a><div class="t-sub">报价 ${Fmt.num(i.quote ? i.quote.price : 0, 2)} 元/kg</div></td>
          <td>${Q.customerName(i.customer)}</td><td>${Q.productName(i.product)}</td><td class="mono">${i.bind ? i.bind.orderId : "—"}</td>
          <td class="num price-cell">${i.bind ? Fmt.num(i.bind.orderPrice, 2) : "—"}</td><td class="tiny muted">${i.bind ? i.bind.boundAt : "—"}</td>
          <td>${UI.badge(i.status)}</td><td><button class="btn-text" data-unbind="${i.id}">解绑</button></td>
        </tr>`).join("") || `<tr><td colspan="8">${UI.empty("暂无已绑定询价")}</td></tr>`}</tbody></table></div>`;
      bindUnbind();
      return;
    }

    document.getElementById("bindBody").innerHTML = `<div class="table-wrap"><table class="table">
      <thead><tr><th>询价单</th><th>客户</th><th>产品</th><th class="num">销售报价</th><th>匹配订单</th><th class="num">订单价</th><th>匹配结果</th><th>操作</th></tr></thead>
      <tbody>${rows.map(i => {
        const cs = candidatesOf(i);
        const best = cs[0];
        const match = cs.length === 1 ? "单一命中" : cs.length > 1 ? "多候选，需人工" : "无匹配订单";
        return `<tr>
          <td><a class="t-main" href="inquiry-detail.html?id=${i.id}">${i.id}</a><div class="t-sub">${i.createdAt.slice(5, 16)} · 有效期 ${i.validUntil}</div></td>
          <td>${Q.customerName(i.customer)}</td><td>${Q.productName(i.product)}<div class="t-sub">${i.cargo} · ${Fmt.num(i.weight)}kg</div></td>
          <td class="num price-cell">${i.quote ? Fmt.num(i.quote.price, 2) : "—"}</td>
          <td class="mono">${best ? best.id : "—"}</td>
          <td class="num">${best ? Fmt.num(best.price, 2) : "—"}</td>
          <td>${match === "单一命中" ? UI.badge("单一命中", "b-green") : match === "多候选，需人工" ? UI.badge(match, "b-amber") : UI.badge(match, "b-red")}</td>
          <td><button class="btn-text" data-bind="${i.id}" ${!cs.length ? "disabled" : ""}>绑定</button></td>
        </tr>`;
      }).join("") || `<tr><td colspan="8">${UI.empty("暂无待绑定询价")}</td></tr>`}</tbody></table></div>`;
    document.querySelectorAll("[data-bind]").forEach(b => b.onclick = () => openBind(b.dataset.bind));
  }

  function bindUnbind() {
    document.querySelectorAll("[data-unbind]").forEach(b => b.onclick = () => {
      const i = Store.find("inquiries", b.dataset.unbind);
      UI.modal({
        title: "解绑订单",
        size: "sm",
        body: `<div class="field"><label>解绑原因<span class="req">*</span></label><textarea class="textarea" id="buReason" placeholder="如 客户取消订单"></textarea></div>
          <div class="banner warn mt-12">${UI.icon("alert", 15)}<div>解绑后订单价失效，后续计费回落客户套餐/公布价；已出账账单不回溯。</div></div>`,
        footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger-solid" id="buSave">确认解绑</button>`,
        onMount(el, close) {
          el.querySelector("#buSave").onclick = () => {
            const reason = UI.val("buReason");
            if (!reason) return UI.toast("请填写解绑原因", "err");
            const o = Store.find("orders", i.bind.orderId);
            if (o) { o.status = "待锁价"; o.inquiry = ""; }
            i.bind = null; i.status = "已报价";
            i.timeline.push({ time: "2026-10-22 20:00", actor: "杨鑫", action: "解绑订单", note: reason });
            Store.save(); Store.log("询价管理", "解绑订单", i.id, reason);
            close(); UI.toast("已解绑"); render();
          };
        }
      });
    });
  }

  function openBind(id) {
    const i = Store.find("inquiries", id);
    const cs = candidatesOf(i);
    UI.modal({
      title: "绑定订单 · " + i.id,
      size: "lg",
      body: `<div class="stack">
        <div class="banner info">${UI.icon("info", 15)}<div>销售报价 ${Fmt.num(i.quote.price, 2)} 元/kg；绑定后订单价按此价格锁定。</div></div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th class="num">当前价</th><th>状态</th><th>选择</th></tr></thead>
          <tbody>${cs.map((o, idx) => `<tr><td class="mono">${o.id}</td><td>${Q.customerName(o.customer)}</td><td>${Q.productName(o.product)}</td><td class="num">${Fmt.num(o.price, 2)}</td><td>${UI.badge(o.status, o.status === "已锁价" ? "b-green" : "b-amber")}</td><td><input type="radio" name="bOrder" value="${o.id}" ${idx === 0 ? "checked" : ""}></td></tr>`).join("")}</tbody></table></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>订单价锁定后，重量勘误会自动覆盖成交价；原型按风险提示展示，不写成既定规则。</div></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="bSave">确认绑定</button>`,
      onMount(el, close) {
        el.querySelector("#bSave").onclick = () => {
          const sel = el.querySelector("input[name=bOrder]:checked");
          if (!sel) return UI.toast("请选择订单", "err");
          const o = Store.find("orders", sel.value);
          i.bind = { orderId: o.id, orderPrice: i.quote.price, boundAt: "2026-10-22 20:00", by: "杨鑫" };
          i.status = "已绑定";
          o.status = "已锁价"; o.price = i.quote.price; o.inquiry = i.id;
          i.timeline.push({ time: "2026-10-22 20:00", actor: "杨鑫", action: "绑定订单", note: o.id + "，订单价 " + i.quote.price + " 元/kg 锁价" });
          Store.save(); Store.log("询价管理", "绑定订单", i.id, o.id);
          close(); UI.toast("订单已绑定"); render();
        };
      }
    });
  }

  function openManual() {
    const pending = Store.list("inquiries").filter(i => i.status === "已报价");
    UI.modal({
      title: "手工绑定订单",
      size: "lg",
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>询价单</label><select class="select" id="mbInq">${pending.map(i => `<option value="${i.id}">${i.id} · ${Q.customerName(i.customer)} · ${Q.productName(i.product)}</option>`).join("")}</select></div>
          <div class="field"><label>订单</label><select class="select" id="mbOrder">${Store.list("orders").filter(o => o.status === "待锁价").map(o => `<option value="${o.id}">${o.id} · ${Q.customerName(o.customer)} · ${Q.productName(o.product)}</option>`).join("")}</select></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>手工绑定会校验客户与产品一致，禁止串单；不一致时直接拦截。</div></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="mbSave">校验并绑定</button>`,
      onMount(el, close) {
        el.querySelector("#mbSave").onclick = () => {
          const i = Store.find("inquiries", UI.val("mbInq"));
          const o = Store.find("orders", UI.val("mbOrder"));
          if (!i || !o) return UI.toast("请选择询价单和订单", "err");
          if (i.customer !== o.customer || i.product !== o.product) return UI.toast("客户或产品不一致，禁止串单", "err");
          i.bind = { orderId: o.id, orderPrice: i.quote.price, boundAt: "2026-10-22 20:00", by: "杨鑫" };
          i.status = "已绑定"; o.status = "已锁价"; o.price = i.quote.price; o.inquiry = i.id;
          i.timeline.push({ time: "2026-10-22 20:00", actor: "杨鑫", action: "手工绑定订单", note: o.id });
          Store.save(); Store.log("询价管理", "手工绑定", i.id, o.id);
          close(); UI.toast("绑定成功"); render();
        };
      }
    });
  }

  UI.shell({ active: "inquiry-bind", title: "订单绑定", content });
  render();
  document.querySelectorAll("#bindTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#bindTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.t; render();
  });
  document.getElementById("matchBtn").onclick = () => UI.toast("已重新匹配：1 条单一命中，1 条多候选", "ok");
  document.getElementById("manualBtn").onclick = openManual;
})();
