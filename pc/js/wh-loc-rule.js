/* ============================================
   wh-loc-rule.js — 库位推荐规则配置页(p967_2062 实现还原版)
   对齐 2026-09 线上实现(FrmRecommendRuleQuery / FrmRecommendRuleEdit):
     1. 一条规则一行:操作网点 + 单个推荐库位 + 匹配维度(销售产品集 / 调拨目的网点集)+ 自动上架;
        新建默认停用;"销售产品/调拨目的网点至少配置一项"
     2. 查询区两行:①操作网点 / 推荐库位 / 启用状态 / 是否自动上架  ②产品代码 / 调拨目的网点;
        推荐库位为可搜索下拉(候选跟随操作网点,未选网点时禁用);工具栏含「查看日志」
     3. 编辑弹窗分两组:「规则信息」( * 操作网点 / * 推荐库位 / 是否自动上架)
        +「匹配维度」(销售产品 / 调拨目的网点两个页签,页签标题带已选数,
        行内「操作/移除」链接逐行移除,「添加」经双表格穿梭弹窗)
     4. 校验:维度至少一项;新增校验库位(不在网点下则拦);同网点+同库位不可重复;
        编辑时操作网点与推荐库位锁定不可改
     5. 操作日志(log_type=RecommendRuleLog):新增/修改/删除/启停各一条,「查看日志」查看
   ============================================ */

/* ---- 组织机构(操作网点取登录人所属网点;调拨目的网点候选=全量组织) ---- */
const LR_ORGS = [
  { code: 'CN0007', name: '东腾曼沙项目仓' },
  { code: 'CN0012', name: '东腾美西中转仓' },
  { code: 'CNSHA',  name: '上海仓' },
  { code: 'CNDGG',  name: '东莞仓' },
  { code: 'USLAX',  name: '洛杉矶仓' },
  { code: 'USNYC',  name: '纽约仓' },
  { code: 'USCHI',  name: '芝加哥仓' },
];
/* 操作网点下拉(演示:登录人所属网点集合) */
const LR_OPS = ['CN0007', 'CN0012'];
/* 登录人所属网点(新增/查询默认值) */
const LR_USER_OG = 'CN0007';

/* ---- 库位与库区(候选跟随操作网点;编辑页展示「所属库区」) ---- */
const LR_WAREHOUSE = {
  CN0007: [
    { code: 'A-01-01', area: 'A区' }, { code: 'A-01-02', area: 'A区' },
    { code: 'B-02-01', area: 'B区' }, { code: 'B-02-04', area: 'B区' },
    { code: 'B-06-01', area: 'B区' }, { code: 'B-06-02', area: 'B区' },
    { code: 'C-01-01', area: 'C区' }, { code: 'C-01-05', area: 'C区' },
    { code: 'C-02-02', area: 'C区' }, { code: 'C-02-08', area: 'C区' },
    { code: 'T-01-01', area: 'T区' },
  ],
  CN0012: [
    { code: 'F-03-01', area: 'F区' },
    { code: 'G-01-01', area: 'G区' }, { code: 'G-01-04', area: 'G区' },
    { code: 'G-05-01', area: 'G区' }, { code: 'G-05-02', area: 'G区' },
    { code: 'G-05-03', area: 'G区' },
  ],
};

