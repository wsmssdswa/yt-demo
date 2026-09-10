/* ============================================
   wh-loc-rule.js — 库位推荐规则配置页(调拨网点方案)
   基线 = 线上 FrmRecommendRule 三窗体还原版;本次叠加「调拨网点」条件:
     1. 行粒度 = 条件集(一条配置意图一行):产品集 + 调拨网点集 + 库位 + 自动上架;
        产品与其他条件项平等,均值多选(产品与调拨网点至少配一项),不按产品拆行
     2. 产品选择对齐线上 uctrlProductMultiSelect:只读框(点击选择产品/已选摘要)
        → 弹「产品选择」弹窗(待选在左/已选在右双表格+各自搜索框+添加/移除按钮,
        双击行或选中行+按钮操作,保存回显摘要,>2 个显前两+等N个,悬停显全量);
        调拨网点为新增字段,跟随同款弹窗式交互(网点代码+网点名称两列)
     3. 调拨网点留空 = 不限;签入时经 LNMS 实时获取推荐调拨网点参与匹配
     4. 多条件固定「全部满足」(AND-only);新建默认停用(对齐线上 rule_status=0)
     5. 防重复 = 同网点+完全相同条件集拦截;命中重叠(可能同时命中)保存拦截,
        库内两两互斥,签入匹配唯一命中(先创建先生效仅作防并发兜底)
   ============================================ */

/* ---- 演示数据(products=产品条件集必配;destOrgs=调拨网点条件集,空=不限) ---- */
const LR_ROWS = [
  { id:1, og:'东腾曼沙项目仓',
    products:['US-MATSU-REG'], destOrgs:['上海仓'],
    locations:['A-01-01','A-01-02'], status:1, autoShelf:0,
    createTime:'2026-05-12 09:30:22', updateTime:'2026-08-02 15:10:08', createUser:'庄亚运', updateUser:'庄亚运' },
  { id:2, og:'东腾曼沙项目仓',
    products:['US-MATSU-REG'], destOrgs:['洛杉矶仓'],
    locations:['B-02-01'], status:1, autoShelf:0,
    createTime:'2026-05-12 10:12:08', updateTime:'2026-07-25 16:10:08', createUser:'庄亚运', updateUser:'李丽' },
  { id:3, og:'东腾曼沙项目仓',
    products:['US-MATSU-ELC','US-KAPAI-ELC'], destOrgs:[],
    locations:['B-02-01','B-02-04'], status:1, autoShelf:1,
    createTime:'2026-05-20 14:22:41', updateTime:'2026-06-18 11:05:33', createUser:'王强', updateUser:'王强' },
  { id:4, og:'东腾曼沙项目仓',
    products:['US-HAIYUN-REG'], destOrgs:[],
    locations:['C-01-01','C-01-05','C-02-02','C-02-08'], status:0, autoShelf:0,
    createTime:'2026-06-01 11:08:15', updateTime:'2026-06-01 11:08:15', createUser:'王强', updateUser:'王强' },
  { id:5, og:'东腾美西中转仓',
    products:['US-MATSU-REG'], destOrgs:[],
    locations:['G-01-01','G-01-04'], status:1, autoShelf:0,
    createTime:'2026-06-15 10:05:44', updateTime:'2026-06-15 10:05:44', createUser:'王强', updateUser:'王强' },
  { id:6, og:'东腾美西中转仓',
    products:['US-HAIYUN-REG'], destOrgs:['纽约仓'],
    locations:['F-03-01'], status:0, autoShelf:0,
    createTime:'2026-06-18 16:22:09', updateTime:'2026-06-18 16:22:09', createUser:'李丽', updateUser:'李丽' },
  { id:7, og:'东腾曼沙项目仓',
    products:['US-BAOHUO-REG'], destOrgs:[],
    locations:['B-06-01','B-06-02'], status:1, autoShelf:1,
    createTime:'2026-07-19 11:31:57', updateTime:'2026-08-10 09:02:33', createUser:'庄亚运', updateUser:'庄亚运' },
  { id:8, og:'东腾美西中转仓',
    products:['US-KAPAI-ELC'], destOrgs:['芝加哥仓','纽约仓'],
    locations:['G-05-01','G-05-02','G-05-03'], status:1, autoShelf:0,
    createTime:'2026-07-28 14:47:20', updateTime:'2026-08-21 17:25:41', createUser:'张敏', updateUser:'张敏' },
  { id:9, og:'东腾曼沙项目仓',
    products:[], destOrgs:['芝加哥仓'],
    locations:['T-01-01'], status:1, autoShelf:0,
    createTime:'2026-08-28 09:15:33', updateTime:'2026-08-28 09:15:33', createUser:'李丽', updateUser:'李丽' },
];

