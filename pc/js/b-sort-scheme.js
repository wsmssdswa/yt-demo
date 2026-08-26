/* ============================================
   b-sort-scheme.js — 分拣分组方案(基础信息,全局配置)
   分组方案 = 什么样的货(条件行 + 且/或),不含格口;
   命中多个方案时可用口=并集找空闲,无优先级;
   在各分拣机的格口看板(B2B分拣管理)圈口挂载后生效。
   演示数据与 B2B分拣管理页各持一份(纯静态原型,跨页不同步)。
   ============================================ */

/* ---- 演示数据:条件项字典(可扩展;值全量多选) ---- */
const SS_PRODUCTS = [
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
const SS_CHANNELS = [
  { code: 'HAIYUN-ZHIXIAN',     name: '海运直达' },
  { code: 'HAIYUN-ZHONGZHUAN',  name: '海运中转' },
  { code: 'MATSU-EXP',          name: '美森正班' },
  { code: 'MATSU-KUAI',         name: '美森加班' },
  { code: 'KONGYUN-ZHIXIAN',    name: '空运直达' },
  { code: 'KONGYUN-JIJI',       name: '空运急件' },
];
const SS_EXCEPTIONS = [
  { code: 'CIF', name: '签入失败' },
  { code: 'CF',  name: '格口已满' },
];
const SS_COND_ITEMS = [
  { key: 'product', label: '产品', ops: ['包含', '不包含'], values: SS_PRODUCTS },
  { key: 'channel', label: '渠道', ops: ['包含', '不包含'], values: SS_CHANNELS },
  { key: 'exception', label: '异常类型', ops: ['包含', '不包含'], values: SS_EXCEPTIONS },
];
const ssItemDef = k => SS_COND_ITEMS.find(d => d.key === k);

/* ---- 演示数据:格口应用明细(与分拣管理页同源副本;invalid=方案换版格口失效) ---- */
const SS_APPLIES = [
  { schemeId: 1, sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案',
    chutes: ['03', '04', '21', '22'], invalid: false, updateUser: '庄亚运', updateTime: '2026-08-24 10:30:11' },
  { schemeId: 1, sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案',
    chutes: ['05', '06'], invalid: false, updateUser: '庄亚运', updateTime: '2026-08-25 10:00:00' },
  { schemeId: 1, sorterCode: 'FJ-02', sorterName: '2号分拣机', solutionName: 'B2B带电专用方案',
    chutes: ['05', '08'], invalid: false, updateUser: '王强', updateTime: '2026-08-21 14:00:00' },
  { schemeId: 2, sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案',
    chutes: ['05', '06', '23', '24'], invalid: false, updateUser: '庄亚运', updateTime: '2026-08-23 16:20:40' },
  { schemeId: 4, sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案',
    chutes: ['61', '62'], invalid: true, updateUser: '王强', updateTime: '2026-08-10 09:10:00' },
  { schemeId: 5, sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案',
    chutes: ['07', '08', '27', '28'], invalid: false, updateUser: '李丽', updateTime: '2026-08-25 09:30:05' },
  { schemeId: 6, sorterCode: 'FJ-01', sorterName: '1号分拣机', solutionName: 'B2B标准分拣方案',
    chutes: ['43', '44'], invalid: false, updateUser: '庄亚运', updateTime: '2026-08-26 10:05:00' },
];
const ssApplyCount = id => new Set(SS_APPLIES.filter(a => a.schemeId === id).map(a => a.sorterCode)).size;

/* ---- 演示数据:方案操作日志(全生命周期流水,最新在前;方案删除后日志仍保留) ---- */
const SS_LOGS = [
  { schemeId: 6, time: '2026-08-26 10:05:00', action: '挂载', detail: 'FJ-01 异常格口 43、44', user: '庄亚运' },
  { schemeId: 6, time: '2026-08-26 10:00:00', action: '新建', detail: '条件:异常类型包含1项', user: '庄亚运' },
  { schemeId: 1, time: '2026-08-25 10:00:11', action: '挂载', detail: 'FJ-01 格口 05、06(与敏货类共享口)', user: '庄亚运' },
  { schemeId: 1, time: '2026-08-24 10:30:11', action: '挂载', detail: 'FJ-01 格口 03、04、21、22', user: '庄亚运' },
  { schemeId: 1, time: '2026-08-21 14:00:00', action: '挂载', detail: 'FJ-02 格口 05、08', user: '王强' },
  { schemeId: 1, time: '2026-08-24 10:22:41', action: '新建', detail: '条件:产品包含3项 且 渠道包含2项', user: '庄亚运' },
  { schemeId: 2, time: '2026-08-23 16:20:40', action: '挂载', detail: 'FJ-01 格口 05、06、23、24', user: '庄亚运' },
  { schemeId: 2, time: '2026-08-23 16:05:12', action: '新建', detail: '条件:产品包含2项', user: '庄亚运' },
  { schemeId: 3, time: '2026-08-23 09:00:00', action: '停用', detail: '启用 → 停用', user: '李丽' },
  { schemeId: 3, time: '2026-08-22 11:50:30', action: '修改', detail: '新增条件:产品包含 US-MATSU-REG(连接词:或)', user: '李丽' },
  { schemeId: 3, time: '2026-08-22 11:40:03', action: '新建', detail: '条件:渠道包含2项', user: '李丽' },
  { schemeId: 4, time: '2026-08-10 09:10:00', action: '挂载', detail: 'FJ-01 格口 61、62(方案换版后已失效)', user: '王强' },
  { schemeId: 4, time: '2026-08-10 09:00:00', action: '新建', detail: '条件:产品包含2项', user: '王强' },
  { schemeId: 5, time: '2026-08-25 09:30:05', action: '挂载', detail: 'FJ-01 格口 07、08、27、28', user: '李丽' },
  { schemeId: 5, time: '2026-08-25 09:15:20', action: '新建', detail: '条件:产品不包含4项 且 渠道包含2项', user: '李丽' },
];
const ssLogAdd = (schemeId, action, detail) =>
  SS_LOGS.unshift({ schemeId, time: Helpers.nowTime(), action, detail, user: '庄亚运' });

/* ---- 演示数据:分组方案(与分拣管理页同源副本) ---- */
const SS_SCHEMES = [
  { id: 1, code: 'GS-001', name: '带电×海运',
    conds: [
      { item: 'product', op: '包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC'] },
      { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
    ], joiner: '且', status: 1, updateUser: '庄亚运', updateTime: '2026-08-24 10:22:41' },
  { id: 2, code: 'GS-002', name: '敏货类',
    conds: [ { item: 'product', op: '包含', values: ['US-MATSU-MG', 'US-HAIYUN-MG'] } ], joiner: '且',
    status: 1, updateUser: '庄亚运', updateTime: '2026-08-23 16:05:12' },
  { id: 3, code: 'GS-003', name: '美森批量件',
    conds: [
      { item: 'channel', op: '包含', values: ['MATSU-EXP', 'MATSU-KUAI'] },
      { item: 'product', op: '包含', values: ['US-MATSU-REG'] },
    ], joiner: '或', status: 0, updateUser: '李丽', updateTime: '2026-08-22 11:40:03' },
  { id: 4, code: 'GS-004', name: '普货类',
    conds: [ { item: 'product', op: '包含', values: ['US-MATSU-REG', 'US-HAIYUN-REG'] } ], joiner: '且',
    status: 1, updateUser: '王强', updateTime: '2026-08-10 09:00:00' },
  { id: 5, code: 'GS-005', name: '非带电海运',
    conds: [
      { item: 'product', op: '不包含', values: ['US-MATSU-ELC', 'US-HAIYUN-ELC', 'US-KAPAI-ELC', 'US-KONGYUN-ELC'] },
      { item: 'channel', op: '包含', values: ['HAIYUN-ZHIXIAN', 'HAIYUN-ZHONGZHUAN'] },
    ], joiner: '且', status: 1, updateUser: '李丽', updateTime: '2026-08-25 09:15:20' },
  { id: 6, code: 'GS-006', name: '签入失败件',
    conds: [ { item: 'exception', op: '包含', values: ['CIF'] } ], joiner: '且',
    status: 1, updateUser: '庄亚运', updateTime: '2026-08-26 10:00:00' },
];

/* ---- 条件列渲染 ---- */
function ssCondsCell(sc) {
  return sc.conds.map((c, i) => {
    const def = ssItemDef(c.item);
    const vals = c.values.length > 2
      ? `<span class="sb-chip ${c.op === '不包含' ? 'sb-chip--not' : ''}" title="${c.values.join('、')}">${c.values[0]} 等${c.values.length}项</span>`
      : c.values.map(v => `<span class="sb-chip ${c.op === '不包含' ? 'sb-chip--not' : ''}">${v}</span>`).join('');
    const join = i > 0 ? `<span class="sb-chip-join sb-chip-join--hl">${sc.joiner}</span>` : '';
    return `${join}<span class="sb-cond-op ${c.op === '不包含' ? 'sb-cond-op--not' : ''}">${def.label} ${c.op}</span>${vals}`;
  }).join('');
}
/* 条件列悬浮全文(纯文本) */
function ssCondsTitle(sc) {
  return sc.conds.map((c, i) =>
    (i > 0 ? ` ${sc.joiner} ` : '') +
    `${ssItemDef(c.item).label}${c.op} ${c.values.join('、')}`).join('');
}

/* ---- 列表 ---- */
function ssGridHtml() {
  return SS_SCHEMES.slice().sort((a, b) => a.id - b.id).map(sc => `
    <tr data-id="${sc.id}" class="${SsPage.checked === sc.id ? 'row--selected' : ''}"
        onclick="SsPage.check(${sc.id})">
      <td class="col--check"><input type="checkbox" onclick="event.stopPropagation()" /></td>
      <td class="col--code">${sc.code}</td>
      <td>${sc.name}</td>
      <td class="sb-cond-td" title="${ssCondsTitle(sc)}"><div class="sb-cond-cell">${ssCondsCell(sc)}</div></td>
      <td title="点击查看应用位置明细">${(() => { const n = ssApplyCount(sc.id); return n ? `<span class="cell-link" onclick="event.stopPropagation();SsPage.showApplyDetail(${sc.id})">${n} 处</span>` : `<span class="sb-chip-dim">0 处</span>`; })()}</td>
      <td>${sc.status === 1 ? '<span class="abn-tag abn-tag--ok">启用</span>' : '<span class="abn-tag">停用</span>'}</td>
      <td>${sc.updateUser}</td>
      <td>${sc.updateTime}</td>
    </tr>`).join('');
}

function ssGrid() {
  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup><col style="width:36px" /><col style="width:80px" /><col style="min-width:110px" />
          <col style="min-width:280px" /><col style="width:90px" /><col style="width:70px" />
          <col style="width:70px" /><col style="width:150px" /></colgroup>
        <thead><tr><th></th><th>方案代码</th><th>方案名称</th>
          <th title="一行=条件项+运算符+值;多条件按且/或连接">匹配条件</th>
          <th title="各分拣机格口上的挂载数">已应用</th>
          <th>状态</th><th>更新人</th><th>更新时间</th></tr></thead>
        <tbody id="ssGridBody">${ssGridHtml()}</tbody>
      </table>
    </div>
  `;
}

/* ---- 编辑弹窗(条件行编辑器;值=下拉多选,与格口选方案同款交互) ---- */
/* chips 渐进显示:一行内尽量多放,放不下的聚合为 "+N 项" */
function ssFitChipsInto(el, chipHtmls, phHtml) {
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
function ssFitChips(idx) {
  const el = document.getElementById(`ssValChips_${idx}`);
  if (!el) return;
  const c = SsPage.editConds[idx];
  const def = ssItemDef(c.item);
  ssFitChipsInto(el, c.values.map(v => {
    const full = def.values.find(x => x.code === v);
    return `<span class="sb-msel-chip" title="${full ? full.name : v}">${v}<b onclick="event.stopPropagation();SsPage.removeValChip(${idx},'${v}')">✕</b></span>`;
  }), '<span class="sb-msel-ph">选择值(可多选)</span>');
}

function ssCondRowHtml(c, idx) {
  const def = ssItemDef(c.item);
  const usedItems = SsPage.editConds.map(x => x.item);
  const itemOpts = SS_COND_ITEMS.map(d =>
    `<option value="${d.key}" ${d.key === c.item ? 'selected' : ''}
       ${usedItems.includes(d.key) && d.key !== c.item ? 'disabled' : ''}>${d.label}</option>`).join('');
  const opOpts = def.ops.map(o => `<option ${o === c.op ? 'selected' : ''}>${o}</option>`).join('');
  return `
    <div class="sb-crow">
      <select class="sel sb-crow-item" onchange="SsPage.onItemChange(${idx}, this.value)">${itemOpts}</select>
      <select class="sel sb-crow-op" onchange="SsPage.editConds[${idx}].op = this.value">${opOpts}</select>
      <div class="sb-msel" id="ssValBox_${idx}">
        <div class="sb-msel-toggle" onclick="SsPage.toggleValDrop(${idx}, event)">
          <span class="sb-msel-chips" id="ssValChips_${idx}"></span>
          <span class="sb-msel-arrow">▾</span>
        </div>
        <div class="sb-msel-drop" id="ssValDrop_${idx}">
          <input class="ipt" placeholder="搜索代码/名称…" style="width:100%" oninput="SsPage.renderValDrop(${idx})" />
          <div class="sb-msel-list" id="ssValList_${idx}"></div>
        </div>
      </div>
      <button class="sb-crow-del" onclick="SsPage.removeCond(${idx})" title="删除该条件">✕</button>
    </div>
  `;
}

function ssCondRowsHtml() {
  const rows = SsPage.editConds.map((c, i) => ssCondRowHtml(c, i)).join('');
  const showJoiner = SsPage.editConds.length > 1;
  return `
    <div class="sb-crows">${rows}</div>
    <div class="sb-crow-foot">
      <button class="btn" onclick="SsPage.addCond()">➕ 新增条件</button>
      ${showJoiner ? `
        <span class="sb-joiner">
          多条件生效:
          <label class="lrb-check"><input type="radio" name="ssJoiner" ${SsPage.editJoiner === '且' ? 'checked' : ''}
            onchange="SsPage.editJoiner='且'" />全部满足</label>
          <label class="lrb-check"><input type="radio" name="ssJoiner" ${SsPage.editJoiner === '或' ? 'checked' : ''}
            onchange="SsPage.editJoiner='或'" />满足其一</label>
        </span>` : ''}
    </div>
  `;
}

function ssEditModal() {
  return `
    <div class="rw-modal" id="ssEditMask" style="display:none">
      <div class="rw-modal-mask" onclick="SsPage.closeEdit()"></div>
      <div class="rw-modal-panel" style="width:760px;overflow:visible">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="ssEditTitle">新建分组方案</span>
          <button class="rw-modal-close" onclick="SsPage.closeEdit()">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="rw-form-row">
            <label class="rw-form-label">方案名称：</label>
            <input class="ipt" id="ssFName" style="flex:1" placeholder="如 带电×海运" />
          </div>
          <div style="margin-top:8px">
            <div class="sb-cond-box" id="ssCondBox"></div>
          </div>
          <div class="sb-policy-note">ℹ 分组方案只定义「什么样的货」,不绑定格口;到 B2B分拣管理 → 格口看板 勾选格口挂载后生效</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="SsPage.closeEdit()">关闭</button>
          <button class="btn btn--primary" onclick="SsPage.saveEdit()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 操作日志弹窗(选中方案查看其日志) ---- */
function ssLogModal() {
  return `
    <div class="rw-modal" id="ssLogMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('ssLogMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:620px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="ssLogTitle">操作日志</span>
          <button class="rw-modal-close" onclick="document.getElementById('ssLogMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <table class="grid rw-log-grid rw-log-grid--wrap" style="width:100%;">
            <thead><tr><th>NO.</th><th>操作人</th><th>操作时间</th><th>操作内容</th></tr></thead>
            <tbody id="ssLogBody"></tbody>
          </table>
          <div class="sb-cond-note" style="margin-top:8px">记录方案全生命周期动作(新建/修改/启停/挂载/摘除/删除),最新在前;日志独立保留,方案删除后仍可追溯</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('ssLogMask').style.display='none'">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 应用位置明细弹窗 ---- */
function ssApplyDetailModal() {
  return `
    <div class="rw-modal" id="ssApplyMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('ssApplyMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:560px">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="ssApplyTitle">应用位置明细</span>
          <button class="rw-modal-close" onclick="document.getElementById('ssApplyMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="ss-apply-list" id="ssApplyList"></div>
          <div class="sb-cond-note" style="margin-top:8px">摘除请到对应分拣机的格口看板(B2B分拣管理)操作;失效应用需重新挂载</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('ssApplyMask').style.display='none'">关闭</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 说明弹窗 ---- */
function ssHelpModal() {
  return `
    <div class="rw-modal" id="ssHelpMask" style="display:none">
      <div class="rw-modal-mask" onclick="document.getElementById('ssHelpMask').style.display='none'"></div>
      <div class="rw-modal-panel" style="width:520px">
        <div class="rw-modal-header">
          <span class="rw-modal-title">分拣分组方案说明</span>
          <button class="rw-modal-close" onclick="document.getElementById('ssHelpMask').style.display='none'">✕</button>
        </div>
        <div class="rw-modal-body">
          <div class="lr-help-step"><b>① 定义:</b>分组方案全局定义「什么样的货」= 条件行(条件项+运算符+值,多条件 且/或),不含格口;一次定义,各分拣机复用</div>
          <div class="lr-help-step"><b>② 挂载:</b>到 B2B分拣管理 → 格口看板,勾选格口 → 应用分拣方案(已挂方案自动回显勾选,取消勾选保存即摘除);一个格口可挂多个方案(共享口,小流量组可合并);挂载即排他——该口只接收命中其所挂任一方案的货,未挂方案的口=默认池</div>
          <div class="lr-help-step"><b>③ 匹配:</b>分拣签入后取订单条件值,命中的<b>所有</b>分组方案同时生效——可用格口=命中方案挂载口的并集,在并集内按 单件/多件 照常找空闲口(多件同票锁同一口),无优先级仲裁</div>
          <div class="lr-help-step"><b>④ 兜底:</b>分组挂载的口全满、或应用因分拣方案换版失效 → 一律<b>转异常口</b>,不回退默认</div>
          <div class="lr-help-step"><b>⑤ 未命中:</b>未命中任何分组的货走默认分拣(未挂方案的格口,按单件/多件分配,与现状一致)</div>
          <div class="lr-help-step"><b>⑥ 删除保护:</b>已被格口挂载的分组不允许删除,请先在各分拣机看板摘除</div>
          <div class="lr-help-note">条件项字典可扩展(当前:产品/渠道),值从基础数据全量多选;分拣中途变更规则,已开始的票跟随第一件的格口不拆分。</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="document.getElementById('ssHelpMask').style.display='none'">知道了</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const SsPage = {
  checked: null,
  editingId: 0,
  editConds: [],
  editJoiner: '且',

  render() {
    document.getElementById('ssGridBody').innerHTML = ssGridHtml();
  },

  check(id) { this.checked = id; this.render(); },

  setStatus(st) {
    if (!this.checked) { Helpers.toast('请先选中一行分组方案'); return; }
    const s = SS_SCHEMES.find(x => x.id === this.checked);
    s.status = st; this.render();
    ssLogAdd(s.id, st === 1 ? '启用' : '停用', `启用 → ${st === 1 ? '启用' : '停用'}`);
    Helpers.toast(`分组「${s.name}」已${st === 1 ? '启用' : '停用'}(演示)`);
  },
  delScheme() {
    if (!this.checked) { Helpers.toast('请先选中一行分组方案'); return; }
    const s = SS_SCHEMES.find(x => x.id === this.checked);
    if (ssApplyCount(s.id) > 0) {
      Helpers.toast(`方案已被 ${ssApplyCount(s.id)} 台分拣机的格口应用,不可删除;请先在各分拣机看板摘除`);
      return;
    }
    ssLogAdd(s.id, '删除', `方案 ${s.code} ${s.name} 删除(未被任何格口应用)`);
    const i = SS_SCHEMES.findIndex(x => x.id === this.checked);
    SS_SCHEMES.splice(i, 1); this.checked = null; this.render();
    Helpers.toast(`分组「${s.name}」已删除,日志已保留(演示)`);
  },

  /* 操作日志(选中方案;格式对齐线上 frmNote 通用日志窗体:序号+操作人/操作时间/操作内容) */
  showLogs() {
    if (!this.checked) { Helpers.toast('请先选中一行分组方案'); return; }
    const s = SS_SCHEMES.find(x => x.id === this.checked);
    if (!s) return;
    document.getElementById('ssLogTitle').textContent = `操作日志 · ${s.code} ${s.name}`;
    const logs = SS_LOGS.filter(l => l.schemeId === s.id);
    document.getElementById('ssLogBody').innerHTML = logs.length ? logs.map((l, i) => `
      <tr>
        <td class="col--num">${i + 1}</td>
        <td class="col--code">${l.user}</td>
        <td>${l.time}</td>
        <td>${l.action}:${l.detail}</td>
      </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#999;padding:12px;">该方案暂无操作日志</td></tr>';
    document.getElementById('ssLogMask').style.display = 'flex';
  },

  openEdit(id) {
    this.editingId = id;
    document.getElementById('ssEditTitle').textContent = id > 0 ? '编辑分组方案' : '新建分组方案';
    if (id > 0) {
      const s = SS_SCHEMES.find(x => x.id === id);
      document.getElementById('ssFName').value = s.name;
      this.editConds = s.conds.map(c => ({ item: c.item, op: c.op, values: c.values.slice() }));
      this.editJoiner = s.joiner || '且';
    } else {
      document.getElementById('ssFName').value = '';
      this.editConds = [{ item: SS_COND_ITEMS[0].key, op: SS_COND_ITEMS[0].ops[0], values: [] }];
      this.editJoiner = '且';
    }
    document.getElementById('ssCondBox').innerHTML = ssCondRowsHtml();
    this.editConds.forEach((c, i) => ssFitChips(i));
    document.getElementById('ssEditMask').style.display = 'flex';
  },
  editChecked() {
    if (!this.checked) { Helpers.toast('请先选中一行分组方案'); return; }
    this.openEdit(this.checked);
  },
  closeEdit() { document.getElementById('ssEditMask').style.display = 'none'; },
  saveEdit() {
    const name = document.getElementById('ssFName').value.trim();
    if (!name) { Helpers.toast('请填写方案名称'); return; }
    const incomplete = this.editConds.some(c => !c.item || !c.op || !c.values.length);
    if (!this.editConds.length || incomplete) {
      Helpers.toast('请至少配置一行完整条件(条件项/运算符/值)'); return;
    }
    const conds = this.editConds.map(c => ({ item: c.item, op: c.op, values: c.values.slice() }));
    const condSummary = conds.map(c =>
      `${ssItemDef(c.item).label}${c.op}${c.values.length}项`).join(` ${this.editJoiner} `);
    if (this.editingId > 0) {
      const s = SS_SCHEMES.find(x => x.id === this.editingId);
      Object.assign(s, { name, conds, joiner: this.editJoiner,
        updateUser: '庄亚运', updateTime: Helpers.nowTime() });
      ssLogAdd(s.id, '修改', `条件:${condSummary}`);
    } else {
      const maxId = Math.max(0, ...SS_SCHEMES.map(s => s.id));
      const code = 'GS-' + String(maxId + 1).padStart(3, '0');
      SS_SCHEMES.push({ id: maxId + 1, code, name, conds, joiner: this.editJoiner,
        status: 1, updateUser: '庄亚运', updateTime: Helpers.nowTime(), });
      ssLogAdd(maxId + 1, '新建', `条件:${condSummary}`);
    }
    this.closeEdit(); this.render();
    Helpers.toast('分组方案已保存(演示)');
  },

  /* ---- 条件行 ---- */
  addCond() {
    if (this.editConds.length >= SS_COND_ITEMS.length) { Helpers.toast('条件项已全部使用'); return; }
    const free = SS_COND_ITEMS.find(d => !this.editConds.some(c => c.item === d.key));
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
    const def = ssItemDef(key);
    this.editConds[idx] = { item: key, op: def.ops[0], values: [] };
    this.refreshCondBox();
  },
  refreshCondBox() {
    document.getElementById('ssCondBox').innerHTML = ssCondRowsHtml();
    this.editConds.forEach((c, i) => ssFitChips(i));
  },

  /* ---- 值选择(行内下拉多选) ---- */
  toggleValDrop(idx, ev) {
    ev.stopPropagation();
    const drop = document.getElementById(`ssValDrop_${idx}`);
    if (!drop) return;
    /* 先关掉其它行打开的下拉 */
    document.querySelectorAll('.sb-msel-drop.is-open').forEach(d => { if (d !== drop) d.classList.remove('is-open'); });
    drop.classList.toggle('is-open');
    if (drop.classList.contains('is-open')) this.renderValDrop(idx);
  },
  renderValDrop(idx) {
    const c = this.editConds[idx];
    const def = ssItemDef(c.item);
    const box = document.getElementById(`ssValBox_${idx}`);
    const drop = document.getElementById(`ssValDrop_${idx}`);
    if (!c || !box || !drop) return;
    const kw = (box.querySelector('.ipt') || {}).value || '';
    const list = def.values.filter(v =>
      !kw || v.code.includes(kw.trim().toUpperCase()) || v.name.includes(kw.trim()));
    drop.querySelector('.sb-msel-list').innerHTML = list.length ? list.map(v => `
      <label class="sb-vpick-item">
        <input type="checkbox" ${c.values.includes(v.code) ? 'checked' : ''}
          onchange="SsPage.onValCheck(${idx},'${v.code}', this.checked)" />
        <span class="sb-vpick-code">${v.code}</span><span class="sb-vpick-name">${v.name}</span>
      </label>`).join('') : '<div class="sb-cond-note" style="padding:8px">无匹配值</div>';
  },
  onValCheck(idx, code, on) {
    const values = this.editConds[idx].values;
    if (on) { values.push(code); } else {
      const i = values.indexOf(code); if (i >= 0) values.splice(i, 1);
    }
    ssFitChips(idx);
  },
  removeValChip(idx, code) {
    const values = this.editConds[idx].values;
    const i = values.indexOf(code); if (i >= 0) values.splice(i, 1);
    ssFitChips(idx);
    this.renderValDrop(idx);
  },

  /* 应用位置明细(按分拣机合并,只看当前状态) */
  showApplyDetail(id) {
    const s = SS_SCHEMES.find(x => x.id === id);
    if (!s) return;
    document.getElementById('ssApplyTitle').textContent = `应用位置明细 — ${s.name}`;
    /* 按分拣机聚合:同机多次挂载合并为一行;失效口与正常口分开标注 */
    const groups = [];
    SS_APPLIES.filter(a => a.schemeId === id).forEach(a => {
      let g = groups.find(x => x.sorterCode === a.sorterCode);
      if (!g) { g = { sorterCode: a.sorterCode, sorterName: a.sorterName, solutionName: a.solutionName, ok: [], bad: [] }; groups.push(g); }
      (a.invalid ? g.bad : g.ok).push(...a.chutes);
    });
    document.getElementById('ssApplyList').innerHTML = groups.length ? groups.map((g, i) => `
      <div class="ss-apply-row ${g.ok.length ? '' : 'is-invalid'}">
        <div class="ss-apply-main">
          <span class="ss-apply-idx">${i + 1}.</span>
          <span class="ss-apply-machine">${g.sorterName}(${g.sorterCode}) · ${g.solutionName}</span>
          ${g.ok.length ? '<span class="abn-tag abn-tag--ok">正常</span>' : '<span class="sb-stale-tag">⚠ 已失效</span>'}
        </div>
        <div class="ss-apply-sub">
          ${g.ok.length ? `<span class="ss-apply-chutes">格口:${[...new Set(g.ok)].sort().join('、')}</span>` : ''}
          ${g.bad.length ? `<span class="ss-apply-chutes" style="color:#CF1322;text-decoration:line-through">格口:${[...new Set(g.bad)].sort().join('、')}</span><span class="sb-stale-tag">已失效</span>` : ''}
        </div>
      </div>`).join('') : '<div class="sb-cond-note" style="padding:12px">该方案尚未被任何格口应用</div>';
    document.getElementById('ssApplyMask').style.display = 'flex';
  },

  showHelp() { document.getElementById('ssHelpMask').style.display = 'flex'; },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-sort-scheme',
  activeTab: 'b2b-order',
  tabs: Layout.tabs.standard(),
  content: `
    <div class="grid-toolbar">
      <button class="btn" onclick="SsPage.openEdit(0)"><span class="ic">➕</span><span>新建</span></button>
      <button class="btn" onclick="SsPage.editChecked()"><span class="ic">✏️</span><span>编辑</span></button>
      <button class="btn" onclick="SsPage.setStatus(1)"><span class="ic">▶️</span><span>启用</span></button>
      <button class="btn" onclick="SsPage.setStatus(0)"><span class="ic">⏸</span><span>停用</span></button>
      <button class="btn" onclick="SsPage.delScheme()"><span class="ic">🗑</span><span>删除</span></button>
      <span class="sep"></span>
      <button class="btn" onclick="SsPage.showLogs()"><span class="ic">📋</span><span>查看日志</span></button>
      <button class="btn" onclick="SsPage.showHelp()"><span class="ic">❓</span><span>规则说明</span></button>
      <span class="sb-toolbar-note">分组方案为全局配置,不含格口;在各分拣机的格口看板(B2B分拣管理)圈口挂载;命中多个方案时,可用口=命中方案的口并集</span>
    </div>
    ${ssGrid()}
    <div class="pager">
      <button class="pg-btn">«</button><button class="pg-btn">‹</button>
      <button class="pg-btn">›</button><button class="pg-btn">»</button>
      <span class="pg-info">总记录数: <b>${SS_SCHEMES.length}</b> 个分组方案,总页数 <b>1</b>,当前第 <b>1</b> 页</span>
    </div>
    ${ssEditModal()}${ssApplyDetailModal()}${ssLogModal()}${ssHelpModal()}
  `,
});

Helpers.startClock();

/* 点击下拉外部时收起所有值下拉 */
document.addEventListener('click', e => {
  if (e.target.closest('.sb-msel')) return;
  document.querySelectorAll('.sb-msel-drop.is-open').forEach(d => d.classList.remove('is-open'));
});
