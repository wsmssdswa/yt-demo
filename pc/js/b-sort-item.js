/* ============================================
   b-sort-item.js — 分拣项配置(基础信息·注册表演示)
   分拣项 = 规则可引用的验证维度(field_name 载体),由本页注册表统一维护;
   规则编辑器(B2B分拣管理-格口看板)的验证字段下拉从注册表读取。
   本页演示:
     · 新增分拣项免发版——保存后到规则页刷新,下拉即出现新验证字段
     · 值形态由「编辑器可选值」决定:配了值清单=编码清单;选「无」时需选数据类型(数字/字符串)
       → 数值/文本。运算符从真实系统 12 个里自由勾选
     · 被规则引用的项给出影响提示(运算符/可选值仍可改;移除的运算符在规则中显示「已失效」)
     · localStorage 存配置(纯静态跨页共享,演示用)
   ============================================ */

/* ---- 值形态(由可选值配置决定;选「无」时由数据类型决定 数值/文本) ---- */
const siTypeName = t => t === 'num' ? '数值' : t === 'str' ? '文本' : '编码清单';
const siValSourceText = it => {
  const vs = it.valSource;
  if (!vs) return '无';
  if (vs.kind === 'manual') return `手工清单(${(vs.values || []).length} 项)`;
  if (vs.kind === 'api') return `接口数据源·${vs.apiKey || ''}(${vs.note || ''})`;
  return `无(${vs.dataType === 'str' ? '字符串' : vs.dataType === 'num' ? '数字' : '未选数据类型'}直接填)`;
};

/* ---- 列表行 ---- */
function siListHtml() {
  const list = SortItemRegistry.items();
  return list.map(it => {
    return `
    <tr data-key="${it.key}" class="${SiPage.checked === it.key ? 'row--selected' : ''}"
        onclick="SiPage.check('${it.key}')">
      <td class="col--check"><input type="checkbox" onclick="event.stopPropagation()" /></td>
      <td>${it.name}</td>
      <td class="col--code">${it.fieldName}</td>
      <td>${siTypeName(SIR_typeOf(it))}</td>
      <td>${siOpsCell(it)}</td>
      <td>${siValSourceText(it)}</td>
      <td class="col--code">${it.refCount}</td>
      <td>${it.updateUser}</td>
      <td>${it.updateTime}</td>
    </tr>`;
  }).join('');
}