const LR_OGS = ['东腾曼沙项目仓', '东腾美西中转仓'];
const LR_PRODUCT_DICT = [
  { code: 'US-MATSU-REG',  name: '美森快船-普货', en: 'Matson Express General' },
  { code: 'US-MATSU-ELC',  name: '美森快船-带电', en: 'Matson Express Electronic' },
  { code: 'US-HAIYUN-REG', name: '海运普船-普货', en: 'Ocean Freight General' },
  { code: 'US-KAPAI-REG',  name: '海外卡派-普货', en: 'Overseas Trucking General' },
  { code: 'US-KAPAI-ELC',  name: '海外卡派-带电', en: 'Overseas Trucking Electronic' },
  { code: 'US-BAOHUO-REG', name: '普船带电-普货', en: 'Ocean Freight Electronic' },
];
const LR_PRODUCTS = LR_PRODUCT_DICT.map(p => p.code);
function lrProductName(code) {
  const hit = LR_PRODUCT_DICT.find(p => p.code === code);
  return hit ? hit.name : code;
}
/* 调拨网点字典:网点代码(NetworkCoding 风格)+ 网点名称;规则/展示主键仍用名称 */
const LR_DEST_ORGS = [
  { code: 'CNSHA', name: '上海仓' },
  { code: 'USLAX', name: '洛杉矶仓' },
  { code: 'USNYC', name: '纽约仓' },
  { code: 'USCHI', name: '芝加哥仓' },
];

/* 推荐库位列显示:≤3 个逗号分隔,超出取前 3 + "…共N个"(对齐线上 FormatLocationDisplay) */
function lrLocDisplay(locs) {
  if (!locs.length) return '';
  if (locs.length <= 3) return locs.join(', ');
  return `${locs.slice(0, 3).join(', ')} …共${locs.length}个`;
}

/* 产品列:代码(名称);多产品显首个 + 等N个;未配置(仅调拨网点)= - */
function lrProductCell(products) {
  if (!products.length) return '-';
  if (products.length === 1) return `${products[0]}(${lrProductName(products[0])})`;
  return `${products[0]}(${lrProductName(products[0])}) 等${products.length}个`;
}

/* 调拨网点列:纯文本拼接;未配置显示 - */
function lrDestOrgCell(destOrgs) {
  return destOrgs.length ? destOrgs.join(', ') : '-';
}

/* 条件摘要(线上防重复句式):产品/调拨多值顿号连接,未配置 = 不限 */
function lrCondStr(products, destOrgs) {
  return `产品「${products.length ? products.join('、') : '不限'}」调拨网点「${destOrgs.length ? destOrgs.join('、') : '不限'}」`;
}


function lrCondSig(products, destOrgs) {
  return JSON.stringify({ p: [...products].sort(), d: [...destOrgs].sort() });
}

/* 条件集重叠判定(AND 语义):产品集有交集 且 调拨集有交集(空 = 不限 = 全交集) */
function lrCondOverlap(a, b) {
  const prodHit = !a.products.length || !b.products.length ||
    a.products.some(p => b.products.includes(p));
  const destHit = !a.destOrgs.length || !b.destOrgs.length ||
    a.destOrgs.some(d => b.destOrgs.includes(d));
  return prodHit && destHit;
}

