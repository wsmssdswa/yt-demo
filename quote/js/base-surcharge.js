/* 基础配置 · 杂费模版 */
(function () {
  const content = `
    ${UI.pageHead({
      title: "杂费模版",
      sub: "配置附加费的适用条件、单价/比例、计费单位与最低收费，并表达叠加、取高、互斥关系。",
      actions: `<button class="btn btn-primary" id="addBtn">${UI.icon("plus", 14)} 新建附加费组</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>与费用项的分工：</b>SYS 费用项只定义“有哪些费”；本页定义“这笔费怎么算、跟谁叠加、最低收多少”。人工加收项（报关、查验）保留标准说明，不配底价。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("percent", 14)}</span>附加费组</div><div class="st-val">${Store.list("surcharges").length}<small>组</small></div><div class="st-ft">美国海派 / 欧洲海派 / 美森快船</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("layers", 14)}</span>费用规则</div><div class="st-val">${Store.list("surcharges").reduce((s, x) => s + x.items.length, 0)}<small>条</small></div><div class="st-ft">叠加 7 · 取高 2 · 互斥 1</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("tag", 14)}</span>引用产品</div><div class="st-val">6<small>个</small></div><div class="st-ft">P001 / P002 / P003 / P006</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>最近变更</div><div class="st-val" style="font-size:18px;letter-spacing:0">10-20 16:00</div><div class="st-ft">美国旺季附加费 1.20 元/kg（11-12 月）</div></div>
    </div>

    <section class="card mt-16">
      <div class="table-toolbar"><span class="count">附加费组</span><span class="spacer"></span><span class="tiny muted">规则按优先顺序执行；同一费用项不可重复配置</span></div>
      <div id="surTable"></div>
    </section>`;

  function render() {
    document.getElementById("surTable").innerHTML = UI.table({
      columns: [
        { label: "附加费组", width: "24%", render: (r) => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub">${r.id} · 版本 ${r.version}</div>` },
        { label: "适用产品", width: "18%", render: (r) => `${Q.productName(r.product)}<div class="t-sub">${r.product}</div>` },
        { label: "费用项", width: "32%", render: (r) => `<div class="row wrap" style="gap:5px">${r.items.map(i => `<span class="badge b-outline no-dot">${UI.esc(Q.feeName(i.fee))}</span>`).join("")}</div>` },
        { label: "引用", width: "6%", align: "right", render: (r) => `<span class="price-cell">${r.refs}</span>` },
        { label: "状态", width: "7%", render: (r) => UI.badge(r.status) },
        { label: "更新", width: "8%", render: (r) => `<span class="tiny muted">${r.updated}</span>` },
        { label: "操作", width: "9%", render: (r) => `<div class="actions"><button class="btn-text" data-view="${r.id}">配置</button></div>` }
      ],
      rows: Store.list("surcharges"), rowAttrs: (r) => `data-id="${r.id}"`, empty: "暂无附加费组"
    });
    document.querySelectorAll("[data-view]").forEach(b => b.onclick = (e) => { e.stopPropagation(); openView(b.dataset.view); });
    document.querySelectorAll("#surTable tbody tr[data-id]").forEach(tr => tr.onclick = () => openView(tr.dataset.id));
  }

  function openView(id) {
    const s = Store.find("surcharges", id);
    UI.drawer({
      title: s.name,
      sub: `${s.id} · 适用 ${Q.productName(s.product)} · 版本 ${s.version}`,
      wide: true,
      body: `<div class="stack">
        <div class="row"><span class="badge b-teal">${s.items.length} 条规则</span><span class="badge b-outline">被 ${s.refs} 个价格引用</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="addItem">${UI.icon("plus", 12)} 新增费用规则</button></div>
        <div class="table-wrap"><table class="table compact" id="surEditTable"><thead><tr><th>费用项</th><th>计费方式</th><th>价格/比例</th><th>基数</th><th>最低收费</th><th>关系</th></tr></thead><tbody>
          ${s.items.map((i, idx) => `<tr>
            <td class="t-main">${UI.esc(Q.feeName(i.fee))}</td>
            <td><select class="select sm" data-f="mode" data-i="${idx}">${["比例", "固定", "按重"].map(x => `<option ${x === i.mode ? "selected" : ""}>${x}</option>`).join("")}</select></td>
            <td><input class="input sm" data-f="value" data-i="${idx}" value="${UI.esc(i.value)}"></td>
            <td><input class="input sm" data-f="base" data-i="${idx}" value="${UI.esc(i.base)}"></td>
            <td><input class="input sm" data-f="min" data-i="${idx}" value="${UI.esc(i.min)}"></td>
            <td><select class="select sm" data-f="stack" data-i="${idx}">${["叠加", "取高（与住宅）", "取高（与偏远）", "互斥（住宅）"].map(x => `<option ${x === i.stack ? "selected" : ""}>${x}</option>`).join("")}</select></td>
          </tr>`).join("")}
        </tbody></table></div>
        <div class="banner">${UI.icon("info", 15)}<div>“取高/互斥”按费用组合整体判断：偏远与住宅同时命中时只收较高一项；燃油与其他附加费默认叠加。</div></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>附加费比例变更后，仅对生效时间之后触发的计费生效；已出账账单不变，差额走勘误。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>关闭</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存规则</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        el.querySelector("[data-save]").onclick = () => {
          el.querySelectorAll("#surEditTable [data-f]").forEach(inp => {
            const idx = +inp.dataset.i;
            s.items[idx][inp.dataset.f] = inp.value;
          });
          Store.update("surcharges", s.id, { items: s.items, version: "v" + (parseInt(s.version.slice(1)) + 1), updated: "2026-10-22" });
          Store.log("基础配置", "更新", s.name, "附加费规则变更，版本 +1");
          close(); UI.toast("附加费规则已保存，版本 +1"); render();
        };
      }
    });
  }

  function openAdd() {
    UI.modal({
      title: "新建附加费组",
      body: `<div class="form-grid">
        <div class="field"><label>名称<span class="req">*</span></label><input class="input" id="nsName" placeholder="如 加拿大附加费组"></div>
        <div class="field"><label>适用产品<span class="req">*</span></label><select class="select" id="nsProduct">${UI.options(Store.list("products"), "code", "name", "")}</select></div>
      </div>
      <div class="banner info mt-12">${UI.icon("info", 15)}<div>创建后默认为启用，需补充至少一条费用规则才能被价格引用。</div></div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="nsSave">创建</button>`,
      onMount(el, close) {
        el.querySelector("#nsSave").onclick = () => {
          const name = UI.val("nsName");
          if (!name) return UI.toast("请填写名称", "err");
          Store.add("surcharges", { id: "S" + String(Store.list("surcharges").length + 1).padStart(2, "0"), name, product: UI.val("nsProduct"), status: "启用", version: "v1", updated: "2026-10-22", refs: 0, items: [] });
          Store.log("基础配置", "新增", name, "新建附加费组");
          close(); UI.toast("附加费组已创建"); render();
        };
      }
    });
  }

  UI.shell({ active: "base-surcharge", title: "杂费模版", content });
  render();
  document.getElementById("addBtn").onclick = openAdd;
})();
