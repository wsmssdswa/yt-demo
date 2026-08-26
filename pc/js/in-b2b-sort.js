/* ============================================
   in-b2b-sort.js — B2B分拣管理页
   模型(2026-08 定稿):分组方案(全局) + 格口应用(本页看板圈口挂载),两层解耦
     · 分组方案在「基础信息 → 分拣分组方案」独立菜单维护(本页只读引用)
     · 本页 = 分拣方案列表(SIMS 同步,只读) + 格口看板弹窗(V1.3.4 基线 + 圈口挂/摘方案)
     · 一口一方案;挂载即排他(未挂的口=默认池);异常口不挂方案
     · 口满/应用失效(方案换版)→ 一律转异常口;锁口优先;SIMS 透传
   ============================================ */

/* ---- 演示数据:分拣方案(SIMS 同步) ---- */
const SB_SOLUTIONS = [
  { sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案', ruleId: 10086,
    chuteTotal: 50, syncTime: '2026-08-20 09:12:33', version: 'v20260820' },
  { sorterCode: 'FJ-02', sorterName: '2号分拣机', solutionName: 'B2B带电专用方案', ruleId: 10090,
    chuteTotal: 36, syncTime: '2026-08-18 15:40:11', version: 'v20260818' },
];

/* ---- 演示数据:FJ-01 方案格口(01-10 单件 / 11-40 多件 / 41-50 异常) ---- */
function sbBuildChutes() {
  const list = [];
  for (let i = 1; i <= 50; i++) {
    const no = String(i).padStart(2, '0');
    const attr = i <= 10 ? '单件' : (i <= 40 ? '多件' : '异常');
    list.push({ no, attr, master: '', cur: 0, total: 0, done: false, exc: '' });
  }
  const byNo = n => list.find(c => c.no === n);
  byNo('03').master = 'YT2621040800007315U001';           /* 单件口:最近落格 */
  byNo('21').master = 'YT2621000070480962';               /* 多件占用 5/8 未到齐 */
  byNo('21').cur = 5; byNo('21').total = 8;
  byNo('22').master = 'YT2621080200003157';               /* 多件 8/8 已到齐 */
  byNo('22').cur = 8; byNo('22').total = 8; byNo('22').done = true;
  byNo('41').master = 'YT2621061500004421';               /* 异常口 */
  byNo('41').exc = 'CF 格口已满转投';
  byNo('42').master = 'YT2621061500004421';               /* 异常口:多件跟随 */
  byNo('42').exc = 'CIF 签入失败';
  return list;
}

/* ---- 演示数据:分组方案(全局,与「基础信息→分拣分组方案」同源副本,只读) ---- */
const SB_SCHEMES = [
  { id: 1, name: '带电×海运',
    conds: [
      { item: 'product', op: '包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC'] },
      { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
    ], joiner: '且', status: 1 },
  { id: 2, name: '敏货类',
    conds: [ { item: 'product', op: '包含', values: ['US-MATSU-MG', 'US-HAIYUN-MG'] } ], joiner: '且',
    status: 1 },
  { id: 3, name: '美森批量件',
    conds: [
      { item: 'channel', op: '包含', values: ['MATSU-EXP', 'MATSU-KUAI'] },
      { item: 'product', op: '包含', values: ['US-MATSU-REG'] },
    ], joiner: '或', status: 0 },
  { id: 4, name: '普货类',
    conds: [ { item: 'product', op: '包含', values: ['US-MATSU-REG', 'US-HAIYUN-REG'] } ], joiner: '且',
    status: 1 },
  { id: 5, name: '非带电海运',
    conds: [
      { item: 'product', op: '不包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC', 'US-KONGYUN-ELC'] },
      { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
    ], joiner: '且', status: 1 },
  { id: 6, name: '签入失败件',
    conds: [ { item: 'exception', op: '包含', values: ['CIF'] } ], joiner: '且', status: 1 },
];
const SB_ITEM_LABEL = { product: '产品', channel: '渠道', exception: '异常类型' };
const sbScheme = id => SB_SCHEMES.find(x => x.id === id);

