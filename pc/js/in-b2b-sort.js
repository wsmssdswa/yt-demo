/* ============================================
   in-b2b-sort.js — B2B分拣管理页
   模型(2026-08-26 定稿):规则直挂格口(单层)
     · 每个格口直接配条件规则(验证字段+验证类型+内容,多条件 全部满足/满足其一)
     · 未配规则的口=默认池(按单件/多件正常分配);异常口可配规则(异常类型字段区分)
     · 一票货命中多个口的规则 → 按格口号顺序落第一个空闲口;多件同票锁同一口
     · 口满/异常 → 转异常口;SIMS 透传(CCOS 回传格口号,SIMS 不自行路由)
     · 方案与格口由 SIMS 同步(本页列表只读);分组方案维护见 基础信息→分拣分组方案
   ============================================ */

/* ---- 演示数据:分拣方案(SIMS 同步,只读) ---- */
const SB_SOLUTIONS = [
  { sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案', ruleId: 10086,
    chuteTotal: 50, syncTime: '2026-08-20 09:12:33', version: 'v20260820' },
  { sorterCode: 'FJ-02', sorterName: '2号分拣机', solutionName: 'B2B带电专用方案', ruleId: 10090,
    chuteTotal: 36, syncTime: '2026-08-18 15:40:11', version: 'v20260818' },
];

