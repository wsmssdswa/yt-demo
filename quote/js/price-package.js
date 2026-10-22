/* 产品价格 · 套餐价 B–E */
(function () {
  let active = "套餐价矩阵";

  const content = `
    ${UI.pageHead({
      title: "套餐价 B–E",
      sub: "基于公布价 A 按价差或折扣生成 B/C/D/E 套餐价，支持按费用项做差异，不只基础运费。",
      actions: `<button class="btn btn-ghost" id="ruleBtn">${UI.icon("sliders", 14)} 价差规则</button>
        <button class="btn btn-primary" id="genBtn">${UI.icon("spark", 14)} 生成套餐价</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>生成规则：</b>套餐价必须高于底价；审批中的套餐不参与取价。A 价变化后可按规则联动生成 B–E，联动前先预览影响范围。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("layers", 14)}</span>套餐矩阵</div><div class="st-val">${Store.list("packages").length}<small>组</small></div><div class="st-ft">覆盖 4 个产品 / 8 个分区</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>生效中</div><div class="st-val">${Store.list("packages").filter(p => p.status === "生效").length}<small>组</small></div><div class="st-ft">全部高于底价</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>审批中</div><div class="st-val">${Store.list("packages").filter(p => p.status === "审批中").length}<small>组</small></div><div class="st-ft">P001 Z1 套餐 D 调整待审</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("percent", 14)}</span>平均折扣</div><div class="st-val">8.5<small>%</small></div><div class="st-ft">E 套餐相对 A 价</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="pkgTabs">
        ${["套餐价矩阵", "价差规则"].map(t => `<a class="tab ${t === active ? "active" : ""}" href="javascript:void(0)" data-t="${t}">${t}</a>`).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>产品</label><select class="select" id="product"><option value="">全部</option>${UI.options(Store.list("products"), "code", "name", "")}</select></div>
        <div class="field"><label>分区</label><select class="select" id="zone"><option value="">全部</option>${[...new Set(Store.list("packages").map(p => p.zone))].map(z => `<option>${z}</option>`).join("")}</select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="pkgBody"></div>
    </section>`;

  function filtered() {
    const p = document.getElementById("product").value;
    const z = document.getElementById("zone").value;
    return Store.list("packages").filter(x => (!p || x.product === p) && (!z || x.zone === z));
  }

  function renderMatrix() {
    const rows = filtered();
    document.getElementById("pkgBody").innerHTML = `
      <div class="price-matrix-wrap"><table class="price-matrix">
        <thead><tr><th>产品 / 分区</th><th class="col-a">A 公布价</th><th>B</th><th>C</th><th>D</th><th class="col-e">E</th><th>底价</th><th>状态</th><th>版本</th><th>操作</th></tr></thead>
        <tbody>${rows.map(r => `<tr data-id="${r.id}">
          <td><div class="t-main">${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.country} · ${UI.esc(r.zone)}</div></td>
          <td class="col-a price-cell">${Fmt.num(r.A, 2)}</td>
          <td class="price-cell">${Fmt.num(r.B, 2)}</td>
          <td class="price-cell">${Fmt.num(r.C, 2)}</td>
          <td class="price-cell ${r.D < r.base ? "red" : ""}">${Fmt.num(r.D, 2)}</td>
          <td class="col-e price-cell">${Fmt.num(r.E, 2)}</td>
          <td><span class="muted">${Fmt.num(r.base, 2)}</span></td>
          <td>${UI.badge(r.status)}</td>
          <td class="mono">${r.version}</td>
          <td><button class="btn-text" data-view="${r.id}">明细</button></td>
        </tr>`).join("")}</tbody>
      </table></div>
      <div class="pager"><span class="info">共 ${rows.length} 组 · 价格单位：元/kg</span><span class="legend"><span><i style="background:#FBF8EE"></i>A 价</span><span><i style="background:#F0FBF9"></i>E 套餐</span></span></div>`;
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#pkgBody tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function renderRules() {
    const rows = filtered();
    document.getElementById("pkgBody").innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>产品 / 分区</th><th>规则</th><th class="num">A</th><th class="num">B</th><th class="num">C</th><th class="num">D</th><th class="num">E</th><th>底价校验</th><th>操作</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td><div class="t-main">${UI.esc(Q.productName(r.product))}</div><div class="t-sub">${r.zone}</div></td>
          <td><span class="badge b-outline no-dot">${UI.esc(r.rule)}</span></td>
          <td class="num price-cell">${Fmt.num(r.A, 2)}</td>
          <td class="num">${Fmt.num(r.B, 2)}</td>
          <td class="num">${Fmt.num(r.C, 2)}</td>
          <td class="num">${Fmt.num(r.D, 2)}</td>
          <td class="num">${Fmt.num(r.E, 2)}</td>
          <td>${r.E > r.base ? UI.badge("通过") : UI.badge("低于底价", "b-red")}</td>
          <td><button class="btn-text" data-rule="${r.id}">编辑规则</button></td>
        </tr>`).join("")}</tbody></table></div>`;
    document.querySelectorAll("[data-rule]").forEach(b => b.onclick = () => openRule(b.dataset.rule));
  }

  function render() { active === "价差规则" ? renderRules() : renderMatrix(); }

  function openView(id) {
    const p = Store.find("packages", id);
    const bindCount = Store.list("custBindings").filter(b => b.product === p.product && b.status === "生效").length;
    UI.drawer({
      title: Q.productName(p.product) + " · " + p.zone,
      sub: `${p.id} · 版本 ${p.version} · ${p.rule}`,
      body: `<div class="stack">
        <div class="price-matrix-wrap"><table class="price-matrix">
          <thead><tr><th>层级</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr></thead>
          <tbody><tr><td>单价（元/kg）</td><td class="col-a">${Fmt.num(p.A, 2)}</td><td>${Fmt.num(p.B, 2)}</td><td>${Fmt.num(p.C, 2)}</td><td>${Fmt.num(p.D, 2)}</td><td class="col-e">${Fmt.num(p.E, 2)}</td></tr>
          <tr><td>相对 A 折扣</td><td>—</td><td>${((1 - p.B / p.A) * 100).toFixed(1)}%</td><td>${((1 - p.C / p.A) * 100).toFixed(1)}%</td><td>${((1 - p.D / p.A) * 100).toFixed(1)}%</td><td>${((1 - p.E / p.A) * 100).toFixed(1)}%</td></tr></tbody>
        </table></div>
        <dl class="kv">
          <dt>底价</dt><dd>${Fmt.num(p.base, 2)} 元/kg</dd>
          <dt>最低套餐</dt><dd>E ${Fmt.num(p.E, 2)} 元/kg，高于底价 ${Fmt.num(p.E - p.base, 2)} 元/kg</dd>
          <dt>已绑定客户</dt><dd>${bindCount} 家</dd>
          <dt>状态</dt><dd>${UI.badge(p.status)}</dd>
        </dl>
        <div class="section-title">逐费用项差异（示例）</div>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>费用项</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr></thead><tbody>
          <tr><td>基础运费</td><td>${Fmt.num(p.A, 2)}</td><td>${Fmt.num(p.B, 2)}</td><td>${Fmt.num(p.C, 2)}</td><td>${Fmt.num(p.D, 2)}</td><td>${Fmt.num(p.E, 2)}</td></tr>
          <tr><td>燃油附加费</td><td>12%</td><td>12%</td><td>11%</td><td>11%</td><td>10%</td></tr>
          <tr><td>偏远附加费</td><td>350 元/票</td><td>350</td><td>330</td><td>330</td><td>300</td></tr>
        </tbody></table></div>
        <div class="banner">${UI.icon("info", 15)}<div>套餐价按费用项可不同；未单独配置的费用项默认沿用公布价。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div><button class="btn btn-soft" data-rule>编辑价差规则</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-rule]").onclick = () => { close(); openRule(p.id); };
      }
    });
  }

  function openRule(id) {
    const p = Store.find("packages", id);
    UI.drawer({
      title: "价差规则 · " + Q.productName(p.product),
      sub: `${p.zone} · 当前 A ${Fmt.num(p.A, 2)} 元/kg`,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>基准价</label><input class="input" value="公布价 A" disabled></div>
          <div class="field"><label>规则类型</label><select class="select" id="prMode"><option>固定价差</option><option>百分比折扣</option><option>按费用项差异</option></select></div>
        </div>
        <div class="section-title">每层价差 / 折扣</div>
        <div class="form-grid cols-3">
          <div class="field"><label>B 价差</label><input class="input" id="prB" type="number" step="0.01" value="${(p.A - p.B).toFixed(2)}"></div>
          <div class="field"><label>C 价差</label><input class="input" id="prC" type="number" step="0.01" value="${(p.A - p.C).toFixed(2)}"></div>
          <div class="field"><label>D 价差</label><input class="input" id="prD" type="number" step="0.01" value="${(p.A - p.D).toFixed(2)}"></div>
          <div class="field"><label>E 价差</label><input class="input" id="prE" type="number" step="0.01" value="${(p.A - p.E).toFixed(2)}"></div>
          <div class="field"><label>最低收费</label><input class="input" value="20 元/票" disabled></div>
          <div class="field"><label>生效方式</label><select class="select"><option>审批后生效</option><option>立即生效</option></select></div>
        </div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>保存规则只生成草稿，需重新生成套餐价并审批后才生效；已绑定客户在生效前仍按原套餐价取价。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存草稿</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          Store.log("产品价格", "更新价差规则", Q.productName(p.product), p.zone + " 套餐价差规则草稿");
          close(); UI.toast("价差规则草稿已保存"); render();
        };
      }
    });
  }

  function openGen() {
    const first = Store.list("packages")[0];
    UI.modal({
      title: "生成套餐价",
      size: "lg",
      body: `<div class="stack">
        <div class="form-grid cols-3">
          <div class="field"><label>产品</label><select class="select" id="gpProduct">${UI.options(Store.list("products").slice(0, 6), "code", "name", first.product)}</select></div>
          <div class="field"><label>分区</label><input class="input" id="gpZone" value="${first.zone}"></div>
          <div class="field"><label>公布价 A</label><input class="input" id="gpA" type="number" step="0.01" value="${first.A}"></div>
        </div>
        <div class="form-grid cols-3">
          <div class="field"><label>B 价差</label><input class="input gpD" data-k="B" type="number" step="0.01" value="0.70"></div>
          <div class="field"><label>C 价差</label><input class="input gpD" data-k="C" type="number" step="0.01" value="1.50"></div>
          <div class="field"><label>D 价差</label><input class="input gpD" data-k="D" type="number" step="0.01" value="2.30"></div>
          <div class="field"><label>E 价差</label><input class="input gpD" data-k="E" type="number" step="0.01" value="3.10"></div>
          <div class="field"><label>底价校验</label><input class="input" value="自动校验" disabled></div>
          <div class="field"><label>生成方式</label><select class="select"><option>按产品/分区单条</option><option>批量按国家</option></select></div>
        </div>
        <div id="gpPreview"></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="gpSubmit">生成并提交审批</button>`,
      onMount(el, close) {
        const draw = () => {
          const A = parseFloat(el.querySelector("#gpA").value) || 0;
          const vals = {};
          el.querySelectorAll(".gpD").forEach(i => vals[i.dataset.k] = +(A - parseFloat(i.value || 0)).toFixed(2));
          el.querySelector("#gpPreview").innerHTML = `<div class="price-matrix-wrap"><table class="price-matrix"><thead><tr><th>层级</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr></thead><tbody><tr><td>生成结果</td><td class="col-a">${A.toFixed(2)}</td><td>${vals.B.toFixed(2)}</td><td>${vals.C.toFixed(2)}</td><td>${vals.D.toFixed(2)}</td><td class="col-e">${vals.E.toFixed(2)}</td></tr></tbody></table></div>`;
        };
        el.querySelectorAll("#gpA, .gpD").forEach(i => i.addEventListener("input", draw));
        draw();
        el.querySelector("#gpSubmit").onclick = () => {
          const A = parseFloat(el.querySelector("#gpA").value);
          const oa = "OA-2026-1022-" + String(Store.list("approvals").length + 1).padStart(2, "0");
          Store.add("approvals", { id: oa, type: "套餐价", title: Q.productName(UI.val("gpProduct")) + " 套餐价生成", object: `${UI.val("gpProduct")} / ${UI.val("gpZone")}`, applicant: "杨鑫", submittedAt: "2026-10-22 20:00", status: "审批中", approver: "价格委员会", oldVal: "—", newVal: "A " + A + " 元/kg", reason: "按价差规则生成 B–E", impact: "影响该分区套餐价与客户取价" });
          Store.log("产品价格", "生成套餐价", Q.productName(UI.val("gpProduct")), "A " + A + " 元/kg，提交 " + oa);
          close(); UI.toast("套餐价已生成并提交审批"); render();
        };
      }
    });
  }

  UI.shell({ active: "price-package", title: "套餐价 B–E", content });
  render();
  document.querySelectorAll("#pkgTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#pkgTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.t; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { document.getElementById("product").value = ""; document.getElementById("zone").value = ""; render(); };
  document.getElementById("genBtn").onclick = openGen;
  document.getElementById("ruleBtn").onclick = () => {
    active = "价差规则";
    document.querySelectorAll("#pkgTabs .tab").forEach(x => x.classList.toggle("active", x.dataset.t === active));
    render();
  };
})();
