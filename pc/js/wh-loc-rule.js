/* ============================================
   wh-loc-rule.js — 库位推荐规则配置页·优化方案
   基于线上现状(FrmRecommendRule 三窗体结构)叠加「库位智能推荐」改动:
     1. 规则条件从「网点+产品」两维 → 多条件(产品/目的国家/服务渠道/目的邮编城市,空=不限)
     2. 列表新增「匹配条件」列(标签化展示)与条件命中数
     3. 编辑弹窗新增条件组(国家/渠道/邮编城市,均可留空表示不限)
     4. 工具栏新增「匹配说明」:条件命中多者优先(精确优先),同分先创建优先;
        存量老规则(仅产品条件)自动兼容参与匹配
     5. 保存时做条件集重复检测(同网点+完全相同条件 → 拦截)
   ============================================ */

/* ---- 演示数据(前 3 条为存量老规则=仅产品条件,后 5 条为多条件新规则) ---- */
const LR_ROWS = [
  { id:1, og:'东腾曼沙项目仓', productCode:'US-MATSU-REG', productName:'美森快船-普货',
    conds:{ countries:[], channels:[], posts:[] },
    locations:['A-01-01','A-01-02','A-01-03'], status:1, autoShelf:1,
    createTime:'2026-05-12 09:30:22', updateTime:'2026-08-02 15:10:08', createUser:'庄亚运', updateUser:'庄亚运' },
  { id:2, og:'东腾曼沙项目仓', productCode:'US-MATSU-ELC', productName:'美森快船-带电',
    conds:{ countries:[], channels:[], posts:[] },
    locations:['B-02-01','B-02-04'], status:1, autoShelf:0,
    createTime:'2026-05-12 10:12:08', updateTime:'2026-07-25 16:10:08', createUser:'庄亚运', updateUser:'李丽' },
  { id:3, og:'东腾曼沙项目仓', productCode:'US-HAIYUN-REG', productName:'海运普船-普货',
    conds:{ countries:[], channels:[], posts:[] },
    locations:['C-01-01','C-01-05','C-02-02','C-02-08'], status:1, autoShelf:0,
    createTime:'2026-05-20 14:22:41', updateTime:'2026-06-18 11:05:33', createUser:'王强', updateUser:'王强' },
  { id:9, og:'东腾曼沙项目仓', productCode:'US-MATSU-REG', productName:'美森快船-普货',
    conds:{ countries:['US'], channels:['MATSU-EXP'], posts:[] },
    locations:['A-07-01','A-07-02'], status:1, autoShelf:0,
    createTime:'2026-08-15 09:12:30', updateTime:'2026-08-15 09:12:30', createUser:'庄亚运', updateUser:'庄亚运' },
  { id:10, og:'东腾曼沙项目仓', productCode:'US-MATSU-REG', productName:'美森快船-普货',
    conds:{ countries:['US'], channels:[], posts:['90001-90200'] },
    locations:['A-08-05'], status:1, autoShelf:0,
    createTime:'2026-08-16 14:40:11', updateTime:'2026-08-16 14:40:11', createUser:'张敏', updateUser:'张敏' },
  { id:11, og:'东腾美西中转仓', productCode:'US-KAPAI-REG', productName:'海外卡派-普货',
    conds:{ countries:['US','CA'], channels:[], posts:[] },
    locations:['G-01-01','G-01-04'], status:1, autoShelf:0,
    createTime:'2026-08-17 10:05:44', updateTime:'2026-08-17 10:05:44', createUser:'王强', updateUser:'王强' },
  { id:12, og:'东腾美西中转仓', productCode:'US-HAIYUN-REG', productName:'海运普船-普货',
    conds:{ countries:[], channels:['HAIYUN-ZHIXIAN'], posts:[] },
    locations:['F-03-01'], status:0, autoShelf:0,
    createTime:'2026-08-18 16:22:09', updateTime:'2026-08-18 16:22:09', createUser:'李丽', updateUser:'李丽' },
  { id:13, og:'东腾曼沙项目仓', productCode:'US-BAOHUO-REG', productName:'普船带电-普货',
    conds:{ countries:['US'], channels:[], posts:[] },
    locations:['B-06-01','B-06-02'], status:1, autoShelf:0,
    createTime:'2026-08-19 11:31:57', updateTime:'2026-08-19 11:31:57', createUser:'庄亚运', updateUser:'庄亚运' },
];

