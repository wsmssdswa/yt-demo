/* 询价管理 · 路由与时效 */
(function () {
  let active = "路由规则";

  const content = `
    ${UI.pageHead({
      title: "路由与时效配置",
      sub: "按产品+国家配置纵队/港前责任人；各环节时限与超时升级可配，超时推送飞书待办。",
      actions: `<button class="btn btn-primary" id="addRoute">${UI.icon("plus", 14)} 新增路由</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>路由口径：</b>新询价按产品+国家自动分派；无匹配配置时进入公共池，由销售主管手工指派。责任人变更不影响已发起询价。</div>
    </div>

    <section class="card">
      <div class="tabs" id="cfgTabs">
        ${["路由规则", "时效配置", "飞书提醒"].map(t => `<a class="tab ${t === active ? "active" : ""}" href="javascript:void(0)" data-t="${t}">${t}</a>`).join("")}
      </div>
      <div id="cfgBody"></div>
    </section>`;

  function renderRoutes() {
    document.getElementById("cfgBody").innerHTML = `<div id="routeTable"></div>`;
    document.getElementById("routeTable").innerHTML = UI.table({
      columns: [
        { label: "产品", width: "24%", render: r => `<div class="t-main">${Q.productName(r.product)}</div><div class="t-sub">${r.product} · ${r.country}</div>` },
        { label: "纵队", width: "16%", render: r => `${r.column}<div class="t-sub">${r.owner}</div>` },
        { label: "口岸", width: "16%", render: r => `${r.port}<div class="t-sub">${r.portOwner}</div>` },
        { label: "状态", width: "9%", render: r => UI.badge(r.status) },
        { label: "影响询价", width: "22%", render: r => `<span class="tiny muted">${Store.list("inquiries").filter(i => i.product === r.product && i.country === r.country && ["待成本", "待风控", "待报价"].includes(i.status)).length} 条进行中</span>` },
        { label: "操作", width: "13%", render: r => `<div class="actions"><button class="btn-text" data-route="${r.id}">编辑</button><button class="btn-text" data-route-toggle="${r.id}">${r.status === "启用" ? "停用" : "启用"}</button></div>` }
      ],
      rows: Store.list("routes"), rowAttrs: r => `data-id="${r.id}"`, empty: "暂无路由规则"
    });
    document.querySelectorAll("[data-route]").forEach(b => b.onclick = () => openRoute(b.dataset.route));
    document.querySelectorAll("[data-route-toggle]").forEach(b => b.onclick = () => {
      const r = Store.find("routes", b.dataset.routeToggle);
      Store.update("routes", r.id, { status: r.status === "启用" ? "停用" : "启用" });
      Store.log("询价管理", "变更路由状态", r.id, Q.productName(r.product) + " → " + (r.status === "启用" ? "启用" : "停用"));
      UI.toast("路由状态已更新"); renderRoutes();
    });
  }

  function renderSla() {
    document.getElementById("cfgBody").innerHTML = `
      <div class="table-wrap"><table class="table"><thead><tr><th>环节</th><th>时限</th><th>超时升级</th><th>提醒方式</th><th>操作</th></tr></thead>
        <tbody>${Store.list("slaConfig").map((s, i) => `<tr>
          <td class="t-main">${s.stage}</td><td><span class="badge b-amber no-dot">${s.limit}</span></td><td>${UI.esc(s.escalate)}</td><td>${UI.esc(s.remind)}</td>
          <td><button class="btn-text" data-sla="${i}">编辑</button></td>
        </tr>`).join("")}</tbody></table></div>
      <div class="card-bd"><div class="banner">${UI.icon("info", 15)}<div>时效按自然小时计算，跨天不暂停；超时只提醒，不自动改状态。实际耗时与超时次数记录在询价单。</div></div></div>`;
    document.querySelectorAll("[data-sla]").forEach(b => b.onclick = () => {
      const s = Store.list("slaConfig")[+b.dataset.sla];
      UI.modal({
        title: "编辑时效 · " + s.stage,
        size: "sm",
        body: `<div class="form-grid">
          <div class="field"><label>时限</label><input class="input" id="slaLimit" value="${UI.esc(s.limit)}"></div>
          <div class="field"><label>提醒方式</label><input class="input" id="slaRemind" value="${UI.esc(s.remind)}"></div>
          <div class="field span-2"><label>超时升级</label><input class="input" id="slaEsc" value="${UI.esc(s.escalate)}"></div>
        </div>`,
        footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="slaSave">保存</button>`,
        onMount(el, close) {
          el.querySelector("#slaSave").onclick = () => {
            Store.update("slaConfig", s.stage, { limit: UI.val("slaLimit"), remind: UI.val("slaRemind"), escalate: UI.val("slaEsc") });
            Store.log("询价管理", "更新时效", s.stage, UI.val("slaLimit"));
            close(); UI.toast("时效已保存"); renderSla();
          };
        }
      });
    });
  }

  function renderRemind() {
    document.getElementById("cfgBody").innerHTML = `<div class="card-bd">
      <div class="split">
        <div class="stack">
          <div class="section-title">提醒渠道</div>
          ${[
            { k: "feishu", t: "飞书待办", d: "各环节临期/超时生成待办，去重后 @ 责任人", on: true },
            { k: "group", t: "群提醒", d: "超时 2 小时升级到纵队/口岸群", on: true },
            { k: "wecom", t: "企业微信", d: "仅报价超时提醒销售主管", on: false }
          ].map(c => `<div class="row" style="padding:10px 0;border-bottom:1px solid #EDF2F2">
            <div><div class="small strong">${c.t}</div><div class="tiny muted mt-4">${c.d}</div></div>
            <span class="spacer"></span>
            <label class="switch"><input type="checkbox" class="remCh" data-k="${c.k}" ${c.on ? "checked" : ""}><span class="track"></span></label>
          </div>`).join("")}
        </div>
        <div class="stack">
          <div class="section-title">消息预览</div>
          <div class="card" style="box-shadow:none">
            <div class="card-bd">
              <div class="small strong">【询价待办】INQ20261022001 待成本</div>
              <div class="tiny muted mt-8" style="line-height:1.8">客户：凯琦 / 美国海派卡派<br>货量：1200 kg / 8.6 m³<br>责任人：王强<br>SLA：剩余 3 小时，请及时处理。</div>
              <div class="row mt-12"><span class="badge b-amber">待成本</span><span class="badge b-outline">飞书待办</span></div>
            </div>
          </div>
          <div class="hint">消息不替代询价单状态；发送失败记录在系统日志，可在消息中心重试。</div>
        </div>
      </div>
    </div>`;
  }

  function render() {
    active === "路由规则" ? renderRoutes() : active === "时效配置" ? renderSla() : renderRemind();
  }

  function openRoute(id) {
    const r = id ? Store.find("routes", id) : null;
    UI.drawer({
      title: r ? "编辑路由规则" : "新增路由规则",
      sub: "按产品 + 国家唯一；同一组合只允许一条启用规则",
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>产品<span class="req">*</span></label><select class="select" id="nrProduct" ${r ? "disabled" : ""}>${UI.options(Store.list("products"), "code", "name", r ? r.product : "")}</select></div>
          <div class="field"><label>国家<span class="req">*</span></label><select class="select" id="nrCountry" ${r ? "disabled" : ""}><option value="US" ${r && r.country === "US" ? "selected" : ""}>美国</option><option value="DE" ${r && r.country === "DE" ? "selected" : ""}>德国</option><option value="GB" ${r && r.country === "GB" ? "selected" : ""}>英国</option><option value="CA" ${r && r.country === "CA" ? "selected" : ""}>加拿大</option></select></div>
          <div class="field"><label>纵队<span class="req">*</span></label><select class="select" id="nrColumn">${["美线纵队", "欧线纵队", "整柜纵队"].map(c => `<option ${r && r.column === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>纵队负责人<span class="req">*</span></label><select class="select" id="nrOwner">${["王强", "刘洋"].map(o => `<option ${r && r.owner === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
          <div class="field"><label>口岸<span class="req">*</span></label><select class="select" id="nrPort">${["深圳口岸", "宁波口岸", "上海口岸", "广州口岸"].map(p => `<option ${r && r.port === p ? "selected" : ""}>${p}</option>`).join("")}</select></div>
          <div class="field"><label>港前负责人<span class="req">*</span></label><select class="select" id="nrPortOwner"><option ${r && r.portOwner === "赵敏" ? "selected" : ""}>赵敏</option></select></div>
          <div class="field"><label>状态</label><select class="select" id="nrStatus"><option ${r && r.status === "启用" ? "selected" : ""}>启用</option><option ${r && r.status === "停用" ? "selected" : ""}>停用</option></select></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>停用路由后，新询价进入公共池；已在途询价的负责人不变。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          const data = { product: UI.val("nrProduct"), country: UI.val("nrCountry"), column: UI.val("nrColumn"), owner: UI.val("nrOwner"), port: UI.val("nrPort"), portOwner: UI.val("nrPortOwner"), status: UI.val("nrStatus") };
          if (r) Store.update("routes", r.id, data);
          else Store.add("routes", { id: "RT" + String(Store.list("routes").length + 1).padStart(2, "0"), ...data });
          Store.log("询价管理", r ? "更新路由" : "新增路由", data.product + "/" + data.country, data.column + " / " + data.owner);
          close(); UI.toast("路由已保存"); renderRoutes();
        };
      }
    });
  }

  UI.shell({ active: "inquiry-config", title: "路由与时效", content });
  render();
  document.querySelectorAll("#cfgTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#cfgTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.t; render();
  });
  document.getElementById("addRoute").onclick = () => {
    if (active !== "路由规则") { active = "路由规则"; document.querySelectorAll("#cfgTabs .tab").forEach(x => x.classList.toggle("active", x.dataset.t === active)); render(); }
    openRoute(null);
  };
})();