/* ---- 演示数据:格口应用(挂 分拣机+分拣方案 维度;一口一方案) ---- */
const SB_APPLIES = [
  { id: 11, schemeId: 1, sorterCode: 'FJ-01', ruleId: 10086, chutes: ['03', '04', '21', '22'],
    updateUser: '庄亚运', updateTime: '2026-08-24 10:30:11' },
  { id: 12, schemeId: 2, sorterCode: 'FJ-01', ruleId: 10086, chutes: ['05', '06', '23', '24'],
    updateUser: '庄亚运', updateTime: '2026-08-23 16:20:40' },
  { id: 13, schemeId: 5, sorterCode: 'FJ-01', ruleId: 10086, chutes: ['07', '08', '27', '28'],
    updateUser: '李丽', updateTime: '2026-08-25 09:30:05' },
  { id: 14, schemeId: 4, sorterCode: 'FJ-01', ruleId: 10086, chutes: ['61', '62'],   /* 失效:换版后格口不存在 */
    updateUser: '王强', updateTime: '2026-08-10 09:10:00' },
  { id: 15, schemeId: 1, sorterCode: 'FJ-02', ruleId: 10090, chutes: ['05', '08'],   /* 复用:2号机也挂带电×海运 */
    updateUser: '王强', updateTime: '2026-08-21 14:00:00' },
  { id: 16, schemeId: 1, sorterCode: 'FJ-01', ruleId: 10086, chutes: ['05', '06'],   /* 共享口:敏货口同时挂带电×海运 */
    updateUser: '庄亚运', updateTime: '2026-08-25 10:00:00' },
  { id: 17, schemeId: 6, sorterCode: 'FJ-01', ruleId: 10086, chutes: ['43', '44'],   /* 异常方案挂异常口:签入失败件 */
    updateUser: '庄亚运', updateTime: '2026-08-26 10:05:00' },
];

/* ---- 工具 ---- */
const sbAttrColor = a => a === '单件' ? '#2E7D32' : (a === '多件' ? '#1565C0' : '#C62828');
/* 应用失效:引用的格口号有不在当前分拣方案内的(方案换版) */
const sbApplyInvalid = a => a.chutes.some(no => !SB_CHUTES.some(c => c.no === no)) &&
  a.sorterCode === 'FJ-01' && a.ruleId === 10086; /* 演示库仅 FJ-01 有格口数据 */

/* ---- 演示数据初始化 ---- */
const SB_CHUTES = sbBuildChutes();
/* 格口 ↔ 分组方案角标(启用方案 + 应用口在当前分拣方案内;一口可挂多方案) */
function sbBadgeMap() {
  const m = {};
  SB_APPLIES.filter(a => a.sorterCode === 'FJ-01' && a.ruleId === 10086).forEach(a => {
    const s = sbScheme(a.schemeId);
    if (!s || s.status !== 1) return;
    a.chutes.forEach(no => {
      if (SB_CHUTES.some(c => c.no === no)) (m[no] = m[no] || []).push(s.name);
    });
  });
  return m;
}
/* 应用弹窗里的条件摘要(只读渲染) */
function sbCondsCell(sc) {
  return sc.conds.map((c, i) => {
    const vals = c.values.length > 2
      ? `<span class="sb-chip ${c.op === '不包含' ? 'sb-chip--not' : ''}" title="${c.values.join('、')}">${c.values[0]} 等${c.values.length}项</span>`
      : c.values.map(v => `<span class="sb-chip ${c.op === '不包含' ? 'sb-chip--not' : ''}">${v}</span>`).join('');
    const join = i > 0 ? `<span class="sb-chip-join sb-chip-join--hl">${sc.joiner}</span>` : '';
    return `${join}<span class="sb-cond-op ${c.op === '不包含' ? 'sb-cond-op--not' : ''}">${SB_ITEM_LABEL[c.item]} ${c.op}</span>${vals}`;
  }).join('');
}

