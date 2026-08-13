/* ============================================
   wh-stock.js — 库存管理页(库内操作组)
   依据:docs/page-fields-reference.md
     · 列表模型 InventoryDataQueryResponse(6 列)
         库位编码|所属库区|库区类型|存储订单(链接)|存储件量(链接)|操作网点
     · 查询条件:单号(必填)+单号类型+库区位+操作网点(必填)
     · 按钮:导出详情数据 | 导出库存子单明细(流式≤2000) | 查询
   注:本页按钮区为「查询 + 两个导出」,无"更多条件"按钮(查询条件较少,
       单号类型/单号/库区位/操作网点全部上主行)。仍保留 .qp/.qf 结构以统一范式。
   ============================================ */

/* ---- 演示数据(8 行,覆盖不同库区类型) ---- */
const STOCK_ROWS = [
  { no:1,  loc:'A-01-02', zone:'A区-普货',  zoneType:'存储区', orderCnt:18, itemCnt:52, og:'东腾曼沙项目仓' },
  { no:2,  loc:'A-02-01', zone:'A区-普货',  zoneType:'存储区', orderCnt:12, itemCnt:34, og:'东腾曼沙项目仓' },
  { no:3,  loc:'B-03-05', zone:'B区-普货',  zoneType:'存储区', orderCnt:9,  itemCnt:21, og:'东腾曼沙项目仓' },
  { no:4,  loc:'C-01-04', zone:'C区-带电',  zoneType:'特殊货区', orderCnt:6, itemCnt:14, og:'东腾曼沙项目仓' },
  { no:5,  loc:'D-04-08', zone:'D区-退货',  zoneType:'退货区', orderCnt:4,  itemCnt:8,  og:'东腾曼沙项目仓' },
  { no:6,  loc:'E-02-02', zone:'E区-异常',  zoneType:'异常区', orderCnt:3,  itemCnt:5,  og:'东腾曼沙项目仓' },
  { no:7,  loc:'F-05-01', zone:'F区-暂存',  zoneType:'暂存区', orderCnt:25, itemCnt:68, og:'东腾曼沙项目仓' },
  { no:8,  loc:'A-03-07', zone:'A区-普货',  zoneType:'存储区', orderCnt:15, itemCnt:40, og:'东腾曼沙项目仓' },
];

/* ---- 查询区 ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:条件较少,全部上主行(无"更多条件"按钮) -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">子单号</option><option value="3">客户单号</option><option value="4">跟踪号</option><option value="5">分拣码</option><option value="6">箱号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔"></textarea>`, 'qf--waybill')}
        ${f('库区位', `<input class="ipt" placeholder="如 A-01" />`)}
        ${f('操作网点', `<input class="ipt" placeholder="选择组织(必填)" />`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 工具栏(导出详情数据 / 导出库存子单明细 / 查询) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('⬇', '导出详情数据',       "Helpers.toast('导出详情数据(占位)')")}
      <span class="sep"></span>
      ${btn('⬇', '导出库存子单明细',   "StockPage.exportSub()")}
      <span class="sep"></span>
      ${btn('🔍', '查询', "Helpers.toast('查询(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(6 列) ---- */
function gridTable() {
  const rows = STOCK_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code">${r.loc}</td>
      <td>${r.zone}</td>
      <td>${r.zoneType}</td>
      <td class="col--num cell-link" title="查看存储订单明细">${r.orderCnt}</td>
      <td class="col--num cell-link" title="查看存储件明细">${r.itemCnt}</td>
      <td>${r.og}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:110px" />  <!-- 库位编码 -->
          <col style="width:110px" />  <!-- 所属库区 -->
          <col style="width:100px" />  <!-- 库区类型 -->
          <col style="width:110px" />  <!-- 存储订单 -->
          <col style="width:110px" />  <!-- 存储件量 -->
          <col style="width:160px" />  <!-- 操作网点 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>库位编码</th>
            <th>所属库区</th>
            <th>库区类型</th>
            <th title="存储订单(链接查看明细)">存储订单</th>
            <th title="存储件量(链接查看明细)">存储件量</th>
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

/* ---- 页面逻辑(导出库存子单明细,流式≤2000) ---- */
const StockPage = {
  exportSub() {
    Helpers.toast('导出库存子单明细(流式,≤2000,演示)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'wh-stock',
  activeTab: 'wh-stock',
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
