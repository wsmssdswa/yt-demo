/* ============================================
   wh-pick.js — 拣货任务列表页(库内操作组)
   依据:docs/page-fields-reference.md
     · 列表模型 PickingTaskPageItem(11 列)
         拣货任务号|发货计划名称|操作网点|发货日期|拣货状态|优先级(A-E)|
         业务模式|已拣箱数/需求箱数|创建时间|修改人|修改时间
     · 查询条件:单号(必填,任务号)+单号类型(1任务号/2子单/3任务名称)
         +操作网点(多选)+拣货状态(多选)+修改人+时间类型(1创建/2修改)+时间范围+业务模式(多选)
     · 按钮:查询 | 导出 | 查看任务明细(选中) | 查看日志(选中) | 打印拣货单(选中)
     · 枚举 QueryPickingTaskStatus:1待拣货 / 2拣货中 / 3已完成 / 4已作废 / 5已迁移
   ============================================ */

/* ---- 演示数据(8 行,覆盖 5 种拣货状态 + 优先级 A-E) ---- */
const PICK_ROWS = [
  { no:1,  taskNo:'PK20260804001', plan:'20260804-海运拼柜发运计划', og:'东腾曼沙项目仓', shipDate:'2026-08-05', status:1, statusLabel:'待拣货', pri:'A', bizMode:'海运拼柜', picked:0,  req:35, createTime:'2026-08-04 09:12:08', updBy:'张三', updTime:'2026-08-04 09:12:08' },
  { no:2,  taskNo:'PK20260804002', plan:'20260804-空运发运计划',     og:'东腾曼沙项目仓', shipDate:'2026-08-05', status:2, statusLabel:'拣货中', pri:'A', bizMode:'空运',     picked:12, req:20, createTime:'2026-08-04 09:35:41', updBy:'李四', updTime:'2026-08-04 10:20:33' },
  { no:3,  taskNo:'PK20260804003', plan:'20260804-海运整柜发运计划', og:'东腾曼沙项目仓', shipDate:'2026-08-06', status:3, statusLabel:'已完成', pri:'B', bizMode:'海运整柜', picked:88, req:88, createTime:'2026-08-04 10:02:19', updBy:'王五', updTime:'2026-08-04 11:48:55' },
  { no:4,  taskNo:'PK20260804004', plan:'20260804-卡航发运计划',     og:'东腾曼沙项目仓', shipDate:'2026-08-05', status:1, statusLabel:'待拣货', pri:'C', bizMode:'卡航',     picked:0,  req:14, createTime:'2026-08-04 10:48:55', updBy:'赵六', updTime:'2026-08-04 10:48:55' },
  { no:5,  taskNo:'PK20260804005', plan:'20260804-海运拼柜发运计划', og:'东腾曼沙项目仓', shipDate:'2026-08-05', status:4, statusLabel:'已作废', pri:'D', bizMode:'海运拼柜', picked:0,  req:6,  createTime:'2026-08-04 11:20:33', updBy:'张三', updTime:'2026-08-04 14:00:07' },
  { no:6,  taskNo:'PK20260803006', plan:'20260803-空运发运计划',     og:'东腾曼沙项目仓', shipDate:'2026-08-04', status:3, statusLabel:'已完成', pri:'B', bizMode:'空运',     picked:42, req:42, createTime:'2026-08-03 13:55:07', updBy:'李四', updTime:'2026-08-03 16:30:21' },
  { no:7,  taskNo:'PK20260803007', plan:'20260803-海运整柜发运计划', og:'东腾曼沙项目仓', shipDate:'2026-08-04', status:5, statusLabel:'已迁移', pri:'E', bizMode:'海运整柜', picked:0,  req:27, createTime:'2026-08-03 16:10:42', updBy:'王五', updTime:'2026-08-03 17:45:18' },
  { no:8,  taskNo:'PK20260803008', plan:'20260803-卡航发运计划',     og:'东腾曼沙项目仓', shipDate:'2026-08-04', status:2, statusLabel:'拣货中', pri:'A', bizMode:'卡航',     picked:4,  req:9,  createTime:'2026-08-03 17:33:18', updBy:'赵六', updTime:'2026-08-04 08:15:42' },
];

/* ---- 枚举映射(来自 QueryPickingTaskStatus) ---- */
const PICK_ENUM = {
  status: {
    1: { label:'待拣货', cls:'pick-status--todo' },
    2: { label:'拣货中', cls:'pick-status--doing' },
    3: { label:'已完成', cls:'pick-status--done' },
    4: { label:'已作废', cls:'pick-status--void' },
    5: { label:'已迁移', cls:'pick-status--moved' },
  },
  /* 优先级 A-E(大写字母映射到色阶) */
  pri: {
    'A': { cls:'pick-pri--a' },
    'B': { cls:'pick-pri--b' },
    'C': { cls:'pick-pri--c' },
    'D': { cls:'pick-pri--d' },
    'E': { cls:'pick-pri--e' },
  },
};

