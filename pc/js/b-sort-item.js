/* ============================================
   b-sort-item.js — 分拣项配置(基础信息·注册表演示)
   分拣项 = 规则可引用的验证维度(field_name 载体),由本页注册表统一维护;
   规则编辑器(分拣分组方案 / 格口规则 / B2B分拣管理)的验证字段下拉从注册表读取。
   本页演示:
     · 新增分拣项免发版——保存后到规则页刷新,下拉即出现新验证字段
     · 被规则引用的项锁定(不可删/停用);变更记操作日志
     · localStorage 存配置(纯静态跨页共享),「重置默认」恢复系统内置种子
   ============================================ */

/* ---- 数据类型与默认运算符(第一期不可改,预留收窄) ---- */
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
  return list.map((it, i) => {
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
      <td class="col--code">${it.key}</td>
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
          <col style="width:70px" /><col style="width:130px" /><col style="width:80px" /></colgroup>
        <thead><tr><th></th><th>中文名</th><th>field_name</th><th>数据类型</th>
          <th title="该分拣项在规则行里可选的验证类型">运算符集</th>
          <th title="签入时这票货的值从哪里拿">运行时取值</th>
          <th title="配规则时内容下拉的候选项来源">编辑器可选值</th>
          <th>被规则引用数</th><th>状态</th><th>更新人</th><th>更新时间</th><th>key</th></tr></thead>
        <tbody id="siGridBody">${siListHtml()}</tbody>
      </table>
    </div>
  `;
}

/* ---- 新增/编辑弹窗 ---- */
function siOpsCheckHtml(it) {
  const cur = (it && it.ops) || [];
  return SIR_OPS_BY_TYPE[it && it.type || 'enum'].map(op => `
    <label class="lrb-check" style="margin-right:10px"><input type="checkbox"
      ${cur.includes(op) ? 'checked' : ''} onchange="SiPage.toggleOp('${op}', this.checked)" />${op}</label>
  `).join('');
}
function siManualRowsHtml(it) {
  const rows = (it && it.valSource.kind === 'manual' && it.valSource.values) || [];
  return rows.map((v, i) => `
    <div class="si-mrow">
      <input class="ipt" style="width:140px" placeholder="值 code" value="${v.code}"
        onchange="SiPage.mv(${i},'code',this.value)" />
      <input class="ipt" style="width:160px" placeholder="显示名" value="${v.name}"
        onchange="SiPage.mv(${i},'name',this.value)" />
      <button class="si-mrow-del" onclick="SiPage.mvDel(${i})">✕</button>
    </div>`).join('');
}

function siEditModal() {
  return `
    <div class="rw-modal" id="siEditMask" style="display:none">
      <div class="rw-modal-mask" onclick="SiPage.closeEdit()"></div>
      <div class="rw-modal-panel" style="width:620px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="siEditTitle">新增分拣项</span>
          <button class="rw-modal-close" onclick="SiPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="rw-form-row">
            <label class="rw-form-label">中文名：</label>
            <input class="ipt" id="siFName" style="flex:1" placeholder="如 目的国" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label">field_name：</label>
            <input class="ipt" id="siFField" style="flex:1" placeholder="snake_case,如 dest_country_code(保存后不可改)" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label">数据类型：</label>
            <select class="sel" id="siFType" style="width:180px" onchange="SiPage.changeType()">
              <option value="enum">枚举(包含/不包含)</option>
              <option value="num">数值(大于/小于等)</option>
            </select>
          </div>
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label">运算符集：</label>
            <div style="flex:1;padding-top:5px" id="siFOps"></div>
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label">运行时取值：</label>
            <select class="sel" id="siFBind" style="flex:1"
              onchange="SiPage.draft.bindSource=this.value"></select>
          </div>
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label">编辑器可选值：</label>
            <div style="flex:1">
              <div style="margin-bottom:6px">
                <label class="lrb-check" style="margin-right:14px"><input type="radio" name="siVKind" value="manual"
                  onchange="SiPage.setValKind('manual')" />手工清单</label>
                <label class="lrb-check"><input type="radio" name="siVKind" value="api"
                  onchange="SiPage.setValKind('api')" />接口数据源</label>
                <label class="lrb-check" style="margin-left:14px"><input type="radio" name="siVKind" value="none"
                  onchange="SiPage.setValKind('none')" />无(数值输入)</label>
              </div>
              <div id="siVManual"><div id="siManualRows"></div>
                <button class="btn" style="margin-top:4px" onclick="SiPage.mvAdd()">➕ 加一行</button></div>
              <div id="siVApi" style="display:none">
                <select class="sel" style="width:100%" id="siVApiKey">
                  <option value="product">产品主数据(SPMS 同步)</option>
                  <option value="channel">渠道主数据</option>
                  <option value="destOrg">目的仓主数据</option>
                </select>
              </div>
            </div>
          </div>
          <div class="sb-policy-note">ℹ 保存后到规则页(分组方案/格口规则/分拣管理)刷新,验证字段下拉即出现该项;运算符集第一期按数据类型给默认全集(勾选收窄预留)</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="SiPage.closeEdit()">取消</button>
          <button class="btn btn--primary" onclick="SiPage.saveEdit()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const SiPage = {
  checked: null,
  editingKey: null,     /* null=新建 */
  draft: null,          /* 弹窗草稿 */

  render() {
    document.getElementById('siGridBody').innerHTML = siListHtml();
    document.getElementById('siTotal').textContent =
      `${SortItemRegistry.items().filter(i => i.status === 1).length} 个启用 / ${SortItemRegistry.items().length} 个分拣项`;
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
    document.getElementById('siEditTitle').textContent = '新增分拣项';
    document.getElementById('siFName').value = '';
    document.getElementById('siFField').value = '';
    document.getElementById('siFField').disabled = false;
    document.getElementById('siFType').value = 'enum';
    this.renderForm();
    document.getElementById('siEditMask').style.display = 'flex';
  },
  editChecked() {
    if (!this.checked) { Helpers.toast('请先选中一行分拣项'); return; }
    const it = SortItemRegistry.items().find(i => i.key === this.checked);
    this.editingKey = it.key;
    this.draft = JSON.parse(JSON.stringify(it));
    document.getElementById('siEditTitle').textContent = `编辑分拣项 — ${it.name}`;
    document.getElementById('siFName').value = it.name;
    document.getElementById('siFField').value = it.fieldName;
    document.getElementById('siFField').disabled = true;   /* field_name 不可改 */
    document.getElementById('siFType').value = it.type;
    this.renderForm();
    document.getElementById('siEditMask').style.display = 'flex';
  },
  closeEdit() { document.getElementById('siEditMask').style.display = 'none'; },

  renderForm() {
    const d = this.draft;
    document.getElementById('siFOps').innerHTML = siOpsCheckHtml(d);
    document.getElementById('siFBind').innerHTML = SIR_BIND_SOURCES.map(s =>
      `<option value="${s.name}" ${d.bindSource === s.name ? 'selected' : ''}>${s.name}</option>`).join('');
    const vk = d.type === 'num' ? 'none' : d.valSource.kind;
    document.querySelectorAll('input[name=siVKind]').forEach(r => {
      r.checked = r.value === (d.type === 'num' ? 'none' : d.valSource.kind);
      r.disabled = d.type === 'num' && r.value !== 'none';
    });
    this.setValKind(vk);
  },
  changeType() {
    const t = document.getElementById('siFType').value;
    this.draft.type = t;
    this.draft.ops = SIR_OPS_BY_TYPE[t].slice();
    this.draft.valSource = t === 'num'
      ? { kind: 'none', note: '数值输入,无可选值' }
      : { kind: 'manual', values: [] };
    this.renderForm();
  },
  toggleOp(op, on) {
    const ops = this.draft.ops;
    if (on) { if (!ops.includes(op)) ops.push(op); }
    else { const i = ops.indexOf(op); if (i >= 0) ops.splice(i, 1); }
  },
  setValKind(kind) {
    const d = this.draft;
    d.valSource = d.valSource || { kind: 'manual', values: [] };
    d.valSource.kind = kind;
    if (kind === 'none') d.valSource = { kind: 'none', note: '数值输入,无可选值' };
    document.getElementById('siVManual').style.display = kind === 'manual' ? '' : 'none';
    document.getElementById('siVApi').style.display = kind === 'api' ? '' : 'none';
    if (kind === 'manual') document.getElementById('siManualRows').innerHTML = siManualRowsHtml(d);
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
    if (!this.editingKey) {
      const field = document.getElementById('siFField').value.trim();
      if (!field || !/^[a-z][a-z0-9_]*$/.test(field)) { Helpers.toast('field_name 需 snake_case(小写字母开头)'); return; }
      if (list.some(i => i.fieldName === field)) { Helpers.toast(`field_name ${field} 已存在`); return; }
      const key = 'f_' + field;
      this.draft.key = key; this.draft.fieldName = field; this.draft.name = name;
      list.push(this.draft);
      Helpers.toast(`分拣项「${name}」已新增(演示),规则页刷新后下拉可见`);
    } else {
      const it = list.find(i => i.key === this.editingKey);
      if (!it) return;
      if (it.refCount > 0 && (this.draft.type !== it.type
          || this.draft.bindSource !== it.bindSource
          || this.draft.ops.join() !== it.ops.join())) {
        Helpers.toast('该项被规则引用,不允许修改字段绑定/类型/运算符;请先在规则中摘除'); return;
      }
      it.name = name;
      Object.assign(it, this.draft);
      it.updateUser = '庄亚运'; it.updateTime = Helpers.nowTime();
      Helpers.toast(`分拣项「${name}」已保存(演示)`);
    }
    SortItemRegistry.save(list);
    this.closeEdit();
    this.checked = this.draft.key;
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
      <span class="sb-toolbar-note">分拣项由本页注册表统一维护,规则编辑器下拉从注册表读取——新增分拣项免发版;被规则引用的项锁定(不可删/停用)</span>
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
          <div class="lr-help-step"><b>③ 被规则引用的项锁定</b>:不可删除/停用/改字段绑定与类型,需先在规则中摘除——规则页演示数据引用数固定(静态原型)</div>
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
