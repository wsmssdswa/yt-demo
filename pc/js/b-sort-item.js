/* ============================================
   b-sort-item.js — 分拣项配置(基础信息·注册表演示)
   分拣项 = 规则可引用的验证维度(field_name 载体),由本页注册表统一维护;
   规则编辑器(分拣分组方案 / 格口规则 / B2B分拣管理)的验证字段下拉从注册表读取。
   本页演示:
     · 新增分拣项免发版——保存后到规则页刷新,下拉即出现新验证字段
     · 被规则引用的项锁定(运行时取值/数据类型/运算符集禁改,弹窗内直接禁用)
     · 运算符集按数据类型给默认全集,收窄能力预留、本期不开放(只读展示)
     · localStorage 存配置(纯静态跨页共享),「重置默认」恢复系统内置种子
   ============================================ */

/* ---- 数据类型与默认运算符(第一期不可改) ---- */
const siTypeName = t => t === 'num' ? '数值' : '枚举';
const siValSourceText = it => {
  const vs = it.valSource;
  if (it.type === 'num') return '无(数值输入)';
  if (vs.kind === 'manual') return `手工清单(${(vs.values || []).length} 项)`;
  return `接口数据源·${vs.apiKey || ''}(${vs.note || ''})`;
};

/* ---- 列表行 ---- */
function siListHtml() {
  const list = SortItemRegistry.items();
  return list.map(it => {
    const st = it.status === 1
      ? '<span class="abn-tag abn-tag--ok">启用</span>'
      : '<span class="abn-tag">停用</span>';
    const pending = it.bindSource.indexOf('待开发') >= 0
      ? '<span class="sb-stale-tag">⚠ 未接数据</span>' : '';
    return `
    <tr data-key="${it.key}" class="${SiPage.checked === it.key ? 'row--selected' : ''}"
        onclick="SiPage.check('${it.key}')">
      <td class="col--check"><input type="checkbox" onclick="event.stopPropagation()" /></td>
      <td>${it.name}</td>
      <td class="col--code">${it.fieldName}</td>
      <td>${siTypeName(it.type)}</td>
      <td>${it.ops.join(' / ')}</td>
      <td>${it.bindSource}${pending}</td>
      <td>${siValSourceText(it)}</td>
      <td class="col--code">${it.refCount}</td>
      <td>${st}</td>
      <td>${it.updateUser}</td>
      <td>${it.updateTime}</td>
    </tr>`;
  }).join('');
}

