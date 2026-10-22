/* 基础配置 · 角色与数据权限 */
(function () {
  let activeRole = "R01";
  const permCols = [
    { k: "base", l: "基础配置" }, { k: "basePrice", l: "底价" }, { k: "publish", l: "公布价" },
    { k: "package", l: "套餐价" }, { k: "custPrice", l: "客户价" }, { k: "inquiry", l: "询价" },
    { k: "quote", l: "报价单" }, { k: "billing", l: "计费" }, { k: "approve", l: "审批" }
  ];

  const content = `
    ${UI.pageHead({
      title: "角色与数据权限",
      sub: "按价格组、销售、纵队、港前、审批角色划分功能权限；底价仅内部授权可见，客户与报价单不输出底价。",
      actions: `<button class="btn btn-ghost" id="addUser">${UI.icon("users", 14)} 添加成员</button>
        <button class="btn btn-primary" id="addRole">${UI.icon("plus", 14)} 新建角色</button>`
    })}

    <div class="banner danger mb-16">${UI.icon("lock", 15)}
      <div><b>底价可见性：</b>底价、成本价只在“价格管理员 / 审批人”角色内可见；销售、纵队、港前、客户侧与报价单均不输出底价。任何导出也不包含底价列。</div>
    </div>

    <div class="role-grid" id="roleGrid"></div>

    <div class="split mt-16">
      <section class="card">
        <div class="card-hd"><h3>功能权限矩阵</h3><span class="sub" id="roleName"></span>
          <div class="right"><span class="tiny muted">✓ 允许 · — 不可见</span></div>
        </div>
        <div class="card-bd">
          <div class="table-wrap permission-scroll"><table class="table compact perm-table" id="permTable">
            <thead><tr><th style="width:150px">功能</th>${permCols.map(c => `<th>${c.l}</th>`).join("")}</tr></thead>
            <tbody></tbody>
          </table></div>
          <div class="row mt-12"><span class="hint">权限变更立即生效；已登录用户下次请求时刷新。</span><span class="spacer"></span><button class="btn btn-primary" id="savePerm">保存权限</button></div>
        </div>
      </section>

      <div class="stack">
        <section class="card">
          <div class="card-hd"><h3>数据范围</h3></div>
          <div class="card-bd">
            <div class="stack" style="gap:10px">
              <div class="banner">${UI.icon("info", 15)}<div>功能权限决定“能不能进”，数据范围决定“能看到谁”。两者同时生效。</div></div>
              <div class="kv tight">
                <dt>价格组</dt><dd>全部价格组</dd>
                <dt>客户范围</dt><dd>按销售归属自动带出</dd>
                <dt>产品范围</dt><dd>按纵队/口岸授权</dd>
                <dt>导出</dt><dd>不包含底价与成本价</dd>
              </div>
            </div>
          </div>
        </section>
        <section class="card">
          <div class="card-hd"><h3>审批边界</h3></div>
          <div class="card-bd">
            <div class="stack" style="gap:9px">
              <div class="row"><span class="small">底价新增/下调</span><span class="spacer"></span><span class="badge b-blue">价格委员会</span></div>
              <div class="row"><span class="small">客户价低于底价</span><span class="spacer"></span><span class="badge b-blue">销售总监</span></div>
              <div class="row"><span class="small">单票改价 / 勘误</span><span class="spacer"></span><span class="badge b-blue">财务经理</span></div>
              <div class="row"><span class="small">套餐价调整</span><span class="spacer"></span><span class="badge b-blue">价格委员会</span></div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <section class="card mt-16">
      <div class="card-hd"><h3>成员</h3><span class="sub">${Store.list("users").length} 人</span>
        <div class="right"><div class="search-inline">${UI.icon("search", 14)}<input class="input sm" id="userKw" placeholder="搜索姓名 / 角色"></div></div>
      </div>
      <div id="userTable"></div>
    </section>`;

  function renderRoles() {
    document.getElementById("roleGrid").innerHTML = Store.list("roles").map(r => `
      <div class="role-card ${r.code === activeRole ? "active" : ""}" data-role="${r.code}">
        <h4>${UI.icon("shield", 14)} ${UI.esc(r.name)} ${r.code === activeRole ? '<span class="badge b-teal">当前</span>' : ""}</h4>
        <p>${UI.esc(r.desc)}</p>
        <div class="meta"><span>${r.users} 人</span><span>${UI.esc(r.scope)}</span></div>
      </div>`).join("");
    document.querySelectorAll("[data-role]").forEach(el => el.onclick = () => { activeRole = el.dataset.role; renderRoles(); renderPerm(); });
  }

  function renderPerm() {
    const role = Store.find("roles", activeRole);
    document.getElementById("roleName").textContent = role.name + " · " + role.scope;
    const tb = document.querySelector("#permTable tbody");
    tb.innerHTML = permCols.map(c => `<tr><td class="t-main">${c.l}</td>${permCols.map(x => `<td data-perm="${x.k}" style="cursor:pointer" class="${role.perms[x.k] ? "perm-yes" : "perm-no"}">${role.perms[x.k] ? "✓" : "—"}</td>`).join("")}</tr>`).join("");
    tb.querySelectorAll("[data-perm]").forEach(td => td.onclick = () => {
      const k = td.dataset.perm;
      role.perms[k] = !role.perms[k];
      renderPerm();
    });
  }

  function renderUsers() {
    const kw = (document.getElementById("userKw")?.value || "").toLowerCase();
    const rows = Store.list("users").filter(u => !kw || (u.name + u.role + u.dept).toLowerCase().includes(kw));
    document.getElementById("userTable").innerHTML = UI.table({
      columns: [
        { label: "成员", width: "20%", render: (r) => `<div class="row"><span class="avatar" style="width:26px;height:26px;font-size:11px">${r.name[0]}</span><div><div class="t-main">${UI.esc(r.name)}</div><div class="t-sub">${UI.esc(r.dept)}</div></div></div>` },
        { label: "角色", width: "15%", render: (r) => UI.badge(r.role, "b-blue") },
        { label: "数据范围", width: "24%", key: "scope" },
        { label: "状态", width: "9%", render: (r) => UI.badge(r.status) },
        { label: "最近登录", width: "16%", render: (r) => `<span class="tiny muted">${r.last}</span>` },
        { label: "操作", width: "16%", render: (r) => `<div class="actions"><button class="btn-text" data-edit-user="${r.name}">编辑</button><button class="btn-text" data-toggle-user="${r.name}">${r.status === "启用" ? "停用" : "启用"}</button></div>` }
      ],
      rows, empty: "没有匹配的成员"
    });
    document.querySelectorAll("[data-edit-user]").forEach(b => b.onclick = () => openUser(b.dataset.editUser));
    document.querySelectorAll("[data-toggle-user]").forEach(b => b.onclick = () => {
      const u = Store.list("users").find(x => x.name === b.dataset.toggleUser);
      UI.confirm("确认" + (u.status === "启用" ? "停用" : "启用"), `成员 <b>${u.name}</b> 将${u.status === "启用" ? "无法登录" : "恢复登录"}。`, () => {
        Store.update("users", u.name, { status: u.status === "启用" ? "停用" : "启用" });
        Store.log("角色权限", "变更成员状态", u.name, "成员状态变更");
        UI.toast("成员状态已更新"); renderUsers();
      });
    });
  }

  function openUser(name) {
    const u = name ? Store.list("users").find(x => x.name === name) : null;
    UI.modal({
      title: u ? "编辑成员 · " + u.name : "添加成员",
      body: `<div class="form-grid">
        <div class="field"><label>姓名<span class="req">*</span></label><input class="input" id="euName" value="${u ? UI.esc(u.name) : ""}" ${u ? "disabled" : ""}></div>
        <div class="field"><label>部门</label><input class="input" id="euDept" value="${u ? UI.esc(u.dept) : ""}"></div>
        <div class="field"><label>角色<span class="req">*</span></label><select class="select" id="euRole">${Store.list("roles").map(r => `<option ${u && u.role === r.name ? "selected" : ""}>${r.name}</option>`).join("")}</select></div>
        <div class="field"><label>数据范围</label><input class="input" id="euScope" value="${u ? UI.esc(u.scope) : "本人名下客户"}"></div>
        <div class="field"><label>状态</label><select class="select" id="euStatus"><option ${u && u.status === "启用" ? "selected" : ""}>启用</option><option ${u && u.status === "停用" ? "selected" : ""}>停用</option></select></div>
      </div>
      <div class="banner info mt-12">${UI.icon("info", 15)}<div>成员来自组织架构同步；角色与数据范围在本系统内维护。</div></div>`,
      footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="euSave">保存</button>`,
      onMount(el, close) {
        el.querySelector("#euSave").onclick = () => {
          const nm = UI.val("euName");
          if (!nm) return UI.toast("请填写姓名", "err");
          if (u) Store.update("users", u.name, { dept: UI.val("euDept"), role: UI.val("euRole"), scope: UI.val("euScope"), status: UI.val("euStatus") });
          else Store.add("users", { name: nm, dept: UI.val("euDept"), role: UI.val("euRole"), scope: UI.val("euScope"), status: UI.val("euStatus"), last: "—" });
          Store.log("角色权限", u ? "更新成员" : "新增成员", nm, "角色/数据范围变更");
          close(); UI.toast("成员已保存"); renderUsers(); renderRoles();
        };
      }
    });
  }

  UI.shell({ active: "base-role", title: "角色与数据权限", content });
  renderRoles(); renderPerm(); renderUsers();

  document.getElementById("userKw").addEventListener("input", renderUsers);
  document.getElementById("savePerm").onclick = () => {
    const role = Store.find("roles", activeRole);
    Store.log("角色权限", "更新权限", role.name, "功能权限矩阵变更");
    UI.toast("权限已保存：" + role.name, "ok");
  };
  document.getElementById("addUser").onclick = () => openUser(null);
  document.getElementById("addRole").onclick = () => UI.modal({
    title: "新建角色",
    body: `<div class="form-grid">
      <div class="field"><label>角色名称<span class="req">*</span></label><input class="input" id="nrName" placeholder="如 区域价格管理员"></div>
      <div class="field"><label>数据范围</label><select class="select" id="nrScope"><option>本人名下客户</option><option>所属产品线</option><option>所属口岸</option><option>指定价格组</option><option>全部数据</option></select></div>
      <div class="field span-2"><label>说明</label><input class="input" id="nrDesc" placeholder="一句话说明这个角色能做什么"></div>
    </div>`,
    footer: `<div class="spacer"></div><button class="btn btn-ghost" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="nrSave">创建</button>`,
    onMount(el, close) {
      el.querySelector("#nrSave").onclick = () => {
        const nm = UI.val("nrName");
        if (!nm) return UI.toast("请填写角色名称", "err");
        Store.add("roles", { code: "R" + String(Store.list("roles").length + 1).padStart(2, "0"), name: nm, users: 0, scope: UI.val("nrScope"), desc: UI.val("nrDesc"), perms: { base: false, basePrice: false, publish: false, package: false, custPrice: false, inquiry: false, quote: false, billing: false, approve: false } });
        Store.log("角色权限", "新增角色", nm, "新建角色");
        close(); UI.toast("角色已创建"); renderRoles(); renderPerm();
      };
    }
  });
})();
