/* ============================================
   wh-mv.js — 移库记录页(库内操作组)
   依据:docs/page-fields-reference.md
     · 列表模型 InventoryTransferLocationResponse(10 列)
         原库位编码|原所属库区|移库库位编码|移库库区|移库类型|
         涉及移库单量(链接)|移库件量(链接)|操作时间|操作人|操作网点
     · 查询条件:单号(必填)+单号类型+原库区位+移库库区位+操作网点
     · 按钮:查询 | 更多
     · 枚举 ChangeTypes:1整箱移库 / 2单箱移库 / 3整库
   ============================================ */

/* ---- 演示数据(8 行,覆盖三种移库类型) ---- */
const MV_ROWS = [
  { no:1,  fromLoc:'A-01-02', fromZone:'A区-普货', toLoc:'B-03-05', toZone:'B区-普货', type:1, typeLabel:'整箱移库', orderCnt:5,  itemCnt:12, time:'2026-08-04 09:18:27', op:'张三', og:'东腾曼沙项目仓' },
  { no:2,  fromLoc:'A-02-01', fromZone:'A区-普货', toLoc:'C-01-04', toZone:'C区-带电', type:2, typeLabel:'单箱移库', orderCnt:1,  itemCnt:3,  time:'2026-08-04 09:42:11', op:'李四', og:'东腾曼沙项目仓' },
  { no:3,  fromLoc:'D-04-08', fromZone:'D区-退货', toLoc:'A-01-05', toZone:'A区-普货', type:1, typeLabel:'整箱移库', orderCnt:8,  itemCnt:20, time:'2026-08-04 10:05:53', op:'王五', og:'东腾曼沙项目仓' },
  { no:4,  fromLoc:'B-03-05', fromZone:'B区-普货', toLoc:'E-02-02', toZone:'E区-异常', type:3, typeLabel:'整库',     orderCnt:46, itemCnt:128,time:'2026-08-04 10:50:36', op:'赵六', og:'东腾曼沙项目仓' },
  { no:5,  fromLoc:'C-01-04', fromZone:'C区-带电', toLoc:'A-03-07', toZone:'A区-普货', type:2, typeLabel:'单箱移库', orderCnt:1,  itemCnt:2,  time:'2026-08-04 11:33:09', op:'张三', og:'东腾曼沙项目仓' },
  { no:6,  fromLoc:'A-01-05', fromZone:'A区-普货', toLoc:'B-04-01', toZone:'B区-普货', type:1, typeLabel:'整箱移库', orderCnt:6,  itemCnt:15, time:'2026-08-04 13:48:42', op:'李四', og:'东腾曼沙项目仓' },
  { no:7,  fromLoc:'E-02-02', fromZone:'E区-异常', toLoc:'D-04-08', toZone:'D区-退货', type:1, typeLabel:'整箱移库', orderCnt:3,  itemCnt:7,  time:'2026-08-03 16:22:15', op:'王五', og:'东腾曼沙项目仓' },
  { no:8,  fromLoc:'B-04-01', fromZone:'B区-普货', toLoc:'A-02-01', toZone:'A区-普货', type:3, typeLabel:'整库',     orderCnt:32, itemCnt:96, time:'2026-08-03 17:40:58', op:'赵六', og:'东腾曼沙项目仓' },
];

/* ---- 枚举映射(来自 ChangeTypes) ---- */
const MV_ENUM = {
  type: {
    1: { label:'整箱移库', cls:'mv-type--box' },
    2: { label:'单箱移库', cls:'mv-type--single' },
    3: { label:'整库',     cls:'mv-type--zone' },
  },
};

/* ---- 查询区 ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">子单号</option><option value="3">客户单号</option><option value="4">跟踪号</option><option value="5">分拣码</option><option value="6">箱号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="MvPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="mvMore" style="display:none;">
        ${f('原库区位', `<input class="ipt" placeholder="如 A-01" />`)}
        ${f('移库库区位', `<input class="ipt" placeholder="如 B-03" />`)}
        ${f('移库类型', `<select class="sel"><option value="">全部</option><option value="1">整箱移库</option><option value="2">单箱移库</option><option value="3">整库</option></select>`)}
        ${f('操作时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('操作网点', `<input class="ipt" placeholder="选择组织" />`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(查询 / 更多) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('🔍', '查询',   "Helpers.toast('查询(占位)')")}
      <span class="sep"></span>
      ${btn('⚙', '更多',   "Helpers.toast('更多(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(10 列) ---- */
function gridTable() {
  /* 移库类型标签 */
  const typeTag = t => {
    const e = MV_ENUM.type[t] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };

  const rows = MV_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code">${r.fromLoc}</td>
      <td>${r.fromZone}</td>
      <td class="col--code">${r.toLoc}</td>
      <td>${r.toZone}</td>
      <td>${typeTag(r.type)}</td>
      <td class="col--num cell-link" title="查看移库单明细">${r.orderCnt}</td>
      <td class="col--num cell-link" title="查看移库件明细">${r.itemCnt}</td>
      <td>${r.time}</td>
      <td>${r.op}</td>
      <td>${r.og}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:110px" />  <!-- 原库位编码 -->
          <col style="width:110px" />  <!-- 原所属库区 -->
          <col style="width:110px" />  <!-- 移库库位编码 -->
          <col style="width:110px" />  <!-- 移库库区 -->
          <col style="width:90px" />   <!-- 移库类型 -->
          <col style="width:110px" />  <!-- 涉及移库单量 -->
          <col style="width:110px" />  <!-- 移库件量 -->
          <col style="width:150px" />  <!-- 操作时间 -->
          <col style="width:70px" />   <!-- 操作人 -->
          <col style="width:140px" />  <!-- 操作网点 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>原库位编码</th>
            <th>原所属库区</th>
            <th>移库库位编码</th>
            <th>移库库区</th>
            <th>移库类型</th>
            <th title="涉及移库单量(链接查看明细)">涉及移库单量</th>
            <th title="移库件量(链接查看明细)">移库件量</th>
            <th>操作时间</th>
            <th>操作人</th>
            <th>操作网点</th>
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

/* ---- 页面逻辑(展开更多) ---- */
const MvPage = {
  toggleMore() {
    const el = document.getElementById('mvMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'wh-mv',
  activeTab: 'wh-mv',
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

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.wh-grid tbody tr');
  if (!tr) return;
  document.querySelectorAll('.wh-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