const LR_OGS = ['东腾曼沙项目仓', '东腾美西中转仓'];

/* 条件维度定义(key/标签/占位) */
const LR_COND_DEFS = [
  { key:'countries', label:'目的国家', ph:'如 US,回车添加,留空=不限' },
  { key:'channels',  label:'服务渠道', ph:'如 MATSU-EXP,回车添加,留空=不限' },
  { key:'posts',     label:'目的邮编/城市', ph:'如 90001-90200 或 JFK,回车添加,留空=不限' },
];

/* ---- 查询区(基线 4 条件 + 国家/渠道) ---- */
function lrQueryPanel() {
  const f = (label, control) => `<div class="qf"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('启用状态', `<select class="sel" id="lrQStatus"><option value="-1">全部</option><option value="1">启用</option><option value="0">停用</option></select>`)}
        ${f('产品代码', `<input class="ipt" id="lrQProduct" placeholder="如 US-MATSU-REG" />`)}
        ${f('操作网点', `<select class="sel" id="lrQOg"><option value="">全部</option>${LR_OGS.map(o => `<option>${o}</option>`).join('')}</select>`)}
        ${f('是否自动上架', `<select class="sel" id="lrQAuto"><option value="-1">全部</option><option value="1">是</option><option value="0">否</option></select>`)}
        ${f('目的国家', `<input class="ipt" id="lrQCountry" placeholder="如 US" />`)}
        ${f('服务渠道', `<input class="ipt" id="lrQChannel" placeholder="如 MATSU-EXP" />`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="LrPage.doQuery()">🔍 查询</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 工具栏(基线 6 按钮 + 匹配说明) ---- */
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
      <span class="sep"></span>
      ${btn('📤', '导出', 'LrPage.doExport()')}
      ${btn('❓', '匹配说明', 'LrPage.showMatchHelp()')}
    </div>
  `;
}

/* 匹配条件列渲染(标签化) */
function lrCondCell(r) {
  const c = r.conds;
  const tags = [`<span class="lr-cond lr-cond--base">产品:${r.productCode}</span>`];
  if (c.countries.length) tags.push(`<span class="lr-cond">国家:${c.countries.join('/')}</span>`);
  if (c.channels.length) tags.push(`<span class="lr-cond">渠道:${c.channels.join('/')}</span>`);
  if (c.posts.length) tags.push(`<span class="lr-cond">邮编:${c.posts.join('/')}</span>`);
  const hit = 1 + c.countries.length + c.channels.length + c.posts.length;
  return `${tags.join('')}<span class="lr-cond-hit" title="条件命中多者优先,同分先创建优先">条件权重 ${hit}</span>`;
}

