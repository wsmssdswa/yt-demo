/* 试算与报价单 · 报价单版本与生成 */
(function () {
  let active = "全部";

  const content = `
    ${UI.pageHead({
      title: "报价单",
      sub: "产品价先做，客户价按客户近 3 个月目的地生成国家；价格变更自动升版，保留历史版本。",
      actions: `<button class="btn btn-primary" id="genBtn">${UI.icon("spark", 14)} 生成报价单</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>版本口径：</b>价格变更后生成的报价单自动升版；已发布版本不可改，只能生成新版本。报价单不展示底价，客户价按客户权限只输出适用国家。</div>
    </div>

    <div class="stat-grid">
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("file", 14)}</span>报价单</div><div class="st-val">${Store.list("quotes").length}<small>个</small></div><div class="st-ft">产品价 3 · 客户价 4</div></div>
      <div class="stat"><div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>已发布</div><div class="st-val">${Store.list("quotes").filter(q => q.status === "已发布").length}<small>个</small></div><div class="st-ft">最近发布 2026-10-08</div></div>
      <div class="stat warn"><div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>待发布</div><div class="st-val">${Store.list("quotes").filter(q => q.status === "待发布").length}<small>个</small></div><div class="st-ft">纽酷专属报价单 V1</div></div>
      <div class="stat alert"><div class="st-hd"><span class="st-ico">${UI.icon("alert", 14)}</span>生成失败</div><div class="st-val">${Store.list("quotes").filter(q => q.status === "生成失败").length}<small>个</small></div><div class="st-ft">英国缺 UK-2 分区价格</div></div>
    </div>

    <section class="card mt-16">
      <div class="tabs" id="qTabs">
        ${["全部", "草稿", "生成中", "待发布", "已发布", "生成失败"].map(s => {
          const n = s === "全部" ? Store.list("quotes").length : Store.list("quotes").filter(q => q.status === s).length;
          return `<a class="tab ${s === active ? "active" : ""}" href="javascript:void(0)" data-s="${s}">${s}<span class="count">${n}</span></a>`;
        }).join("")}
      </div>
      <div class="filterbar">
        <div class="field"><label>关键字</label><input class="input" id="kw" placeholder="报价单号 / 名称 / 客户"></div>
        <div class="field"><label>类型</label><select class="select" id="type"><option value="">全部</option><option>产品价</option><option>客户价</option></select></div>
        <div class="field"><label>客户</label><select class="select" id="customer"><option value="">全部</option>${UI.options(Store.list("customers"), "code", "short", "")}</select></div>
        <div class="actions"><button class="btn btn-ghost" id="resetBtn">重置</button><button class="btn btn-primary" id="queryBtn">查询</button></div>
      </div>
      <div id="qTable"></div>
      <div id="qPager"></div>
    </section>`;

  function filtered() {
    const kw = (document.getElementById("kw").value || "").toLowerCase();
    const type = document.getElementById("type").value;
    const cust = document.getElementById("customer").value;
    return Store.list("quotes").filter(q => {
      if (active !== "全部" && q.status !== active) return false;
      if (type && q.type !== type) return false;
      if (cust && q.customer !== cust) return false;
      if (kw && !(q.id + q.name + Q.customerName(q.customer) + q.countries).toLowerCase().includes(kw)) return false;
      return true;
    });
  }

  function render() {
    const rows = filtered();
    document.getElementById("qTable").innerHTML = UI.table({
      columns: [
        { label: "报价单", width: "21%", render: r => `<div class="t-main">${UI.esc(r.name)}</div><div class="t-sub">${r.id} · ${r.type}</div>` },
        { label: "客户 / 国家", width: "19%", render: r => `<div>${r.customer ? Q.customerName(r.customer) : "全部客户"}</div><div class="t-sub">${UI.esc(r.countries)}</div>` },
        { label: "版本", width: "7%", render: r => `<span class="mono">${r.version}</span>` },
        { label: "价格项", width: "6%", align: "right", render: r => `<span class="price-cell">${r.itemCount}</span>` },
        { label: "状态", width: "9%", render: r => UI.badge(r.status) },
        { label: "生成 / 发布", width: "18%", render: r => `<div class="tiny">${r.generatedAt}</div><div class="t-sub">${r.publishedAt !== "—" ? "发布 " + r.publishedAt : "未发布"}</div>` },
        { label: "失败原因", width: "12%", render: r => r.failure ? `<span class="tiny red">${UI.esc(r.failure)}</span>` : `<span class="muted">—</span>` },
        { label: "操作", width: "18%", render: r => `<div class="actions">
          <button class="btn-text" data-preview="${r.id}">预览</button>
          ${r.status === "待发布" ? `<button class="btn-text" data-publish="${r.id}">发布</button>` : ""}
          ${r.status === "已发布" ? `<button class="btn-text" data-download="${r.id}">下载</button>` : ""}
          ${r.status === "生成失败" ? `<button class="btn-text" data-retry="${r.id}">重试</button>` : ""}
        </div>` }
      ],
      rows, rowAttrs: r => `data-id="${r.id}"`, empty: "没有匹配的报价单"
    });
    document.getElementById("qPager").innerHTML = UI.pager(rows.length, 1, 20);
    document.querySelectorAll("[data-preview]").forEach(b => b.onclick = e => { e.stopPropagation(); location.href = "quote-preview.html?id=" + b.dataset.preview; });
    document.querySelectorAll("[data-publish]").forEach(b => b.onclick = e => { e.stopPropagation(); publish(b.dataset.publish); });
    document.querySelectorAll("[data-download]").forEach(b => b.onclick = e => { e.stopPropagation(); UI.toast("已开始下载 " + b.dataset.download + ".pdf（示例）"); });
    document.querySelectorAll("[data-retry]").forEach(b => b.onclick = e => { e.stopPropagation(); retry(b.dataset.retry); });
    document.querySelectorAll("#qTable tbody tr[data-id]").forEach(tr => tr.onclick = () => location.href = "quote-preview.html?id=" + tr.dataset.id);
  }

  function publish(id) {
    const q = Store.find("quotes", id);
    UI.confirm("发布报价单", `将 <b>${UI.esc(q.name)} ${q.version}</b> 发布到用户中心，客户按权限可查询与下载。发布后不可修改。`, () => {
      Store.update("quotes", id, { status: "已发布", publishedAt: "2026-10-22 20:00", deliveries: [{ channel: "用户中心", to: q.customer ? Q.customerName(q.customer) : "全部客户", at: "2026-10-22 20:00", status: "已送达" }] });
      Store.log("报价单", "发布", q.name + " " + q.version, "发布到用户中心");
      UI.toast("报价单已发布"); render();
    });
  }

  function retry(id) {
    const q = Store.find("quotes", id);
    UI.toast("正在重新生成 " + q.id + "…");
    Store.update("quotes", id, { status: "生成中", failure: "" });
    render();
    setTimeout(() => {
      Store.update("quotes", id, { status: "待发布", generatedAt: "2026-10-22 20:00", itemCount: 15, failure: "" });
      Store.log("报价单", "重新生成", q.name, "生成成功，待发布");
      UI.toast("重新生成成功，待发布"); render();
    }, 1600);
  }

  function openGen() {
    UI.modal({
      title: "生成报价单",
      size: "lg",
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>报价单类型<span class="req">*</span></label><select class="select" id="gqType"><option>产品价</option><option>客户价</option></select></div>
          <div class="field"><label>客户（客户价必填）</label><select class="select" id="gqCustomer">${UI.options(Store.list("customers"), "code", "short", "")}</select></div>
          <div class="field"><label>模板</label><select class="select" id="gqTpl">${Store.list("quoteTemplates").map(t => `<option value="${t.id}">${t.name}（${t.version}）</option>`).join("")}</select></div>
          <div class="field"><label>生效日期</label><input class="input" id="gqFrom" type="date" value="2026-11-01"></div>
          <div class="field span-2"><label>范围</label>
            <div class="row wrap" style="gap:12px">
              ${["P001 美国海派卡派", "P002 美国海派快递", "P003 欧洲海派", "P007 英国海派", "P008 加拿大海派"].map((x, i) => `<label class="check"><input type="checkbox" class="gqProd" value="${["P001", "P002", "P003", "P007", "P008"][i]}" ${i < 3 ? "checked" : ""}> ${x}</label>`).join("")}
            </div>
          </div>
        </div>
        <div class="banner info">${UI.icon("info", 15)}<div>客户价按客户近 3 个月目的地生成国家；产品价按所选产品全部生效分区生成。价格变更会自动升版。</div></div>
        <div class="banner warn">${UI.icon("alert", 15)}<div>缺生效价格的产品/国家会生成失败，并在列表显示原因；不会用 0 元或臆造价格补齐。</div></div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="gqSave">开始生成</button>`,
      onMount(el, close) {
        el.querySelector("#gqSave").onclick = () => {
          const prods = [...el.querySelectorAll(".gqProd:checked")].map(x => x.value);
          if (!prods.length) return UI.toast("请至少选择一个产品", "err");
          const type = UI.val("gqType"), cust = UI.val("gqCustomer");
          const q = {
            id: "Q202610" + String(80 + Store.list("quotes").length).slice(-2),
            name: type === "客户价" ? Q.customerName(cust) + "专属报价单" : (prods.length === 1 ? Q.productName(prods[0]) : "产品组合") + "产品价",
            type, customer: type === "客户价" ? cust : "", countries: [...new Set(prods.map(p => Q.product(p).countryName))].join("、") || "美国",
            version: "V1", status: "生成中", generatedAt: "2026-10-22 20:00", publishedAt: "—", owner: "杨鑫", itemCount: 0, failure: "", deliveries: []
          };
          Store.add("quotes", q);
          Store.log("报价单", "生成", q.name, "类型 " + type);
          close(); UI.toast("已开始生成，完成后待发布"); render();
          setTimeout(() => {
            Store.update("quotes", q.id, { status: "待发布", itemCount: 12 });
            Store.log("报价单", "生成完成", q.name, "12 个价格项，待发布");
            UI.toast("报价单生成完成：" + q.name); render();
          }, 1800);
        };
      }
    });
  }

  UI.shell({ active: "quote-list", title: "报价单", content });
  render();
  document.querySelectorAll("#qTabs .tab").forEach(t => t.onclick = () => {
    document.querySelectorAll("#qTabs .tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); active = t.dataset.s; render();
  });
  document.getElementById("queryBtn").onclick = render;
  document.getElementById("resetBtn").onclick = () => { ["kw", "type", "customer"].forEach(id => document.getElementById(id).value = ""); render(); };
  document.getElementById("kw").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
  document.getElementById("genBtn").onclick = openGen;
})();
