/* 询价管理 · 询价详情 */
(function () {
  let id = UI.param("id") || Store.list("inquiries")[0].id;
  let inq = Store.find("inquiries", id);

  if (!inq) {
    UI.shell({ active: "inquiry-list", title: "询价详情", content: UI.empty("询价单不存在", "返回列表重新选择") });
    return;
  }

  const steps = ["提交", "成本", "风控", "报价", "绑定"];
  const stepIndex = { "草稿": 0, "待成本": 1, "待风控": 2, "待报价": 3, "已报价": 4, "已绑定": 5, "已失效": 4 }[inq.status] || 0;

  function build() {
    const c = Q.customer(inq.customer), p = Q.product(inq.product);
    const sla = ["已报价", "已绑定"].includes(inq.status) ? { text: "已完成", cls: "b-gray" } : inq.status === "已失效" ? { text: "已失效", cls: "b-gray" } : inq.status === "草稿" ? { text: "未提交", cls: "b-gray" } : Fmt.sla(inq.slaDue);
    const route = Store.list("routes").find(r => r.product === inq.product && r.country === inq.country);
    const canAct = ["待成本", "待风控", "待报价", "已报价", "草稿"].includes(inq.status);

    return `
      ${UI.pageHead({
        title: "询价详情",
        sub: `询价单 ${inq.id} · 创建于 ${inq.createdAt} · ${inq.type}`,
        actions: `<button class="btn btn-ghost" onclick="location.href='inquiry-list.html'">${UI.icon("left", 14)} 返回列表</button>
          ${inq.status === "已报价" || inq.status === "已绑定" ? `<button class="btn btn-ghost" onclick="location.href='trial.html'">${UI.icon("calc", 14)} 试算</button>` : ""}
          ${inq.status === "草稿" ? `<button class="btn btn-primary" data-action="submitDraft">提交询价</button>` : ""}`
      })}

      <section class="card">
        <div class="doc-hd">
          <div class="dh-main">
            <div class="dh-id">${inq.id} ${UI.badge(inq.status)} ${inq.quote && inq.quote.belowBase ? '<span class="badge b-amber">报价审批中</span>' : ""}</div>
            <div class="dh-sub">
              <span>${UI.icon("users", 12)} ${UI.esc(c.name)}</span>
              <span>${UI.icon("box", 12)} ${UI.esc(p.name)}</span>
              <span>${UI.icon("map", 12)} ${inq.country} · ${UI.esc(inq.city)} ${UI.esc(inq.zip)}</span>
              <span>${UI.icon("clock", 12)} SLA ${sla.text}</span>
            </div>
          </div>
          <div class="dh-amount">
            <b>${inq.quote ? Fmt.num(inq.quote.price, 2) : "—"}<small style="font-size:11px;font-weight:500"> ${inq.quote ? "元/kg" : ""}</small></b>
            <span>${inq.quote ? "销售报价" : "待报价"}</span>
          </div>
        </div>
        <div class="card-bd" style="padding-top:16px;padding-bottom:14px">
          <div class="steps">
            ${steps.map((s, i) => `<div class="step ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}"><span class="n">${i < stepIndex ? "✓" : i + 1}</span><span class="lbl">${s}</span></div>${i < steps.length - 1 ? `<span class="step-line ${i < stepIndex ? "done" : ""}"></span>` : ""}`).join("")}
          </div>
        </div>
      </section>

      <div class="detail-grid mt-16">
        <div class="stack">
          <section class="card">
            <div class="card-hd"><h3>基本信息</h3><div class="right">${inq.type === "整柜" ? '<span class="badge b-blue">整柜</span>' : inq.type === "X 系列" ? '<span class="badge b-purple">X 系列</span>' : '<span class="badge b-teal">标准产品</span>'}</div></div>
            <div class="card-bd">
              <dl class="kv two">
                <dt>客户</dt><dd>${UI.esc(c.name)}（${c.code}）</dd>
                <dt>销售</dt><dd>${UI.esc(inq.sales)}</dd>
                <dt>产品</dt><dd>${UI.esc(p.name)}（${p.code}）</dd>
                <dt>负责人</dt><dd>${UI.esc(inq.owner)}${route ? " · " + route.column : ""}</dd>
                <dt>品名</dt><dd>${UI.esc(inq.cargo)}</dd>
                <dt>件数 / 重量 / 体积</dt><dd>${inq.pieces} 件 / ${Fmt.num(inq.weight)} kg / ${Fmt.num(inq.volume, 2)} m³</dd>
                <dt>地址类型</dt><dd>${UI.esc(inq.addressType)}</dd>
                <dt>目的地</dt><dd>${UI.esc(inq.city)} ${UI.esc(inq.zip)}，${inq.country}</dd>
                <dt>时效要求</dt><dd>${UI.esc(inq.transit)}</dd>
                <dt>报价有效期</dt><dd>${inq.validUntil}</dd>
                <dt>箱规 / 包装</dt><dd>${UI.esc(inq.box || "未提供")}</dd>
                <dt>创建时间</dt><dd>${inq.createdAt}</dd>
              </dl>
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>纵队成本</h3><span class="sub">仅内部可见</span>
              <div class="right">${inq.cost ? UI.badge("已录入", "b-green") : canAct && inq.status === "待成本" ? `<button class="btn btn-soft btn-sm" data-action="cost">录入成本</button>` : ""}</div>
            </div>
            <div class="card-bd">
              ${inq.cost ? `<div class="row"><div><div class="tiny muted">成本单价</div><div class="price-big">${Fmt.num(inq.cost.unit, 2)}<small>元/kg</small></div></div><span class="spacer"></span><span class="badge b-outline">${UI.esc(inq.cost.scope)}</span></div>
                <div class="hint mt-8">${UI.esc(inq.cost.note || "—")} · ${inq.cost.by} ${inq.cost.at}</div>` : UI.empty("还没有录入成本", "纵队按产品+国家核算成本与适用范围")}
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>港前风控</h3><span class="sub">可承运性 / 附加费</span>
              <div class="right">${inq.risk ? UI.badge(inq.risk.ok ? "可承运" : "不可承运", inq.risk.ok ? "b-green" : "b-red") : canAct && inq.status === "待风控" ? `<button class="btn btn-soft btn-sm" data-action="risk">确认可承运</button>` : ""}</div>
            </div>
            <div class="card-bd">
              ${inq.risk ? `<div class="banner ${inq.risk.ok ? "success" : "danger"}">${UI.icon(inq.risk.ok ? "checkCircle" : "alert", 15)}<div>${UI.esc(inq.risk.note)}</div></div>
                ${inq.risk.surcharges && inq.risk.surcharges.length ? `<div class="table-wrap mt-12"><table class="table compact"><thead><tr><th>附加费</th><th>金额 / 比例</th><th>说明</th></tr></thead><tbody>${inq.risk.surcharges.map(s => `<tr><td>${UI.esc(Q.feeName(s.fee))}</td><td class="price-cell">${UI.esc(s.value)}</td><td class="tiny muted">${UI.esc(s.note || "—")}</td></tr>`).join("")}</tbody></table></div>` : ""}
                <div class="hint mt-8">${inq.risk.by} ${inq.risk.at}</div>` : UI.empty("还没有风控结论", "港前确认品名、地址与可承运性，并录入附加费")}
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>销售报价</h3><span class="sub">对客报价与有效期</span>
              <div class="right">${inq.quote ? UI.badge(inq.quote.belowBase ? "审批中" : "已报价", inq.quote.belowBase ? "b-amber" : "b-teal") : canAct && inq.status === "待报价" ? `<button class="btn btn-soft btn-sm" data-action="quote">录入报价</button>` : ""}</div>
            </div>
            <div class="card-bd">
              ${inq.quote ? `<div class="row"><div><div class="tiny muted">报价（${inq.quote.mode}）</div><div class="price-big">${Fmt.num(inq.quote.price, 2)}<small>元/kg</small></div></div><span class="spacer"></span><span class="tiny muted">有效期 ${inq.quote.validDays} 天 · ${inq.quote.at}</span></div>
                <div class="hint mt-8">${UI.esc(inq.quote.note || "—")}</div>
                ${inq.quote.belowBase ? `<div class="banner warn mt-12">${UI.icon("alert", 15)}<div>报价低于底价，已提交 OA 审批；审批通过前不能对外报出，也不会被订单绑定取价。</div></div>` : ""}` : UI.empty("还没有销售报价", "汇总成本与附加费后录入对客报价")}
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>订单绑定</h3><span class="sub">订单价 = 计费最高优先级</span></div>
            <div class="card-bd">
              ${inq.bind ? `<dl class="kv tight"><dt>订单号</dt><dd class="mono">${inq.bind.orderId}</dd><dt>订单价</dt><dd><span class="price-big" style="font-size:16px">${Fmt.num(inq.bind.orderPrice, 2)}</span> <span class="tiny muted">元/kg（锁价）</span></dd><dt>绑定时间</dt><dd>${inq.bind.boundAt}</dd><dt>操作人</dt><dd>${inq.bind.by}</dd></dl>
                <div class="row mt-12"><span class="hint">订单价由 PQM 计算后回写 B2B 订单系统；按当前代码，CCOS 重量勘误会自动重算并覆盖成交价（不校验是否出账），已列入口径风险，是否需要拦截待业务确认。详见 <a href="docs/open-questions.md" target="_blank">问题台账</a>。</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="unbind">解绑</button></div>` : `<div class="row"><span class="hint">尚未绑定订单。有效期内可按客户+产品+品名+货量自动匹配，或手工绑定。</span><span class="spacer"></span><button class="btn btn-soft btn-sm" data-action="bind" ${inq.status !== "已报价" ? "disabled" : ""}>绑定订单</button></div>`}
            </div>
          </section>
        </div>

        <div class="detail-side">
          <section class="card">
            <div class="card-hd"><h3>SLA 与处理</h3></div>
            <div class="card-bd">
              <div class="row"><span class="small">当前节点</span><span class="spacer"></span>${UI.badge(inq.status)}</div>
              <div class="row mt-8"><span class="small">剩余时间</span><span class="spacer"></span><span class="badge ${sla.cls}">${sla.text}</span></div>
              <div class="row mt-8"><span class="small">负责人</span><span class="spacer"></span><span class="small">${UI.esc(inq.owner)}</span></div>
              <div class="divider"></div>
              <div class="stack" style="gap:8px">
                ${actionButtons()}
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>AI 风险提示</h3><div class="right">${UI.badge(inq.aiRisk.level, inq.aiRisk.level === "高" ? "b-red" : inq.aiRisk.level === "中" ? "b-amber" : inq.aiRisk.level === "低" ? "b-green" : "b-gray")}</div></div>
            <div class="card-bd">
              <div class="ai-panel"><div class="ai-hd"><span class="spark">${UI.icon("spark", 12)}</span>品名 / 资料识别</div><div class="tiny mt-8" style="line-height:1.75;color:var(--ink-2)">${UI.esc(inq.aiRisk.text)}</div></div>
              <div class="hint mt-8">AI 提示只作参考，不替代港前判断。</div>
            </div>
          </section>

          <section class="card">
            <div class="card-hd"><h3>处理时间线</h3></div>
            <div class="card-bd">
              <div class="timeline">
                ${[...inq.timeline].reverse().map((t, i) => `<div class="tl-item ${i === 0 ? "now" : "done"}"><div class="tl-title">${UI.esc(t.action)}</div><div class="tl-meta">${t.time} · ${UI.esc(t.actor)}</div>${t.note ? `<div class="tl-body">${UI.esc(t.note)}</div>` : ""}</div>`).join("")}
              </div>
            </div>
          </section>
        </div>
      </div>`;
  }

  function actionButtons() {
    if (inq.status === "待成本") return `<button class="btn btn-primary" data-action="cost" style="width:100%">录入成本</button><button class="btn btn-ghost" data-action="comment" style="width:100%">添加处理意见</button>`;
    if (inq.status === "待风控") return `<button class="btn btn-primary" data-action="risk" style="width:100%">确认可承运并录附加费</button><button class="btn btn-ghost" data-action="refuse" style="width:100%">拒绝承运</button>`;
    if (inq.status === "待报价") return `<button class="btn btn-primary" data-action="quote" style="width:100%">录入销售报价</button><button class="btn btn-ghost" data-action="comment" style="width:100%">添加处理意见</button>`;
    if (inq.status === "已报价") return `<button class="btn btn-primary" data-action="bind" style="width:100%">绑定订单</button><button class="btn btn-ghost" data-action="comment" style="width:100%">添加处理意见</button>`;
    if (inq.status === "已绑定") return `<button class="btn btn-ghost" data-action="unbind" style="width:100%">解绑订单</button><button class="btn btn-ghost" data-action="comment" style="width:100%">添加处理意见</button>`;
    if (inq.status === "草稿") return `<button class="btn btn-primary" data-action="submitDraft" style="width:100%">提交询价</button>`;
    if (inq.status === "已失效") return `<button class="btn btn-primary" data-action="copy" style="width:100%">复制为新询价</button>`;
    return "";
  }

  function saveTimeline(action, note) {
    inq.timeline.push({ time: "2026-10-22 20:00", actor: "杨鑫", action, note });
    Store.save();
  }

  function openCost() {
    UI.drawer({
      title: "录入成本 · " + Q.productName(inq.product),
      sub: `${inq.id} · 仅内部可见，成本不进入对客报价单`,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>成本单价<span class="req">*</span></label><div class="input-group"><input class="input" id="icUnit" type="number" step="0.01" value="13.50"><span class="unit">元/kg</span></div></div>
          <div class="field"><label>适用范围</label><input class="input" id="icScope" value="美国海派卡派，含尾程"></div>
          <div class="field"><label>成本有效期</label><select class="select" id="icValid"><option>7 天</option><option>15 天</option><option>30 天</option></select></div>
          <div class="field"><label>信息来源</label><select class="select"><option>纵队核算</option><option>供应商报价</option><option>历史成本</option></select></div>
          <div class="field span-2"><label>备注</label><textarea class="textarea" id="icNote" placeholder="如 含拖车、不含目的港杂费"></textarea></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>成本只用于内部核算，销售与客户侧不可见；成本低于底价不阻断，但报价低于底价会触发审批。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存并流转</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const unit = parseFloat(UI.val("icUnit"));
          if (!unit) return UI.toast("请填写成本单价", "err");
          inq.cost = { unit, scope: UI.val("icScope"), note: UI.val("icNote"), by: "王强", at: "2026-10-22 20:00" };
          inq.status = "待风控";
          saveTimeline("录入成本", `成本 ${unit} 元/kg；${UI.val("icScope")}`);
          Store.save(); Store.log("询价管理", "录入成本", inq.id, unit + " 元/kg");
          close(); UI.toast("成本已保存，流转至待风控"); refresh();
        };
      }
    });
  }

  function openRisk() {
    UI.drawer({
      title: "港前确认 · " + inq.id,
      sub: "可承运性、限制条件与附加费",
      body: `<div class="stack">
        <div class="field"><label>可承运性</label><label class="switch"><input type="checkbox" id="irOk" checked><span class="track"></span><span class="sw-label">确认可承运</span></label></div>
        <div class="field"><label>限制条件 / 处理意见</label><textarea class="textarea" id="irNote" placeholder="如 普货可承运；需确认是否含电池">普货可承运；已核对品名，无敏感词。</textarea></div>
        <div class="divider"></div>
        <div class="row"><strong class="small">附加费</strong><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="irAdd">${UI.icon("plus", 12)} 添加</button></div>
        <div id="irRows">
          <div class="box-row" style="grid-template-columns:1.4fr 1fr 1fr 34px"><div class="field"><label>费用项</label><select class="select irFee"><option>FUEL</option><option>REMOTE</option><option>RESIDENTIAL</option><option>OVERSIZE</option></select></div><div class="field"><label>金额/比例</label><input class="input irVal" value="12%"></div><div class="field"><label>说明</label><input class="input irNote" placeholder="如 按基础运费"></div><button class="btn-icon" data-del>${UI.icon("x", 13)}</button></div>
        </div>
        <div class="banner">${UI.icon("info", 15)}<div>附加费结果回写询价单，销售可见；最终计费仍按杂费模版与客户减免计算。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存并流转</button>`,
      onMount(el, close) {
        const addRow = () => {
          const row = document.createElement("div");
          row.className = "box-row";
          row.style.gridTemplateColumns = "1.4fr 1fr 1fr 34px";
          row.innerHTML = `<div class="field"><label>费用项</label><select class="select irFee"><option>FUEL</option><option>REMOTE</option><option>RESIDENTIAL</option><option>OVERSIZE</option></select></div><div class="field"><label>金额/比例</label><input class="input irVal"></div><div class="field"><label>说明</label><input class="input irNote"></div><button class="btn-icon" data-del>${UI.icon("x", 13)}</button>`;
          row.querySelector("[data-del]").onclick = () => row.remove();
          el.querySelector("#irRows").appendChild(row);
        };
        el.querySelector("#irAdd").onclick = addRow;
        el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => b.closest(".box-row").remove());
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const surcharges = [...el.querySelectorAll("#irRows .box-row")].map(r => ({
            fee: r.querySelector(".irFee")?.value, value: r.querySelector(".irVal")?.value, note: r.querySelector(".irNote")?.value
          })).filter(x => x.value);
          inq.risk = { ok: el.querySelector("#irOk").checked, note: UI.val("irNote"), surcharges, by: "赵敏", at: "2026-10-22 20:00" };
          inq.status = "待报价";
          saveTimeline("确认可承运", UI.val("irNote") + (surcharges.length ? "；附加费 " + surcharges.map(s => Q.feeName(s.fee) + " " + s.value).join("、") : ""));
          Store.save(); Store.log("询价管理", "确认可承运", inq.id, UI.val("irNote"));
          close(); UI.toast("风控已确认，流转至待报价"); refresh();
        };
      }
    });
  }

  function openQuote() {
    const base = Q.basePrice(inq.product, inq.country);
    UI.drawer({
      title: "录入销售报价 · " + inq.id,
      sub: base ? `产品底价 ${Fmt.num(base.price, 2)} 元/kg（内部可见）` : "该产品暂无生效底价",
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>报价方式</label><select class="select" id="iqMode"><option>单价</option><option>总价</option></select></div>
          <div class="field"><label>对客报价<span class="req">*</span></label><div class="input-group"><input class="input" id="iqPrice" type="number" step="0.01" value="16.20"><span class="unit">元/kg</span></div></div>
          <div class="field"><label>有效期</label><select class="select" id="iqDays"><option>7 天</option><option>10 天</option><option>14 天</option></select></div>
          <div class="field"><label>是否含附加费</label><select class="select" id="iqIncl"><option>含燃油，不含住宅/偏远</option><option>含全部可算附加费</option><option>不含附加费</option></select></div>
          <div class="field span-2"><label>报价说明</label><textarea class="textarea" id="iqNote" placeholder="对客可见的报价条件">含燃油，不含住宅附加费。</textarea></div>
        </div>
        <div id="iqCheck"></div>
        <div class="banner">${UI.icon("info", 15)}<div>报价低于底价时必须审批；审批通过前不得对外报出，已接受的历史报价不被覆盖。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存报价</button>`,
      onMount(el, close) {
        const priceEl = el.querySelector("#iqPrice");
        const check = () => {
          const v = parseFloat(priceEl.value);
          const box = el.querySelector("#iqCheck");
          if (!v || !base) { box.innerHTML = `<div class="banner warn">${UI.icon("alert", 15)}<div>该产品/国家暂无生效底价，报价将按“无底价校验”记录，需人工确认。</div></div>`; return; }
          if (v < base.price) {
            box.innerHTML = `<div class="banner danger">${UI.icon("alert", 15)}<div><b>低于底价 ${(base.price - v).toFixed(2)} 元/kg。</b>保存后进入 OA 审批，审批通过前不能对外报出。</div></div>`;
            priceEl.classList.add("err");
          } else {
            box.innerHTML = `<div class="banner success">${UI.icon("checkCircle", 15)}<div>高于底价 ${(v - base.price).toFixed(2)} 元/kg，可正常报价。</div></div>`;
            priceEl.classList.remove("err");
          }
        };
        priceEl.addEventListener("input", check); check();
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const v = parseFloat(priceEl.value);
          if (!v) return UI.toast("请填写报价", "err");
          const below = base && v < base.price;
          let oa = "";
          if (below) {
            oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
            Store.add("approvals", { id: oa, type: "询价报价", title: inq.id + " 报价低于底价", object: `${inq.customer} / ${inq.product}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "销售总监", oldVal: base.price + " 元/kg（底价）", newVal: v + " 元/kg", reason: "询价对客报价低于底价", impact: "审批通过前不可对外报出，不可绑定订单取价" });
          }
          inq.quote = { mode: UI.val("iqMode"), price: v, validDays: parseInt(UI.val("iqDays")), note: UI.val("iqNote"), by: "张伟", at: "2026-10-22 20:00", belowBase: !!below, approval: oa };
          if (!below) inq.status = "已报价";
          inq.validUntil = "2026-10-29";
          saveTimeline(below ? "提交报价审批" : "录入销售报价", `${v} 元/kg，${UI.val("iqDays")}；${UI.val("iqNote")}${below ? "；" + oa : ""}`);
          Store.save(); Store.log("询价管理", below ? "报价低于底价" : "录入销售报价", inq.id, v + " 元/kg");
          close(); UI.toast(below ? "报价低于底价，已提交审批" : "报价已保存"); refresh();
        };
      }
    });
  }

  function openBind() {
    const candidates = Store.list("orders").filter(o => o.customer === inq.customer && o.product === inq.product);
    UI.modal({
      title: "绑定订单 · " + inq.id,
      size: "lg",
      body: `<div class="stack">
        <div class="banner info">${UI.icon("info", 15)}<div>匹配条件：客户代码 + 销售产品 + 品名 + 货量，在报价有效期内单一明确命中才允许绑定。</div></div>
        ${candidates.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th class="num">订单价</th><th>状态</th><th>选择</th></tr></thead>
          <tbody>${candidates.map(o => `<tr><td class="mono">${o.id}</td><td>${Q.customerName(o.customer)}</td><td>${Q.productName(o.product)}</td><td class="num price-cell">${Fmt.num(o.price, 2)}</td><td>${UI.badge(o.status, o.status === "已锁价" ? "b-green" : "b-amber")}</td><td><input type="radio" name="bindOrder" value="${o.id}" ${o.id === "ORD20261020003" ? "checked" : ""}></td></tr>`).join("")}</tbody></table></div>
          <div class="banner warn">${UI.icon("alert", 15)}<div>绑定后订单价按本次报价锁定；但 CCOS 重量勘误（1003）会自动重算并覆盖成交价，不校验是否已出账——这是已识别的口径风险。</div></div>`
        : `<div class="banner danger">${UI.icon("alert", 15)}<div>没有可绑定的订单，请先在 OMS/B2B 订单系统创建订单。</div></div>`}
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="bindSave" ${candidates.length ? "" : "disabled"}>确认绑定</button>`,
      onMount(el, close) {
        const btn = el.querySelector("#bindSave");
        if (!btn) return;
        btn.onclick = () => {
          const sel = el.querySelector("input[name=bindOrder]:checked");
          if (!sel) return UI.toast("请选择订单", "err");
          const order = Store.find("orders", sel.value);
          inq.bind = { orderId: order.id, orderPrice: inq.quote.price, boundAt: "2026-10-22 20:00", by: "张伟" };
          inq.status = "已绑定";
          order.status = "已锁价"; order.price = inq.quote.price; order.inquiry = inq.id;
          saveTimeline("绑定订单", order.id + "，订单价 " + inq.quote.price + " 元/kg 锁价");
          Store.save(); Store.log("询价管理", "绑定订单", inq.id, order.id + "，订单价 " + inq.quote.price);
          close(); UI.toast("订单已绑定，订单价锁定"); refresh();
        };
      }
    });
  }

  function openUnbind() {
    UI.modal({
      title: "解绑订单",
      size: "sm",
      body: `<div class="field"><label>解绑原因<span class="req">*</span></label><textarea class="textarea" id="ubReason" placeholder="如 客户取消订单 / 订单信息错误"></textarea></div>
        <div class="banner warn mt-12">${UI.icon("alert", 15)}<div>解绑后订单价失效，后续计费回落客户套餐/公布价；已计费账单不回溯。</div></div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-danger-solid" id="ubSave">确认解绑</button>`,
      onMount(el, close) {
        el.querySelector("#ubSave").onclick = () => {
          const reason = UI.val("ubReason");
          if (!reason) return UI.toast("请填写解绑原因", "err");
          const order = Store.find("orders", inq.bind.orderId);
          if (order) { order.status = "待锁价"; order.inquiry = ""; }
          saveTimeline("解绑订单", inq.bind.orderId + "；" + reason);
          inq.bind = null; inq.status = "已报价";
          Store.save(); Store.log("询价管理", "解绑订单", inq.id, reason);
          close(); UI.toast("已解绑，询价回到已报价"); refresh();
        };
      }
    });
  }

  function submitDraft() {
    inq.status = "待成本";
    inq.slaDue = "2026-10-23 04:00";
    inq.owner = "王强";
    saveTimeline("提交询价", "草稿提交，进入待成本");
    Store.save(); Store.log("询价管理", "提交询价", inq.id, "草稿提交");
    UI.toast("已提交，进入待成本"); refresh();
  }

  function addComment() {
    UI.modal({
      title: "添加处理意见",
      size: "sm",
      body: `<div class="field"><label>处理意见</label><textarea class="textarea" id="cmText" placeholder="记录与客户的沟通、补充条件等"></textarea></div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="cmSave">保存</button>`,
      onMount(el, close) {
        el.querySelector("#cmSave").onclick = () => {
          if (!UI.val("cmText")) return UI.toast("请填写处理意见", "err");
          saveTimeline("添加处理意见", UI.val("cmText"));
          Store.save(); close(); UI.toast("已添加"); refresh();
        };
      }
    });
  }

  function refresh() {
    inq = Store.find("inquiries", id);
    document.querySelector(".page").innerHTML = build();
    bind();
  }

  function bind() {
    document.querySelectorAll("[data-action]").forEach(b => b.onclick = () => {
      const a = b.dataset.action;
      if (a === "cost") openCost();
      if (a === "risk") openRisk();
      if (a === "quote") openQuote();
      if (a === "bind") openBind();
      if (a === "unbind") openUnbind();
      if (a === "submitDraft") submitDraft();
      if (a === "comment") addComment();
      if (a === "copy") { UI.toast("复制入口在询价列表", "warn"); setTimeout(() => location.href = "inquiry-list.html", 700); }
      if (a === "refuse") UI.toast("拒绝承运：原型演示入口，实际会记录原因并退回销售", "warn");
    });
  }

  UI.shell({ active: "inquiry-list", title: "询价详情", content: build() });
  bind();
})();
