/* ============================================
   b-sort-chute-rule.js — 分拣格口规则(单层结构·对比方案)
   与「分组方案+格口应用」两层结构对比体验:
     · 无分组方案实体,每个格口直接配条件规则(条件项+运算符+值,多条件 且/或)
     · 未配规则的口=默认池;异常口可配规则(异常类型验证字段区分不同异常)
     · 一票货命中多个口的规则 → 按格口号顺序落第一个空闲口(无优先级仲裁)
     · 同类货要 N 个口 = 逐口重复配(或勾选批量配);规则变更需逐口改
     · 每口规则变更单独记日志(批量操作每口一条)
   演示数据与 B2B分拣管理/分拣分组方案 各持一份(纯静态原型,跨页不同步)。
   ============================================ */

/* ---- 条件项字典(与 分拣分组方案 同源副本;值全量多选) ---- */
const CR_PRODUCTS = [
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
const CR_CHANNELS = [
  { code: 'HAIYUN-ZHIXIAN',     name: '海运直达' },
  { code: 'HAIYUN-ZHONGZHUAN',  name: '海运中转' },
  { code: 'MATSU-EXP',          name: '美森正班' },
  { code: 'MATSU-KUAI',         name: '美森加班' },
  { code: 'KONGYUN-ZHIXIAN',    name: '空运直达' },
  { code: 'KONGYUN-JIJI',       name: '空运急件' },
];
const CR_EXCEPTIONS = [
  { code: 'CIF', name: '签入失败' },
  { code: 'CF',  name: '格口已满' },
];
const CR_COND_ITEMS = [
  { key: 'product', label: '产品', ops: ['包含', '不包含'], values: CR_PRODUCTS },
  { key: 'channel', label: '渠道', ops: ['包含', '不包含'], values: CR_CHANNELS },
  { key: 'exception', label: '异常类型', ops: ['包含', '不包含'], values: CR_EXCEPTIONS },
];
const crItemDef = k => CR_COND_ITEMS.find(d => d.key === k);
const crNameOf = (item, code) => {
  const v = crItemDef(item).values.find(x => x.code === code);
  return v ? v.name : code;
};

/* ---- 演示数据:FJ-01 格口(01-10 单件 / 11-40 多件 / 41-50 异常) ----
   预置:03、04=带电×海运;05、06=敏货;11、12=非带电海运(多件口示例) */
function crBuildChutes() {
  const list = [];
  for (let i = 1; i <= 50; i++) {
    const no = String(i).padStart(2, '0');
    const attr = i <= 10 ? '单件' : (i <= 40 ? '多件' : '异常');
    list.push({ no, attr, conds: [], joiner: '且' });
  }
  const byNo = n => list.find(c => c.no === n);
  byNo('03').conds = [
    { item: 'product', op: '包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC'] },
    { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
  ];
  byNo('04').conds = byNo('03').conds.map(c => ({ ...c, values: c.values.slice() }));
  byNo('05').conds = [ { item: 'product', op: '包含', values: ['US-MATSU-MG', 'US-HAIYUN-MG'] } ];
  byNo('06').conds = byNo('05').conds.map(c => ({ ...c, values: c.values.slice() }));
  byNo('11').conds = [
    { item: 'product', op: '不包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC', 'US-KONGYUN-ELC'] },
    { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
  ];
  byNo('12').conds = byNo('11').conds.map(c => ({ ...c, values: c.values.slice() }));
  return list;
}
const CR_CHUTES = crBuildChutes();

/* ---- 演示数据:格口规则变更日志(每口一条;批量操作每口一条) ---- */
const CR_LOGS = [
  { no: '03', time: '2026-08-24 10:30:11', user: '庄亚运', action: '配置', detail: '产品包含3项 且 渠道包含2项' },
  { no: '04', time: '2026-08-24 10:32:40', user: '庄亚运', action: '配置', detail: '产品包含3项 且 渠道包含2项(同 03 号口)' },
  { no: '05', time: '2026-08-23 09:00:00', user: '王强',   action: '配置', detail: '产品包含2项' },
  { no: '06', time: '2026-08-23 09:02:15', user: '王强',   action: '配置', detail: '产品包含2项(同 05 号口)' },
  { no: '11', time: '2026-08-25 09:30:05', user: '李丽',   action: '配置', detail: '产品不包含4项 且 渠道包含2项' },
  { no: '12', time: '2026-08-25 09:31:52', user: '李丽',   action: '配置', detail: '产品不包含4项 且 渠道包含2项(同 11 号口)' },
];
const crLogAdd = (no, action, detail) =>
  CR_LOGS.unshift({ no, time: Helpers.nowTime(), user: '庄亚运', action, detail });

/* ---- 规则摘要 / 悬浮全文 ---- */
function crRuleSummary(c) {
  return c.conds.map(x => `${crItemDef(x.item).label}${x.op === '包含' ? '含' : '不含'}${x.values.length}`).join(` ${c.joiner} `);
}
function crRuleTitle(c) {
  return c.conds.map((x, i) =>
    (i > 0 ? ` ${c.joiner} ` : '') +
    `${crItemDef(x.item).label}${x.op} ${x.values.map(v => crNameOf(x.item, v)).join('、')}`).join('');
}

/* ---- 规则重叠检测(演示级简化:仅比对双方均为「包含」的条件项值交集;
        任一方含「不包含」条件的组合不做判断) ---- */
function crConflictGroups() {
  const conf = CR_CHUTES.filter(c => c.conds.length);
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
function crConflictMap() {
  const m = {};
  crConflictGroups().forEach(g => {
    (m[g.a] = m[g.a] || []).push(g);
    (m[g.b] = m[g.b] || []).push(g);
  });
  return m;
}

/* ---- 卡片 / 看板 ---- */
const crAttrColor = a => a === '单件' ? '#2E7D32' : (a === '多件' ? '#1565C0' : '#C62828');

function crCardsHtml() {
  const cmap = crConflictMap();
  return CR_CHUTES.map(c => {
    const isAbn = c.attr === '异常';
    const hasRule = c.conds.length > 0;
    const cls = isAbn ? 'sb-card--abn' : (hasRule ? 'cr-card--rule' : 'cr-card--pool');
    const confs = (cmap[c.no] || []).map(g => g.a === c.no ? g.b : g.a);
    const confHtml = confs.length
      ? `<div class="cr-conflict" title="规则包含值有交集,该货会同时命中两口,按格口号顺序落第一个空闲口">⚠ 与 ${[...new Set(confs)].join('、')} 重叠</div>` : '';
    const sum = hasRule
      ? `<div class="cr-rule-sum" title="${crRuleTitle(c)}">${crRuleSummary(c)}</div>`
      : isAbn
        ? `<div class="cr-rule-sum cr-rule-sum--dim">未配规则(落首个空闲异常口)</div>`
        : `<div class="cr-rule-sum cr-rule-sum--dim">默认池(未配规则)</div>`;
    return `<div class="sb-card ${cls}"
                 onclick="CrPage.openRule('${c.no}')" title="格口 ${c.no} · ${c.attr}(点击配置规则)">
      <div class="sb-card-top">
        <span class="sb-card-no">${c.no}</span>
        <span class="sb-card-attr" style="color:${crAttrColor(c.attr)}">${c.attr}</span>
      </div>
      ${sum}${confHtml}
    </div>`;
  }).join('');
}

/* ---- 主视图(查询区 + 工具栏 + 看板主体) ---- */
function crBoardView() {
  const groups = crConflictGroups();
  const warn = groups.length ? `
    <div class="sb-warn-bar">⚠ 检测到 ${groups.length} 组格口规则重叠:${groups.map(g =>
      `${g.a}↔${g.b}(${crItemDef(g.item).label}:${g.vals[0]} 等${g.vals.length}项)`).join(';')};一票货同时命中多个口的规则时,按格口号顺序落第一个空闲口(无优先级仲裁)</div>` : '';
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        <div class="qf"><label>分拣机</label>
          <select class="sel" id="crQSorter">
            <option value="FJ-01">FJ-01(1号分拣机)</option>
            <option value="FJ-02">FJ-02(2号分拣机)</option>
          </select>
        </div>
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="CrPage.doQuery()">🔍 查询</button>
        </div>
      </div>
    </div>
    <div class="grid-toolbar">
      <button class="btn" onclick="CrPage.showLogs()"><span class="ic">🗓</span><span>查看日志</span></button>
      <button class="btn" onclick="CrPage.showHelp()"><span class="ic">❓</span><span>规则说明</span></button>
      <span class="sb-toolbar-note">单层结构:格口直接配条件规则,无分组方案实体;点卡片=配置该口规则;删光条件行保存=恢复默认池</span>
    </div>
    <div style="flex:1;min-height:0;display:flex;flex-direction:column;padding:0 12px 12px;">
      ${warn}
      <div class="sb-board-head">
        <span class="sb-legend">
          <i class="sb-lg cr-lg--rule"></i>已配规则
          <i class="sb-lg cr-lg--pool"></i>默认池
          <i class="sb-lg sb-lg--abn"></i>异常口
        </span>
      </div>
      <div class="cr-board-wrap">${crCardsHtml()}</div>
    </div>
    ${crEditModal()}${crLogModal()}${crHelpModal()}
  `;
}

/* ============================================
   弹窗:配置格口规则(单口/批量同款,条件行编辑器与分组方案页同款交互)
   ============================================ */
function crFitChipsInto(el, chipHtmls, phHtml) {
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
function crFitChips(idx) {
  const el = document.getElementById(`crValChips_${idx}`);
  if (!el) return;
  const c = CrPage.editConds[idx];
  crFitChipsInto(el, c.values.map(v =>
    `<span class="sb-msel-chip" title="${crNameOf(c.item, v)}">${v}<b onclick="event.stopPropagation();CrPage.removeValChip(${idx},'${v}')">✕</b></span>`),
    '<span class="sb-msel-ph">选择值(可多选)</span>');
}

function crCondRowHtml(c, idx) {
  const def = crItemDef(c.item);
  const usedItems = CrPage.editConds.map(x => x.item);
  const itemOpts = CR_COND_ITEMS.map(d =>
    `<option value="${d.key}" ${d.key === c.item ? 'selected' : ''}
       ${usedItems.includes(d.key) && d.key !== c.item ? 'disabled' : ''}>${d.label}</option>`).join('');
  const opOpts = def.ops.map(o => `<option ${o === c.op ? 'selected' : ''}>${o}</option>`).join('');
  return `
    <div class="sb-crow">
      <select class="sel sb-crow-item" onchange="CrPage.onItemChange(${idx}, this.value)">${itemOpts}</select>
      <select class="sel sb-crow-op" onchange="CrPage.editConds[${idx}].op = this.value">${opOpts}</select>
      <div class="sb-msel" id="crValBox_${idx}">
        <div class="sb-msel-toggle" onclick="CrPage.toggleValDrop(${idx}, event)">
          <span class="sb-msel-chips" id="crValChips_${idx}"></span>
          <span class="sb-msel-arrow">▾</span>
        </div>
        <div class="sb-msel-drop" id="crValDrop_${idx}">
          <input class="ipt" placeholder="搜索代码/名称…" style="width:100%" oninput="CrPage.renderValDrop(${idx})" />
          <div class="sb-msel-list" id="crValList_${idx}"></div>
        </div>
      </div>
      <button class="sb-crow-del" onclick="CrPage.removeCond(${idx})" title="删除该条件">✕</button>
    </div>
  `;
}

/* 规则预览(实时反映当前条件行;连接词显示 全部满足/满足其一) */
function crRulePreviewText() {
  if (!CrPage.editConds.length) return '未配规则:该格口将作为默认池,按单件/多件正常分配';
  const body = CrPage.editConds.map(x =>
    `${crItemDef(x.item).label}${x.op} ${x.values.length ? x.values.map(v => crNameOf(x.item, v)).join('、') : '(未选值)'}`)
    .join(` ${CrPage.editJoiner} `);
  return `落口规则:${body}`;
}
function crRenderPreview() {
  const el = document.getElementById('crRulePreview');
  if (el) el.textContent = crRulePreviewText();
}

function crCondRowsHtml() {
  const rows = CrPage.editConds.map((c, i) => crCondRowHtml(c, i)).join('');
  const showJoiner = CrPage.editConds.length > 1;
  return `
    <div class="sb-crows">${rows}</div>
    <div class="sb-crow-foot">
      <button class="btn" onclick="CrPage.addCond()">➕ 新增条件</button>
      ${showJoiner ? `
        <span class="sb-joiner">
          多条件生效:
          <label class="lrb-check"><input type="radio" name="crJoiner" ${CrPage.editJoiner === '且' ? 'checked' : ''}
            onchange="CrPage.editJoiner='且';crRenderPreview()" />全部满足</label>
          <label class="lrb-check"><input type="radio" name="crJoiner" ${CrPage.editJoiner === '或' ? 'checked' : ''}
            onchange="CrPage.editJoiner='或';crRenderPreview()" />满足其一</label>
        </span>` : ''}
    </div>
  `;
}

function crEditModal() {
  return `
    <div class="rw-modal" id="crEditMask" style="display:none">
      <div class="rw-modal-mask" onclick="CrPage.closeEdit()"></div>
      <div class="rw-modal-panel" style="width:820px;overflow:visible">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="crEditTitle">配置格口规则</span>
          <button class="rw-modal-close" onclick="CrPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="cr-info-bar" id="crInfoBar"></div>
          <div style="margin-top:10px" id="crCondBoxWrap">
            <div class="sb-cond-box" id="crCondBox" style="gap:8px"></div>
          </div>
          <div class="sb-rule-preview" id="crRulePreview"></div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="CrPage.closeEdit()">取消</button>
          <button class="btn btn--primary" onclick="CrPage.saveRule()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* 弹窗顶部格口基本信息(格口档案) */
const CR_SORTER = { code: 'FJ-01', name: '1号分拣机', solution: 'B2B标准分拣方案', version: 'v20260820' };
function crInfoBarHtml(c) {
  const last = CR_LOGS.find(l => l.no === c.no);
  return `
    <span>分拣机:<b>${CR_SORTER.code} · ${CR_SORTER.name}</b></span>
    <span>分拣方案:<b>${CR_SORTER.solution}</b>(${CR_SORTER.version})</span>
    <span>格口号:<b>${c.no}</b></span>
    <span>属性:<b>${c.attr}</b></span>
    <span>当前规则:<b>${c.conds.length ? crRuleSummary(c) : '默认池(未配规则)'}</b></span>
    <span>最近变更:<b>${last ? `${last.time} ${last.user}` : '-'}</b></span>`;
}

/* ---- 日志弹窗(每口一条,批量操作也是每口一条) ---- */
function crLogModal() {
  return `
    <div class="rw-modal" id="crLogMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('crLogMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:680px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">格口规则变更日志</span>
          <button class="rw-modal-close" onclick="document.getElementById('crLogMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <table class="grid rw-log-grid rw-log-grid--wrap" style="width:100%;">
            <thead><tr><th>NO.</th><th>格口</th><th>操作人</th><th>操作时间</th><th>操作内容</th></tr></thead>
            <tbody id="crLogBody"></tbody>
          </table>
          <div class="sb-cond-note" style="margin-top:8px">每个格口的规则变更单独记录(批量操作每口一条),最新在前;本页无方案实体,日志按格口散记</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('crLogMask').style.display='none'">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 说明弹窗 ---- */
function crHelpModal() {
  return `
    <div class="rw-modal" id="crHelpMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('crHelpMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:520px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">格口规则说明(单层结构)</span>
          <button class="rw-modal-close" onclick="document.getElementById('crHelpMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="lr-help-step"><b>① 直接配:</b>每个格口单独配「什么样的货」= 条件行(验证字段+验证类型+内容,多条件 全部满足/满足其一);点卡片即配</div>
          <div class="lr-help-step"><b>② 生效:</b>分拣签入后按各口规则匹配;未配规则的口=默认池(按单件/多件正常分配,与现状一致)</div>
          <div class="lr-help-step"><b>③ 多口命中:</b>一票货同时命中多个口的规则时,按格口号顺序落第一个空闲口(⚠ 页面对「包含」值有交集的口给出重叠提示,无优先级仲裁)</div>
          <div class="lr-help-step"><b>④ 同类多口:</b>一类货需要多个格口时,需逐口配置相同规则;后续规则变更(如产品清单更新)需对每个口重新配置</div>
          <div class="lr-help-step"><b>⑤ 异常口:</b>可配规则(用「异常类型」验证字段区分不同异常);异常件未命中方案时落首个空闲异常口</div>
          <div class="lr-help-note">条件项字典可扩展(当前:产品/渠道),值从基础数据全量多选;分拣中途变更规则,已开始的票跟随第一件的格口不拆分。</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('crHelpMask').style.display='none'">知道了</button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   页面逻辑
   ============================================ */
const CrPage = {
  editChutes: [],         /* 弹窗编辑目标口(当前仅单口) */
  editConds: [],
  editJoiner: '且',

  render() {
    document.getElementById('crView').innerHTML = crBoardView();
  },

  doQuery() {
    const v = document.getElementById('crQSorter').value;
    if (v !== 'FJ-01') { Helpers.toast('FJ-02 格口数据未同步到本演示,继续展示 FJ-01'); return; }
    Helpers.toast('已查询(演示)');
  },

  openEditCommon() {
    document.getElementById('crCondBox').innerHTML = crCondRowsHtml();
    this.editConds.forEach((c, i) => crFitChips(i));
    crRenderPreview();
    document.getElementById('crEditMask').style.display = 'flex';
  },
  openRule(no) {
    const c = CR_CHUTES.find(x => x.no === no);
    this.editChutes = [no];
    document.getElementById('crEditTitle').textContent = `配置格口规则 — ${no} 号口(${c.attr})`;
    document.getElementById('crInfoBar').innerHTML = crInfoBarHtml(c);
    this.editConds = c.conds.length
      ? c.conds.map(x => ({ item: x.item, op: x.op, values: x.values.slice() }))
      : [{ item: CR_COND_ITEMS[0].key, op: CR_COND_ITEMS[0].ops[0], values: [] }];
    this.editJoiner = c.joiner || '且';
    this.openEditCommon();
  },
  closeEdit() { document.getElementById('crEditMask').style.display = 'none'; },

  saveRule() {
    const incomplete = this.editConds.some(c => !c.item || !c.op || !c.values.length);
    if (incomplete) { Helpers.toast('每行条件需选择值;删光条件行保存=恢复默认池'); return; }
    const isClear = this.editConds.length === 0;
    const summary = this.editConds.map(c =>
      `${crItemDef(c.item).label}${c.op}${c.values.length}项`).join(` ${this.editJoiner} `);
    this.editChutes.forEach(no => {
      const c = CR_CHUTES.find(x => x.no === no);
      c.conds = this.editConds.map(x => ({ item: x.item, op: x.op, values: x.values.slice() }));
      c.joiner = this.editJoiner;
      crLogAdd(no, isClear ? '清空' : '配置', isClear ? '恢复默认池' : summary);
    });
    this.closeEdit();
    this.render();
    Helpers.toast(isClear
      ? `格口 ${this.editChutes.join('、')} 已恢复默认池(演示)`
      : `格口 ${this.editChutes.join('、')} 规则已保存(演示)`);
  },

  /* ---- 条件行(flex 行式:行尾✕删除,底部新增条件) ---- */
  removeCond(idx) {
    this.editConds.splice(idx, 1);
    if (this.editConds.length <= 1) this.editJoiner = '且';
    this.refreshCondBox();
  },
  addCond() {
    if (this.editConds.length >= CR_COND_ITEMS.length) { Helpers.toast('条件项已全部使用'); return; }
    const free = CR_COND_ITEMS.find(d => !this.editConds.some(c => c.item === d.key));
    if (!free) { Helpers.toast('条件项已全部使用'); return; }
    this.editConds.push({ item: free.key, op: free.ops[0], values: [] });
    this.refreshCondBox();
  },
  onItemChange(idx, key) {
    const def = crItemDef(key);
    this.editConds[idx] = { item: key, op: def.ops[0], values: [] };
    this.refreshCondBox();
  },
  refreshCondBox() {
    document.getElementById('crCondBox').innerHTML = crCondRowsHtml();
    this.editConds.forEach((c, i) => crFitChips(i));
    crRenderPreview();
  },

  /* ---- 值选择(行内下拉多选) ---- */
  toggleValDrop(idx, ev) {
    ev.stopPropagation();
    const drop = document.getElementById(`crValDrop_${idx}`);
    if (!drop) return;
    document.querySelectorAll('.sb-msel-drop.is-open').forEach(d => { if (d !== drop) d.classList.remove('is-open'); });
    drop.classList.toggle('is-open');
    if (drop.classList.contains('is-open')) this.renderValDrop(idx);
  },
  renderValDrop(idx) {
    const c = this.editConds[idx];
    if (!c) return;
    const def = crItemDef(c.item);
    const box = document.getElementById(`crValBox_${idx}`);
    const drop = document.getElementById(`crValDrop_${idx}`);
    if (!box || !drop) return;
    const kw = (box.querySelector('.ipt') || {}).value || '';
    const list = def.values.filter(v =>
      !kw || v.code.includes(kw.trim().toUpperCase()) || v.name.includes(kw.trim()));
    drop.querySelector('.sb-msel-list').innerHTML = list.length ? list.map(v => `
      <label class="sb-vpick-item">
        <input type="checkbox" ${c.values.includes(v.code) ? 'checked' : ''}
          onchange="CrPage.onValCheck(${idx},'${v.code}', this.checked)" />
        <span class="sb-vpick-code">${v.code}</span><span class="sb-vpick-name">${v.name}</span>
      </label>`).join('') : '<div class="sb-cond-note" style="padding:8px">无匹配值</div>';
  },
  onValCheck(idx, code, on) {
    const values = this.editConds[idx].values;
    if (on) { values.push(code); } else {
      const i = values.indexOf(code); if (i >= 0) values.splice(i, 1);
    }
    crFitChips(idx);
    crRenderPreview();
  },
  removeValChip(idx, code) {
    const values = this.editConds[idx].values;
    const i = values.indexOf(code); if (i >= 0) values.splice(i, 1);
    crFitChips(idx);
    this.renderValDrop(idx);
    crRenderPreview();
  },

  showLogs() {
    document.getElementById('crLogBody').innerHTML = CR_LOGS.length ? CR_LOGS.map((l, i) => `
      <tr>
        <td class="col--num">${i + 1}</td>
        <td class="col--code">${l.no}</td>
        <td class="col--code">${l.user}</td>
        <td>${l.time}</td>
        <td>${l.action}:${l.detail}</td>
      </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:#999;padding:12px;">暂无变更日志</td></tr>';
    document.getElementById('crLogMask').style.display = 'flex';
  },

  showHelp() { document.getElementById('crHelpMask').style.display = 'flex'; },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-chute-rule',
  activeTab: 'b2b-order',
  tabs: Layout.tabs.standard(),
  content: `<div id="crView" style="flex:1;display:flex;flex-direction:column;min-height:0;"></div>`,
});
CrPage.render();
Helpers.startClock();

/* 点击下拉外部时收起所有值下拉 */
document.addEventListener('click', e => {
  if (e.target.closest('.sb-msel')) return;
  document.querySelectorAll('.sb-msel-drop.is-open').forEach(d => d.classList.remove('is-open'));
});