/* ---- 查询区 ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:单号类型 + 单号 + 查询/更多条件 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">任务号</option><option value="2">子单号</option><option value="3">任务名称</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,按单号类型匹配"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="PickPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="pickMore" style="display:none;">
        ${f('操作网点', `<input class="ipt" placeholder="多选,逗号分隔" />`)}
        ${f('拣货状态', `<select class="sel" multiple size="3" style="height:auto;">
          <option value="1">待拣货</option><option value="2">拣货中</option><option value="3">已完成</option><option value="4">已作废</option><option value="5">已迁移</option>
        </select>`)}
        ${f('业务模式', `<input class="ipt" placeholder="多选,逗号分隔" />`)}
        ${f('修改人', `<input class="ipt" placeholder="操作人" />`)}
        ${f('时间类型', `<select class="sel"><option value="1">创建时间</option><option value="2">修改时间</option></select>`)}
        ${f('时间范围', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(查询 / 导出 / 查看任务明细 / 查看日志 / 打印拣货单) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('🔍', '查询',       "Helpers.toast('查询(占位)')")}
      <span class="sep"></span>
      ${btn('⬇', '导出',       "Helpers.toast('导出(占位)')")}
      <span class="sep"></span>
      ${btn('📋', '查看任务明细', "PickPage.viewDetail()")}
      ${btn('🗒', '查看日志',     "PickPage.viewLog()")}
      ${btn('🖨', '打印拣货单',   "PickPage.printTask()")}
    </div>
  `;
}

/* ---- 数据表格(11 列) ---- */
function gridTable() {
  /* 拣货状态标签 */
  const statusTag = s => {
    const e = PICK_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };
  /* 优先级 A-E 标签 */
  const priTag = p => {
    const e = PICK_ENUM.pri[p] || { cls:'pick-pri--e' };
    return `<span class="abn-tag ${e.cls}">${p}</span>`;
  };
  /* 已拣/需求箱数:拣货中(部分)用橙色,已完成用绿色 */
  const boxCell = r => {
    const txt = `${r.picked} / ${r.req}`;
    if (r.status === 3) return `<span style="color:#389E0D;font-weight:600;">${txt}</span>`;
    if (r.status === 2 && r.picked < r.req) return `<span style="color:#D46B08;font-weight:600;">${txt}</span>`;
    return `<span style="color:#888;">${txt}</span>`;
  };

  const rows = PICK_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code cell-link" title="${r.taskNo}">${r.taskNo}</td>
      <td>${r.plan}</td>
      <td>${r.og}</td>
      <td>${r.shipDate}</td>
      <td>${statusTag(r.status)}</td>
      <td class="col--center">${priTag(r.pri)}</td>
      <td>${r.bizMode}</td>
      <td class="col--num">${boxCell(r)}</td>
      <td>${r.createTime}</td>
      <td>${r.updBy}</td>
      <td>${r.updTime}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:160px" />  <!-- 拣货任务号 -->
          <col style="width:200px" />  <!-- 发货计划名称 -->
          <col style="width:140px" />  <!-- 操作网点 -->
          <col style="width:100px" />  <!-- 发货日期 -->
          <col style="width:90px" />   <!-- 拣货状态 -->
          <col style="width:70px" />   <!-- 优先级 -->
          <col style="width:90px" />   <!-- 业务模式 -->
          <col style="width:110px" />  <!-- 已拣/需求箱数 -->
          <col style="width:150px" />  <!-- 创建时间 -->
          <col style="width:70px" />   <!-- 修改人 -->
          <col style="width:150px" />  <!-- 修改时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>拣货任务号</th>
            <th>发货计划名称</th>
            <th>操作网点</th>
            <th>发货日期</th>
            <th>拣货状态</th>
            <th class="col--center">优先级</th>
            <th>业务模式</th>
            <th title="已拣箱数 / 需求箱数">已拣/需求箱数</th>
            <th>创建时间</th>
            <th>修改人</th>
            <th>修改时间</th>
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

/* ---- 页面逻辑(展开更多 / 选中行操作) ---- */
const PickPage = {
  toggleMore() {
    const el = document.getElementById('pickMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  /* 取当前选中行(单选) */
  selectedNo() {
    const tr = document.querySelector('.wh-grid tbody tr.row--selected');
    return tr ? tr.dataset.no : null;
  },
  viewDetail() {
    if (!this.selectedNo()) { Helpers.toast('请选择要查看的任务！'); return; }
    Helpers.toast(`查看任务明细(任务 #${this.selectedNo()},占位)`);
  },
  viewLog() {
    if (!this.selectedNo()) { Helpers.toast('请选择要查看的任务！'); return; }
    Helpers.toast(`查看日志(任务 #${this.selectedNo()},占位)`);
  },
  printTask() {
    if (!this.selectedNo()) { Helpers.toast('请选择要打印的任务！'); return; }
    const ok = confirm(`确定打印拣货单(任务 #${this.selectedNo()}),是否继续？`);
    if (!ok) return;
    Helpers.toast('打印拣货单成功！(演示)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'wh-pick',
  activeTab: 'wh-pick',
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