/* ---- 演示数据(一行=一条规则;products/destOrgs 存编码,展示时翻译) ---- */
const LR_ROWS = [
  { id:1, og:'CN0007', location:'A-01-01', products:['US-MATSU-REG'], destOrgs:['CNSHA'], status:1, autoShelf:0,
    createTime:'2026-05-12 09:30:22', updateTime:'2026-08-02 15:10:08', createUser:'庄亚运', updateUser:'庄亚运' },
  { id:2, og:'CN0007', location:'B-02-01', products:['US-MATSU-REG'], destOrgs:['USLAX'], status:1, autoShelf:0,
    createTime:'2026-05-12 10:12:08', updateTime:'2026-07-25 16:10:08', createUser:'庄亚运', updateUser:'李丽' },
  { id:3, og:'CN0007', location:'B-02-04', products:['US-MATSU-ELC','US-KAPAI-ELC'], destOrgs:[], status:1, autoShelf:1,
    createTime:'2026-05-20 14:22:41', updateTime:'2026-06-18 11:05:33', createUser:'王强', updateUser:'王强' },
  { id:4, og:'CN0007', location:'C-01-01', products:['US-HAIYUN-REG'], destOrgs:[], status:0, autoShelf:0,
    createTime:'2026-06-01 11:08:15', updateTime:'2026-06-01 11:08:15', createUser:'王强', updateUser:'王强' },
  { id:5, og:'CN0012', location:'G-01-01', products:['US-MATSU-REG'], destOrgs:[], status:1, autoShelf:0,
    createTime:'2026-06-15 10:05:44', updateTime:'2026-06-15 10:05:44', createUser:'王强', updateUser:'王强' },
  { id:6, og:'CN0012', location:'F-03-01', products:['US-HAIYUN-REG'], destOrgs:['USNYC'], status:0, autoShelf:0,
    createTime:'2026-06-18 16:22:09', updateTime:'2026-06-18 16:22:09', createUser:'李丽', updateUser:'李丽' },
  { id:7, og:'CN0007', location:'B-06-01', products:['US-BAOHUO-REG'], destOrgs:[], status:1, autoShelf:1,
    createTime:'2026-07-19 11:31:57', updateTime:'2026-08-10 09:02:33', createUser:'庄亚运', updateUser:'庄亚运' },
  { id:8, og:'CN0012', location:'G-05-01', products:['US-KAPAI-ELC'], destOrgs:['USCHI','USNYC'], status:1, autoShelf:0,
    createTime:'2026-07-28 14:47:20', updateTime:'2026-08-21 17:25:41', createUser:'张敏', updateUser:'张敏' },
  { id:9, og:'CN0007', location:'T-01-01', products:[], destOrgs:['USCHI'], status:1, autoShelf:0,
    createTime:'2026-08-28 09:15:33', updateTime:'2026-08-28 09:15:33', createUser:'李丽', updateUser:'李丽' },
];

const LR_PRODUCT_DICT = [
  { code: 'US-MATSU-REG',  name: '美森快船-普货', en: 'Matson Express General' },
  { code: 'US-MATSU-ELC',  name: '美森快船-带电', en: 'Matson Express Electronic' },
  { code: 'US-HAIYUN-REG', name: '海运普船-普货', en: 'Ocean Freight General' },
  { code: 'US-KAPAI-REG',  name: '海外卡派-普货', en: 'Overseas Trucking General' },
  { code: 'US-KAPAI-ELC',  name: '海外卡派-带电', en: 'Overseas Trucking Electronic' },
  { code: 'US-BAOHUO-REG', name: '普船带电-普货', en: 'Ocean Freight Electronic' },
];
const LR_PRODUCTS = LR_PRODUCT_DICT.map(p => p.code);

/* ---- 翻译/拼接辅助 ---- */
function lrProductName(code) {
  const hit = LR_PRODUCT_DICT.find(p => p.code === code);
  return hit ? hit.name : code;
}
function lrOgName(code) {
  const hit = LR_ORGS.find(o => o.code === code);
  return hit ? hit.name : code;
}
/* 列表列:多值逗号连接,空集合给空串(与实现一致,不补占位) */
function lrJoinCodes(codes) { return codes.length ? codes.join(', ') : ''; }
function lrJoinProductNames(codes) { return codes.length ? codes.map(lrProductName).join(', ') : ''; }
function lrJoinOgNames(codes) { return codes.length ? codes.map(lrOgName).join(', ') : ''; }
/* 网点下库位候选 */
function lrLocOptions(ogCode) { return LR_WAREHOUSE[ogCode] || []; }
function lrLocArea(ogCode, locCode) {
  const hit = lrLocOptions(ogCode).find(l => l.code === locCode);
  return hit ? hit.area : '';
}