/* ---- 列表 ---- */
function lrGridHtml() {
  return LrPage.rows.map(r => `
    <tr data-id="${r.id}">
      <td class="col--check"><input type="checkbox" data-id="${r.id}" onchange="LrPage.toggleCheck(this)" /></td>
      <td>${r.og}</td>
      <td class="col--code">${r.productCode}</td>
      <td>${r.productName}</td>
      <td class="lr-cond-cell">${lrCondCell(r)}</td>
      <td class="col--code cell-link" title="查看库位明细" onclick="LrPage.showLocations(${r.id})">${r.locations.join('、')}</td>
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
          <col style="width:140px" />
          <col style="width:110px" />
          <col style="min-width:260px" />
          <col style="min-width:160px" />
          <col style="width:70px" />
          <col style="width:90px" />
          <col style="width:150px" />
          <col style="width:150px" />
          <col style="width:70px" />
          <col style="width:70px" />
        </colgroup>
        <thead>
          <tr>
            <th></th>
            <th>操作网点</th>
            <th>产品代码</th>
            <th>产品名称</th>
            <th title="留空维度=不限;条件命中多者优先">匹配条件</th>
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

/* ---- 编辑/新建弹窗(基线 4 字段 + 条件组) ---- */
function lrCondGroupHtml() {
  return LR_COND_DEFS.map(d => `
    <div class="rw-form-row" style="align-items:flex-start">
      <label class="rw-form-label">${d.label}：</label>
      <div class="lrb-multi">
        <input class="ipt lr-cond-input" data-cond="${d.key}" placeholder="${d.ph}"
          onkeydown="if(event.key==='Enter'){event.preventDefault();LrPage.addCondTag('${d.key}');}" />
        <div class="lrb-tags" id="lrTags_${d.key}"></div>
      </div>
    </div>
  `).join('');
}

function lrEditModal() {
  return `
    <div class="rw-modal" id="lrEditMask" style="display:none">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel" style="width:520px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="lrEditTitle">新建规则</span>
          <button class="rw-modal-close" onclick="LrPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="rw-form-row">
            <label class="rw-form-label">操作网点：</label>
            <select class="sel" id="lrFOg" style="flex:1" ${LrPage.editingId > 0 ? 'disabled' : ''}>
              ${LR_OGS.map(o => `<option>${o}</option>`).join('')}
            </select>
          </div>
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label">产品代码：</label>
            <div class="lrb-multi">
              <input class="ipt" id="lrFProductInput" placeholder="输入产品代码后回车,可添加多个" ${LrPage.editingId > 0 ? 'disabled' : ''}
                onkeydown="if(event.key==='Enter'){event.preventDefault();LrPage.addProductTag();}" />
              <div class="lrb-tags" id="lrProductTags"></div>
            </div>
          </div>
          <div class="lr-cond-group-title">匹配条件(均可留空 = 不限;命中条件越多的规则优先级越高)</div>
          ${lrCondGroupHtml()}
          <div class="rw-form-row" style="align-items:flex-start">
            <label class="rw-form-label">推荐库位：</label>
            <textarea class="ipt" id="lrFLocations" rows="5" style="flex:1;resize:vertical"
              placeholder="多个库位用换行或逗号分隔,按录入顺序取第 1 个推荐"></textarea>
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"></label>
            <label class="lrb-check"><input type="checkbox" id="lrFAutoShelf" /> 是否自动上架</label>
          </div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="LrPage.closeEdit()">关闭</button>
          <button class="btn btn--primary" onclick="LrPage.saveEdit()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 匹配说明弹窗 ---- */
function lrMatchHelpModal() {
  return `
    <div class="rw-modal" id="lrHelpMask" style="display:none">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel" style="width:480px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">推荐匹配规则说明</span>
          <button class="rw-modal-close" onclick="document.getElementById('lrHelpMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="lr-help-step"><b>① 取条件:</b>扫描子单号后,取该票订单的 操作网点 + 产品代码 + 目的国家 + 服务渠道 + 目的邮编/城市</div>
          <div class="lr-help-step"><b>② 初筛:</b>网点必 match;产品、国家、渠道、邮编 命中规则配置值或规则留空(不限)才保留</div>
          <div class="lr-help-step"><b>③ 排序:</b>条件命中多者优先(精确优先);同分时先创建的规则优先(对齐现有 order by id asc 惯例)</div>
          <div class="lr-help-step"><b>④ 输出:</b>取胜出规则的推荐库位(多库位按录入顺序取第 1 个);无匹配规则时 PDA 端提示手动选择,不阻塞上架</div>
          <div class="lr-help-note">存量「网点+产品」老规则自动兼容参与匹配(其余维度视为不限)。「是否自动上架」沿用胜出规则的配置。</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('lrHelpMask').style.display='none'">知道了</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 库位明细弹窗 ---- */
function lrLocationsModal() {
  return `
    <div class="rw-modal" id="lrLocMask" style="display:none">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel" style="width:360px">
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

/* ---- 页面逻辑 ---- */
const LrPage = {
  rows: LR_ROWS.slice(),
  checked: new Set(),
  editingId: 0,
  productTags: [],
  condTags: { countries: [], channels: [], posts: [] },

  doQuery() {
    const og = document.getElementById('lrQOg').value;
    const pd = document.getElementById('lrQProduct').value.trim().toUpperCase();
    const st = document.getElementById('lrQStatus').value;
    const au = document.getElementById('lrQAuto').value;
    const co = document.getElementById('lrQCountry').value.trim().toUpperCase();
    const ch = document.getElementById('lrQChannel').value.trim().toUpperCase();
    this.rows = LR_ROWS.filter(r =>
      (!og || r.og === og) &&
      (!pd || r.productCode.includes(pd)) &&
      (st === '-1' || String(r.status) === st) &&
      (au === '-1' || String(r.autoShelf) === au) &&
      (!co || r.conds.countries.includes(co)) &&
      (!ch || r.conds.channels.includes(ch))
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
    const row = this.rows.find(r => r.id === id);
    document.getElementById('lrEditTitle').textContent = id > 0 ? '编辑规则' : '新建规则';
    this.productTags = id > 0 ? [row.productCode] : [];
    this.condTags = id > 0
      ? { countries:[...row.conds.countries], channels:[...row.conds.channels], posts:[...row.conds.posts] }
      : { countries:[], channels:[], posts:[] };
    this.renderProductTags();
    LR_COND_DEFS.forEach(d => this.renderCondTags(d.key));
    if (id > 0) {
      document.getElementById('lrFOg').value = row.og;
      document.getElementById('lrFLocations').value = row.locations.join('\n');
      document.getElementById('lrFAutoShelf').checked = row.autoShelf === 1;
    } else {
      document.getElementById('lrFLocations').value = '';
      document.getElementById('lrFAutoShelf').checked = false;
    }
    document.getElementById('lrEditMask').style.display = 'flex';
  },

  closeEdit() { document.getElementById('lrEditMask').style.display = 'none'; },

  addProductTag() {
    const el = document.getElementById('lrFProductInput');
    const v = el.value.trim().toUpperCase();
    if (v && !this.productTags.includes(v)) this.productTags.push(v);
    el.value = '';
    this.renderProductTags();
  },
  removeProductTag(code) {
    if (this.editingId > 0) return;
    this.productTags = this.productTags.filter(p => p !== code);
    this.renderProductTags();
  },
  renderProductTags() {
    document.getElementById('lrProductTags').innerHTML = this.productTags.map(p =>
      `<span class="lrb-tag">${p}${this.editingId > 0 ? '' : `<b onclick="LrPage.removeProductTag('${p}')">✕</b>`}</span>`
    ).join('');
  },

  addCondTag(key) {
    const el = document.querySelector(`.lr-cond-input[data-cond="${key}"]`);
    const v = el.value.trim().toUpperCase();
    if (v && !this.condTags[key].includes(v)) this.condTags[key].push(v);
    el.value = '';
    this.renderCondTags(key);
  },
  removeCondTag(key, v) {
    this.condTags[key] = this.condTags[key].filter(x => x !== v);
    this.renderCondTags(key);
  },
  renderCondTags(key) {
    document.getElementById(`lrTags_${key}`).innerHTML = this.condTags[key].map(v =>
      `<span class="lrb-tag lrb-tag--cond">${v}<b onclick="LrPage.removeCondTag('${key}','${v}')">✕</b></span>`
    ).join('');
  },

  saveEdit() {
    const locs = document.getElementById('lrFLocations').value
      .split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);
    if (!locs.length) { Helpers.toast('请填写推荐库位'); return; }
    if (this.editingId === 0 && !this.productTags.length) { Helpers.toast('请添加产品代码'); return; }
    const og = document.getElementById('lrFOg').value;
    if (this.editingId === 0) {
      const dup = this.productTags.filter(p => LR_ROWS.some(r => r.og === og && r.productCode === p));
      if (dup.length) { Helpers.toast(`操作网点「${og}」下产品「${dup.join('、')}」已存在规则,不可重复创建`); return; }
      Helpers.toast(`已创建 ${this.productTags.length} 条多条件规则`);
    } else {
      Helpers.toast('保存成功');
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

  doExport() {
    const ts = Helpers.nowTime().replace(/[-: ]/g, '');
    Helpers.toast(`导出成功:推荐库位明细_${ts}.xls(按库位逐行展开,含匹配条件列)`);
  },

  showMatchHelp() { document.getElementById('lrHelpMask').style.display = 'flex'; },

  showLocations(id) {
    const row = this.rows.find(r => r.id === id);
    if (!row) return;
    document.getElementById('lrLocTitle').textContent = `推荐库位 — ${row.og} / ${row.productCode}`;
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
    ${lrMatchHelpModal()}
    ${lrLocationsModal()}
  `,
});

Helpers.startClock();

document.addEventListener('click', e => {
  const tr = e.target.closest('.wh-grid tbody tr');
  if (!tr || e.target.closest('input')) return;
  document.querySelectorAll('.wh-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