function siGrid() {
  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup><col style="width:36px" /><col style="width:90px" /><col style="width:140px" />
          <col style="width:60px" /><col style="min-width:150px" /><col style="min-width:160px" />
          <col style="min-width:150px" /><col style="width:80px" /><col style="width:70px" />
          <col style="width:70px" /><col style="width:130px" /></colgroup>
        <thead><tr><th></th><th>中文名</th><th>field_name</th><th>数据类型</th>
          <th title="该分拣项在规则行里可选的验证类型">运算符集</th>
          <th title="签入时这票货的值从哪里拿">运行时取值</th>
          <th title="配规则时内容下拉的候选项来源">编辑器可选值</th>
          <th>被规则引用数</th><th>状态</th><th>更新人</th><th>更新时间</th></tr></thead>
        <tbody id="siGridBody">${siListHtml()}</tbody>
      </table>
    </div>
  `;
}

/* ============================================
   编辑弹窗(排版对齐系统配置弹窗惯例)
   区块: ① 基本信息 ② 取值定义(数据类型/运算符集/运行时取值) ③ 编辑器可选值
   ============================================ */
function siOpsChipsHtml(it) {
  const cur = (it && it.ops) || [];
  if (!cur.length) return '<span class="si-dim">—</span>';
  return cur.map(op => `<span class="sb-chip">${op}</span>`).join('');
}

/* 手工清单:小表格(code / 显示名 / 删除) */
function siManualRowsHtml(it) {
  const rows = (it && it.valSource.kind === 'manual' && it.valSource.values) || [];
  if (!rows.length) {
    return `<tr><td colspan="3" class="cr-empty">暂无值,点击下方「➕ 加一行」添加</td></tr>`;
  }
  return rows.map((v, i) => `
    <tr>
      <td><input class="ipt" style="width:130px" placeholder="值 code,如 US"
        value="${v.code}" oninput="SiPage.mv(${i},'code',this.value)" /></td>
      <td><input class="ipt" style="width:160px" placeholder="显示名,如 美国"
        value="${v.name}" oninput="SiPage.mv(${i},'name',this.value)" /></td>
      <td class="col--check"><button class="si-mrow-del" onclick="SiPage.mvDel(${i})"
        title="删除该行">✕</button></td>
    </tr>`).join('');
}

function siEditModal() {
  return `
    <div class="rw-modal" id="siEditMask" style="display:none">
      <div class="rw-modal-mask" onclick="SiPage.closeEdit()"></div>
      <div class="rw-modal-panel si-panel" style="width:700px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="siEditTitle">新增分拣项</span>
          <button class="rw-modal-close" onclick="SiPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="si-lock-note" id="siLockNote" style="display:none"></div>

          <div class="si-sec-title">基本信息</div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>中文名</label>
            <input class="ipt rw-form-ipt" id="siFName" placeholder="规则编辑器下拉显示的名称,如 目的国" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>field_name</label>
            <div style="flex:1">
              <input class="ipt rw-form-ipt" id="siFField" placeholder="小写 snake_case,如 dest_country_code" style="width:100%" />
              <div class="si-dim" id="siFFieldTip">唯一标识,保存后不可修改</div>
            </div>
          </div>

          <div class="si-sec-title">取值定义</div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>数据类型</label>
            <select class="sel rw-form-ipt" id="siFType" style="width:220px" onchange="SiPage.changeType()">
              <option value="enum">枚举</option>
              <option value="num">数值</option>
            </select>
            <div class="si-dim" style="margin-left:10px" id="siFTypeTip">枚举=按清单取值;数值=数值条件(主单件数等)</div>
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label">运算符集</label>
            <div style="flex:1;padding-top:4px" id="siFOps"></div>
            <div class="si-dim" style="width:200px;text-align:right">按数据类型给默认全集,收窄预留、本期不开放</div>
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>运行时取值</label>
            <select class="sel rw-form-ipt" id="siFBind" style="width:320px"
              onchange="SiPage.draft.bindSource=this.value"></select>
            <div class="si-dim" style="margin-left:10px">签入时这票货的值从哪拿(白名单字段)</div>
          </div>

          <div class="si-sec-title">编辑器可选值</div>
          <div id="siValBody"></div>
        </div>
        <div class="rw-modal-tip">保存后到规则页(分组方案 / 格口规则 / 分拣管理)刷新,验证字段下拉即出现该项</div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="SiPage.closeEdit()">取消</button>
          <button class="btn btn--primary" onclick="SiPage.saveEdit()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* 编辑器可选值区(按类型联动渲染) */
function siValBodyHtml() {
  const d = SiPage.draft;
  if (d.type === 'num') {
    return `<div class="si-val-static">数值型分拣项无可选值,配规则时「内容」为数值输入框</div>`;
  }
  const vs = d.valSource;
  const isManual = vs.kind === 'manual';
  return `
    <div class="rw-form-row" style="margin-bottom:8px">
      <label class="rw-form-label">可选值来源</label>
      <label class="lrb-check" style="margin-right:18px"><input type="radio" name="siVKind" value="manual"
        ${isManual ? 'checked' : ''} onchange="SiPage.setValKind('manual')" />手工清单</label>
      <label class="lrb-check"><input type="radio" name="siVKind" value="api"
        ${!isManual ? 'checked' : ''} onchange="SiPage.setValKind('api')" />接口数据源</label>
    </div>
    <div class="rw-form-row" id="siValContent" style="margin-bottom:0">
      ${isManual ? `
        <label class="rw-form-label">值清单</label>
        <div style="flex:1">
          <table class="grid" style="width:100%;max-width:430px">
            <colgroup><col style="width:150px" /><col style="width:180px" /><col style="width:40px" /></colgroup>
            <thead><tr><th>值 code</th><th>显示名</th><th></th></tr></thead>
            <tbody id="siManualRows">${siManualRowsHtml(d)}</tbody>
          </table>
          <button class="btn" style="margin-top:6px" onclick="SiPage.mvAdd()">➕ 加一行</button>
          <div class="si-dim" style="margin-top:4px">规则编辑器显示中文名,匹配用值本身(code);留空行保存会被拦截</div>
        </div>`
      : `
        <label class="rw-form-label">数据源</label>
        <div style="flex:1">
          <select class="sel" style="width:320px" id="siVApiKey"
            onchange="SiPage.draft.valSource.apiKey=this.value;SiPage.draft.valSource.note=this.selectedOptions[0].text">
            <option value="product">产品主数据(SPMS 同步)</option>
            <option value="channel">渠道主数据</option>
          </select>
          <div class="si-dim" style="margin-top:4px">配规则时实时拉取,随主数据自动更新,无重复维护</div>
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
    document.getElementById('siTotal').textContent =
      `${list.filter(i => i.status === 1).length} 个启用 / ${list.length} 个分拣项`;
  },
  check(key) { this.checked = key; this.render(); },

  /* 列表工具栏 */
  addNew() {
    this.editingKey = null;
    this.draft = {
      key: '', name: '', fieldName: '', type: 'enum',
      ops: SIR_OPS_BY_TYPE.enum.slice(), bindSource: '订单属性字段 product_code',
      valSource: { kind: 'manual', values: [] }, refCount: 0, status: 1,
      updateUser: '庄亚运', updateTime: Helpers.nowTime(),
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
  openEditForm(title, locked) {
    document.getElementById('siEditTitle').textContent = title;
    document.getElementById('siFName').value = this.draft.name;
    document.getElementById('siFField').value = this.draft.fieldName;
    document.getElementById('siFField').disabled = !!this.editingKey;   /* field_name 保存后不可改 */
    document.getElementById('siFType').value = this.draft.type;
    document.getElementById('siFType').disabled = locked;
    document.getElementById('siFBind').disabled = locked;
    const lockNote = document.getElementById('siLockNote');
    if (locked) {
      lockNote.style.display = '';
      lockNote.innerHTML = `🔒 被 ${this.draft.refCount} 条规则引用:数据类型 / 运算符集 / 运行时取值已锁定,如需调整请先在规则中摘除;中文名仍可修改`;
    } else {
      lockNote.style.display = 'none';
    }
    this.renderForm();
    if (locked) {
      /* 被引用锁定:编辑器可选值区(radio/值表/接口源)一并禁用 */
      document.getElementById('siValBody').querySelectorAll('input,select,button').forEach(el => { el.disabled = true; });
    }
    document.getElementById('siEditMask').style.display = 'flex';
  },
  closeEdit() { document.getElementById('siEditMask').style.display = 'none'; },

  renderForm() {
    const d = this.draft;
    document.getElementById('siFOps').innerHTML = siOpsChipsHtml(d);
    document.getElementById('siFBind').innerHTML = SIR_BIND_SOURCES.map(s =>
      `<option value="${s.name}" ${d.bindSource === s.name ? 'selected' : ''}>${s.name}</option>`).join('');
    document.getElementById('siValBody').innerHTML = siValBodyHtml();
  },
  changeType() {
    const t = document.getElementById('siFType').value;
    const old = this.draft;
    this.draft.type = t;
    this.draft.ops = SIR_OPS_BY_TYPE[t].slice();
    /* 数值→枚举:给回手工清单空表;枚举→数值:切 none */
    if (t === 'num') {
      this.draft.valSource = { kind: 'none', note: '数值输入,无可选值' };
    } else if (!old.valSource || old.valSource.kind === 'none') {
      this.draft.valSource = { kind: 'manual', values: [] };
    }
    this.renderForm();
  },
  setValKind(kind) {
    const d = this.draft;
    if (kind === 'manual' && (!d.valSource.values)) d.valSource.values = [];
    d.valSource.kind = kind;
    this.renderForm();
  },
  /* 手工清单行编辑 */
  mv(i, f, v) {
    const vs = this.draft.valSource.values;
    if (vs[i]) vs[i][f] = v;
  },
  mvAdd() {
    this.draft.valSource.values.push({ code: '', name: '' });
    document.getElementById('siManualRows').innerHTML = siManualRowsHtml(this.draft);
  },
  mvDel(i) {
    this.draft.valSource.values.splice(i, 1);
    document.getElementById('siManualRows').innerHTML = siManualRowsHtml(this.draft);
  },

  saveEdit() {
    const list = SortItemRegistry.items();
    const name = document.getElementById('siFName').value.trim();
    if (!name) { Helpers.toast('请填写中文名'); return; }
    const d = this.draft;
    /* 手工清单校验:至少一行且 code 非空不重复 */
    if (d.type === 'enum' && d.valSource.kind === 'manual') {
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
      Helpers.toast(`分拣项「${name}」已新增(演示),规则页刷新后下拉可见`);
    } else {
      const it = list.find(i => i.key === this.editingKey);
      if (!it) return;
      if (it.refCount > 0) {
        /* 锁定项 UI 已禁用类型/取值/运算符/可选值,此处兜底:只允许中文名变更 */
        const lockedF = ['type', 'bindSource', 'ops', 'valSource'];
        if (lockedF.some(f => JSON.stringify(d[f]) !== JSON.stringify(it[f]))) {
          Helpers.toast('该项被规则引用,不允许修改类型/取值/运算符/可选值;请先在规则中摘除'); return;
        }
        it.name = name;
      } else {
        Object.assign(it, d);
      }
      it.updateUser = '庄亚运'; it.updateTime = Helpers.nowTime();
      Helpers.toast(`分拣项「${name}」已保存(演示)`);
    }
    SortItemRegistry.save(list);
    this.closeEdit();
    this.checked = this.editingKey || d.key;
    this.render();
  },

  toggleStatus(st) {
    if (!this.checked) { Helpers.toast('请先选中一行分拣项'); return; }
    const list = SortItemRegistry.items();
    const it = list.find(i => i.key === this.checked);
    if (it.refCount > 0) { Helpers.toast(`「${it.name}」被 ${it.refCount} 条规则引用,不可停用;请先在规则中摘除`); return; }
    it.status = st;
    it.updateUser = '庄亚运'; it.updateTime = Helpers.nowTime();
    SortItemRegistry.save(list);
    this.render();
    Helpers.toast(`分拣项「${it.name}」已${st === 1 ? '启用' : '停用'}(演示)`);
  },
  delItem() {
    if (!this.checked) { Helpers.toast('请先选中一行分拣项'); return; }
    const list = SortItemRegistry.items();
    const it = list.find(i => i.key === this.checked);
    if (it.refCount > 0) { Helpers.toast(`「${it.name}」被 ${it.refCount} 条规则引用,不可删除;请先在规则中摘除`); return; }
    const i = list.findIndex(x => x.key === this.checked);
    list.splice(i, 1);
    SortItemRegistry.save(list);
    this.checked = null;
    this.render();
    Helpers.toast(`分拣项「${it.name}」已删除(演示)`);
  },
  resetAll() {
    SortItemRegistry.reset();
    this.checked = null;
    this.render();
    Helpers.toast('已重置为系统内置分拣项(演示)');
  },
  showHelp() { document.getElementById('siHelpMask').style.display = 'flex'; },
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
      <button class="btn" onclick="SiPage.toggleStatus(1)"><span class="ic">▶️</span><span>启用</span></button>
      <button class="btn" onclick="SiPage.toggleStatus(0)"><span class="ic">⏸</span><span>停用</span></button>
      <button class="btn" onclick="SiPage.delItem()"><span class="ic">🗑</span><span>删除</span></button>
      <span class="sep"></span>
      <button class="btn" onclick="SiPage.resetAll()"><span class="ic">🔄</span><span>重置默认</span></button>
      <button class="btn" onclick="SiPage.showHelp()"><span class="ic">❓</span><span>说明</span></button>
      <span class="sb-toolbar-note">分拣项由本页注册表统一维护,规则编辑器下拉从注册表读取——新增分拣项免发版;被规则引用的项锁定(不可删/停用/改取值)</span>
    </div>
    ${siGrid()}
    <div class="pager">
      <button class="pg-btn">«</button><button class="pg-btn">‹</button>
      <button class="pg-btn">›</button><button class="pg-btn">»</button>
      <span class="pg-info">总记录数: <b id="siTotal"></b> 条</span>
    </div>
    ${siEditModal()}
    <div class="rw-modal" id="siHelpMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('siHelpMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:520px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">分拣项配置说明(注册表)</span>
          <button class="rw-modal-close" onclick="document.getElementById('siHelpMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="lr-help-step"><b>① 分拣项 = 规则可引用的验证维度</b>(field_name 载体),规则编辑器每一行「验证字段」下拉 = 引用一个启用中的分拣项</div>
          <div class="lr-help-step"><b>② 运行时取值 vs 编辑器可选值</b>是两回事:前者=签入时这票货的值从哪拿(白名单字段绑定,禁开放表达式);后者=配规则时内容下拉显示什么(手工清单 / 接口数据源;数值项无)</div>
          <div class="lr-help-step"><b>③ 被规则引用的项锁定</b>:不可删除/停用,弹窗内数据类型/运算符集/运行时取值直接禁用——需先在规则中摘除</div>
          <div class="lr-help-step"><b>④ 新增演示</b>:新增一项 → 到 分组方案/格口规则/分拣管理 任一页刷新 → 验证字段下拉即出现(免发版)</div>
          <div class="lr-help-note">配置存浏览器 localStorage,「重置默认」恢复系统内置种子(产品/渠道/异常类型/调拨目的仓/主单件数)</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('siHelpMask').style.display='none'">知道了</button>
        </div>
      </div>
    </div>
  `,
});
SiPage.render();
Helpers.startClock();