/* ---- 可搜索库位下拉(线上 uctrlLocationSearchable;编辑页带「所属库区」提示行) ---- */
function lrLocSearch(id, opts) {
  opts = opts || {};
  return `
    <div class="lrb-loc${opts.area ? '' : ' lrb-loc--flat'}" id="${id}Wrap">
      <div class="lrb-loc-main">
        <input class="ipt lrb-loc-input" id="${id}" autocomplete="off"
          placeholder="${opts.ph || '输入或选择库位'}" ${opts.width ? `style="width:${opts.width}px"` : ''}
          oninput="LrPage.locInput('${id}')" onfocus="LrPage.locFocus('${id}')" />
        <span class="lrb-loc-arrow" onclick="LrPage.locToggle('${id}')">▾</span>
        <div class="lrb-loc-drop" id="${id}Drop" style="display:none"></div>
      </div>
      ${opts.area ? `<div class="lrb-loc-area" id="${id}Area">所属库区：</div>` : ''}
    </div>
  `;
}

/* ---- 查询区(两行:第一行 5 项含查询按钮,第二行 产品代码/调拨目的网点) ---- */
function lrQueryPanel() {
  const f = (label, control) => `<div class="qf"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('操作网点', `<select class="sel" id="lrQOg" style="width:170px" onchange="LrPage.onQueryOgChange()">
          <option value="">全部</option>${LR_OPS.map(c => `<option value="${c}"${c === LR_USER_OG ? ' selected' : ''}>${lrOgName(c)}</option>`).join('')}
        </select>`)}
        ${f('推荐库位', lrLocSearch('lrQLoc', { width: 180 }))}
        ${f('启用状态', `<select class="sel" id="lrQStatus"><option value="-1">全部</option><option value="1">启用</option><option value="0">停用</option></select>`)}
        ${f('是否自动上架', `<select class="sel" id="lrQAuto"><option value="-1">全部</option><option value="1">是</option><option value="0">否</option></select>`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="LrPage.doQuery()">🔍 查询</button>
        </div>
      </div>
      <div class="qp-row">
        ${f('产品代码', `<select class="sel" id="lrQProduct"><option value="">全部</option>${LR_PRODUCTS.map(p => `<option>${p}</option>`).join('')}</select>`)}
        ${f('调拨目的网点', `<select class="sel" id="lrQDestOrg" style="width:170px"><option value="">全部</option>${LR_ORGS.map(o => `<option value="${o.code}">${o.name}</option>`).join('')}</select>`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(实现 7 按钮:新建/编辑/启用/停用/删除/导出/查看日志) ---- */
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
      ${btn('📋', '查看日志', 'LrPage.showLog()')}
    </div>
  `;
}

