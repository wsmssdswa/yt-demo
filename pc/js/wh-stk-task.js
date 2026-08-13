/* ============================================
   wh-stk-task.js — 盘点任务页(库内操作组)
   依据:docs/page-fields-reference.md
     · 列表模型 InventoryCheckTaskDto(12 列)
         盘点单号|盘点状态|应盘库位|已盘库位|应盘件量|已盘件量|
         差异数量(>0红)|处理状态|操作人|操作网点|创建时间|完成时间
     · 查询条件:盘点单号(批量)+创建时间+盘点状态(多选)+操作网点
     · 按钮:查询 | 查看详情(选中) | 新建盘点 | 取消盘点(选中,须未开始/进行中,二次确认) |
              查看日志(选中) | 导出
     · 枚举 InventoryCheckTaskStatus:1未开始 / 2进行中 / 3已完成 / 4已取消
   注:主行用「盘点单号」代替通用单号(参考文档明确)。
       盘点差异数>0 红色加粗高亮;状态:未开始橙/进行中蓝/已完成绿/已取消灰。
   ============================================ */

/* ---- 演示数据(8 行,覆盖 4 种状态 + 含差异行) ---- */
const STK_ROWS = [
  { no:1,  no2:'PD20260804001', status:2, statusLabel:'进行中', expLoc:30, actLoc:18, expCnt:120, actCnt:78,  diff:0,  handle:'处理中', op:'张三', og:'东腾曼沙项目仓', createTime:'2026-08-04 09:12:08', finishTime:'' },
  { no:2,  no2:'PD20260804002', status:1, statusLabel:'未开始', expLoc:25, actLoc:0,  expCnt:90,  actCnt:0,   diff:0,  handle:'待处理', op:'李四', og:'东腾曼沙项目仓', createTime:'2026-08-04 09:35:41', finishTime:'' },
  { no:3,  no2:'PD20260804003', status:3, statusLabel:'已完成', expLoc:40, actLoc:40, expCnt:150, actCnt:148, diff:2,  handle:'已处理', op:'王五', og:'东腾曼沙项目仓', createTime:'2026-08-04 10:02:19', finishTime:'2026-08-04 15:30:42' },
  { no:4,  no2:'PD20260803004', status:3, statusLabel:'已完成', expLoc:18, actLoc:18, expCnt:60,  actCnt:60,  diff:0,  handle:'已处理', op:'赵六', og:'东腾曼沙项目仓', createTime:'2026-08-03 10:48:55', finishTime:'2026-08-03 14:20:11' },
  { no:5,  no2:'PD20260803005', status:4, statusLabel:'已取消', expLoc:22, actLoc:5,  expCnt:80,  actCnt:12,  diff:0,  handle:'已取消', op:'张三', og:'东腾曼沙项目仓', createTime:'2026-08-03 11:20:33', finishTime:'2026-08-03 13:00:07' },
  { no:6,  no2:'PD20260803006', status:3, statusLabel:'已完成', expLoc:35, actLoc:35, expCnt:130, actCnt:122, diff:8,  handle:'已处理', op:'李四', og:'东腾曼沙项目仓', createTime:'2026-08-03 13:55:07', finishTime:'2026-08-03 18:30:21' },
  { no:7,  no2:'PD20260802007', status:3, statusLabel:'已完成', expLoc:28, actLoc:28, expCnt:100, actCnt:100, diff:0,  handle:'已处理', op:'王五', og:'东腾曼沙项目仓', createTime:'2026-08-02 16:10:42', finishTime:'2026-08-02 20:45:18' },
  { no:8,  no2:'PD20260804008', status:2, statusLabel:'进行中', expLoc:20, actLoc:14, expCnt:75,  actCnt:52,  diff:1,  handle:'处理中', op:'赵六', og:'东腾曼沙项目仓', createTime:'2026-08-04 17:33:18', finishTime:'' },
];

/* ---- 枚举映射(来自 InventoryCheckTaskStatus) ---- */
const STK_ENUM = {
  status: {
    1: { label:'未开始', cls:'stk-status--todo' },
    2: { label:'进行中', cls:'stk-status--doing' },
    3: { label:'已完成', cls:'stk-status--done' },
    4: { label:'已取消', cls:'stk-status--cancel' },
  },
};

/* ---- 查询区(主行用「盘点单号」代替通用单号) ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:盘点单号 + 创建时间 + 操作网点 + 查询/更多条件 -->
      <div class="qp-row qp-row--main">
        ${f('盘点单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔"></textarea>`, 'qf--waybill')}
        ${f('创建时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('盘点状态', `<select class="sel"><option value="">全部</option><option value="1">未开始</option><option value="2">进行中</option><option value="3">已完成</option><option value="4">已取消</option></select>`)}
        ${f('操作网点', `<input class="ipt" placeholder="选择组织" />`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="StkPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="stkMore" style="display:none;">
        ${f('盘点状态(多选)', `<select class="sel" multiple size="4" style="height:auto;">
          <option value="1">未开始</option><option value="2">进行中</option><option value="3">已完成</option><option value="4">已取消</option>
        </select>`)}
        ${f('处理状态', `<select class="sel"><option value="">全部</option><option>待处理</option><option>处理中</option><option>已处理</option><option>已取消</option></select>`)}
        ${f('操作人', `<input class="ipt" placeholder="操作人" />`)}
        ${f('完成时间', `<span class="qf-range"><input class="ipt ipt--date" value="" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="" /></span>`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(查询 / 查看详情 / 新建盘点 / 取消盘点 / 查看日志 / 导出) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('🔍', '查询',       "Helpers.toast('查询(占位)')")}
      <span class="sep"></span>
      ${btn('📋', '查看详情',   "StkPage.viewDetail()")}
      ${btn('+',  '新建盘点',   "Helpers.toast('新建盘点(占位)')")}
      ${btn('✕',  '取消盘点',   "StkPage.cancelTask()")}
      <span class="sep"></span>
      ${btn('🗒', '查看日志',   "StkPage.viewLog()")}
      <span class="sep"></span>
      ${btn('⬇', '导出',       "Helpers.toast('导出(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(12 列,差异数>0 红色加粗) ---- */
