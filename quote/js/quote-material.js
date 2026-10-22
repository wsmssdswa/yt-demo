/* 试算与报价单 · 报价单资料 */
(function () {
  const cats = ["全部", "附加费说明", "计费规则", "理赔与免责", "保价", "船期与时效", "收货仓", "图片附件"];
  let activeCat = "全部";

  const content = `
    ${UI.pageHead({
      title: "报价单资料",
      sub: "维护附加费/计费说明、理赔免责、保价、船期、收货仓与图片附件；按产品/国家引用，带版本。",
      actions: `<button class="btn btn-ghost" id="uploadBtn">${UI.icon("upload", 14)} 上传资料</button>
        <button class="btn btn-primary" id="newBtn">${UI.icon("plus", 14)} 新建资料</button>`
    })}

    <div class="banner info mb-16">${UI.icon("info", 15)}
      <div><b>引用口径：</b>报价单按产品/国家引用资料的最新版本；资料更新后只影响新生成的报价单，已发布版本保留原资料快照。</div>
    </div>

    <div class="split-wide">
      <section class="card">
        <div class="card-hd"><h3>资料分类</h3></div>
        <div class="card-bd" style="padding:8px">
          ${cats.map(c => {
            const n = c === "全部" ? Store.list("quoteMaterials").length : Store.list("quoteMaterials").filter(m => m.category === c).length;
            return `<a class="nav-item ${c === activeCat ? "active" : ""}" href="javascript:void(0)" data-cat="${c}" style="color:${c === activeCat ? "var(--brand-deep)" : "var(--ink-2)"};background:${c === activeCat ? "var(--brand-soft)" : "transparent"};margin-bottom:2px">
              ${UI.icon("file", 14)}<span>${c}</span><span class="nav-badge" style="background:#EEF4F4;color:#617478">${n}</span></a>`;
          }).join("")}
        </div>
      </section>

      <section class="card">
        <div class="card-hd"><h3>${activeCat === "全部" ? "全部资料" : activeCat}</h3><span class="sub" id="matCount"></span></div>
        <div class="card-bd" id="matBody"></div>
      </section>
    </div>`;

  function render() {
    const rows = Store.list("quoteMaterials").filter(m => activeCat === "全部" || m.category === activeCat);
    document.getElementById("matCount").textContent = rows.length + " 条";
    document.getElementById("matBody").innerHTML = rows.length ? `<div class="grid-2">
      ${rows.map(m => `<div class="card" style="box-shadow:none;margin:0">
        <div class="card-bd" style="padding:14px 15px">
          <div class="row"><strong class="small">${UI.esc(m.name)}</strong><span class="spacer"></span><span class="badge b-outline no-dot">${m.version}</span></div>
          <div class="row mt-8" style="gap:8px"><span class="badge b-teal no-dot">${UI.esc(m.category)}</span><span class="tiny muted">${UI.esc(Q.productName(m.product) === m.product ? "通用" : Q.productName(m.product))}</span><span class="tiny muted">${m.refs} 个报价单引用</span></div>
          <div class="tiny mt-8" style="color:var(--ink-3);line-height:1.7;height:42px;overflow:hidden">${UI.esc(m.content)}</div>
          <div class="row mt-8"><span class="tiny muted">更新 ${m.updated}</span><span class="spacer"></span><button class="btn-text" data-edit="${m.id}">编辑</button></div>
        </div>
      </div>`).join("")}
    </div>` : UI.empty("该分类暂无资料", "点击右上角新建");
    document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openEdit(b.dataset.edit));
  }

  function openEdit(id) {
    const m = id ? Store.find("quoteMaterials", id) : null;
    UI.drawer({
      title: m ? m.name : "新建报价单资料",
      sub: m ? `${m.id} · ${m.version} · ${m.refs} 个报价单引用` : "按分类维护，版本随内容更新",
      wide: true,
      body: `<div class="stack">
        <div class="form-grid">
          <div class="field"><label>资料名称<span class="req">*</span></label><input class="input" id="qmName" value="${m ? UI.esc(m.name) : ""}"></div>
          <div class="field"><label>分类<span class="req">*</span></label><select class="select" id="qmCat">${cats.slice(1).map(c => `<option ${m && m.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label>适用产品</label><select class="select" id="qmProduct"><option value="通用" ${m && m.product === "通用" ? "selected" : ""}>通用</option>${UI.options(Store.list("products"), "code", "name", m ? m.product : "")}</select></div>
          <div class="field"><label>版本</label><input class="input" value="${m ? m.version : "v1"}" disabled></div>
        </div>
        <div class="field"><label>资料内容<span class="req">*</span></label><textarea class="textarea" id="qmContent" style="min-height:160px">${m ? UI.esc(m.content) : ""}</textarea></div>
        ${!m || m.category === "图片附件" ? `<div class="upload-zone" id="qmUpload">${UI.icon("upload", 22)}<div>上传图片或 PDF，支持 PNG/JPG/PDF，单文件 ≤ 10MB</div></div>` : ""}
        <div class="banner warn">${UI.icon("alert", 15)}<div>内容更新后版本 +1，新报价单引用新版本；已发布报价单保留原版本快照，不自动更新。</div></div>
      </div>`,
      footer: `<button class="btn btn-ghost" data-cancel>取消</button><div class="spacer"></div><button class="btn btn-primary" data-save>保存</button>`,
      onMount(el, close) {
        el.querySelector("[data-cancel]").onclick = close;
        if (el.querySelector("#qmUpload")) el.querySelector("#qmUpload").onclick = () => UI.toast("已上传 1 个文件（示例）");
        el.querySelector("[data-save]").onclick = () => {
          const name = UI.val("qmName"), content = UI.val("qmContent");
          if (!name || !content) return UI.toast("请填写名称和内容", "err");
          if (m) {
            const v = parseInt(m.version.replace("v", "")) + 1;
            Store.update("quoteMaterials", m.id, { name, category: UI.val("qmCat"), product: UI.val("qmProduct"), content, version: "v" + v, updated: "2026-10-22" });
            Store.log("报价单", "更新资料", name, "版本 " + m.version + " → v" + v);
          } else {
            Store.add("quoteMaterials", { id: "QM" + String(Store.list("quoteMaterials").length + 1).padStart(2, "0"), name, category: UI.val("qmCat"), product: UI.val("qmProduct"), version: "v1", updated: "2026-10-22", refs: 0, content });
            Store.log("报价单", "新增资料", name, "新建报价单资料");
          }
          close(); UI.toast("资料已保存"); render();
        };
      }
    });
  }

  UI.shell({ active: "quote-material", title: "报价单资料", content });
  render();
  document.querySelectorAll("[data-cat]").forEach(el => el.onclick = () => {
    activeCat = el.dataset.cat;
    document.querySelectorAll("[data-cat]").forEach(x => { x.classList.remove("active"); x.style.background = "transparent"; x.style.color = "var(--ink-2)"; });
    el.classList.add("active"); el.style.background = "var(--brand-soft)"; el.style.color = "var(--brand-deep)";
    render();
  });
  document.getElementById("newBtn").onclick = () => openEdit(null);
  document.getElementById("uploadBtn").onclick = () => UI.toast("上传资料：支持图片/PDF，原型仅演示入口", "warn");
})();