/* ---- 列表(实现列:规则编号/操作网点/推荐库位/产品代码/产品名称/调拨目的网点/启用状态/是否自动上架/创建时间/更新时间/创建人/更新人) ---- */
function lrGridHtml() {
  return LrPage.rows.map(r => `
    <tr data-id="${r.id}">
      <td class="col--check"><input type="checkbox" data-id="${r.id}" onchange="LrPage.toggleCheck(this)" /></td>
      <td class="col--num">${r.id}</td>
      <td>${lrOgName(r.og)}</td>
      <td class="col--code">${r.location}</td>
      <td class="col--code" title="${lrJoinCodes(r.products)}">${lrJoinCodes(r.products)}</td>
      <td title="${lrJoinProductNames(r.products)}">${lrJoinProductNames(r.products)}</td>
      <td title="${lrJoinOgNames(r.destOrgs)}">${lrJoinOgNames(r.destOrgs)}</td>
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
      <table class="grid wh-grid lrb-grid">
        <colgroup>
          <col style="width:36px" />
          <col style="width:62px" />
          <col style="width:112px" />
          <col style="width:88px" />
          <col style="width:132px" />
          <col style="width:118px" />
          <col style="width:118px" />
          <col style="width:64px" />
          <col style="width:86px" />
          <col style="width:134px" />
          <col style="width:134px" />
          <col style="width:62px" />
          <col style="width:62px" />
        </colgroup>
        <thead>
          <tr>
            <th></th>
            <th>规则编号</th>
            <th>操作网点</th>
            <th>推荐库位</th>
            <th>产品代码</th>
            <th>产品名称</th>
            <th>调拨目的网点</th>
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

/* ---- 编辑弹窗(两个分组框:规则信息 / 匹配维度[双页签]) ---- */
function lrEditModal() {
  return `
    <div class="rw-modal" id="lrEditMask" style="display:none">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel lrb-edit-panel" style="width:800px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">编辑规则</span>
          <button class="rw-modal-close" onclick="LrPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body lrb-edit-body">
          <div class="lrb-gb">
            <div class="lrb-gb-title">规则信息</div>
            <div class="lrb-gb-inner">
              <div class="lrb-form-row">
                <span class="lrb-req">*</span>
                <label class="lrb-form-label">操作网点：</label>
                <select class="sel" id="lrFOg" style="width:400px" onchange="LrPage.onEditOgChange()">
                  ${LR_OPS.map(c => `<option value="${c}">${lrOgName(c)}</option>`).join('')}
                </select>
              </div>
              <div class="lrb-form-row">
                <span class="lrb-req">*</span>
                <label class="lrb-form-label">推荐库位：</label>
                ${lrLocSearch('lrFLoc', { area: true, width: 400, ph: '输入或选择库位' })}
              </div>
              <div class="lrb-form-row">
                <span class="lrb-req"></span>
                <label class="lrb-form-label"></label>
                <label class="lrb-check"><input type="checkbox" id="lrFAutoShelf" /> 是否自动上架</label>
              </div>
            </div>
          </div>
          <div class="lrb-gb lrb-gb--grow">
            <div class="lrb-gb-title">匹配维度</div>
            <div class="lrb-gb-inner lrb-gb-inner--fill">
              <div class="lrb-tabs">
                <div class="lrb-tab lrb-tab--active" id="lrTabProduct" onclick="LrPage.switchTab('product')">销售产品 (0)</div>
                <div class="lrb-tab" id="lrTabDestOrg" onclick="LrPage.switchTab('destOrg')">调拨目的网点 (0)</div>
              </div>
              <div class="lrb-pane" id="lrPaneProduct">
                <div class="lrb-pane-bar">
                  <button class="btn" onclick="LrPage.openPicker('product')">添加</button>
                  <span class="lrb-pane-count" id="lrProdCount">已选 0 项</span>
                </div>
                <div class="lrb-pane-grid">
                  <table class="grid lrb-inner-grid">
                    <colgroup><col style="width:200px" /><col style="width:300px" /><col style="width:60px" /></colgroup>
                    <thead><tr><th>产品代码</th><th>产品名称</th><th>操作</th></tr></thead>
                    <tbody id="lrProdRows"></tbody>
                  </table>
                </div>
              </div>
              <div class="lrb-pane" id="lrPaneDestOrg" style="display:none">
                <div class="lrb-pane-bar">
                  <button class="btn" onclick="LrPage.openPicker('destOrg')">添加</button>
                  <span class="lrb-pane-count" id="lrOrgCount">已选 0 项</span>
                </div>
                <div class="lrb-pane-grid">
                  <table class="grid lrb-inner-grid">
                    <colgroup><col style="width:200px" /><col style="width:300px" /><col style="width:60px" /></colgroup>
                    <thead><tr><th>网点代码</th><th>网点名称</th><th>操作</th></tr></thead>
                    <tbody id="lrOrgRows"></tbody>
                  </table>
                </div>
              </div>
            </div>
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

/* ---- 选择弹窗(已选在左/待选在右,双击或按钮添加移除;产品三列/网点两列) ---- */
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
            <div class="lrb-picker-mid">
              <button class="btn" id="lrPickerAddBtn" onclick="LrPage.pickerAdd()">添加</button>
              <button class="btn" id="lrPickerRemoveBtn" onclick="LrPage.pickerRemove()">移除</button>
            </div>
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

/* ---- 日志弹窗(线上 frmNote;列:操作时间/操作人/日志内容) ---- */
function lrLogModal() {
  return `
    <div class="rw-modal" id="lrLogMask" style="display:none">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel" style="width:670px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">日志</span>
          <button class="rw-modal-close" onclick="LrPage.closeLog()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="lrb-log-grid">
            <table class="grid lrb-inner-grid">
              <colgroup><col style="width:150px" /><col style="width:90px" /><col /></colgroup>
              <thead><tr><th>操作时间</th><th>操作人</th><th>日志内容</th></tr></thead>
              <tbody id="lrLogRows"></tbody>
            </table>
          </div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="LrPage.closeLog()">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const LrPage = {
  rows: LR_ROWS.slice(),
  checked: new Set(),
  currentId: 0,
  editingId: 0,
  tabMode: 'product',
  prodRows: [],
  orgRows: [],
  /* 库位下拉状态 */
  loc: { id: '', open: false },
  /* 选择弹窗状态 */
  picker: { mode: '', sel: [], pendFilter: '', selFilter: '', cur: null },

  /* ================= 查询 ================= */
  onQueryOgChange() {
    /* 换网点后候选整体重载;未选网点则禁用(实现同款:候选跟随操作网点) */
    const el = document.getElementById('lrQLoc');
    const og = document.getElementById('lrQOg').value;
    el.value = '';
    LrPage.closeLocDrop();
    el.disabled = !og;
    el.placeholder = og ? '输入或选择库位' : '请先选择操作网点';
  },

  doQuery() {
    const og = document.getElementById('lrQOg').value;
    const loc = document.getElementById('lrQLoc').value.trim();
    const pd = document.getElementById('lrQProduct').value;
    const st = document.getElementById('lrQStatus').value;
    const au = document.getElementById('lrQAuto').value;
    const de = document.getElementById('lrQDestOrg').value;
    this.rows = LR_ROWS.filter(r =>
      (!og || r.og === og) &&
      (!loc || r.location === loc) &&
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

  /* ================= 库位可搜索下拉 ================= */
  locOgOf(id) {
    return id === 'lrQLoc' ? document.getElementById('lrQOg').value : document.getElementById('lrFOg').value;
  },
  locCandidates(id) { return lrLocOptions(this.locOgOf(id)); },

  renderLocDrop(id, keyword) {
    const kw = (keyword || '').trim();
    const list = this.locCandidates(id).filter(l => !kw || l.code.toUpperCase().includes(kw.toUpperCase()));
    const box = document.getElementById(id + 'Drop');
    box.innerHTML = list.length
      ? list.map(l => `<div class="lrb-loc-item" onclick="LrPage.locPick('${id}','${l.code}')">
          <span class="lrb-loc-item-code">${l.code}</span><span class="lrb-loc-item-area">${l.area}</span></div>`).join('')
      : '<div class="lrb-loc-empty">无匹配的库位</div>';
    box.style.display = 'block';
    this.loc = { id, open: true };
  },

  closeLocDrop() {
    document.querySelectorAll('.lrb-loc-drop').forEach(d => { d.style.display = 'none'; });
    this.loc = { id: '', open: false };
  },

  locFocus(id) {
    if (document.getElementById(id).disabled) return;
    this.renderLocDrop(id, '');
  },

  locToggle(id) {
    const el = document.getElementById(id);
    if (el.disabled) return;
    if (this.loc.open && this.loc.id === id) { this.closeLocDrop(); return; }
    this.renderLocDrop(id, '');
  },

  locInput(id) {
    if (document.getElementById(id).disabled) return;
    this.renderLocDrop(id, document.getElementById(id).value);
    this.updateLocArea(id);
  },

  locPick(id, code) {
    document.getElementById(id).value = code;
    this.closeLocDrop();
    this.updateLocArea(id);
  },

  /* 编辑页「所属库区」提示行(线上:命中显库区,手打无效值显「无效库位」) */
  updateLocArea(id) {
    const areaEl = document.getElementById(id + 'Area');
    if (!areaEl) return;
    const v = document.getElementById(id).value.trim();
    if (!v) { areaEl.textContent = '所属库区：'; return; }
    const area = lrLocArea(this.locOgOf(id), v);
    areaEl.textContent = area ? `所属库区：${area}` : '所属库区：无效库位';
  },

  /* ================= 编辑弹窗 ================= */
  openEdit(id) {
    this.editingId = id;
    const row = id > 0 ? this.rows.find(r => r.id === id) : null;
    const isCreate = !row;

    /* 编辑时操作网点与推荐库位锁定不可改 */
    const ogSel = document.getElementById('lrFOg');
    ogSel.disabled = !isCreate;
    ogSel.value = isCreate ? LR_USER_OG : row.og;

    const locInput = document.getElementById('lrFLoc');
    locInput.disabled = !isCreate;
    locInput.classList.toggle('lrb-loc-locked', !isCreate);
    locInput.value = isCreate ? '' : row.location;
    this.updateLocArea('lrFLoc');

    document.getElementById('lrFAutoShelf').checked = isCreate ? false : row.autoShelf === 1;

    this.prodRows = isCreate ? [] : row.products.map(c => ({ code: c, name: lrProductName(c) }));
    this.orgRows = isCreate ? [] : row.destOrgs.map(c => ({ code: c, name: lrOgName(c) }));
    this.renderProdRows();
    this.renderOrgRows();
    this.switchTab('product');
    this.closeLocDrop();

    document.getElementById('lrEditMask').style.display = 'flex';
  },

  closeEdit() {
    this.closeLocDrop();
    document.getElementById('lrEditMask').style.display = 'none';
  },

  onEditOgChange() {
    /* 新增态换网点 → 库位候选重载并清空(原库位失效) */
    if (this.editingId > 0) return;
    const locInput = document.getElementById('lrFLoc');
    locInput.value = '';
    this.updateLocArea('lrFLoc');
    this.closeLocDrop();
  },

  switchTab(mode) {
    this.tabMode = mode;
    document.getElementById('lrTabProduct').classList.toggle('lrb-tab--active', mode === 'product');
    document.getElementById('lrTabDestOrg').classList.toggle('lrb-tab--active', mode === 'destOrg');
    document.getElementById('lrPaneProduct').style.display = mode === 'product' ? 'block' : 'none';
    document.getElementById('lrPaneDestOrg').style.display = mode === 'destOrg' ? 'block' : 'none';
  },

  renderProdRows() {
    document.getElementById('lrProdRows').innerHTML = this.prodRows.map(p => `
      <tr><td class="col--code">${p.code}</td><td>${p.name}</td>
      <td><a class="lrb-link" onclick="LrPage.removeProd('${p.code}')">移除</a></td></tr>`).join('');
    document.getElementById('lrProdCount').textContent = `已选 ${this.prodRows.length} 项`;
    document.getElementById('lrTabProduct').textContent = `销售产品 (${this.prodRows.length})`;
  },

  renderOrgRows() {
    document.getElementById('lrOrgRows').innerHTML = this.orgRows.map(o => `
      <tr><td class="col--code">${o.code}</td><td>${o.name}</td>
      <td><a class="lrb-link" onclick="LrPage.removeOrg('${o.code}')">移除</a></td></tr>`).join('');
    document.getElementById('lrOrgCount').textContent = `已选 ${this.orgRows.length} 项`;
    document.getElementById('lrTabDestOrg').textContent = `调拨目的网点 (${this.orgRows.length})`;
  },

  removeProd(code) {
    this.prodRows = this.prodRows.filter(p => p.code !== code);
    this.renderProdRows();
  },

  removeOrg(code) {
    this.orgRows = this.orgRows.filter(o => o.code !== code);
    this.renderOrgRows();
  },

  /* ================= 选择弹窗(双表格穿梭) ================= */
  pickerAll() {
    return this.picker.mode === 'product'
      ? LR_PRODUCT_DICT
      : LR_ORGS.map(o => ({ code: o.code, name: o.name, en: '' }));
  },
  pickerKey(item) { return item.code; },
  pickerLabel() { return this.picker.mode === 'product' ? '产品' : '网点'; },

  openPicker(mode) {
    this.picker.mode = mode;
    this.picker.pendFilter = '';
    this.picker.selFilter = '';
    this.picker.cur = null;
    this.picker.sel = mode === 'product'
      ? this.prodRows.map(p => p.code)
      : this.orgRows.map(o => o.code);
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
      .filter(Boolean).some(v => v.toUpperCase().includes(q.toUpperCase()));
    const selRows = all.filter(i => selSet.has(this.pickerKey(i)) && match(i, this.picker.selFilter));
    const pendRows = all.filter(i => !selSet.has(this.pickerKey(i)) && match(i, this.picker.pendFilter));

    const cols = isProd
      ? '<col style="width:36%"/><col style="width:30%"/><col style="width:34%"/>'
      : '<col style="width:40%"/><col style="width:60%"/>';
    const heads = isProd
      ? '<tr><th>产品代码</th><th>中文名称</th><th>英文名称</th></tr>'
      : '<tr><th>网点代码</th><th>网点名称</th></tr>';
    const rowHtml = (i, side) => {
      const k = this.pickerKey(i);
      const marked = this.picker.cur && this.picker.cur.side === side && this.picker.cur.key === k;
      const dbl = side === 'pend' ? `LrPage.pickerAdd('${k}')` : `LrPage.pickerRemove('${k}')`;
      const mark = `LrPage.pickerMark('${side}','${k}')`;
      const cls = marked ? ' class="row--picked"' : '';
      return isProd
        ? `<tr${cls} onclick="${mark}" ondblclick="${dbl}"><td class="col--code">${i.code}</td><td>${i.name}</td><td>${i.en}</td></tr>`
        : `<tr${cls} onclick="${mark}" ondblclick="${dbl}"><td class="col--code">${i.code}</td><td>${i.name}</td></tr>`;
    };
    const empty = which => `<tr class="lrb-picker-empty"><td colspan="${isProd ? 3 : 2}">${which}</td></tr>`;

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

  pickerAdd(key) {
    key = key || (this.picker.cur && this.picker.cur.side === 'pend' && this.picker.cur.key);
    if (!key) { Helpers.toast(`请先选中待选${this.pickerLabel()}`); return; }
    if (!this.picker.sel.includes(key)) this.picker.sel.push(key);
    this.picker.cur = null;
    this.renderPicker();
  },

  pickerRemove(key) {
    key = key || (this.picker.cur && this.picker.cur.side === 'sel' && this.picker.cur.key);
    if (!key) { Helpers.toast(`请先选中已选${this.pickerLabel()}`); return; }
    this.picker.sel = this.picker.sel.filter(k => k !== key);
    this.picker.cur = null;
    this.renderPicker();
  },

  savePicker() {
    if (this.picker.mode === 'product') {
      this.prodRows = this.picker.sel.map(code => ({ code, name: lrProductName(code) }));
      this.renderProdRows();
    } else {
      this.orgRows = this.picker.sel.map(code => ({ code, name: lrOgName(code) }));
      this.renderOrgRows();
    }
    document.getElementById('lrPickerMask').style.display = 'none';
  },

  closePicker() { document.getElementById('lrPickerMask').style.display = 'none'; },

  /* ================= 保存 ================= */
  saveEdit() {
    const isCreate = this.editingId === 0;
    const og = document.getElementById('lrFOg').value;
    let loc = '';

    if (isCreate) {
      if (!og) { Helpers.toast('请选择操作网点'); return; }
      loc = document.getElementById('lrFLoc').value.trim();
      if (!loc) { Helpers.toast('请选择推荐库位'); return; }
      if (!this.locCandidates('lrFLoc').some(l => l.code === loc)) {
        Helpers.toast(`库位「${loc}」不在当前操作网点下，请从下拉列表中选择`); return;
      }
    } else {
      loc = document.getElementById('lrFLoc').value.trim();
    }

    if (!this.prodRows.length && !this.orgRows.length) {
      Helpers.toast('销售产品与调拨目的网点至少配置一项'); return;
    }

    /* 同网点 + 同推荐库位不可重复(服务端兜底文案) */
    if (isCreate && LR_ROWS.some(r => r.og === og && r.location === loc)) {
      Helpers.toast(`操作网点「${og}」下推荐库位「${loc}」已存在规则，不可重复创建`); return;
    }

    const now = Helpers.nowTime();
    if (isCreate) {
      const maxId = Math.max(...LR_ROWS.map(r => r.id));
      LR_ROWS.push({
        id: maxId + 1, og, location: loc,
        products: this.prodRows.map(p => p.code),
        destOrgs: this.orgRows.map(o => o.code),
        status: 0, autoShelf: document.getElementById('lrFAutoShelf').checked ? 1 : 0,
        createTime: now, updateTime: now, createUser: '当前用户', updateUser: '当前用户',
      });
      Helpers.toast('新增成功！');
    } else {
      const row = LR_ROWS.find(r => r.id === this.editingId);
      if (row) {
        row.products = this.prodRows.map(p => p.code);
        row.destOrgs = this.orgRows.map(o => o.code);
        row.autoShelf = document.getElementById('lrFAutoShelf').checked ? 1 : 0;
        row.updateTime = now;
        row.updateUser = '当前用户';
      }
      Helpers.toast('修改成功！');
    }
    this.closeEdit();
    this.doQuery();
  },

  /* ================= 工具栏其它操作 ================= */
  editChecked() {
    const rows = this.getCheckedRows();
    if (!rows.length) { Helpers.toast('请勾选要修改的规则！'); return; }
    if (rows.length > 1) { Helpers.toast('编辑仅支持单选！'); return; }
    this.openEdit(rows[0].id);
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
      rows.forEach(r => { r.status = target; r.updateTime = Helpers.nowTime(); r.updateUser = '当前用户'; });
      this.doQuery();
      Helpers.toast(`${verb}成功`);
    }
  },

  deleteChecked() {
    const rows = this.getCheckedRows();
    if (!rows.length) { Helpers.toast('请勾选要删除的规则'); return; }
    if (confirm(`确定删除选中的 ${rows.length} 条规则？删除后不可恢复`)) {
      LR_ROWS.length = 0;
      LR_ROWS.push(...this.rows.filter(r => !this.checked.has(r.id)));
      this.doQuery();
      Helpers.toast('删除成功');
    }
  },

  /* 导出:一个维度值一行平铺,文件名对齐实现「推荐库位明细_yyyyMMddHHmmss.xls」 */
  doExport() {
    if (!confirm('确定导出推荐库位明细？')) return;
    const ts = Helpers.nowTime().replace(/[-: ]/g, '');
    Helpers.toast(`导出成功！推荐库位明细_${ts}.xls`);
  },

  /* ================= 查看日志 ================= */
  showLog() {
    const row = this.rows.find(r => r.id === this.currentId);
    if (!row) { Helpers.toast('请选择要查看日志的规则！'); return; }
    document.getElementById('lrLogRows').innerHTML = this.buildLogs(row).map(l => `
      <tr><td>${l.time}</td><td>${l.user}</td><td>${l.text}</td></tr>`).join('');
    document.getElementById('lrLogMask').style.display = 'flex';
  },

  closeLog() { document.getElementById('lrLogMask').style.display = 'none'; },

  /* 日志内容模板对齐实现(新增/修改/删除/启停各一条,log_type=RecommendRuleLog) */
  buildLogs(row) {
    const logs = [{
      time: row.createTime, user: row.createUser,
      text: `新增推荐库位，销售产品${row.products.length}个，目的网点${row.destOrgs.length}个`,
    }];
    if (row.updateTime !== row.createTime) {
      logs.push({
        time: row.updateTime, user: row.updateUser,
        text: `修改推荐库位，销售产品${row.products.length}个，目的网点${row.destOrgs.length}个`,
      });
    }
    if (row.status === 0 && row.updateTime !== row.createTime) {
      logs.push({ time: row.updateTime, user: row.updateUser, text: '修改状态：停用' });
    }
    return logs.reverse();
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
    ${lrPickerModal()}
    ${lrLogModal()}
  `,
});

Helpers.startClock();

/* 行选中态(查看日志按当前行取,实现同款) */
document.addEventListener('click', e => {
  const tr = e.target.closest('.wh-grid tbody tr');
  if (!tr || e.target.closest('input') || e.target.closest('.lrb-loc-drop')) return;
  document.querySelectorAll('.wh-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
  LrPage.currentId = Number(tr.dataset.id);
});

/* 点击空白处收起库位候选下拉 */
document.addEventListener('click', e => {
  if (e.target.closest('.lrb-loc')) return;
  LrPage.closeLocDrop();
});

/* 选择弹窗键盘操作(实现:待选表格 Enter=添加,已选表格 Delete=移除) */
document.addEventListener('keydown', e => {
  const mask = document.getElementById('lrPickerMask');
  if (mask && mask.style.display !== 'none') {
    if (e.key === 'Enter') { e.preventDefault(); LrPage.pickerAdd(); }
    else if (e.key === 'Delete') { e.preventDefault(); LrPage.pickerRemove(); }
  }
});