/* ============================================
   方案列表(基线 V1.3.4)
   ============================================ */
function sbSolutionsView() {
  const rows = SbPage.filterSolutions();
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        <div class="qf"><label>方案名称</label><input class="ipt" id="sbQName" placeholder="如 B2B标准分拣方案" /></div>
        <div class="qf"><label>分拣机代码</label><input class="ipt" id="sbQCode" placeholder="如 FJ-01" /></div>
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="SbPage.doQuery()">🔍 查询</button>
        </div>
      </div>
    </div>
    <div class="grid-toolbar">
      <button class="btn" onclick="SbPage.openBoard()"><span class="ic">▦</span><span>查看格口</span></button>
      <span class="sep"></span>
      <button class="btn" onclick="Helpers.toast('已刷新(演示)')"><span class="ic">🔄</span><span>刷新</span></button>
      <span class="sb-toolbar-note">方案与格口由 SIMS 同步,此处只读;格口上挂分组方案(基础信息→分拣分组方案 定义)</span>
    </div>
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup><col style="width:36px" /><col style="width:110px" /><col style="width:100px" />
          <col style="min-width:160px" /><col style="width:80px" /><col style="width:110px" />
          <col style="width:150px" /><col style="width:100px" /></colgroup>
        <thead><tr><th></th><th>分拣机名称</th><th>分拣机代码</th><th>方案名称</th>
          <th>格口数</th><th>已挂方案口数</th><th>最近同步时间</th><th>方案版本</th></tr></thead>
        <tbody>
          ${rows.map(s => `
            <tr data-code="${s.sorterCode}" class="${SbPage.checkedSol === s.sorterCode ? 'row--selected' : ''}"
                onclick="SbPage.checkSol('${s.sorterCode}')">
              <td class="col--check"><input type="checkbox" onclick="event.stopPropagation()" /></td>
              <td>${s.sorterName}</td>
              <td class="col--code">${s.sorterCode}</td>
              <td>${s.solutionName}</td>
              <td>${s.chuteTotal}</td>
              <td>${SB_APPLIES.filter(a => a.sorterCode === s.sorterCode && a.ruleId === s.ruleId)
                    .reduce((n, a) => n + a.chutes.length, 0)}</td>
              <td>${s.syncTime}</td>
              <td>${s.version}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="pager">
      <button class="pg-btn" title="首页">«</button><button class="pg-btn" title="上一页">‹</button>
      <button class="pg-btn" title="下一页">›</button><button class="pg-btn" title="末页">»</button>
      <span class="pg-info">总记录数: <b>${rows.length}</b> 条,总页数: <b>1</b> 页,当前第 <b>1</b> 页</span>
    </div>
    ${sbBoardModal()}${sbApplyModal()}${sbReleaseModal()}
  `;
}

/* ============================================
   弹窗:格口看板(V1.3.4 基线 + 圈口挂分组方案)
   ============================================ */
function sbBoardCardsHtml() {
  const badge = sbBadgeMap();
  return SB_CHUTES.map(c => {
    const free = !c.master && !c.exc;
    let cls = '';
    if (c.exc) cls = 'sb-card--abn';
    else if (c.attr === '多件' && c.master) cls = c.done ? 'sb-card--done' : 'sb-card--multi';
    else if (free) cls = c.attr === '异常' ? 'sb-card--free sb-card--free--abn' : 'sb-card--free';
    /* 单件口/到齐沿用默认绿实线 */
    const mid = c.exc
      ? `<div class="sb-card-master" title="${c.master}">${c.master}</div>
         <div class="sb-card-exc">${c.exc}</div>`
      : c.attr === '多件' && c.master
        ? `<div class="sb-card-master" title="${c.master}">${c.master}</div>
           <div class="sb-card-progress ${c.done ? 'is-done' : ''}"
                title="点击查看未分拣子单明细(演示)">${c.cur}/${c.total}件${c.done ? ' 已到齐' : ''}</div>`
        : c.master
          ? `<div class="sb-card-master" title="${c.master}">${c.master}</div><div class="sb-card-free">已落格</div>`
          : `<div class="sb-card-free">空闲</div>`;
    const bds = badge[c.no] || [];
    const bd = bds.length ? `<div class="sb-card-badge" title="已挂分组方案:${bds.join('、')}">● ${bds.join(' · ')}</div>` : '';
    return `<div class="sb-card ${cls} ${SbPage.selChutes.has(c.no) ? 'sb-card--sel' : ''}"
                 onclick="SbPage.toggleChute('${c.no}')" title="格口 ${c.no} · ${c.attr}(点击勾选/取消)">
      <div class="sb-card-top"><span class="sb-card-no">${c.no}</span>
        <span class="sb-card-attr" style="color:${sbAttrColor(c.attr)}">${c.attr}</span></div>
      ${mid}${bd}
    </div>`;
  }).join('');
}

function sbBoardModal() {
  return `
    <div class="rw-modal sb-board-modal" id="sbBoardMask" style="display:none">
      <div class="rw-modal-mask" onclick="SbPage.closeBoard()"></div>
      <div class="rw-modal-panel">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="sbBoardTitle">格口看板</span>
          <button class="rw-modal-close" onclick="SbPage.closeBoard()">✕</button>
        </div>
        <div class="rw-modal-body" id="sbBoardBody"></div>
      </div>
    </div>
  `;
}

function sbRenderBoardBody() {
  const s = SbPage.sol || SB_SOLUTIONS[0];
  document.getElementById('sbBoardTitle').textContent =
    `格口看板 — ${s.solutionName} | ${s.sorterName}(${s.sorterCode}) | 格口 ${s.chuteTotal} 个 | 版本 ${s.version}`;
  const invalids = SB_APPLIES.filter(a => a.sorterCode === 'FJ-01' && a.ruleId === 10086 && sbApplyInvalid(a));
  const warn = invalids.length ? `
    <div class="sb-warn-bar">⚠ 方案换版后有 ${invalids.length} 个格口应用失效:${invalids.map(a =>
      `${sbScheme(a.schemeId).name} → 格口 ${a.chutes.join('、')}`).join(';')},请重新应用分拣方案(期间命中该分组的货转异常口)</div>` : '';
  document.getElementById('sbBoardBody').innerHTML = `
    ${warn}
    <div class="sb-board-head">
      <span class="sb-legend">
        <i class="sb-lg sb-lg--free"></i>空闲
        <i class="sb-lg sb-lg--multi"></i>多件未到齐
        <i class="sb-lg sb-lg--done"></i>多件已到齐
        <i class="sb-lg sb-lg--abn"></i>异常
        <i class="sb-lg sb-lg--rule">●</i>已挂方案
      </span>
      <span style="flex:1"></span>
      <span class="sb-pick-count">已勾选 <b>${SbPage.selChutes.size}</b> 个口</span>
      <button class="btn btn--primary" onclick="SbPage.openApply()">📌 应用分拣方案</button>
      <button class="btn" onclick="SbPage.openRelease()">🔓 释放格口</button>
    </div>
    <div class="sb-board-wrap">${sbBoardCardsHtml()}</div>
    <div class="sb-board-tip">看板 3s 自动轮询(演示为静态);点格口勾选(可多选)→ 应用分拣方案(已挂方案回显勾选,取消勾选保存即摘除);● 角标=已挂方案(多个用·分隔),该口只接收命中其所挂任一方案的货;异常口不挂方案;方案在 基础信息→分拣分组方案 维护</div>
  `;
}

/* ============================================
   弹窗:应用分拣方案(看板圈口,编辑式挂载/摘除)
   ============================================ */
function sbApplyModal() {
  return `
    <div class="rw-modal sb-apply-modal" id="sbApplyMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('sbApplyMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:500px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">应用分拣方案</span>
          <button class="rw-modal-close" onclick="document.getElementById('sbApplyMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="sb-rel-info">已勾选格口:<b id="sbApplyChutes"></b></div>
          <div class="rw-form-row" style="margin-top:8px;flex-direction:column;align-items:stretch;gap:4px">
            <label class="rw-form-label" style="min-width:0">分拣方案(可多选)：</label>
            <div class="sb-msel" id="sbApplySchemeBox">
              <div class="sb-msel-toggle" onclick="SbPage.toggleSchemeDrop(event)">
                <span class="sb-msel-chips" id="sbApplySchemeChips"></span>
                <span class="sb-msel-arrow">▾</span>
              </div>
              <div class="sb-msel-drop" id="sbSchemeDrop">
                <input class="ipt" id="sbSchemeDropSearch" placeholder="搜索方案名称…" style="width:100%" oninput="SbPage.renderSchemeDrop()" />
                <div class="sb-msel-list" id="sbSchemeDropList"></div>
              </div>
            </div>
          </div>
          <div class="sb-cond-note">已挂方案自动回显勾选;取消勾选后保存即从所选格口摘除;一个格口可挂多个方案(共享口),口=所挂方案的并集,只接收命中任一所挂方案的货;未挂方案的格口=默认池</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('sbApplyMask').style.display='none'">取消</button>
          <button class="btn btn--primary" onclick="SbPage.confirmApply()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   弹窗:释放格口(基线功能,带乐观锁提示)
   ============================================ */
function sbReleaseModal() {
  return `
    <div class="rw-modal" id="sbRelMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('sbRelMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:380px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">释放格口</span>
          <button class="rw-modal-close" onclick="document.getElementById('sbRelMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="sb-rel-info" id="sbRelInfo"></div>
          <div class="sb-cond-note">释放以当前占用主单号为乐观锁:若已被他人释放或被新主单占用,将提示刷新后重试</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('sbRelMask').style.display='none'">取消</button>
          <button class="btn btn--primary" onclick="SbPage.doRelease()">确认释放</button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   页面逻辑
   ============================================ */
const SbPage = {
  sol: null,                  /* 当前分拣方案对象 */
  checkedSol: null,           /* 方案列表选中 sorterCode */
  selChutes: new Set(),       /* 看板勾选的格口(可多选) */

  render() {
    document.getElementById('sbView').innerHTML = sbSolutionsView();
  },

  /* ---- 方案列表 ---- */
  filterSolutions() {
    const name = (document.getElementById('sbQName') || {}).value || '';
    const code = (document.getElementById('sbQCode') || {}).value || '';
    return SB_SOLUTIONS.filter(s =>
      (!name || s.solutionName.includes(name.trim())) && (!code || s.sorterCode.includes(code.trim())));
  },
  doQuery() { this.render(); Helpers.toast('已查询(演示)'); },
  checkSol(code) { this.checkedSol = code; this.render(); },

  /* ---- 看板 ---- */
  openBoard() {
    if (!this.checkedSol) { Helpers.toast('请先选中一行方案'); return; }
    this.sol = SB_SOLUTIONS.find(s => s.sorterCode === this.checkedSol);
    this.selChutes.clear();
    sbRenderBoardBody();
    document.getElementById('sbBoardMask').style.display = 'flex';
  },
  closeBoard() { document.getElementById('sbBoardMask').style.display = 'none'; },
  toggleChute(no) { this.selChutes.has(no) ? this.selChutes.delete(no) : this.selChutes.add(no); sbRenderBoardBody(); },

  /* 应用分拣方案(编辑式:打开回显已挂方案,取消勾选保存即摘除) */
  applySel: new Set(),           /* 弹窗当前勾选的方案 id */
  openSelInit: new Set(),        /* 打开时已挂方案快照(对比增删) */
  openApply() {
    if (!this.selChutes.size) { Helpers.toast('请先勾选格口(点击卡片)'); return; }
    document.getElementById('sbApplyChutes').textContent = Array.from(this.selChutes).sort().join('、');
    /* 回显:所选格口上已挂方案的并集 */
    const init = new Set();
    SB_APPLIES.filter(a => a.sorterCode === this.sol.sorterCode && a.ruleId === this.sol.ruleId)
      .forEach(a => a.chutes.forEach(no => {
        if (this.selChutes.has(no) && sbScheme(a.schemeId)) init.add(a.schemeId);
      }));
    this.applySel = new Set(init);
    this.openSelInit = init;
    document.getElementById('sbSchemeDropSearch').value = '';
    this.renderSchemeChips();
    this.renderSchemeDrop();
    document.getElementById('sbApplyMask').style.display = 'flex';
  },
  /* 下拉开/关 */
  toggleSchemeDrop(ev) {
    ev.stopPropagation();
    const drop = document.getElementById('sbSchemeDrop');
    drop.classList.toggle('is-open');
  },
  closeSchemeDrop() {
    document.getElementById('sbSchemeDrop').classList.remove('is-open');
  },
  /* 下拉列表(按搜索过滤,启用中的方案) */
  renderSchemeDrop() {
    const kw = (document.getElementById('sbSchemeDropSearch') || {}).value || '';
    const list = SB_SCHEMES.filter(s => s.status === 1 &&
      (!kw || s.name.includes(kw.trim())));
    document.getElementById('sbSchemeDropList').innerHTML = list.length ? list.map(s => `
      <label class="sb-vpick-item">
        <input type="checkbox" value="${s.id}" ${this.applySel.has(s.id) ? 'checked' : ''}
          onchange="SbPage.onDropCheck(${s.id}, this.checked)" />
        <span class="sb-vpick-code">${s.name}</span>
        <span class="sb-vpick-name">${s.conds.map(c =>
          `${SB_ITEM_LABEL[c.item]}${c.op}${c.values.length > 2 ? c.values[0] + '等' + c.values.length + '项' : c.values.join('/')}`).join(' ' + s.joiner + ' ')}</span>
      </label>`).join('') : '<div class="sb-cond-note" style="padding:8px">无匹配方案</div>';
  },
  onDropCheck(id, on) {
    on ? this.applySel.add(id) : this.applySel.delete(id);
    this.renderSchemeChips();
  },
  removeSchemeChip(id) {
    this.applySel.delete(id);
    this.renderSchemeChips();
    this.renderSchemeDrop();
  },
  /* 已选 chips 渐进显示:一行内尽量多放,放不下的聚合为 "+N 项" */
  renderSchemeChips() {
    const box = document.getElementById('sbApplySchemeChips');
    const chips = Array.from(this.applySel).map(id => {
      const s = sbScheme(id);
      return `<span class="sb-msel-chip">${s.name}<b onclick="event.stopPropagation();SbPage.removeSchemeChip(${id})">✕</b></span>`;
    });
    const ph = '<span class="sb-msel-ph">点击选择方案(可多选)</span>';
    if (!chips.length) { box.innerHTML = ph; return; }
    box.innerHTML = '';
    let shown = 0;
    for (const h of chips) {
      box.insertAdjacentHTML('beforeend', h);
      if (box.scrollHeight > box.clientHeight + 2) { box.lastElementChild.remove(); break; }
      shown++;
    }
    const rest = chips.length - shown;
    if (rest > 0) {
      box.insertAdjacentHTML('beforeend', `<span class="sb-msel-more" title="打开下拉查看/取消全部选中方案">+${rest} 项</span>`);
      if (box.scrollHeight > box.clientHeight + 2) {
        const els = box.querySelectorAll('.sb-msel-chip');
        if (els.length) els[els.length - 1].remove();
      }
    }
  },
  confirmApply() {
    const mounted = [], removed = [];
    /* 新增勾选 → 挂载到未挂该方案的所选口 */
    Array.from(this.applySel).forEach(id => {
      const s = sbScheme(id);
      const existing = new Set();
      SB_APPLIES.filter(a => a.sorterCode === this.sol.sorterCode && a.ruleId === this.sol.ruleId
        && a.schemeId === s.id).forEach(a => a.chutes.forEach(no => existing.add(no)));
      const fresh = Array.from(this.selChutes).filter(no => !existing.has(no));
      if (fresh.length) {
        SB_APPLIES.push({ id: Date.now() + id, schemeId: s.id, sorterCode: this.sol.sorterCode,
          ruleId: this.sol.ruleId, chutes: fresh.sort(),
          updateUser: '庄亚运', updateTime: Helpers.nowTime() });
        mounted.push(s.name);
      }
    });
    /* 取消勾选(打开时有、现在没有)→ 从所选口摘除 */
    Array.from(this.openSelInit).filter(id => !this.applySel.has(id)).forEach(id => {
      const s = sbScheme(id);
      if (!s) return;
      SB_APPLIES.filter(a => a.sorterCode === this.sol.sorterCode && a.ruleId === this.sol.ruleId
        && a.schemeId === s.id).forEach(a => {
        a.chutes = a.chutes.filter(no => !this.selChutes.has(no));
      });
      removed.push(s.name);
    });
    for (let i = SB_APPLIES.length - 1; i >= 0; i--) {
      if (!SB_APPLIES[i].chutes.length) SB_APPLIES.splice(i, 1);
    }
    if (!mounted.length && !removed.length) { Helpers.toast('未发生变化'); return; }
    this.selChutes.clear();
    this.closeSchemeDrop();
    document.getElementById('sbApplyMask').style.display = 'none';
    this.render();
    sbRenderBoardBody();
    document.getElementById('sbBoardMask').style.display = 'flex';
    const parts = [];
    if (mounted.length) parts.push(`已挂载:${mounted.join('、')}`);
    if (removed.length) parts.push(`已摘除:${removed.join('、')}`);
    Helpers.toast(`${parts.join(';')}(演示)`);
  },

  /* 释放格口(单口动作) */
  openRelease() {
    if (this.selChutes.size !== 1) { Helpers.toast('释放为单口操作,请只勾选 1 个格口'); return; }
    const no = Array.from(this.selChutes)[0];
    const c = SB_CHUTES.find(x => x.no === no);
    document.getElementById('sbRelInfo').innerHTML =
      `格口号:<b>${c.no}</b>(${c.attr})<br/>占用主单:<b>${c.master || '(空闲)'}</b><br/>状态:${c.exc || (c.done ? '已到齐' : (c.master ? '占用中' : '空闲'))}`;
    document.getElementById('sbRelMask').style.display = 'flex';
  },
  doRelease() {
    const no = Array.from(this.selChutes)[0];
    const c = SB_CHUTES.find(x => x.no === no);
    if (c) { c.master = ''; c.cur = 0; c.total = 0; c.done = false; c.exc = ''; }
    this.selChutes.clear();
    document.getElementById('sbRelMask').style.display = 'none';
    sbRenderBoardBody();
    Helpers.toast(`格口 ${no} 已释放(演示)`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'in-b2b-sort',
  activeTab: 'b2b-order',
  tabs: Layout.tabs.standard(),
  content: `<div id="sbView" style="flex:1;display:flex;flex-direction:column;min-height:0;"></div>`,
});
SbPage.render();
Helpers.startClock();

/* 点击下拉外部时收起方案下拉 */
document.addEventListener('click', e => {
  const box = document.getElementById('sbApplySchemeBox');
  if (box && !box.contains(e.target)) SbPage.closeSchemeDrop();
});