/* ---- 查询区(线上 4 条件 + 调拨网点筛选) ---- */
function lrQueryPanel() {
  const f = (label, control) => `<div class="qf"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('启用状态', `<select class="sel" id="lrQStatus"><option value="-1">全部</option><option value="1">启用</option><option value="0">停用</option></select>`)}
        ${f('产品代码', `<select class="sel" id="lrQProduct"><option value="">全部</option>${LR_PRODUCTS.map(p => `<option>${p}</option>`).join('')}</select>`)}
        ${f('操作网点', `<select class="sel" id="lrQOg"><option value="">全部</option>${LR_OGS.map(o => `<option>${o}</option>`).join('')}</select>`)}
        ${f('是否自动上架', `<select class="sel" id="lrQAuto"><option value="-1">全部</option><option value="1">是</option><option value="0">否</option></select>`)}
        ${f('调拨网点', `<select class="sel" id="lrQDestOrg"><option value="">全部</option>${LR_DEST_ORGS.map(o => `<option>${o.name}</option>`).join('')}</select>`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="LrPage.doQuery()">🔍 查询</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 工具栏(线上 6 按钮) ---- */
function lrToolbar() {
  const btn = (icon, text, fn) =>
    `<button class="btn" onclick="${fn}"><span class="ic">${icon}</span><span>${text}</span></button>`;
  return `
    <div class="grid-toolbar">
      ${btn('➕', '新建', 'LrPage.openEdit(0)')}
      ${btn('✏️', '编辑', 'LrPage.editChecked()')}
      ${btn('▶️', '启用', 'LrPage.updateStatus(1)')}
      ${btn('⏸', '停用', 'LrPage.updateStatus(0)')}
      ${btn('🗑', '删除', 'LrPage.deleteChecked()')}
      ${btn('📤', '导出', 'LrPage.doExport()')}
    </div>
  `;
}

/* ---- 列表(线上列结构 + 新增调拨网点列;产品代码/名称合并一列;一行 = 一条条件集规则) ---- */
function lrGridHtml() {
  return LrPage.rows.map(r => `
    <tr data-id="${r.id}">
      <td class="col--check"><input type="checkbox" data-id="${r.id}" onchange="LrPage.toggleCheck(this)" /></td>
      <td>${r.og}</td>
      <td class="col--code" title="${r.products.join('、')}">${lrProductCell(r.products)}</td>
      <td title="${r.destOrgs.length ? r.destOrgs.join('、') : '未配置,任何调拨网点均可命中'}">${lrDestOrgCell(r.destOrgs)}</td>
      <td class="col--code cell-link" title="双击查看库位明细" onclick="LrPage.showLocations(${r.id})">${lrLocDisplay(r.locations)}</td>
      <td>${r.status === 1 ? '<span class="abn-tag abn-tag--ok">启用</span>' : '<span class="abn-tag">停用</span>'}</td>
      <td>${r.autoShelf === 1 ? '是' : '否'}</td>
      <td>${r.createTime}</td>
      <td>${r.updateTime}</td>
      <td>${r.createUser}</td>
      <td>${r.updateUser}</td>
    </tr>
  `).join('');
}

function lrGrid() {
  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup>
          <col style="width:36px" />
          <col style="width:120px" />
          <col style="min-width:210px" />
          <col style="width:120px" />
          <col style="min-width:170px" />
          <col style="width:64px" />
          <col style="width:84px" />
          <col style="width:145px" />
          <col style="width:145px" />
          <col style="width:64px" />
          <col style="width:64px" />
        </colgroup>
        <thead>
          <tr>
            <th></th>
            <th>操作网点</th>
            <th title="产品代码与名称合并展示;多产品显首个+等N个;悬浮查看全量">产品</th>
            <th title="调拨网点条件;未配置=不限,任何调拨网点均可命中">调拨网点</th>
            <th>推荐库位</th>
            <th>启用状态</th>
            <th>是否自动上架</th>
            <th>创建时间</th>
            <th>更新时间</th>
            <th>创建人</th>
            <th>更新人</th>
          </tr>
        </thead>
        <tbody id="lrGridBody">${lrGridHtml()}</tbody>
      </table>
    </div>
  `;
}

function lrPager() {
  return `
    <div class="pager">
      <button class="pg-btn" title="首页">«</button>
      <button class="pg-btn" title="上一页">‹</button>
      <button class="pg-btn" title="下一页">›</button>
      <button class="pg-btn" title="末页">»</button>
      <span class="pg-info">总记录数: <b id="lrTotal">${LR_ROWS.length}</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go">
        <input class="ipt" value="" />
        <button class="pg-btn">GO</button>
        <select class="sel"><option>50</option><option>100</option><option>200</option></select>
      </span>
    </div>
  `;
}

