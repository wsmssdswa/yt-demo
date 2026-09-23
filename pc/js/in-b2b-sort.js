/* ============================================
   in-b2b-sort.js — B2B分拣管理页
   模型(2026-08-26 定稿):规则直挂格口(单层)
     · 每个格口直接配条件规则(验证字段+验证类型+内容,多条件 全部满足/满足其一)
     · 未配规则的口按其格口属性正常分配(默认分拣);异常口可配规则(异常类型字段区分)
     · 一票货命中多个口的规则 → 按格口号顺序落第一个空闲口;多件同票锁同一口
     · 口满/异常 → 转异常口;SIMS 透传(CCOS 回传格口号,SIMS 不自行路由)
     · 方案与格口由 SIMS 同步(本页列表只读);格口规则在看板中按格口直接配置
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
  /* 预置货型分组规则(同类货一片口;op=运算符 code,见注册表 SIR_OPS 全局 12 运算符) */
  const ruleElecSea = [
    { item: 'product', op: 'IN', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC'] },
    { item: 'channel', op: 'IN', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
  ];
  const ruleMg = [ { item: 'product', op: 'IN', values: ['US-MATSU-MG', 'US-HAIYUN-MG'] } ];
  /* 普货海运:真实运算符无"不包含",用罗列表达(带电/敏货/普货三分,互不重叠) */
  const ruleNoElec = [
    { item: 'product', op: 'IN', values: ['US-MATSU-REG', 'US-HAIYUN-REG', 'US-KAPAI-REG'] },
    { item: 'channel', op: 'IN', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
  ];
  const ruleCif = [ { item: 'exception', op: 'IN', values: ['CIF'] } ];
  const rulePieces = [ { item: 'pieces', op: 'GT', values: ['5'] } ];
  const cp = r => r.map(c => ({ ...c, values: c.values.slice() }));
  ['03', '04', '21', '22'].forEach(n => { byNo(n).conds = cp(ruleElecSea); });
  ['05', '06', '23', '24'].forEach(n => { byNo(n).conds = cp(ruleMg); });
  ['07', '08', '27', '28'].forEach(n => { byNo(n).conds = cp(ruleNoElec); });
  ['43', '44'].forEach(n => { byNo(n).conds = cp(ruleCif); });
  /* 09/10 留空 = 未配规则:演示"未配规则的格口仍按其格口属性参与默认分拣" */
  ['13', '14'].forEach(n => { byNo(n).conds = cp(rulePieces); });
  /* 02 口(单件):单字段规则示例(只按产品圈货) */
  byNo('02').conds = [ { item: 'product', op: 'IN', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC'] } ];
  return list;
}

/* ---- 条件项字典(2026-09-04 起来自分拣项内置清单,本页不再写死) ---- */
/* 产品/渠道为"接口数据源"型分拣项的取值表(模拟 CCOS 主数据,内置清单引用) */
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
/* 兜底:预置规则引用的 key 若不在内置清单内(演示数据未对齐),按原名展示不崩 */
const sbItemDef = k => SB_COND_ITEMS.find(d => d.key === k)
  || { key: k, label: `(未登记)${k}`, type: 'enum', ops: ['IN'], values: [] };
/* 规则可用字段:按格口属性过滤——单件口的件数恒为 1(货类判定先行),任何件数条件都恒真/恒假,
   故不提供「主单件数」;多件口可配(内容最小填 2)、异常口不限(异常件件数不定) */
const sbItemsFor = attr => attr === '单件'
  ? SB_COND_ITEMS.filter(d => d.key !== 'pieces')
  : SB_COND_ITEMS.slice();
const sbNameOf = (item, code) => {
  const def = sbItemDef(item);
  if (!def.values) return String(code);   /* 数值字段无枚举,直接显示数值 */
  const v = def.values.find(x => x.code === code);
  return v ? v.name : code;
};

/* ---- 工具 ---- */
const sbAttrColor = a => a === '单件' ? '#2E7D32' : (a === '多件' ? '#1565C0' : '#C62828');
/* 条件行 → 压缩摘要(卡片徽标用) */
function sbRuleSummary(c) {
  return c.conds.map(x => {
    const def = sbItemDef(x.item);
    return SIR_valSummary(def, x, SIR_ctrlOf(def.type, x.op));
  }).join(` ${c.joiner} `);
}
/* 条件行 → 完整文本(title 悬浮/日志用) */
function sbRuleTitle(c) {
  return c.conds.map(x => {
    const def = sbItemDef(x.item);
    return SIR_valText(def, x, SIR_ctrlOf(def.type, x.op));
  }).join(` ${c.joiner} `);
}
/* 规则摘要(日志用):条件行超 3 行只记前 3 行与总数(与 PRD 记录参数口径一致) */
function sbRuleLogText(conds, joiner) {
  const pick = conds.length > 3 ? conds.slice(0, 3) : conds;
  const body = pick.map(x => {
    const def = sbItemDef(x.item);
    return SIR_valText(def, x, SIR_ctrlOf(def.type, x.op));
  }).join(` ${joiner} `);
  return conds.length > 3 ? `${body} 等 ${conds.length} 行` : body;
}

/* ---- 演示数据初始化 ---- */
const SB_CHUTES = sbBuildChutes();

/* 格口规则操作日志(演示数据,新→旧;真实系统写通用操作日志模块,按分拣机+格口号可查)
   sorter 用于"按方案筛"(外层列表选中一行方案 → 只看该分拣机) */
const SB_RULE_LOGS = [
  { sorter: 'FJ-01', chute: '02', t: '2026-09-20 09:31:20', u: '庄亚运', og: '东腾曼沙项目仓',
    c: '通过【格口看板-规则配置】配置格口 02（分拣机 FJ-01）规则，由「未配规则」改为「产品 包含 美森快船-带电、海运普船-带电」' },
  { sorter: 'FJ-01', chute: '15', t: '2026-09-19 16:20:05', u: '庄亚运', og: '东腾曼沙项目仓',
    c: '通过【格口看板-规则配置】清空格口 15（分拣机 FJ-01）规则，恢复默认分拣' },
  { sorter: 'FJ-01', chute: '27', t: '2026-09-19 10:15:44', u: '李四', og: '东腾曼沙项目仓',
    c: '通过【格口看板-规则配置】配置格口 27（分拣机 FJ-01）规则，由「产品 包含 美森快船-普货」改为「产品 包含 美森快船-普货、海运普船-普货、海外卡派-普货 且 渠道 包含 海运直达」' },
  { sorter: 'FJ-01', chute: '03', t: '2026-09-18 15:40:12', u: '庄亚运', og: '东腾曼沙项目仓',
    c: '通过【格口看板-规则配置】配置格口 03（分拣机 FJ-01）规则，由「产品 包含 美森快船-带电」改为「产品 包含 美森快船-带电、海运普船-带电、海外卡派-带电 且 渠道 包含 海运直达、海运中转」' },
  /* 方案换版自动清理(服务端行为,系统记日志留痕) */
  { sorter: 'FJ-01', chute: '52', t: '2026-08-20 09:12:40', u: '系统', og: '东腾曼沙项目仓',
    c: '通过【方案换版】同步新版本方案（v20260810 → v20260820），格口号 52 不在新方案中，自动清理该口规则；原规则：产品 包含 海外卡派-带电' },
];

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
      <button class="btn" onclick="SbPage.openLog()"><span class="ic">📋</span><span>操作日志</span></button>
      <span class="sep"></span>
      <button class="btn" onclick="Helpers.toast('已刷新')"><span class="ic">🔄</span><span>刷新</span></button>
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
    ${sbBoardModal()}${sbRuleModal()}${sbReleaseModal()}${sbLogModal()}${sbPickModal()}
  `;
}

/* ============================================
   弹窗:操作日志(该方案全部格口的规则配置记录,可按格口号筛)
   ============================================ */
function sbLogRowsHtml(kw) {
  const rows = SB_RULE_LOGS.filter(l => l.sorter === SbPage.logSorter && (!kw || l.chute.includes(kw)));
  if (!rows.length) return '<tr><td colspan="6" class="cr-empty">没有符合条件的操作记录</td></tr>';
  return rows.map((l, i) => `
    <tr>
      <td class="col--num">${i + 1}</td>
      <td class="col--code">${l.chute}</td>
      <td>${l.u}</td>
      <td>${l.t}</td>
      <td>${l.og || '—'}</td>
      <td>${l.c}</td>
    </tr>`).join('');
}

function sbLogModal() {
  return `
    <div class="rw-modal" id="sbLogMask" style="display:none">
      <div class="rw-modal-mask" onclick="SbPage.closeLog()"></div>
      <div class="rw-modal-panel rw-modal-panel--log rw-modal-panel--scroll">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="sbLogTitle">操作日志</span>
          <button class="rw-modal-close" onclick="SbPage.closeLog()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="rw-log-filter">
            <label>格口号</label>
            <input class="ipt" id="sbLogChute" placeholder="如 03,留空看全部"
                   onkeydown="if(event.key==='Enter'){SbPage.doLogQuery()}" />
            <button class="btn" onclick="SbPage.doLogQuery()">🔍 查询</button>
            <span class="rw-log-count" id="sbLogCount"></span>
          </div>
          <table class="grid sb-log-grid" style="width:100%;">
            <thead><tr><th>NO.</th><th>格口号</th><th>操作人</th><th>操作时间</th><th>操作网点</th><th>操作内容</th></tr></thead>
            <tbody id="sbLogBody"></tbody>
          </table>
        </div>
        <div class="rw-modal-footer">
          <button class="btn btn--primary" onclick="SbPage.closeLog()">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   弹窗:选择值(多选控件「选择…」打开;PC 端范式=勾选列表 + 确定/取消)
   ============================================ */
function sbPickModal() {
  return `
    <div class="rw-modal rw-modal--nested" id="sbPickMask" style="display:none">
      <div class="rw-modal-mask" onclick="SbPage.closePick()"></div>
      <div class="rw-modal-panel" style="width:460px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="sbPickTitle">选择值</span>
          <button class="rw-modal-close" onclick="SbPage.closePick()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="rw-log-filter">
            <label>搜索</label>
            <input class="ipt" id="sbPickKw" placeholder="值 code / 显示名" oninput="SbPage.renderPickList()" />
            <button class="btn" onclick="SbPage.pickAll(true)">全选</button>
            <button class="btn" onclick="SbPage.pickAll(false)">清空</button>
            <span class="rw-log-count" id="sbPickCount"></span>
          </div>
          <table class="grid sb-pick-grid" style="width:100%;">
            <thead><tr><th class="col--check"><input type="checkbox" id="sbPickAllBox"
              onchange="SbPage.pickAll(this.checked)" /></th><th>值 code</th><th>显示名</th></tr></thead>
            <tbody id="sbPickBody"></tbody>
          </table>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="SbPage.closePick()">取消</button>
          <button class="btn btn--primary" onclick="SbPage.confirmPick()">确定</button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   弹窗:格口看板(V1.3.4 基线 + 规则直挂口)
   ============================================ */
function sbBoardCardsHtml() {
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
                title="点击查看未分拣子单明细">${c.cur}/${c.total}件${c.done ? ' 已到齐' : ''}</div>`
        : c.master
          ? `<div class="sb-card-master" title="${c.master}">${c.master}</div><div class="sb-card-free">已落格</div>`
          : `<div class="sb-card-free">未占用</div>`;
    const confHtml = '';   /* 规则交叉提示已撤(格口不多,看规则摘要可判断);判定逻辑见 git 历史 */
    /* 规则态与占用态分两行展示:未配规则的格口按其格口属性正常分配,别与"口没占用"混为一谈 */
    const rule = c.conds.length
      ? `<div class="sb-card-badge sb-card-badge--rule" title="已配规则:${sbRuleTitle(c)}">已配规则:${sbRuleSummary(c)}</div>`
      : `<div class="sb-card-badge sb-card-badge--pool" title="未配规则:该口按其格口属性正常分配(默认分拣)">未配规则</div>`;
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
  document.getElementById('sbBoardBody').innerHTML = `
    <div class="sb-board-head">
      <span class="sb-legend">
        <i class="sb-lg sb-lg--free"></i>未占用
        <i class="sb-lg sb-lg--multi"></i>多件未到齐
        <i class="sb-lg sb-lg--done"></i>多件已到齐
        <i class="sb-lg sb-lg--abn"></i>异常
        <i class="sb-lg sb-lg--pool">未配规则</i>按单件/多件正常分配
        <i class="sb-lg sb-lg--rule">已配规则:</i>规则摘要
      </span>
      <span style="flex:1"></span>
      <span class="sb-pick-count">已选中 <b>${SbPage.selChutes.size}</b> 个口</span>
      <button class="btn btn--primary" onclick="SbPage.editRuleChecked()">✏️ 编辑落口规则</button>
      <button class="btn" onclick="SbPage.openRelease()">🔓 释放格口</button>
    </div>
    <div class="sb-board-wrap">${sbBoardCardsHtml()}</div>
    <div class="sb-board-tip">单击格口选中(可多选,配合释放格口),双击(或选中后点「编辑落口规则」)=配置该口规则,规则直挂口无方案实体;未配规则的口按其格口属性正常分配(与"口没占用"是两回事);一票货命中多个口时按格口号数值升序取第一个空闲口;多件同票锁同一口</div>
  `;
}

/* ============================================
   弹窗:配置格口规则(单口)
   ============================================ */
/* 内容值控件:按运算符形态渲染(in=多选 / eq=枚举单选 / num=数值 / range=双值区间 / text=文本) */
function sbValCtrlHtml(c, idx) {
  const def = sbItemDef(c.item);
  const ctrl = SIR_ctrlOf(def.type, c.op);
  if (ctrl === 'num') {
    /* 主单件数在多件口最小填 2:件数=1 的货只在单件口范围内,配 1 永不命中 */
    const min = (c.item === 'pieces' && SbPage.curAttr() === '多件') ? 2 : '';
    return `<input type="number"${min ? ` min="${min}"` : ''} class="ipt" style="flex:1;min-width:0" placeholder="填写数值"
      value="${c.values[0] || ''}" oninput="SbPage.onNumInput(${idx}, this.value)" />`;
  }
  if (ctrl === 'range') {
    return `<div style="flex:1;display:flex;align-items:center;gap:4px;min-width:0">
      <input type="number" class="ipt" style="flex:1;min-width:0" placeholder="起始值"
        value="${c.values[0] || ''}" oninput="SbPage.onRangeInput(${idx}, 0, this.value)" />
      <span style="color:#999">~</span>
      <input type="number" class="ipt" style="flex:1;min-width:0" placeholder="结束值"
        value="${c.values[1] || ''}" oninput="SbPage.onRangeInput(${idx}, 1, this.value)" />
    </div>`;
  }
  if (ctrl === 'text') {
    return `<input class="ipt" style="flex:1;min-width:0" placeholder="填写匹配文本,如 US-"
      value="${c.values[0] || ''}" oninput="SbPage.onTextInput(${idx}, this.value)" />`;
  }
  if (ctrl === 'eq') {
    const opts = ['<option value="">请选择</option>'].concat((def.values || []).map(v =>
      `<option value="${v.code}" ${c.values[0] === v.code ? 'selected' : ''}>${v.name}</option>`)).join('');
    return `<select class="sel" style="flex:1;min-width:0" onchange="SbPage.onEqInput(${idx}, this.value)">${opts}</select>`;
  }
  /* in:多选 = 只读框显示已选 + 「选择…」打开勾选弹窗
     (PC 端范式:对齐生产端 DataGridView 勾选列,不做 chips 标签溢出与浮层下拉) */
  const picked = c.values.map(v => sbNameOf(c.item, v)).join('、');
  return `<div class="sb-pick" style="flex:1;min-width:0">
      <input class="ipt sb-pick-ipt" readonly value="${picked}" title="${picked}"
        placeholder="未选值,点「选择…」勾选" onclick="SbPage.openPick(${idx})" />
      <button class="btn sb-pick-btn" onclick="SbPage.openPick(${idx})">选择…</button>
    </div>`;
}

function sbCondRowHtml(c, idx) {
  const def = sbItemDef(c.item);
  /* 同字段可多行(不限制):「满足其一」下取并集(可表达多段区间),「全部满足」下取交集;
     字段候选按格口属性过滤(单件口不给件数维度);历史数据用了本口不适用的字段时补进候选并标注,保证显示=数据 */
  const items = sbItemsFor(SbPage.curAttr());
  const stale = !items.some(d => d.key === c.item);
  const itemOpts = items.map(d =>
    `<option value="${d.key}" ${d.key === c.item ? 'selected' : ''}>${d.label}</option>`).join('')
    + (stale ? `<option value="${c.item}" selected>${def.label}（该口不适用）</option>` : '');
  /* 运算符下拉:候选=该分拣项值形态的运算符全集(内置固定,不存在失效缺项);
     value=code, 文案=中文名(悬浮英文符号/关键字) */
  const opOpts = (def.ops || []).map(code => {
    const o = SIR_opOf(code);
    return `<option value="${code}" ${code === c.op ? 'selected' : ''}
      ${o ? `title="${o.expr}"` : ''}>${o ? o.label : code}</option>`;
  }).join('');
  return `
    <div class="sb-crow">
      <select class="sel sb-crow-item" onchange="SbPage.onItemChange(${idx}, this.value)">${itemOpts}</select>
      <select class="sel sb-crow-op" onchange="SbPage.onOpChange(${idx}, this.value)">${opOpts}</select>
      ${sbValCtrlHtml(c, idx)}
      <button class="sb-crow-del" onclick="SbPage.removeCond(${idx})" title="删除该条件">✕</button>
    </div>
  `;
}

/* 规则预览(实时反映当前条件行;连接词直接用 且/或,读起来通顺) */
function sbRulePreviewText() {
  if (!SbPage.editConds.length) return '未配规则:该格口按单件/多件正常分配';
  const body = SbPage.editConds.map(x => {
    const def = sbItemDef(x.item);
    return SIR_valText(def, x, SIR_ctrlOf(def.type, x.op));
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
    <span>属性:<b>${c.attr}</b></span>`;
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
  pickIdx: null,              /* 值勾选弹窗正在编辑的条件行下标 */
  pickDraft: [],              /* 值勾选弹窗草稿(确定才写回条件行) */
  logSorter: null,            /* 操作日志弹窗的方案范围(未选中行=null 表示全部方案) */
  editConds: [],
  editJoiner: '且',

  render() {
    document.getElementById('sbView').innerHTML = sbSolutionsView();
  },

  /* 当前编辑格口的属性(单件/多件/异常)——字段候选与件数下限随属性而定 */
  curAttr() {
    const c = SB_CHUTES.find(x => x.no === this.ruleNo);
    return c ? c.attr : '';
  },

  /* ---- 方案列表 ---- */
  filterSolutions() {
    const name = (document.getElementById('sbQName') || {}).value || '';
    const code = (document.getElementById('sbQCode') || {}).value || '';
    return SB_SOLUTIONS.filter(s =>
      (!name || s.solutionName.includes(name.trim())) && (!code || s.sorterCode.includes(code.trim())));
  },
  doQuery() { this.render(); Helpers.toast('已查询'); },
  checkSol(code) { this.checkedSol = code; this.render(); },

  /* ---- 看板 ---- */
  openBoard() {
    if (!this.checkedSol) { Helpers.toast('请先选中一行方案'); return; }
    this.sol = SB_SOLUTIONS.find(s => s.sorterCode === this.checkedSol);
    sbRenderBoardBody();
    document.getElementById('sbBoardMask').style.display = 'flex';
  },
  closeBoard() { document.getElementById('sbBoardMask').style.display = 'none'; },

  /* ---- 操作日志(外层列表工具栏入口;必须先选中一行方案=看该分拣机的记录。
         分拣机由 SIMS 同步、业务侧删不掉,所以不提供"全部方案"视图) ---- */
  openLog() {
    const s = this.checkedSol ? SB_SOLUTIONS.find(x => x.sorterCode === this.checkedSol) : null;
    if (!s) { Helpers.toast('请先选中一行方案'); return; }
    this.logSorter = s.sorterCode;
    document.getElementById('sbLogTitle').textContent =
      `操作日志 — ${s.solutionName} | ${s.sorterName}(${s.sorterCode})`;
    document.getElementById('sbLogChute').value = '';
    this.doLogQuery();
    document.getElementById('sbLogMask').style.display = 'flex';
  },
  closeLog() { document.getElementById('sbLogMask').style.display = 'none'; },
  doLogQuery() {
    const kw = (document.getElementById('sbLogChute') || {}).value || '';
    document.getElementById('sbLogBody').innerHTML = sbLogRowsHtml(kw.trim());
    const n = SB_RULE_LOGS.filter(l => l.sorter === this.logSorter
      && (!kw.trim() || l.chute.includes(kw.trim()))).length;
    document.getElementById('sbLogCount').textContent =
      `共 ${n} 条记录${kw.trim() ? `（筛格口号 ${kw.trim()}）` : ''}`;
  },

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

  /* ---- 配置格口规则(单口) ---- */
  editRuleChecked() {
    if (this.selChutes.size !== 1) { Helpers.toast('编辑规则为单口操作,请只选中 1 个格口'); return; }
    this.openRule(Array.from(this.selChutes)[0]);
  },
  openRule(no) {
    const c = SB_CHUTES.find(x => x.no === no);
    this.ruleNo = no;
    document.getElementById('sbRuleTitle').textContent = `配置格口规则 — ${no} 号口(${c.attr})`;
    document.getElementById('sbRuleInfo').innerHTML = sbRuleInfoHtml(c);
    if (c.conds.length) {
      this.editConds = c.conds.map(x => ({ item: x.item, op: x.op, values: x.values.slice() }));
    } else {
      const d0 = sbItemsFor(c.attr)[0];      /* 首行默认字段(单件口跳过件数维度) */
      this.editConds = [{ item: d0.key, op: d0.ops[0], values: [] }];
    }
    this.editJoiner = c.joiner || '且';
    this.refreshCondBox();
    document.getElementById('sbRuleMask').style.display = 'flex';
  },
  closeRule() { document.getElementById('sbRuleMask').style.display = 'none'; },

  saveRule() {
    const c = SB_CHUTES.find(x => x.no === this.ruleNo);
    if (!c) return;
    const incomplete = this.editConds.some(x => {
      if (!x.item || !x.op) return true;
      const def = sbItemDef(x.item);
      return !SIR_valOk(x, SIR_ctrlOf(def.type, x.op));
    });
    if (incomplete) { Helpers.toast('每行条件需填全内容(区间需起止两个数值);删光条件行保存=恢复默认分拣'); return; }
    /* 主单件数(多件口)最小填 2:件数=1 的货只在单件口范围内,配 1 永不命中 */
    if (c.attr === '多件') {
      const tooSmall = this.editConds.some(x => x.item === 'pieces'
        && (x.values || []).some(v => v !== '' && v != null && Number(v) < 2));
      if (tooSmall) { Helpers.toast('主单件数最小填 2(件数 1 的货只在单件口范围内匹配,填 1 不会命中)'); return; }
    }
    const isClear = this.editConds.length === 0;
    const s = this.sol || SB_SOLUTIONS[0];
    /* 日志记"改之前长什么样"(排查"这票货为什么落这个口"要回得出改前的规则) */
    const oldText = c.conds.length ? sbRuleLogText(c.conds, c.joiner) : '未配规则';
    c.conds = this.editConds.map(x => ({ item: x.item, op: x.op, values: x.values.slice() }));
    c.joiner = this.editJoiner;
    SB_RULE_LOGS.unshift({
      sorter: s.sorterCode, chute: c.no, t: Helpers.nowTime(), u: '庄亚运', og: '东腾曼沙项目仓',
      c: isClear
        ? `通过【格口看板-规则配置】清空格口 ${c.no}（分拣机 ${s.sorterCode}）规则，恢复默认分拣`
        : `通过【格口看板-规则配置】配置格口 ${c.no}（分拣机 ${s.sorterCode}）规则，由「${oldText}」改为「${sbRuleLogText(c.conds, c.joiner)}」`,
    });
    this.closeRule();
    sbRenderBoardBody();
    document.getElementById('sbBoardMask').style.display = 'flex';
    Helpers.toast(isClear ? `格口 ${c.no} 已恢复默认分拣` : `格口 ${c.no} 规则已保存`);
  },

  /* ---- 条件行(flex 行式) ---- */
  /* 新增条件行:同一字段可配多行(「满足其一」下取并集,可表达多段区间);
     字段都用过时沿用最后一行的字段,不再拦截 */
  addCond() {
    const items = sbItemsFor(this.curAttr());
    const used = this.editConds.map(x => x.item);
    const free = items.find(d => !used.includes(d.key));
    const last = this.editConds[this.editConds.length - 1];
    const pick = free || (last ? sbItemDef(last.item) : items[0]);
    const ops = (pick.ops && pick.ops.length) ? pick.ops : ['IN'];
    this.editConds.push({ item: pick.key, op: ops[0], values: [] });
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
  /* 运算符切换:值结构随运算符形态变化,重置并重渲染该行 */
  onOpChange(idx, code) {
    this.editConds[idx].op = code;
    this.editConds[idx].values = [];
    this.refreshCondBox();
  },
  /* 数值输入(单值运算符:GT/LT/GE/LE/EQ/NE 用于数值字段) */
  onNumInput(idx, v) {
    this.editConds[idx].values = v === '' ? [] : [v];
    sbRenderPreview();
  },
  /* 区间输入(起止双值:BETWEEN/INTERVAL) */
  onRangeInput(idx, slot, v) {
    const c = this.editConds[idx];
    const arr = c.values.slice();
    while (arr.length < 2) arr.push('');
    arr[slot] = v;
    c.values = arr;
    sbRenderPreview();
  },
  /* 文本匹配输入(KWMATCH/MATCHSTART/MATCHEND) */
  onTextInput(idx, v) {
    this.editConds[idx].values = v === '' ? [] : [v];
    sbRenderPreview();
  },
  /* 枚举单选(EQ/NE 用于枚举字段) */
  onEqInput(idx, code) {
    this.editConds[idx].values = code ? [code] : [];
    sbRenderPreview();
  },
  refreshCondBox() {
    document.getElementById('sbCondBox').innerHTML = sbCondRowsHtml();
    sbRenderPreview();
  },

  /* ---- 值勾选弹窗(多选控件点「选择…」;确定才写回条件行) ---- */
  openPick(idx) {
    const c = this.editConds[idx];
    if (!c) return;
    const def = sbItemDef(c.item);
    if (!def.values || !def.values.length) { Helpers.toast('该分拣项暂无可选值'); return; }
    this.pickIdx = idx;
    this.pickDraft = c.values.slice();
    document.getElementById('sbPickTitle').textContent = `选择值 — ${def.label}`;
    document.getElementById('sbPickKw').value = '';
    this.renderPickList();
    document.getElementById('sbPickMask').style.display = 'flex';
  },
  closePick() { document.getElementById('sbPickMask').style.display = 'none'; },
  renderPickList() {
    const c = this.editConds[this.pickIdx];
    if (!c) return;
    const def = sbItemDef(c.item);
    const all = def.values || [];
    const kw = (document.getElementById('sbPickKw').value || '').trim();
    const list = all.filter(v => !kw || v.code.includes(kw.toUpperCase()) || v.name.includes(kw));
    document.getElementById('sbPickBody').innerHTML = list.length ? list.map(v => `
      <tr class="${this.pickDraft.includes(v.code) ? 'row--selected' : ''}" onclick="SbPage.pickRow('${v.code}')">
        <td class="col--check"><input type="checkbox" ${this.pickDraft.includes(v.code) ? 'checked' : ''}
          onclick="event.stopPropagation();SbPage.pickRow('${v.code}')" /></td>
        <td class="col--code">${v.code}</td>
        <td>${v.name}</td>
      </tr>`).join('') : '<tr><td colspan="3" class="cr-empty">无匹配值</td></tr>';
    document.getElementById('sbPickCount').textContent =
      `已选 ${this.pickDraft.length} / ${all.length} 项`;
    const box = document.getElementById('sbPickAllBox');
    if (box) box.checked = !!all.length && this.pickDraft.length === all.length;
  },
  pickRow(code) {
    const i = this.pickDraft.indexOf(code);
    if (i >= 0) this.pickDraft.splice(i, 1); else this.pickDraft.push(code);
    this.renderPickList();
  },
  pickAll(on) {
    const c = this.editConds[this.pickIdx];
    if (!c) return;
    this.pickDraft = on ? (sbItemDef(c.item).values || []).map(v => v.code) : [];
    this.renderPickList();
  },
  confirmPick() {
    const c = this.editConds[this.pickIdx];
    if (c) c.values = this.pickDraft.slice();
    this.closePick();
    this.refreshCondBox();
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
    Helpers.toast(`格口 ${no} 已释放`);
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
