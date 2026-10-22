/* 试算与报价单 · 报价单模板 */
(function () {
  let selected = Store.list("quoteTemplates")[0].id;
  let draft = JSON.parse(JSON.stringify(Store.find("quoteTemplates", selected)));

  const allSections = ["基础运费", "附加费明细", "计费说明", "参考时效", "保价说明", "理赔免责", "图片附件"];
  const allFields = ["重量段", "体积段", "单价", "起收量", "目的国家", "分区", "套餐价", "柜型", "一口价", "包含项", "生效时间", "参考时效", "有效期"];

  const content = `
    ${UI.pageHead({
      title: "报价单模板",
      sub: "配置产品价/客户价版式、字段与排序、展示哪些费用项；模板保存后只影响之后生成的报价单。",
      actions: `<button class="btn btn-ghost" id="copyBtn">${UI.icon("copy", 14)} 复制模板</button>
        <button class="btn btn-primary" id="newBtn">${UI.icon("plus", 14)} 新建模板</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>产品价先做：</b>产品公布价报价单先上线；客户价按客户近 3 个月目的地生成国家，复用同一套版式但只展示该客户可用的价格层级。底价永不出现在报价单。</div>
    </div>

    <div class="split-wide">
      <section class="card">
        <div class="card-hd"><h3>模板列表</h3><span class="sub">${Store.list("quoteTemplates").length} 个</span></div>
        <div class="card-bd" style="padding:10px">
          <div class="stack" style="gap:6px" id="tplList"></div>
        </div>
      </section>

      <section class="card">
        <div class="card-hd"><h3 id="edTitle">版式配置</h3><span class="sub" id="edSub"></span>
          <div class="right"><button class="btn btn-ghost btn-sm" id="previewBtn">${UI.icon("eye", 12)} 版式预览</button></div>
        </div>
        <div class="card-bd" id="editor"></div>
      </section>
    </div>`;

  function renderList() {
    document.getElementById("tplList").innerHTML = Store.list("quoteTemplates").map(t => `
      <div class="role-card ${t.id === selected ? "active" : ""}" data-t="${t.id}" style="cursor:pointer;padding:11px 12px">
        <h4 style="font-size:12.5px">${UI.esc(t.name)}</h4>
        <p style="margin-top:4px">${UI.esc(t.type)} · ${UI.esc(t.scope)}</p>
        <div class="meta" style="margin-top:7px"><span>${t.layout}</span><span>${t.version}</span><span>${t.refs} 个报价单</span></div>
      </div>`).join("");
    document.querySelectorAll("[data-t]").forEach(el => el.onclick = () => {
      selected = el.dataset.t;
      draft = JSON.parse(JSON.stringify(Store.find("quoteTemplates", selected)));
      renderList(); renderEditor();
    });
  }

  function renderEditor() {
    document.getElementById("edTitle").textContent = draft.name;
    document.getElementById("edSub").textContent = `${draft.type} · ${draft.layout} · ${draft.version}`;
    document.getElementById("editor").innerHTML = `<div class="stack">
      <div class="form-grid">
        <div class="field"><label>模板名称</label><input class="input" id="etName" value="${UI.esc(draft.name)}"></div>
        <div class="field"><label>模板类型</label><select class="select" id="etType"><option ${draft.type === "产品价" ? "selected" : ""}>产品价</option><option ${draft.type === "客户价" ? "selected" : ""}>客户价</option></select></div>
        <div class="field"><label>适用范围</label><input class="input" id="etScope" value="${UI.esc(draft.scope)}"></div>
        <div class="field"><label>价格版式</label><select class="select" id="etLayout">${["重量段", "按方", "首续重", "一口价"].map(x => `<option ${draft.layout === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      </div>
      <div class="divider"></div>
      <div class="section-title">展示模块</div>
      <div class="row wrap" style="gap:10px">
        ${allSections.map(s => `<label class="check"><input type="checkbox" class="etSec" value="${s}" ${draft.sections.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}
      </div>
      <div class="divider"></div>
      <div class="section-title">字段与排序</div>
      <div class="table-wrap"><table class="table compact"><thead><tr><th>顺序</th><th>字段</th><th>是否展示</th><th>排序</th></tr></thead><tbody>
        ${draft.fields.map((f, i) => `<tr><td>${i + 1}</td><td class="t-main">${UI.esc(f)}</td><td>${UI.badge("展示", "b-green")}</td><td><button class="btn-text" data-up="${i}">上移</button><button class="btn-text" data-down="${i}">下移</button></td></tr>`).join("")}
      </tbody></table></div>
      <div class="row"><span class="hint">字段顺序决定报价单列顺序；不展示的字段请在下方“可选字段”中添加或移除。</span></div>
      <div class="row wrap" style="gap:8px">
        ${allFields.filter(f => !draft.fields.includes(f)).map(f => `<button class="btn btn-ghost btn-sm" data-addf="${f}">${UI.icon("plus", 11)} ${f}</button>`).join("") || '<span class="tiny muted">全部字段已展示</span>'}
      </div>
      <div class="divider"></div>
      <div class="row">
        <span class="hint">保存后版本号 +1，只影响新生成的报价单；已生成版本保留原版式。</span>
        <span class="spacer"></span>
        <button class="btn btn-primary" id="saveTpl">保存模板</button>
      </div>
    </div>`;
    document.querySelectorAll("[data-up]").forEach(b => b.onclick = () => {
      const i = +b.dataset.up; if (i === 0) return;
      [draft.fields[i - 1], draft.fields[i]] = [draft.fields[i], draft.fields[i - 1]]; renderEditor();
    });
    document.querySelectorAll("[data-down]").forEach(b => b.onclick = () => {
      const i = +b.dataset.down; if (i === draft.fields.length - 1) return;
      [draft.fields[i + 1], draft.fields[i]] = [draft.fields[i], draft.fields[i + 1]]; renderEditor();
    });
    document.querySelectorAll("[data-addf]").forEach(b => b.onclick = () => { draft.fields.push(b.dataset.addf); renderEditor(); });
    document.querySelectorAll(".etSec").forEach(c => c.onchange = () => {
      draft.sections = [...document.querySelectorAll(".etSec:checked")].map(x => x.value);
    });
    document.getElementById("saveTpl").onclick = () => {
      draft.name = UI.val("etName"); draft.type = UI.val("etType"); draft.scope = UI.val("etScope"); draft.layout = UI.val("etLayout");
      const v = parseInt(draft.version.replace("V", "")) + 1;
      draft.version = "V" + v; draft.updated = "2026-10-22";
      Store.update("quoteTemplates", draft.id, draft);
      Store.log("报价单", "更新模板", draft.name, "版式/字段/模块变更，版本 " + draft.version);
      UI.toast("模板已保存，版本 " + draft.version); renderList(); renderEditor();
    };
  }

  function preview() {
    const m = UI.modal({
      title: "版式预览 · " + draft.name,
      size: "lg",
      body: `<div style="background:#E9EFEF;padding:12px;border-radius:8px;overflow:auto">
        <div style="background:#fff;width:100%;min-width:620px;padding:24px 26px;border:1px solid #E3EBEB">
          <div style="display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:2px solid #00A99D">
            <span style="width:30px;height:30px;border-radius:8px;background:#00A99D;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">Q</span>
            <div><div style="font-size:14px;font-weight:700">B2B 报价系统</div><div style="font-size:9px;color:#7C8F93;letter-spacing:.5px">QUOTATION</div></div>
            <span style="margin-left:auto;font-size:10px;color:#7C8F93">${draft.type} · ${draft.layout}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;padding:12px 0;font-size:10px;color:#4E6267;border-bottom:1px solid #E3EBEB">
            <div>客户：示例客户</div><div>报价单号：Q20261002 · ${draft.version}</div>
            <div>有效期：2026-10-01 ~ 2026-12-31</div><div>适用范围：${UI.esc(draft.scope)}</div>
          </div>
          ${draft.sections.includes("基础运费") ? `<div style="margin-top:14px;font-size:10.5px;font-weight:700;margin-bottom:6px">价格表</div>
          <table class="qs-table"><thead><tr>${draft.fields.slice(0, 4).map(f => `<th>${UI.esc(f)}</th>`).join("")}<th class="num">单价</th></tr></thead>
          <tbody><tr><td>0–21kg</td><td>18.50</td><td>2026-10-01</td><td>7-10 天</td><td class="num">元/kg</td></tr>
          <tr><td>21–45kg</td><td>17.20</td><td>2026-10-01</td><td>7-10 天</td><td class="num">元/kg</td></tr></tbody></table>` : ""}
          ${draft.sections.includes("附加费明细") ? `<div style="margin-top:12px;font-size:10.5px;font-weight:700;margin-bottom:6px">附加费</div><div style="font-size:9.5px;color:#4E6267;line-height:1.8">燃油 12% · 偏远 350 元/票 · 住宅 120 元/票</div>` : ""}
          ${draft.sections.includes("计费说明") ? `<div style="margin-top:12px;font-size:10.5px;font-weight:700;margin-bottom:6px">计费说明</div><div style="font-size:9.5px;color:#4E6267;line-height:1.8">材积系数 6000，取实重与材积重较大值，按 0.5kg 进位。</div>` : ""}
          ${draft.sections.includes("参考时效") ? `<div style="margin-top:12px;font-size:10.5px;font-weight:700;margin-bottom:6px">参考时效</div><div style="font-size:9.5px;color:#4E6267">开船后 14-18 天到港，提柜后 3-5 天派送。</div>` : ""}
          <div style="margin-top:18px;font-size:8.5px;color:#A3B2B5">本报价单为示例预览，正式报价单以发布版本为准。</div>
        </div>
      </div>`,
      footer: `<div class="spacer"></div><button class="btn btn-primary" onclick="UI.closeModal()">关闭</button>`
    });
  }

  UI.shell({ active: "quote-template", title: "报价单模板", content });
  renderList(); renderEditor();

  document.getElementById("previewBtn").onclick = preview;
  document.getElementById("copyBtn").onclick = () => {
    const copy = JSON.parse(JSON.stringify(draft));
    copy.id = "QT" + String(Store.list("quoteTemplates").length + 1).padStart(2, "0");
    copy.name = draft.name + "（副本）"; copy.version = "V1"; copy.refs = 0; copy.updated = "2026-10-22";
    Store.add("quoteTemplates", copy);
    selected = copy.id; draft = JSON.parse(JSON.stringify(copy));
    Store.log("报价单", "复制模板", copy.name, "复制自 " + draft.id);
    UI.toast("模板已复制"); renderList(); renderEditor();
  };
  document.getElementById("newBtn").onclick = () => {
    const t = { id: "QT" + String(Store.list("quoteTemplates").length + 1).padStart(2, "0"), name: "新报价单模板", type: "产品价", scope: "待配置", layout: "重量段", version: "V1", status: "启用", updated: "2026-10-22", refs: 0, sections: ["基础运费", "附加费明细"], fields: ["重量段", "单价", "生效时间"] };
    Store.add("quoteTemplates", t);
    selected = t.id; draft = JSON.parse(JSON.stringify(t));
    renderList(); renderEditor();
  };
})();