/* 选择框(线上 uctrlProductMultiSelect 形态:只读框,点击弹窗选择,回显摘要) */
function lrPickField(id, openFn, ph) {
  return `
    <div class="lrb-pick-wrap">
      <div class="lrb-pick" id="${id}" onclick="${openFn}" title="">${ph}</div>
    </div>
  `;
}

/* ---- 编辑弹窗(线上平铺形态 + 调拨网点字段) ---- */
function lrEditModal() {
  return `
    <div class="rw-modal" id="lrEditMask" style="display:none">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel" style="width:560px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">编辑规则</span>
          <button class="rw-modal-close" onclick="LrPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="rw-form-row">
            <label class="rw-form-label">操作网点：</label>
            <select class="sel" id="lrFOg" style="flex:1">
              ${LR_OGS.map(o => `<option>${o}</option>`).join('')}
            </select>
          </div>
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label">产品代码：</label>
            ${lrPickField('lrFProduct', 'LrPage.openPicker(\'product\')', '点击选择产品')}
          </div>
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label">调拨网点：</label>
            <div style="flex:1">
              ${lrPickField('lrFDestOrg', 'LrPage.openPicker(\'destOrg\')', '点击选择调拨网点')}
              <div class="sb-cond-note">未选择 = 不限(产品与调拨网点至少填一项)</div>
            </div>
          </div>
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label">推荐库位：</label>
            <textarea class="ipt" id="lrFLocations" rows="5" style="flex:1;resize:vertical;font-family:Consolas,monospace"
              placeholder="多个库位用换行或逗号分隔,最多 100 个"></textarea>
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"></label>
            <label class="lrb-check"><input type="checkbox" id="lrFAutoShelf" /> 是否自动上架</label>
          </div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn btn--primary" onclick="LrPage.saveEdit()">保存</button>
          <button class="btn" onclick="LrPage.closeEdit()">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 推荐库位明细弹窗(线上 FrmRecommendRuleLocations) ---- */
function lrLocationsModal() {
  return `
    <div class="rw-modal" id="lrLocMask" style="display:none">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel" style="width:420px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="lrLocTitle">推荐库位</span>
          <button class="rw-modal-close" onclick="document.getElementById('lrLocMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="lrb-loc-count" id="lrLocCount">共 0 个库位</div>
          <div class="lrb-loc-list" id="lrLocList"></div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('lrLocMask').style.display='none'">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 选择弹窗(线上 FormProductMultiSelector 布局微调:待选在左/已选在右,中间添加/移除) ---- */
function lrPickerModal() {
  return `
    <div class="rw-modal" id="lrPickerMask" style="display:none">
      <div class="rw-modal-mask" onclick="LrPage.closePicker()"></div>
      <div class="rw-modal-panel lrb-picker-panel" style="width:720px" tabindex="-1">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="lrPickerTitle">产品选择</span>
          <button class="rw-modal-close" onclick="LrPage.closePicker()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="lrb-picker">
            <div class="lrb-picker-col">
              <div class="lrb-picker-head" id="lrPickerPendHead">待选产品</div>
              <input class="ipt lrb-picker-search" id="lrPickerPendFilter" placeholder="输入代码/名称过滤"
                oninput="LrPage.pickerFilter('pend')" />
              <div class="lrb-picker-gridwrap">
                <table class="grid lrb-picker-grid">
                  <colgroup id="lrPickerPendCols"></colgroup>
                  <thead id="lrPickerPendHeadRow"></thead>
                  <tbody id="lrPickerPendBody"></tbody>
                </table>
              </div>
            </div>
            <div class="lrb-picker-mid">
              <button class="btn" id="lrPickerAddBtn" onclick="LrPage.pickerAdd()">添加</button>
              <button class="btn" id="lrPickerRemoveBtn" onclick="LrPage.pickerRemove()">移除</button>
            </div>
            <div class="lrb-picker-col">
              <div class="lrb-picker-head" id="lrPickerSelHead">已选产品</div>
              <input class="ipt lrb-picker-search" id="lrPickerSelFilter" placeholder="输入代码/名称过滤"
                oninput="LrPage.pickerFilter('sel')" />
              <div class="lrb-picker-gridwrap">
                <table class="grid lrb-picker-grid">
                  <colgroup id="lrPickerSelCols"></colgroup>
                  <thead id="lrPickerSelHeadRow"></thead>
                  <tbody id="lrPickerSelBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn btn--primary" onclick="LrPage.savePicker()">保存</button>
          <button class="btn" onclick="LrPage.closePicker()">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const LrPage = {
  rows: LR_ROWS.slice(),
  checked: new Set(),
  editingId: 0,
  productTags: [],
  destOrgTags: [],
  /* 选择弹窗状态(mode: product|destOrg;cur: 当前选中行 {side, key}) */
  picker: { mode: '', sel: [], pendFilter: '', selFilter: '', cur: null },

  doQuery() {
    const og = document.getElementById('lrQOg').value;
    const pd = document.getElementById('lrQProduct').value;
    const st = document.getElementById('lrQStatus').value;
    const au = document.getElementById('lrQAuto').value;
    const de = document.getElementById('lrQDestOrg').value;
    this.rows = LR_ROWS.filter(r =>
      (!og || r.og === og) &&
      (!pd || r.products.includes(pd)) &&
      (st === '-1' || String(r.status) === st) &&
      (au === '-1' || String(r.autoShelf) === au) &&
      (!de || r.destOrgs.includes(de))
    );
    document.getElementById('lrTotal').textContent = this.rows.length;
    document.getElementById('lrGridBody').innerHTML = lrGridHtml();
    this.checked.clear();
    if (!this.rows.length) Helpers.toast('未查询到记录！');
  },

  toggleCheck(el) {
    if (el.checked) this.checked.add(Number(el.dataset.id));
    else this.checked.delete(Number(el.dataset.id));
  },

  getCheckedRows() { return this.rows.filter(r => this.checked.has(r.id)); },

  editChecked() {
    const rows = this.getCheckedRows();
    if (!rows.length) { Helpers.toast('请勾选要修改的规则！'); return; }
    if (rows.length > 1) { Helpers.toast('编辑仅支持单选！'); return; }
    this.openEdit(rows[0].id);
  },

  openEdit(id) {
    this.editingId = id;
    const row = id > 0 ? this.rows.find(r => r.id === id) : null;
    /* 新建默认回显当前用户网点(线上行为);编辑时网点+产品锁定 */
    this.productTags = row ? [...row.products] : [];
    this.destOrgTags = row ? [...row.destOrgs] : [];
    document.getElementById('lrFOg').disabled = !!row;
    this.renderPickFields();
    if (row) {
      document.getElementById('lrFOg').value = row.og;
      document.getElementById('lrFLocations').value = row.locations.join('\n');
      document.getElementById('lrFAutoShelf').checked = row.autoShelf === 1;
    } else {
      document.getElementById('lrFOg').value = LR_OGS[0];
      document.getElementById('lrFLocations').value = '';
      document.getElementById('lrFAutoShelf').checked = false;
    }
    document.getElementById('lrEditMask').style.display = 'flex';
  },

  closeEdit() { document.getElementById('lrEditMask').style.display = 'none'; },

  /* ---- 选择弹窗(线上 uctrlProductMultiSelect + FormProductMultiSelector 同款) ---- */
  pickerAll() {
    return this.picker.mode === 'product'
      ? LR_PRODUCT_DICT
      : LR_DEST_ORGS.map(n => ({ name: n }));
  },
  pickerKey(item) { return this.picker.mode === 'product' ? item.code : item.name; },
  pickerLabel() { return this.picker.mode === 'product' ? '产品' : '调拨网点'; },

  openPicker(mode) {
    if (mode === 'product' && this.editingId > 0) { Helpers.toast('产品不可修改'); return; }
    this.picker.mode = mode;
    this.picker.pendFilter = '';
    this.picker.selFilter = '';
    this.picker.cur = null;
    this.picker.sel = mode === 'product' ? [...this.productTags] : [...this.destOrgTags];
    const label = this.pickerLabel();
    document.getElementById('lrPickerTitle').textContent = `${label}选择`;
    document.getElementById('lrPickerSelHead').textContent = `已选${label}`;
    document.getElementById('lrPickerPendHead').textContent = `待选${label}`;
    document.getElementById('lrPickerSelFilter').value = '';
    document.getElementById('lrPickerPendFilter').value = '';
    this.renderPicker();
    document.getElementById('lrPickerMask').style.display = 'flex';
    document.querySelector('.lrb-picker-panel').focus();
  },

  pickerFilter(side) {
    const v = document.getElementById(side === 'sel' ? 'lrPickerSelFilter' : 'lrPickerPendFilter').value.trim();
    if (side === 'sel') this.picker.selFilter = v; else this.picker.pendFilter = v;
    this.renderPicker();
  },

  renderPicker() {
    const isProd = this.picker.mode === 'product';
    const all = this.pickerAll();
    const selSet = new Set(this.picker.sel);
    const match = (item, q) => !q || [item.code, item.name, item.en]
      .filter(Boolean).some(v => v.includes(q));
    const selRows = all.filter(i => selSet.has(this.pickerKey(i)) && match(i, this.picker.selFilter));
    const pendRows = all.filter(i => !selSet.has(this.pickerKey(i)) && match(i, this.picker.pendFilter));

    const cols = isProd
      ? '<col style="width:36%"/><col style="width:30%"/><col style="width:34%"/>'
      : '<col style="width:100%"/>';
    const heads = isProd
      ? '<tr><th>产品代码</th><th>中文名称</th><th>英文名称</th></tr>'
      : '<tr><th>网点名称</th></tr>';
    const rowHtml = (i, side) => {
      const k = this.pickerKey(i);
      const marked = this.picker.cur && this.picker.cur.side === side && this.picker.cur.key === k;
      const dbl = side === 'pend' ? `LrPage.pickerAdd('${k}')` : `LrPage.pickerRemove('${k}')`;
      const mark = `LrPage.pickerMark('${side}','${k}')`;
      const cls = marked ? ' class="row--picked"' : '';
      return isProd
        ? `<tr${cls} onclick="${mark}" ondblclick="${dbl}"><td class="col--code">${i.code}</td><td>${i.name}</td><td>${i.en}</td></tr>`
        : `<tr${cls} onclick="${mark}" ondblclick="${dbl}"><td>${i.name}</td></tr>`;
    };
    const empty = which => `<tr class="lrb-picker-empty"><td colspan="${isProd ? 3 : 1}">${which}</td></tr>`;

    document.getElementById('lrPickerSelCols').innerHTML = cols;
    document.getElementById('lrPickerPendCols').innerHTML = cols;
    document.getElementById('lrPickerSelHeadRow').innerHTML = heads;
    document.getElementById('lrPickerPendHeadRow').innerHTML = heads;
    document.getElementById('lrPickerSelBody').innerHTML =
      selRows.length ? selRows.map(i => rowHtml(i, 'sel')).join('') : empty('暂无已选');
    document.getElementById('lrPickerPendBody').innerHTML =
      pendRows.length ? pendRows.map(i => rowHtml(i, 'pend')).join('') : empty('暂无待选');
  },

  pickerMark(side, key) {
    this.picker.cur = { side, key };
    this.renderPicker();
  },

  /* 添加:待选当前行(或双击行) → 已选;无当前行提示(线上无选中时静默,原型提示更直观) */
  pickerAdd(key) {
    key = key || (this.picker.cur && this.picker.cur.side === 'pend' && this.picker.cur.key);
    if (!key) { Helpers.toast(`请先选中待选${this.pickerLabel()}`); return; }
    if (!this.picker.sel.includes(key)) this.picker.sel.push(key);
    this.picker.cur = null;
    this.renderPicker();
  },

  /* 移除:已选当前行(或双击行) → 移出 */
  pickerRemove(key) {
    key = key || (this.picker.cur && this.picker.cur.side === 'sel' && this.picker.cur.key);
    if (!key) { Helpers.toast(`请先选中已选${this.pickerLabel()}`); return; }
    this.picker.sel = this.picker.sel.filter(k => k !== key);
    this.picker.cur = null;
    this.renderPicker();
  },

  savePicker() {
    /* 产品上限对齐线上服务端校验(产品数量不能超过20) */
    if (this.picker.mode === 'product' && this.picker.sel.length > 20) {
      Helpers.toast('产品数量不能超过20'); return;
    }
    if (this.picker.mode === 'product') this.productTags = [...this.picker.sel];
    else this.destOrgTags = [...this.picker.sel];
    this.renderPickFields();
    document.getElementById('lrPickerMask').style.display = 'none';
  },

  closePicker() { document.getElementById('lrPickerMask').style.display = 'none'; },

  /* ---- 选择框回显摘要(线上 UpdateDisplay:≤2 全显中文名,>2 前两+等N,悬停显全量) ---- */
  renderPickFields() {
    const pBox = document.getElementById('lrFProduct');
    const pNames = this.productTags.map(lrProductName);
    pBox.classList.toggle('lrb-pick--locked', this.editingId > 0);
    if (!pNames.length) {
      pBox.textContent = '点击选择产品';
      pBox.classList.add('lrb-pick--empty');
      pBox.title = '';
    } else {
      pBox.classList.remove('lrb-pick--empty');
      pBox.textContent = pNames.length <= 2
        ? pNames.join('、')
        : `${pNames[0]}、${pNames[1]} 等${pNames.length}个产品`;
      pBox.title = pNames.join('、');
    }
    const dBox = document.getElementById('lrFDestOrg');
    if (!this.destOrgTags.length) {
      dBox.textContent = '点击选择调拨网点';
      dBox.classList.add('lrb-pick--empty');
      dBox.title = '';
    } else {
      dBox.classList.remove('lrb-pick--empty');
      dBox.textContent = this.destOrgTags.length <= 2
        ? this.destOrgTags.join('、')
        : `${this.destOrgTags[0]}、${this.destOrgTags[1]} 等${this.destOrgTags.length}个网点`;
      dBox.title = this.destOrgTags.join('、');
    }
  },

  saveEdit() {
    /* 库位解析对齐线上:换行/半角逗号/中文逗号分隔,去空白去重 */
    const raw = document.getElementById('lrFLocations').value || '';
    const locs = [...new Set(raw.split(/[\n,，]/).map(s => s.trim()).filter(Boolean))];
    if (!locs.length) { Helpers.toast('请至少添加一个推荐库位'); return; }
    if (locs.length > 100) { Helpers.toast('推荐库位数量不能超过100'); return; }
    /* 产品与调拨网点至少配置一项(都空 = 无条件,不允许) */
    if (!this.productTags.length && !this.destOrgTags.length) {
      Helpers.toast('产品与调拨网点至少配置一项'); return;
    }
    const og = document.getElementById('lrFOg').value;
    if (!og) { Helpers.toast('请选择操作网点'); return; }

    if (this.editingId === 0) {
      /* 防重复:同网点+完全相同条件集(产品集+调拨网点集);文案对齐线上防重复句式 */
      const sig = lrCondSig(this.productTags, this.destOrgTags);
      if (LR_ROWS.some(r => r.og === og && lrCondSig(r.products, r.destOrgs) === sig)) {
        Helpers.toast(`操作网点「${og}」下${lrCondStr(this.productTags, this.destOrgTags)}已存在相同条件的规则，不可重复创建`); return;
      }
    }
    /* 重叠拦截:与同网点任意已有规则(含停用)可能同时命中 → 不允许保存,
       库内规则两两互斥,签入匹配永远唯一命中(先创建先生效退化为防并发的兜底) */
    const overlapRow = LR_ROWS.find(r =>
      r.og === og && r.id !== this.editingId &&
      lrCondSig(r.products, r.destOrgs) !== lrCondSig(this.productTags, this.destOrgTags) &&
      lrCondOverlap({ products: this.productTags, destOrgs: this.destOrgTags }, r));
    if (overlapRow) {
      Helpers.toast(`操作网点「${og}」下${lrCondStr(this.productTags, this.destOrgTags)}已存在可能同时命中的规则，不可创建，请调整或停用已有规则`); return;
    }

    if (this.editingId === 0) {
      /* 一条规则一行(条件集粒度);新建默认停用(对齐线上 rule_status=0,手动启用生效) */
      const now = Helpers.nowTime();
      const maxId = Math.max(...LR_ROWS.map(r => r.id));
      LR_ROWS.push({
        id: maxId + 1, og,
        products: [...this.productTags], destOrgs: [...this.destOrgTags],
        locations: [...locs], status: 0, autoShelf: document.getElementById('lrFAutoShelf').checked ? 1 : 0,
        createTime: now, updateTime: now, createUser: '当前用户', updateUser: '当前用户',
      });
      this.rows = LR_ROWS.slice();
      document.getElementById('lrGridBody').innerHTML = lrGridHtml();
      document.getElementById('lrTotal').textContent = this.rows.length;
      Helpers.toast('创建成功(新建默认停用,请勾选启用)');
    } else {
      const row = LR_ROWS.find(r => r.id === this.editingId);
      if (row) {
        row.products = [...this.productTags];
        row.destOrgs = [...this.destOrgTags];
        row.locations = [...locs];
        row.autoShelf = document.getElementById('lrFAutoShelf').checked ? 1 : 0;
        row.updateTime = Helpers.nowTime();
        row.updateUser = '当前用户';
        this.rows = LR_ROWS.slice();
        document.getElementById('lrGridBody').innerHTML = lrGridHtml();
      }
      Helpers.toast('修改成功！');
    }
    this.closeEdit();
  },

  updateStatus(target) {
    const rows = this.getCheckedRows();
    if (!rows.length) { Helpers.toast(target === 1 ? '请勾选要启用的规则' : '请勾选要停用的规则'); return; }
    const already = rows.filter(r => r.status === target);
    if (already.length) {
      Helpers.toast(`选中的规则中有${already.length}条已是${target === 1 ? '启用' : '停用'}状态`);
      return;
    }
    const verb = target === 1 ? '启用' : '停用';
    if (confirm(`确定${verb}选中的 ${rows.length} 条规则？`)) {
      rows.forEach(r => r.status = target);
      document.getElementById('lrGridBody').innerHTML = lrGridHtml();
      Helpers.toast(`${verb}成功`);
    }
  },

  deleteChecked() {
    const rows = this.getCheckedRows();
    if (!rows.length) { Helpers.toast('请勾选要删除的规则'); return; }
    if (confirm(`确定删除选中的 ${rows.length} 条规则？删除后不可恢复`)) {
      LR_ROWS.length = 0;
      LR_ROWS.push(...this.rows.filter(r => !this.checked.has(r.id)));
      this.rows = LR_ROWS.slice();
      this.checked.clear();
      document.getElementById('lrGridBody').innerHTML = lrGridHtml();
      document.getElementById('lrTotal').textContent = this.rows.length;
      Helpers.toast('删除成功');
    }
  },

  /* 导出:按库位逐行展开,文件名对齐线上「推荐库位明细_yyyyMMddHHmmss.xls」 */
  doExport() {
    const ts = Helpers.nowTime().replace(/[-: ]/g, '');
    Helpers.toast(`导出成功：推荐库位明细_${ts}.xls`);
  },

  showLocations(id) {
    const row = this.rows.find(r => r.id === id);
    if (!row) return;
    document.getElementById('lrLocTitle').textContent = `推荐库位 — ${row.og} / ${row.products.join('、')}`;
    document.getElementById('lrLocCount').textContent = row.locations.length
      ? `共 ${row.locations.length} 个库位` : '该规则下暂无库位';
    document.getElementById('lrLocList').innerHTML = row.locations
      .map((c, i) => `<div class="lrb-loc-item">${i + 1}.  ${c}</div>`).join('');
    document.getElementById('lrLocMask').style.display = 'flex';
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-b2b-bin',
  activeTab: 'b-b2b-bin',
  tabs: Layout.tabs.standard(),
  content: `
    ${lrQueryPanel()}
    ${lrToolbar()}
    ${lrGrid()}
    ${lrPager()}
    ${lrEditModal()}
    ${lrLocationsModal()}
    ${lrPickerModal()}
  `,
});

Helpers.startClock();

document.addEventListener('click', e => {
  const tr = e.target.closest('.wh-grid tbody tr');
  if (!tr || e.target.closest('input')) return;
  document.querySelectorAll('.wh-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});

/* 选择弹窗键盘操作(线上:待选表格 Enter=添加,已选表格 Delete=移除) */
document.addEventListener('keydown', e => {
  const mask = document.getElementById('lrPickerMask');
  if (!mask || mask.style.display === 'none') return;
  if (e.key === 'Enter') { e.preventDefault(); LrPage.pickerAdd(); }
  else if (e.key === 'Delete') { e.preventDefault(); LrPage.pickerRemove(); }
});