/* ---- 演示数据:FJ-01 格口(01-10 单件 / 11-40 多件 / 41-50 异常;规则直挂口) ---- */
function sbBuildChutes() {
  const list = [];
  for (let i = 1; i <= 50; i++) {
    const no = String(i).padStart(2, '0');
    const attr = i <= 10 ? '单件' : (i <= 40 ? '多件' : '异常');
    list.push({ no, attr, master: '', cur: 0, total: 0, done: false, exc: '', conds: [], joiner: '且' });
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
  /* 预置货型分组规则(同类货一片口) */
  const ruleElecSea = [
    { item: 'product', op: '包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC'] },
    { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
  ];
  const ruleMg = [ { item: 'product', op: '包含', values: ['US-MATSU-MG', 'US-HAIYUN-MG'] } ];
  const ruleNoElec = [
    { item: 'product', op: '不包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC', 'US-KONGYUN-ELC'] },
    { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
  ];
  const ruleCif = [ { item: 'exception', op: '包含', values: ['CIF'] } ];
  const ruleDest = [ { item: 'destOrg', op: '包含', values: ['DE-FRA', 'UK-LON'] } ];
  const rulePieces = [ { item: 'pieces', op: '大于', values: ['5'] } ];
  const cp = r => r.map(c => ({ ...c, values: c.values.slice() }));
  ['03', '04', '21', '22'].forEach(n => { byNo(n).conds = cp(ruleElecSea); });
  ['05', '06', '23', '24'].forEach(n => { byNo(n).conds = cp(ruleMg); });
  ['07', '08', '27', '28'].forEach(n => { byNo(n).conds = cp(ruleNoElec); });
  ['43', '44'].forEach(n => { byNo(n).conds = cp(ruleCif); });
  ['09', '10'].forEach(n => { byNo(n).conds = cp(ruleDest); });
  ['13', '14'].forEach(n => { byNo(n).conds = cp(rulePieces); });
  return list;
}

/* ---- 条件项字典(2026-09-04 起从分拣项注册表读取,本页不再写死) ---- */
/* 产品/渠道为"接口数据源"型分拣项的取值表(模拟 CCOS 主数据,注册表引用) */
const SB_PRODUCTS = [
  { code: 'US-MATSU-ELC',  name: '美森快船-带电' },
  { code: 'US-MATSU-REG',  name: '美森快船-普货' },
  { code: 'US-MATSU-MG',   name: '美森快船-敏货' },
  { code: 'US-HAIYUN-ELC', name: '海运普船-带电' },
  { code: 'US-HAIYUN-REG', name: '海运普船-普货' },
  { code: 'US-HAIYUN-MG',  name: '海运普船-敏货' },
  { code: 'US-KAPAI-ELC',  name: '海外卡派-带电' },
  { code: 'US-KAPAI-REG',  name: '海外卡派-普货' },
  { code: 'US-KONGYUN-REG',name: '空运专线-普货' },
  { code: 'US-KONGYUN-ELC',name: '空运专线-带电' },
];
const SB_CHANNELS = [
  { code: 'HAIYUN-ZHIXIAN',     name: '海运直达' },
  { code: 'HAIYUN-ZHONGZHUAN',  name: '海运中转' },
  { code: 'MATSU-EXP',          name: '美森正班' },
  { code: 'MATSU-KUAI',         name: '美森加班' },
  { code: 'KONGYUN-ZHIXIAN',    name: '空运直达' },
  { code: 'KONGYUN-JIJI',       name: '空运急件' },
];
const SB_COND_ITEMS = SortItemRegistry.buildCondItems({ product: SB_PRODUCTS, channel: SB_CHANNELS });
/* 兜底:预置规则引用的 key 若被注册表停用/删除,按原名展示不崩 */
const sbItemDef = k => SB_COND_ITEMS.find(d => d.key === k)
  || { key: k, label: `(已停用)${k}`, type: 'enum', ops: ['包含'], values: [] };
const sbNameOf = (item, code) => {
  const def = sbItemDef(item);
  if (!def.values) return String(code);   /* 数值字段无枚举,直接显示数值 */
  const v = def.values.find(x => x.code === code);
  return v ? v.name : code;
};

/* ---- 工具 ---- */
const sbAttrColor = a => a === '单件' ? '#2E7D32' : (a === '多件' ? '#1565C0' : '#C62828');
function sbRuleSummary(c) {
  return c.conds.map(x => {
    const def = sbItemDef(x.item);
    if (def.type === 'num') return `${def.label}${x.op}${x.values[0] || ''}`;
    return `${def.label}${x.op === '包含' ? '含' : '不含'}${x.values.length}`;
  }).join(` ${c.joiner} `);
}
function sbRuleTitle(c) {
  return c.conds.map((x, i) =>
    (i > 0 ? ` ${c.joiner} ` : '') +
    `${sbItemDef(x.item).label}${x.op} ${x.values.map(v => sbNameOf(x.item, v)).join('、')}`).join('');
}
/* 规则重叠检测(演示级简化:仅比对双方均为「包含」的条件项值交集;含「不包含」的组合不判断) */
function sbConflictGroups() {
  const conf = SB_CHUTES.filter(c => c.conds.length);
  const res = [];
  for (let i = 0; i < conf.length; i++) {
    for (let j = i + 1; j < conf.length; j++) {
      const a = conf[i], b = conf[j];
      if (a.conds.some(x => x.op === '不包含') || b.conds.some(x => x.op === '不包含')) continue;
      for (const ca of a.conds) {
        if (ca.op !== '包含') continue;
        const cb = b.conds.find(x => x.item === ca.item && x.op === '包含');
        if (!cb) continue;
        const inter = ca.values.filter(v => cb.values.includes(v));
        if (inter.length) { res.push({ a: a.no, b: b.no, item: ca.item, vals: inter }); break; }
      }
    }
  }
  return res;
}

/* ---- 演示数据初始化 ---- */
const SB_CHUTES = sbBuildChutes();

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
      <span class="sb-toolbar-note">方案与格口由 SIMS 同步,此处只读;格口规则在看板中按格口直接配置(规则直挂口)</span>
    </div>
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup><col style="width:36px" /><col style="width:110px" /><col style="width:100px" />
          <col style="min-width:160px" /><col style="width:80px" /><col style="width:110px" />
          <col style="width:150px" /><col style="width:100px" /></colgroup>
        <thead><tr><th></th><th>分拣机名称</th><th>分拣机代码</th><th>方案名称</th>
          <th>格口数</th><th>已配规则口数</th><th>最近同步时间</th><th>方案版本</th></tr></thead>
        <tbody>
          ${rows.map(s => `
            <tr data-code="${s.sorterCode}" class="${SbPage.checkedSol === s.sorterCode ? 'row--selected' : ''}"
                onclick="SbPage.checkSol('${s.sorterCode}')">
              <td class="col--check"><input type="checkbox" onclick="event.stopPropagation()" /></td>
              <td>${s.sorterName}</td>
              <td class="col--code">${s.sorterCode}</td>
              <td>${s.solutionName}</td>
              <td>${s.chuteTotal}</td>
              <td>${s.sorterCode === 'FJ-01' ? SB_CHUTES.filter(c => c.conds.length).length : 0}</td>
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
    ${sbBoardModal()}${sbRuleModal()}${sbReleaseModal()}
  `;
}

/* ============================================
   弹窗:格口看板(V1.3.4 基线 + 规则直挂口)
   ============================================ */
function sbBoardCardsHtml() {
  const cmap = {};
  sbConflictGroups().forEach(g => {
    (cmap[g.a] = cmap[g.a] || []).push(g);
    (cmap[g.b] = cmap[g.b] || []).push(g);
  });
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
    const confs = (cmap[c.no] || []).map(g => g.a === c.no ? g.b : g.a);
    const confHtml = confs.length
      ? `<div class="cr-conflict" title="规则包含值有交集,该货会同时命中两口,按格口号顺序落第一个空闲口">⚠ 与 ${[...new Set(confs)].join('、')} 重叠</div>` : '';
    const rule = c.conds.length
      ? `<div class="sb-card-badge sb-card-badge--rule" title="${sbRuleTitle(c)}">规则:${sbRuleSummary(c)}</div>`
      : '';
    return `<div class="sb-card ${cls} ${SbPage.selChutes.has(c.no) ? 'sb-card--sel' : ''}"
                 onclick="SbPage.cardClick('${c.no}')" ondblclick="SbPage.cardDblClick('${c.no}')"
                 title="格口 ${c.no} · ${c.attr}(单击选中,双击编辑规则)">
      <div class="sb-card-top"><span class="sb-card-no">${c.no}</span>
        <span class="sb-card-attr" style="color:${sbAttrColor(c.attr)}">${c.attr}</span></div>
      ${mid}${confHtml}${rule}
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
  const groups = sbConflictGroups();
  const warn = groups.length ? `
    <div class="sb-warn-bar">⚠ 检测到 ${groups.length} 组格口规则重叠:${groups.map(g =>
      `${g.a}↔${g.b}(${sbItemDef(g.item).label}:${g.vals[0]} 等${g.vals.length}项)`).join(';')};一票货同时命中多个口的规则时,按格口号顺序落第一个空闲口(无优先级仲裁)</div>` : '';
  document.getElementById('sbBoardBody').innerHTML = `
    ${warn}
    <div class="sb-board-head">
      <span class="sb-legend">
        <i class="sb-lg sb-lg--free"></i>空闲
        <i class="sb-lg sb-lg--multi"></i>多件未到齐
        <i class="sb-lg sb-lg--done"></i>多件已到齐
        <i class="sb-lg sb-lg--abn"></i>异常
        <i class="sb-lg sb-lg--rule">规则:</i>已配规则
      </span>
      <span style="flex:1"></span>
      <span class="sb-pick-count">已选中 <b>${SbPage.selChutes.size}</b> 个口</span>
      <button class="btn btn--primary" onclick="SbPage.editRuleChecked()">✏️ 编辑落口规则</button>
      <button class="btn" onclick="SbPage.openRelease()">🔓 释放格口</button>
    </div>
    <div class="sb-board-wrap">${sbBoardCardsHtml()}</div>
    <div class="sb-board-tip">看板 3s 自动轮询(演示为静态);单击格口选中(可多选,配合释放格口),双击(或选中后点「编辑落口规则」)=配置该口规则,规则直挂口无方案实体;未配规则的口=默认池;一票货命中多个口时按格口号顺序落第一个空闲口;多件同票锁同一口</div>
  `;
}

/* ============================================
   弹窗:配置格口规则(单口,交互与 格口规则对比页 一致)
   ============================================ */
function sbFitChipsInto(el, chipHtmls, phHtml) {
  if (!chipHtmls.length) { el.innerHTML = phHtml; return; }
  el.innerHTML = '';
  let shown = 0;
  for (const h of chipHtmls) {
    el.insertAdjacentHTML('beforeend', h);
    if (el.scrollHeight > el.clientHeight + 2) { el.lastElementChild.remove(); break; }
    shown++;
  }
  const rest = chipHtmls.length - shown;
  if (rest > 0) {
    el.insertAdjacentHTML('beforeend', `<span class="sb-msel-more" title="打开下拉查看/取消全部选中项">+${rest} 项</span>`);
    if (el.scrollHeight > el.clientHeight + 2) {
      const chips = el.querySelectorAll('.sb-msel-chip');
      if (chips.length) chips[chips.length - 1].remove();
    }
  }
}
function sbFitChips(idx) {
  const el = document.getElementById(`sbValChips_${idx}`);
  if (!el) return;
  const c = SbPage.editConds[idx];
  sbFitChipsInto(el, c.values.map(v =>
    `<span class="sb-msel-chip" title="${sbNameOf(c.item, v)}">${v}<b onclick="event.stopPropagation();SbPage.removeValChip(${idx},'${v}')">✕</b></span>`),
    '<span class="sb-msel-ph">选择值(可多选)</span>');
}

function sbCondRowHtml(c, idx) {
  const def = sbItemDef(c.item);
  const usedItems = SbPage.editConds.map(x => x.item);
  const itemOpts = SB_COND_ITEMS.map(d =>
    `<option value="${d.key}" ${d.key === c.item ? 'selected' : ''}
       ${usedItems.includes(d.key) && d.key !== c.item ? 'disabled' : ''}>${d.label}</option>`).join('');
  const opOpts = def.ops.map(o => `<option ${o === c.op ? 'selected' : ''}>${o}</option>`).join('');
  /* 数值字段(主单件数)内容=数值输入框;枚举字段=多选下拉 */
  const valHtml = def.type === 'num'
    ? `<input type="number" class="ipt" style="flex:1;min-width:0" placeholder="填写数值"
         value="${c.values[0] || ''}" oninput="SbPage.onNumInput(${idx}, this.value)" />`
    : `<div class="sb-msel" id="sbValBox_${idx}">
        <div class="sb-msel-toggle" onclick="SbPage.toggleValDrop(${idx}, event)">
          <span class="sb-msel-chips" id="sbValChips_${idx}"></span>
          <span class="sb-msel-arrow">▾</span>
        </div>
        <div class="sb-msel-drop" id="sbValDrop_${idx}">
          <input class="ipt" placeholder="搜索代码/名称…" style="width:100%" oninput="SbPage.renderValDrop(${idx})" />
          <div class="sb-msel-list" id="sbValList_${idx}"></div>
        </div>
      </div>`;
  return `
    <div class="sb-crow">
      <select class="sel sb-crow-item" onchange="SbPage.onItemChange(${idx}, this.value)">${itemOpts}</select>
      <select class="sel sb-crow-op" onchange="SbPage.editConds[${idx}].op = this.value;sbRenderPreview()">${opOpts}</select>
      ${valHtml}
      <button class="sb-crow-del" onclick="SbPage.removeCond(${idx})" title="删除该条件">✕</button>
    </div>
  `;
}

/* 规则预览(实时反映当前条件行;连接词直接用 且/或,读起来通顺) */
function sbRulePreviewText() {
  if (!SbPage.editConds.length) return '未配规则:该格口将作为默认池,按单件/多件正常分配';
  const body = SbPage.editConds.map(x => {
    const def = sbItemDef(x.item);
    if (def.type === 'num') return `${def.label}${x.op} ${x.values.length ? x.values[0] : '(未填数值)'}`;
    return `${def.label}${x.op} ${x.values.length ? x.values.map(v => sbNameOf(x.item, v)).join('、') : '(未选值)'}`;
  }).join(` ${SbPage.editJoiner} `);
  return `落口规则:${body}`;
}
function sbRenderPreview() {
  const el = document.getElementById('sbRulePreview');
  if (el) el.textContent = sbRulePreviewText();
}

function sbCondRowsHtml() {
  const rows = SbPage.editConds.map((c, i) => sbCondRowHtml(c, i)).join('');
  const showJoiner = SbPage.editConds.length > 1;
  return `
    <div class="sb-crows">${rows}</div>
    <div class="sb-crow-foot">
      <button class="btn" onclick="SbPage.addCond()">➕ 新增条件</button>
      ${showJoiner ? `
        <span class="sb-joiner">
          多条件生效:
          <label class="lrb-check"><input type="radio" name="sbJoiner" ${SbPage.editJoiner === '且' ? 'checked' : ''}
            onchange="SbPage.editJoiner='且';sbRenderPreview()" />全部满足</label>
          <label class="lrb-check"><input type="radio" name="sbJoiner" ${SbPage.editJoiner === '或' ? 'checked' : ''}
            onchange="SbPage.editJoiner='或';sbRenderPreview()" />满足其一</label>
        </span>` : ''}
    </div>
  `;
}

function sbRuleInfoHtml(c) {
  const s = SbPage.sol || SB_SOLUTIONS[0];
  return `
    <span>分拣机:<b>${s.sorterCode} · ${s.sorterName}</b></span>
    <span>分拣方案:<b>${s.solutionName}</b>(${s.version})</span>
    <span>格口号:<b>${c.no}</b></span>
    <span>属性:<b>${c.attr}</b></span>
    <span>当前规则:<b>${c.conds.length ? sbRuleSummary(c) : '默认池(未配规则)'}</b></span>`;
}

function sbRuleModal() {
  return `
    <div class="rw-modal" id="sbRuleMask" style="display:none">
      <div class="rw-modal-mask" onclick="SbPage.closeRule()"></div>
      <div class="rw-modal-panel" style="width:820px;overflow:visible">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="sbRuleTitle">配置格口规则</span>
          <button class="rw-modal-close" onclick="SbPage.closeRule()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="cr-info-bar" id="sbRuleInfo"></div>
          <div style="margin-top:10px">
            <div class="sb-cond-box" id="sbCondBox" style="gap:8px"></div>
          </div>
          <div class="sb-rule-preview" id="sbRulePreview"></div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="SbPage.closeRule()">取消</button>
          <button class="btn btn--primary" onclick="SbPage.saveRule()">保存</button>
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
  selChutes: new Set(),       /* 看板选中的格口(单击;配合编辑规则/释放) */
  _clickTimer: null,          /* 单击/双击区分定时器 */
  ruleNo: null,               /* 规则弹窗编辑的格口号 */
  editConds: [],
  editJoiner: '且',

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
    sbRenderBoardBody();
    document.getElementById('sbBoardMask').style.display = 'flex';
  },
  closeBoard() { document.getElementById('sbBoardMask').style.display = 'none'; },

  /* ---- 卡片单击=选中(延时区分双击),双击=编辑规则 ---- */
  cardClick(no) {
    clearTimeout(this._clickTimer);
    this._clickTimer = setTimeout(() => this.toggleChute(no), 220);
  },
  cardDblClick(no) {
    clearTimeout(this._clickTimer);
    this.openRule(no);
  },
  toggleChute(no) {
    this.selChutes.has(no) ? this.selChutes.delete(no) : this.selChutes.add(no);
    sbRenderBoardBody();
  },

  /* ---- 配置格口规则(单口,交互与 格口规则对比页 一致) ---- */
  editRuleChecked() {
    if (this.selChutes.size !== 1) { Helpers.toast('编辑规则为单口操作,请只选中 1 个格口'); return; }
    this.openRule(Array.from(this.selChutes)[0]);
  },
  openRule(no) {
    const c = SB_CHUTES.find(x => x.no === no);
    this.ruleNo = no;
    document.getElementById('sbRuleTitle').textContent = `配置格口规则 — ${no} 号口(${c.attr})`;
    document.getElementById('sbRuleInfo').innerHTML = sbRuleInfoHtml(c);
    this.editConds = c.conds.length
      ? c.conds.map(x => ({ item: x.item, op: x.op, values: x.values.slice() }))
      : [{ item: SB_COND_ITEMS[0].key, op: SB_COND_ITEMS[0].ops[0], values: [] }];
    this.editJoiner = c.joiner || '且';
    this.refreshCondBox();
    document.getElementById('sbRuleMask').style.display = 'flex';
  },
  closeRule() { document.getElementById('sbRuleMask').style.display = 'none'; },

  saveRule() {
    const c = SB_CHUTES.find(x => x.no === this.ruleNo);
    if (!c) return;
    const incomplete = this.editConds.some(x => !x.item || !x.op || !x.values.length);
    if (incomplete) { Helpers.toast('每行条件需选择值/填写数值;删光条件行保存=恢复默认池'); return; }
    const isClear = this.editConds.length === 0;
    c.conds = this.editConds.map(x => ({ item: x.item, op: x.op, values: x.values.slice() }));
    c.joiner = this.editJoiner;
    this.closeRule();
    sbRenderBoardBody();
    document.getElementById('sbBoardMask').style.display = 'flex';
    Helpers.toast(isClear ? `格口 ${c.no} 已恢复默认池(演示)` : `格口 ${c.no} 规则已保存(演示)`);
  },

  /* ---- 条件行(flex 行式) ---- */
  addCond() {
    if (this.editConds.length >= SB_COND_ITEMS.length) { Helpers.toast('条件项已全部使用'); return; }
    const free = SB_COND_ITEMS.find(d => !this.editConds.some(x => x.item === d.key));
    if (!free) { Helpers.toast('条件项已全部使用'); return; }
    this.editConds.push({ item: free.key, op: free.ops[0], values: [] });
    this.refreshCondBox();
  },
  removeCond(idx) {
    this.editConds.splice(idx, 1);
    if (this.editConds.length <= 1) this.editJoiner = '且';
    this.refreshCondBox();
  },
  onItemChange(idx, key) {
    const def = sbItemDef(key);
    this.editConds[idx] = { item: key, op: def.ops[0], values: [] };
    this.refreshCondBox();
  },
  /* 数值字段(主单件数)内容输入 */
  onNumInput(idx, v) {
    this.editConds[idx].values = v === '' ? [] : [v];
    sbRenderPreview();
  },
  refreshCondBox() {
    document.getElementById('sbCondBox').innerHTML = sbCondRowsHtml();
    this.editConds.forEach((c, i) => sbFitChips(i));
    sbRenderPreview();
  },

  /* ---- 值选择(行内下拉多选) ---- */
  toggleValDrop(idx, ev) {
    ev.stopPropagation();
    const drop = document.getElementById(`sbValDrop_${idx}`);
    if (!drop) return;
    document.querySelectorAll('.sb-msel-drop.is-open').forEach(d => { if (d !== drop) d.classList.remove('is-open'); });
    drop.classList.toggle('is-open');
    if (drop.classList.contains('is-open')) this.renderValDrop(idx);
  },
  renderValDrop(idx) {
    const c = this.editConds[idx];
    if (!c) return;
    const def = sbItemDef(c.item);
    const box = document.getElementById(`sbValBox_${idx}`);
    const drop = document.getElementById(`sbValDrop_${idx}`);
    if (!box || !drop) return;
    const kw = (box.querySelector('.ipt') || {}).value || '';
    const list = def.values.filter(v =>
      !kw || v.code.includes(kw.trim().toUpperCase()) || v.name.includes(kw.trim()));
    drop.querySelector('.sb-msel-list').innerHTML = list.length ? list.map(v => `
      <label class="sb-vpick-item">
        <input type="checkbox" ${c.values.includes(v.code) ? 'checked' : ''}
          onchange="SbPage.onValCheck(${idx},'${v.code}', this.checked)" />
        <span class="sb-vpick-code">${v.code}</span><span class="sb-vpick-name">${v.name}</span>
      </label>`).join('') : '<div class="sb-cond-note" style="padding:8px">无匹配值</div>';
  },
  onValCheck(idx, code, on) {
    const values = this.editConds[idx].values;
    if (on) { values.push(code); } else {
      const i = values.indexOf(code); if (i >= 0) values.splice(i, 1);
    }
    sbFitChips(idx);
    sbRenderPreview();
  },
  removeValChip(idx, code) {
    const values = this.editConds[idx].values;
    const i = values.indexOf(code); if (i >= 0) values.splice(i, 1);
    sbFitChips(idx);
    this.renderValDrop(idx);
    sbRenderPreview();
  },

  /* 释放格口(选中单口,基线乐观锁交互) */
  openRelease() {
    if (this.selChutes.size !== 1) { Helpers.toast('释放为单口操作,请只选中 1 个格口'); return; }
    const c = SB_CHUTES.find(x => x.no === Array.from(this.selChutes)[0]);
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
    document.getElementById('sbBoardMask').style.display = 'flex';
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

/* 点击下拉外部时收起所有值下拉 */
document.addEventListener('click', e => {
  if (e.target.closest('.sb-msel')) return;
  document.querySelectorAll('.sb-msel-drop.is-open').forEach(d => d.classList.remove('is-open'));
});