function gridTable() {
  /* 盘点状态标签 */
  const statusTag = s => {
    const e = STK_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };
  /* 差异数量:>0 红色加粗,否则灰色 */
  const diffCell = d =>
    d > 0 ? `<span class="stk-diff">${d}</span>` : `<span style="color:#bbb;">0</span>`;

  const rows = STK_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code cell-link" title="${r.no2}">${r.no2}</td>
      <td>${statusTag(r.status)}</td>
      <td class="col--num">${r.expLoc}</td>
      <td class="col--num">${r.actLoc}</td>
      <td class="col--num">${r.expCnt}</td>
      <td class="col--num">${r.actCnt}</td>
      <td class="col--num">${diffCell(r.diff)}</td>
      <td>${r.handle}</td>
      <td>${r.op}</td>
      <td>${r.og}</td>
      <td>${r.createTime}</td>
      <td>${r.finishTime || '<span style="color:#bbb;">—</span>'}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:160px" />  <!-- 盘点单号 -->
          <col style="width:80px" />   <!-- 盘点状态 -->
          <col style="width:80px" />   <!-- 应盘库位 -->
          <col style="width:80px" />   <!-- 已盘库位 -->
          <col style="width:80px" />   <!-- 应盘件量 -->
          <col style="width:80px" />   <!-- 已盘件量 -->
          <col style="width:80px" />   <!-- 差异数量 -->
          <col style="width:80px" />   <!-- 处理状态 -->
          <col style="width:70px" />   <!-- 操作人 -->
          <col style="width:140px" />  <!-- 操作网点 -->
          <col style="width:150px" />  <!-- 创建时间 -->
          <col style="width:150px" />  <!-- 完成时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>盘点单号</th>
            <th>盘点状态</th>
            <th title="应盘库位数">应盘库位</th>
            <th title="已盘库位数">已盘库位</th>
            <th title="应盘件量">应盘件量</th>
            <th title="已盘件量">已盘件量</th>
            <th class="col--center" title="差异数量(>0 红色高亮)">差异数量</th>
            <th>处理状态</th>
            <th>操作人</th>
            <th>操作网点</th>
            <th>创建时间</th>
            <th>完成时间</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ---- 分页栏 ---- */
function pager() {
  return `
    <div class="pager">
      <button class="pg-btn" title="首页">«</button>
      <button class="pg-btn" title="上一页">‹</button>
      <button class="pg-btn" title="下一页">›</button>
      <button class="pg-btn" title="末页">»</button>
      <span class="pg-info">总记录数: <b>8</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go">
        <input class="ipt" value="" />
        <button class="pg-btn">GO</button>
        <select class="sel"><option>50</option><option>100</option><option>200</option></select>
      </span>
    </div>
  `;
}

/* ---- 页面逻辑(展开更多 / 选中行操作 / 取消盘点) ---- */
const StkPage = {
  toggleMore() {
    const el = document.getElementById('stkMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  /* 取当前选中行 */
  selectedRow() {
    const tr = document.querySelector('.wh-grid tbody tr.row--selected');
    if (!tr) return null;
    return STK_ROWS.find(r => r.no === Number(tr.dataset.no)) || null;
  },
  viewDetail() {
    const r = this.selectedRow();
    if (!r) { Helpers.toast('请选择要查看的盘点任务！'); return; }
    Helpers.toast(`查看详情(盘点单 ${r.no2},占位)`);
  },
  viewLog() {
    const r = this.selectedRow();
    if (!r) { Helpers.toast('请选择要查看的盘点任务！'); return; }
    Helpers.toast(`查看日志(盘点单 ${r.no2},占位)`);
  },
  /* 取消盘点:须未开始/进行中,二次确认 */
  cancelTask() {
    const r = this.selectedRow();
    if (!r) { Helpers.toast('请选择要取消的盘点任务！'); return; }
    if (r.status !== 1 && r.status !== 2) {
      Helpers.toast('只能取消未开始或进行中的盘点任务！');
      return;
    }
    const ok = confirm(`确定取消盘点任务「${r.no2}」,是否继续？`);
    if (!ok) return;
    Helpers.toast('取消盘点成功！(演示)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'wh-stk-task',
  activeTab: 'wh-stk-task',
  tabs: Layout.tabs.standard(),
  content: `
    ${queryPanel()}
    ${gridToolbar()}
    ${gridTable()}
    ${pager()}
  `,
});

/* 启动底部时钟 */
Helpers.startClock();

/* 表格行点击 → 选中态(单选) */
document.addEventListener('click', e => {
  const tr = e.target.closest('.wh-grid tbody tr');
  if (!tr) return;
  document.querySelectorAll('.wh-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