function siGrid() {
  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup><col style="width:36px" /><col style="width:100px" /><col style="width:150px" />
          <col style="width:80px" /><col style="min-width:140px" /><col style="width:280px" />
          <col style="width:100px" />
          <col style="width:80px" /><col style="width:150px" /></colgroup>
        <thead><tr><th></th><th>中文名</th><th>field_name</th><th>值形态</th>
          <th title="该分拣项在规则行里可选的验证类型">运算符集</th>
          <th title="配规则时内容下拉的候选项来源">编辑器可选值</th>
          <th>被规则引用数</th><th>更新人</th><th>更新时间</th></tr></thead>
        <tbody id="siGridBody">${siListHtml()}</tbody>
      </table>
    </div>
  `;
}

/* ============================================
   编辑弹窗(排版对齐系统配置弹窗惯例)
   区块: ① 基本信息 ② 取值定义(运算符集) ③ 编辑器可选值
   ============================================ */
/* 运算符勾选网格:真实系统 12 个全列(checkbox) */
function siOpsCheckHtml() {
  const cur = SiPage.draft.ops || [];
  return SIR_OPS.map(o => `
    <label class="si-op-item" title="${o.expr}">
      <input type="checkbox" ${cur.includes(o.code) ? 'checked' : ''}
        onchange="SiPage.toggleOp('${o.code}', this.checked)" />
      <span class="si-op-lbl">${o.label}</span>
      <span class="si-op-expr">${o.expr}</span>
    </label>`).join('');
}

/* 手工清单:小表格(code / 显示名 / 删除);回车=加一行,重复 code 实时标红 */
function siManualRowsHtml(it) {
  const rows = (it && it.valSource.kind === 'manual' && it.valSource.values) || [];
  if (!rows.length) {
    return `<tr><td colspan="3" class="cr-empty">暂无值,点击下方「➕ 加一行」添加</td></tr>`;
  }
  return rows.map((v, i) => `
    <tr>
      <td><input class="ipt" style="width:100%" placeholder="如 CIF"
        value="${v.code}" oninput="SiPage.mv(${i},'code',this.value)" onkeydown="SiPage.mvKey(event)" /></td>
      <td><input class="ipt" style="width:100%" placeholder="如 签入失败"
        value="${v.name}" oninput="SiPage.mv(${i},'name',this.value)" onkeydown="SiPage.mvKey(event)" /></td>
      <td class="col--check"><button class="si-mrow-del" onclick="SiPage.mvDel(${i})"
        title="删除该行">✕</button></td>
    </tr>`).join('');
}

/* 重复 code 实时标红(保存时仍会拦截) */
function siMarkDup() {
  const inputs = [...document.querySelectorAll('#siManualRows tr td:first-child input')];
  const vals = inputs.map(i => (i.value || '').trim().toLowerCase());
  inputs.forEach((inp, i) => {
    const dup = !!vals[i] && vals.filter(v => v === vals[i]).length > 1;
    inp.classList.toggle('si-dup', dup);
    inp.title = dup ? 'code 与其他行重复' : '';
  });
}

function siEditModal() {
  return `
    <div class="rw-modal" id="siEditMask" style="display:none">
      <div class="rw-modal-mask" onclick="SiPage.closeEdit()"></div>
      <div class="rw-modal-panel si-panel rw-modal-panel--scroll" style="width:700px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="siEditTitle">新增分拣项</span>
          <button class="rw-modal-close" onclick="SiPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="si-lock-note" id="siLockNote" style="display:none"></div>

          <div class="si-sec-title">基本信息</div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>中文名</label>
            <input class="ipt rw-form-ipt" id="siFName" placeholder="如 目的国" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>field_name</label>
            <div style="flex:1">
              <input class="ipt rw-form-ipt" id="siFField" placeholder="小写 snake_case,如 dest_country_code" style="width:100%" />
              <div class="si-dim" id="siFFieldTip">唯一标识,保存后不可修改;须与过机接口取值字段一致</div>
            </div>
          </div>

          <div class="si-sec-title">取值定义</div>
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label"><span class="rw-req">*</span>运算符</label>
            <div style="flex:1">
              <div class="si-op-grid" id="siFOps"></div>
              <div class="si-dim">按需勾选,至少勾选一个;规则行「内容」的填写方式随运算符变化</div>
            </div>
          </div>

          <div class="si-sec-title">编辑器可选值</div>
          <div id="siValBody"></div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="SiPage.closeEdit()">取消</button>
          <button class="btn btn--primary" onclick="SiPage.saveEdit()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* 变更明细:只列发生变化的属性,写成"属性:旧值→新值"(对齐日志参数规范;清单类收敛为前 3 项+总数) */
function siDiffText(before, after) {
  const out = [];
  if (before.name !== after.name) out.push(`中文名:${before.name}→${after.name}`);
  const labels = codes => (codes || []).map(c => (SIR_OP_MAP[c] || {}).label || c);
  const bOps = labels(before.ops).join('、'), aOps = labels(after.ops).join('、');
  if (bOps !== aOps) out.push(`运算符:${bOps || '无'}→${aOps || '无'}`);
  const kindText = vs => vs.kind === 'manual' ? '手工清单'
    : vs.kind === 'api' ? `接口数据源·${vs.apiKey || ''}`
      : `无(${vs.dataType === 'str' ? '字符串' : '数字'}直接填)`;
  const bvs = before.valSource || {}, avs = after.valSource || {};
  if ((bvs.kind || '') !== (avs.kind || '')) {
    out.push(`可选值来源:${kindText(bvs)}→${kindText(avs)}`);
  } else if (avs.kind === 'none') {
    const bdt = bvs.dataType === 'str' ? '字符串' : '数字', adt = avs.dataType === 'str' ? '字符串' : '数字';
    if (bdt !== adt) out.push(`数据类型:${bdt}→${adt}`);
  } else if (avs.kind === 'manual') {
    const bc = (bvs.values || []).map(v => v.code), ac = (avs.values || []).map(v => v.code);
    const brief = arr => arr.length > 3 ? `${arr.slice(0, 3).join('、')} 等 ${arr.length} 项` : arr.join('、');
    const add = ac.filter(c => !bc.includes(c)), del = bc.filter(c => !ac.includes(c));
    const seg = [];
    if (add.length) seg.push(`新增 ${brief(add)}`);
    if (del.length) seg.push(`删除 ${brief(del)}`);
    if (seg.length) out.push(`可选值:${seg.join('；')}`);
  }
  return out.join('；') || '无变化';
}

/* 操作日志弹窗
   一律列全部日志(含已删除的分拣项,删除记录不被丢掉);选中分拣项时关键词带出该项名称
   对齐退仓/增值页日志弹窗范式:筛选条 + 表格 + 关闭 */
function siLogModal() {
  return `
    <div class="rw-modal" id="siLogMask" style="display:none">
      <div class="rw-modal-mask" onclick="SiPage.closeLog()"></div>
      <div class="rw-modal-panel rw-modal-panel--log rw-modal-panel--scroll">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="siLogTitle">操作日志 — 分拣项配置（含已删除）</span>
          <button class="rw-modal-close" onclick="SiPage.closeLog()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="rw-log-filter">
            <label>关键词</label>
            <input class="ipt" id="siLogKw" placeholder="分拣项 / 字段标识 / 操作人 / 内容"
                   onkeydown="if(event.key==='Enter'){SiPage.doLogQuery()}" />
            <button class="btn" onclick="SiPage.doLogQuery()">🔍 查询</button>
            <span class="rw-log-count" id="siLogCount"></span>
          </div>
          <table class="grid si-log-grid" style="width:100%;">
            <thead><tr><th>NO.</th><th>分拣项</th><th>字段标识</th><th>操作人</th>
              <th>操作时间</th><th>操作网点</th><th>操作内容</th></tr></thead>
            <tbody id="siLogBody"></tbody>
          </table>
        </div>
        <div class="rw-modal-footer">
          <button class="btn btn--primary" onclick="SiPage.closeLog()">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* 列表运算符列:直接列运算符名称,超出由列宽省略号截断,悬浮看全量(含表达式) */
function siOpsCell(it) {
  const full = it.ops.map(c => {
    const o = SIR_OP_MAP[c];
    return o ? `${o.label} ${o.expr}` : c;
  }).join('；');
  const names = it.ops.map(c => (SIR_OP_MAP[c] || {}).label || c).join('、');
  return `<span title="${full}">${names}</span>`;
}

/* 编辑器可选值区(三选:手工清单 / 接口数据源 / 无-直接填值;决定值形态
   选「无」时需选数据类型:数字→数值 / 字符串→文本) */
function siValBodyHtml() {
  const d = SiPage.draft;
  const vs = d.valSource || { kind: 'manual', values: [] };
  const k = vs.kind === 'none' ? 'none' : vs.kind;
  const dt = vs.dataType === 'str' ? 'str' : vs.dataType === 'num' ? 'num' : '';   /* 不预选,必填 */
  return `
    <div class="rw-form-row" style="margin-bottom:8px">
      <label class="rw-form-label">可选值来源</label>
      <label class="lrb-check" style="margin-right:14px"><input type="radio" name="siVKind" value="manual"
        ${k === 'manual' ? 'checked' : ''} onchange="SiPage.setValKind('manual')" />手工清单</label>
      <label class="lrb-check" style="margin-right:14px"><input type="radio" name="siVKind" value="api"
        ${k === 'api' ? 'checked' : ''} onchange="SiPage.setValKind('api')" />接口数据源</label>
      <label class="lrb-check"><input type="radio" name="siVKind" value="none"
        ${k === 'none' ? 'checked' : ''} onchange="SiPage.setValKind('none')" />无(直接填值)</label>
    </div>
    <div class="rw-form-row" id="siValContent" style="margin-bottom:0">
      ${k === 'manual' ? `
        <label class="rw-form-label">值清单</label>
        <div style="flex:1">
          <table class="grid" style="width:100%;max-width:520px">
            <colgroup><col style="width:190px" /><col style="width:270px" /><col style="width:40px" /></colgroup>
            <thead><tr><th>值 code</th><th>显示名</th><th></th></tr></thead>
            <tbody id="siManualRows">${siManualRowsHtml(d)}</tbody>
          </table>
          <button class="btn" style="margin-top:6px" title="在任一输入框按回车也可快速加一行" onclick="SiPage.mvAdd()">➕ 加一行</button>
          <div class="si-dim" style="margin-top:4px">code 必填且不可重复;显示名留空自动取 code;空行保存时自动忽略</div>
        </div>`
      : k === 'api' ? `
        <label class="rw-form-label">数据源</label>
        <div style="flex:1">
          <select class="sel" style="width:320px" id="siVApiKey"
            onchange="SiPage.draft.valSource.apiKey=this.value;SiPage.draft.valSource.note=this.selectedOptions[0].text">
            <option value="product">产品主数据(SPMS 同步)</option>
            <option value="channel">渠道主数据</option>
          </select>
          <div class="si-dim" style="margin-top:4px">随主数据自动更新,无需人工维护</div>
        </div>`
      : `
        <label class="rw-form-label" title="必选：决定值形态(数值/文本)与「等于/不等于」的输入框形态">数据类型 <span style="color:#CF1322">*</span></label>
        <div style="flex:1">
          <div style="display:flex;align-items:center">
            <label class="lrb-check" style="margin-right:14px"><input type="radio" name="siVDataType" value="num"
              ${dt === 'num' ? 'checked' : ''} onchange="SiPage.setDataType('num')" />数字</label>
            <label class="lrb-check"><input type="radio" name="siVDataType" value="str"
              ${dt === 'str' ? 'checked' : ''} onchange="SiPage.setDataType('str')" />字符串</label>
          </div>
        </div>`}
    </div>`;
}

/* ---- 页面逻辑 ---- */
const SiPage = {
  checked: null,
  editingKey: null,     /* null=新建 */
  draft: null,          /* 弹窗草稿 */

  render() {
    const list = SortItemRegistry.items();
    document.getElementById('siGridBody').innerHTML = siListHtml();
    document.getElementById('siTotal').textContent = list.length;
  },
  check(key) { this.checked = key; this.render(); },

  /* ---- 操作日志(工具栏「日志」;选中分拣项 → 关键词带出该项名称) ---- */
  openLog() {
    const it = this.checked ? SortItemRegistry.items().find(i => i.key === this.checked) : null;
    document.getElementById('siLogKw').value = it ? it.name : '';
    this.doLogQuery();
    document.getElementById('siLogMask').style.display = 'flex';
  },
  closeLog() { document.getElementById('siLogMask').style.display = 'none'; },
  /* 过滤:关键词(分拣项 / 字段标识 / 操作人 / 内容);已删除的分拣项日志一并列出并打标 */
  doLogQuery() {
    const kw = (document.getElementById('siLogKw').value || '').trim().toLowerCase();
    const alive = SortItemRegistry.items().map(i => i.key);
    const isDel = l => !alive.includes(l.key);
    let rows = SortItemRegistry.logs();
    if (kw) {
      rows = rows.filter(l => [l.name, l.fieldName, l.u, l.c]
        .some(v => String(v || '').toLowerCase().includes(kw)));
    }
    /* 已删除条数按"当前结果集"算,别把全量数字贴到筛选后的结果上 */
    const delCount = rows.filter(isDel).length;
    document.getElementById('siLogBody').innerHTML = rows.length
      ? rows.map((l, i) => `
          <tr>
            <td class="col--num">${i + 1}</td>
            <td>${l.name || '—'}</td>
            <td class="col--code">${l.fieldName || '—'}</td>
            <td>${l.u}</td>
            <td>${l.t}</td>
            <td>${l.og || '—'}</td>
            <td>${l.c}</td>
          </tr>`).join('')
      : '<tr><td colspan="7" class="cr-empty">没有符合条件的操作记录</td></tr>';
    document.getElementById('siLogCount').textContent =
      `${kw ? `关键词「${document.getElementById('siLogKw').value.trim()}」` : '全部分拣项'} · ${rows.length} 条`
      + `${delCount ? `（含已删除 ${delCount} 条）` : ''}`;
  },

  /* 列表工具栏 */
  addNew() {
    this.editingKey = null;
    this.draft = {
      key: '', name: '', fieldName: '',
      ops: [], valSource: { kind: 'manual', values: [] },
      refCount: 0, updateUser: '庄亚运', updateTime: Helpers.nowTime(),
    };
    this.openEditForm('新增分拣项', false);
  },
  editChecked() {
    if (!this.checked) { Helpers.toast('请先选中一行分拣项'); return; }
    const it = SortItemRegistry.items().find(i => i.key === this.checked);
    this.editingKey = it.key;
    this.draft = JSON.parse(JSON.stringify(it));
    this.openEditForm(`编辑分拣项 — ${it.name}`, it.refCount > 0);
  },
  openEditForm(title, referenced) {
    document.getElementById('siEditTitle').textContent = title;
    document.getElementById('siFName').value = this.draft.name;
    document.getElementById('siFField').value = this.draft.fieldName;
    document.getElementById('siFField').disabled = !!this.editingKey;   /* field_name 保存后不可改 */
    const lockNote = document.getElementById('siLockNote');
    if (referenced) {
      /* 被引用只提示影响面,不锁编辑:移除的运算符在引用规则中显示"已失效"、不再命中 */
      lockNote.style.display = '';
      lockNote.innerHTML = `⚠ 被 ${this.draft.refCount} 条规则引用:修改运算符 / 可选值后,引用规则中的对应条件行会显示「已失效」并停止命中`;
    } else {
      lockNote.style.display = 'none';
    }
    this.renderForm();
    document.getElementById('siEditMask').style.display = 'flex';
  },
  closeEdit() { document.getElementById('siEditMask').style.display = 'none'; },

  renderForm() {
    document.getElementById('siFOps').innerHTML = siOpsCheckHtml();
    document.getElementById('siValBody').innerHTML = siValBodyHtml();
  },
  toggleOp(code, on) {
    const ops = this.draft.ops;
    if (on) { if (!ops.includes(code)) ops.push(code); }
    else { const i = ops.indexOf(code); if (i >= 0) ops.splice(i, 1); }
  },
  setValKind(kind) {
    const d = this.draft;
    if (kind === 'none') {
      const prev = d.valSource && (d.valSource.dataType === 'str' || d.valSource.dataType === 'num')
        ? d.valSource.dataType : null;              /* 保留已选;没选过就留空,由用户必选 */
      d.valSource = { kind: 'none', dataType: prev, note: '直接填值,无可选值' };
    } else if (kind === 'manual') {
      d.valSource = { kind, values: (d.valSource && d.valSource.values) || [] };
    } else {
      d.valSource = { kind, apiKey: (d.valSource && d.valSource.apiKey) || 'product', note: '产品主数据(SPMS 同步)' };
    }
    this.renderForm();
  },
  /* 数据类型:仅「无」时可选(数字→数值 / 字符串→文本) */
  setDataType(t) {
    if (this.draft.valSource.kind !== 'none') return;
    this.draft.valSource.dataType = t === 'str' ? 'str' : 'num';
    this.renderForm();
  },
  /* 手工清单行编辑 */
  mv(i, f, v) {
    const vs = this.draft.valSource.values;
    if (vs[i]) vs[i][f] = v;
    siMarkDup();
  },
  /* 回车=快速加一行(连续录入) */
  mvKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); this.mvAdd(); }
  },
  mvAdd() {
    this.draft.valSource.values.push({ code: '', name: '' });
    this.rerenderManual(true);
  },
  mvDel(i) {
    this.draft.valSource.values.splice(i, 1);
    this.rerenderManual();
  },
  /* 重渲染清单;focusNew=true 时聚焦新行 code 输入框 */
  rerenderManual(focusNew) {
    const tbody = document.getElementById('siManualRows');
    if (!tbody) return;
    tbody.innerHTML = siManualRowsHtml(this.draft);
    siMarkDup();
    if (focusNew) {
      const rows = tbody.querySelectorAll('tr');
      const last = rows[rows.length - 1];
      const inp = last && last.querySelector('input');
      if (inp) inp.focus();
    }
  },

  saveEdit() {
    const list = SortItemRegistry.items();
    const name = document.getElementById('siFName').value.trim();
    if (!name) { Helpers.toast('请填写中文名'); return; }
    const d = this.draft;
    if (!d.ops.length) { Helpers.toast('请至少勾选一个运算符'); return; }
    /* 数据类型必填(仅「可选值来源=无」时):不预选,漏选直接拦截 */
    if (d.valSource.kind === 'none' && d.valSource.dataType !== 'num' && d.valSource.dataType !== 'str') {
      Helpers.toast('请选择数据类型(数字 / 字符串)'); return;
    }
    /* 手工清单校验:至少一行且 code 非空不重复(清单型才查) */
    if (d.valSource.kind === 'manual') {
      const rows = d.valSource.values || [];
      const nonEmpty = rows.filter(r => (r.code || '').trim());
      const codes = nonEmpty.map(r => r.code.trim());
      if (!codes.length) { Helpers.toast('手工清单至少需一行值(填写 code)'); return; }
      if (new Set(codes).size !== codes.length) { Helpers.toast('手工清单 code 不能重复'); return; }
      d.valSource.values = nonEmpty.map(r => ({ code: r.code.trim(), name: (r.name || '').trim() || r.code.trim() }));
    }
    if (!this.editingKey) {
      const field = document.getElementById('siFField').value.trim();
      if (!field || !/^[a-z][a-z0-9_]*$/.test(field)) { Helpers.toast('field_name 需小写 snake_case(字母开头)'); return; }
      if (list.some(i => i.fieldName === field)) { Helpers.toast(`field_name ${field} 已存在`); return; }
      d.key = 'f_' + field; d.fieldName = field; d.name = name;
      list.push(JSON.parse(JSON.stringify(d)));
      SortItemRegistry.addLog({ key: d.key, name, fieldName: field, t: Helpers.nowTime(), u: '庄亚运', og: '东腾曼沙项目仓',
        c: `通过【分拣项配置-新增】新增分拣项：${name}，字段标识：${field}` });
      Helpers.toast(`分拣项「${name}」已新增,规则页刷新后下拉可见`);
    } else {
      const it = list.find(i => i.key === this.editingKey);
      if (!it) return;
      /* 被引用不再锁编辑;移除的运算符会在引用规则中显示"已失效",保存时给影响提示 */
      const removedOps = (it.ops || []).filter(c => !(d.ops || []).includes(c));
      const before = JSON.parse(JSON.stringify(it));
      Object.assign(it, d);
      it.updateUser = '庄亚运'; it.updateTime = Helpers.nowTime();
      /* 无变化不记日志(日志只记真实变更) */
      const diff = siDiffText(before, it);
      if (diff !== '无变化') {
        SortItemRegistry.addLog({ key: it.key, name, fieldName: it.fieldName, t: it.updateTime, u: '庄亚运', og: '东腾曼沙项目仓',
          c: `通过【分拣项配置-编辑】修改分拣项：${name}，变更：${diff}` });
      }
      if (it.refCount > 0 && removedOps.length) {
        Helpers.toast(`已保存:被移除的运算符在 ${it.refCount} 条引用规则中显示「已失效」并不再命中`);
      } else {
        Helpers.toast(`分拣项「${name}」已保存`);
      }
    }
    SortItemRegistry.save(list);
    this.closeEdit();
    this.checked = this.editingKey || d.key;
    this.render();
  },

  delItem() {
    if (!this.checked) { Helpers.toast('请先选中一行分拣项'); return; }
    const list = SortItemRegistry.items();
    const it = list.find(i => i.key === this.checked);
    if (it.refCount > 0) { Helpers.toast(`「${it.name}」被 ${it.refCount} 条规则引用,不可删除;请先在规则中摘除`); return; }
    const i = list.findIndex(x => x.key === this.checked);
    list.splice(i, 1);
    SortItemRegistry.save(list);
    SortItemRegistry.addLog({ key: it.key, name: it.name, fieldName: it.fieldName, t: Helpers.nowTime(), u: '庄亚运', og: '东腾曼沙项目仓',
      c: `通过【分拣项配置-删除】删除分拣项：${it.name}，字段标识：${it.fieldName}` });
    this.checked = null;
    this.render();
    Helpers.toast(`分拣项「${it.name}」已删除`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-sort-item',
  activeTab: 'b2b-order',
  tabs: Layout.tabs.standard(),
  content: `
    <div class="grid-toolbar">
      <button class="btn" onclick="SiPage.addNew()"><span class="ic">➕</span><span>新增</span></button>
      <button class="btn" onclick="SiPage.editChecked()"><span class="ic">✏️</span><span>编辑</span></button>
      <button class="btn" onclick="SiPage.delItem()"><span class="ic">🗑</span><span>删除</span></button>
      <button class="btn" onclick="SiPage.openLog()"><span class="ic">📋</span><span>日志</span></button>
      <span class="sb-toolbar-note">被规则引用的分拣项不可删除;修改运算符 / 可选值会提示影响的规则数</span>
    </div>
    ${siGrid()}
    <div class="pager">
      <button class="pg-btn">«</button><button class="pg-btn">‹</button>
      <button class="pg-btn">›</button><button class="pg-btn">»</button>
      <span class="pg-info">总记录数: <b id="siTotal"></b> 条</span>
    </div>
    ${siEditModal()}
    ${siLogModal()}
  `,
});
SiPage.render();
Helpers.startClock();
