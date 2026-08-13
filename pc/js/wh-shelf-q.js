/* ============================================
   wh-shelf-q.js — 上架数据查询页(库内操作组)
   依据:docs/page-fields-reference.md
     · 列表模型 ShelfDataQueryResponse(8 列)
         上架编码|上架类型|业务场景|上架单量(链接)|上架件量(链接)|
         上架时间|上架网点|上架操作人
     · 查询条件(简单+更多):单号(必填)+单号类型(1运单/2子单/3客户/4跟踪/5分拣码/6箱号)
         + 客户代码 + 上架时间 + 库区位 + 操作网点
     · 按钮:查询 | 更多
     · 主行:单号类型(select) + 单号(textarea) + 查询/更多条件
   ============================================ */

/* ---- 演示数据(8 行,覆盖各种上架类型/业务场景) ---- */
const SHELF_ROWS = [
  { no:1,  code:'SH20260804001', type:'人工上架', scene:'签入上架', orderCnt:12, itemCnt:35, time:'2026-08-04 09:12:08', og:'东腾曼沙项目仓', op:'张三' },
  { no:2,  code:'SH20260804002', type:'系统上架', scene:'复核上架', orderCnt:8,  itemCnt:20, time:'2026-08-04 09:35:41', og:'东腾曼沙项目仓', op:'李四' },
  { no:3,  code:'SH20260804003', type:'人工上架', scene:'退货上架', orderCnt:3,  itemCnt:6,  time:'2026-08-04 10:02:19', og:'东腾曼沙项目仓', op:'王五' },
  { no:4,  code:'SH20260804004', type:'系统上架', scene:'签入上架', orderCnt:25, itemCnt:88, time:'2026-08-04 10:48:55', og:'东腾曼沙项目仓', op:'赵六' },
  { no:5,  code:'SH20260804005', type:'人工上架', scene:'移库上架', orderCnt:6,  itemCnt:14, time:'2026-08-04 11:20:33', og:'东腾曼沙项目仓', op:'张三' },
  { no:6,  code:'SH20260804006', type:'系统上架', scene:'复核上架', orderCnt:18, itemCnt:42, time:'2026-08-04 13:55:07', og:'东腾曼沙项目仓', op:'李四' },
  { no:7,  code:'SH20260803007', type:'人工上架', scene:'签入上架', orderCnt:9,  itemCnt:27, time:'2026-08-03 16:10:42', og:'东腾曼沙项目仓', op:'王五' },
  { no:8,  code:'SH20260803008', type:'系统上架', scene:'异常上架', orderCnt:4,  itemCnt:9,  time:'2026-08-03 17:33:18', og:'东腾曼沙项目仓', op:'赵六' },
];

/* ---- 查询区(对应 ShelfDataQueryInput) ----
   主行:单号类型 + 单号 + 查询/更多条件;其余进更多条件 */
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
          <button class="btn" id="btnMore" onclick="ShelfPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="shelfMore" style="display:none;">
        ${f('客户代码', `<input class="ipt" placeholder="客户代码" />`)}
        ${f('上架时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('库区位', `<input class="ipt" placeholder="如 A-01-02" />`)}
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

/* ---- 数据表格(8 列,严格对应 ShelfDataQueryResponse) ---- */
function gridTable() {
  const rows = SHELF_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code cell-link" title="${r.code}">${r.code}</td>
      <td>${r.type}</td>
      <td>${r.scene}</td>
      <td class="col--num cell-link" title="查看上架单明细">${r.orderCnt}</td>
      <td class="col--num cell-link" title="查看上架件明细">${r.itemCnt}</td>
      <td>${r.time}</td>
      <td>${r.og}</td>
      <td>${r.op}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:170px" />  <!-- 上架编码 -->
          <col style="width:100px" />  <!-- 上架类型 -->
          <col style="width:110px" />  <!-- 业务场景 -->
          <col style="width:100px" />  <!-- 上架单量 -->
          <col style="width:100px" />  <!-- 上架件量 -->
          <col style="width:150px" />  <!-- 上架时间 -->
          <col style="width:150px" />  <!-- 上架网点 -->
          <col style="width:90px" />   <!-- 上架操作人 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>上架编码</th>
            <th>上架类型</th>
            <th>业务场景</th>
            <th title="上架单量(链接查看明细)">上架单量</th>
            <th title="上架件量(链接查看明细)">上架件量</th>
            <th>上架时间</th>
            <th>上架网点</th>
            <th>上架操作人</th>
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

/* ---- 页面逻辑(展开更多 / 行选中) ---- */
const ShelfPage = {
  toggleMore() {
    const el = document.getElementById('shelfMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'wh-shelf-q',
  activeTab: 'wh-shelf-q',
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
