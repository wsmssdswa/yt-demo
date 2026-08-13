/* ============================================
   in-check-bat.js — 签入批次页
   依据:code/pc 生产源码
     · 列表模型 BatchInfoItem(8 列,见 [DataColumn] 标注)
       应到件量/实扫到件量/未到件量均为链接,点击查看明细
     · 查询条件:单号(必填)+单号类型(1运单/2客户/4平台/5子单/6箱号)
                 +时间范围+操作网点
     · 窗体按钮:查询 | 导出数据
     · 无状态枚举(批次为汇总记录)
   ============================================ */

/* ---- 演示数据(8 行,各批次件量/扫描进度不同) ---- */
const CHECKBAT_ROWS = [
  { no:1,  batch:'CI20260804001', scan:120, due:125, real:120, miss:5,  subSt:'张三', ctime:'2026-08-04 18:40:00', og:'东腾曼沙项目仓', sel:false },
  { no:2,  batch:'CI20260804002', scan:88,  due:90,  real:88,  miss:2,  subSt:'张三', ctime:'2026-08-04 17:30:00', og:'东腾曼沙项目仓', sel:true },
  { no:3,  batch:'CI20260804003', scan:200, due:200, real:200, miss:0,  subSt:'李四', ctime:'2026-08-04 20:15:00', og:'东腾曼沙项目仓', sel:false },
  { no:4,  batch:'CI20260804004', scan:45,  due:60,  real:45,  miss:15, subSt:'李四', ctime:'2026-08-04 16:40:00', og:'东腾曼沙项目仓', sel:false },
  { no:5,  batch:'CI20260803005', scan:300, due:300, real:300, miss:0,  subSt:'张三', ctime:'2026-08-03 14:20:00', og:'东腾曼沙项目仓', sel:true },
  { no:6,  batch:'CI20260803006', scan:156, due:160, real:156, miss:4,  subSt:'王五', ctime:'2026-08-03 10:05:00', og:'东腾曼沙项目仓', sel:false },
  { no:7,  batch:'CI20260802007', scan:72,  due:80,  real:72,  miss:8,  subSt:'王五', ctime:'2026-08-02 19:50:00', og:'东腾曼沙项目仓', sel:false },
  { no:8,  batch:'CI20260802008', scan:500, due:500, real:500, miss:0,  subSt:'李四', ctime:'2026-08-02 09:30:00', og:'东腾曼沙项目仓', sel:false },
];

/* ---- 查询区 ----
   布局:字段纵向(label 上、控件下),与异常订单页统一。
   主行默认只显示「单号类型 + 单号 + 查询/更多条件按钮」,其余进更多条件 */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:只留单号类型 + 单号 + 按钮 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">客户单号</option><option value="4">平台单号</option><option value="5">子单号</option><option value="6">箱号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="CheckBatPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="checkBatMore" style="display:none;">
        ${f('时间范围', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('操作网点', `<input class="ipt" placeholder="选择组织" />`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(对应窗体按钮) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('📤', '导出数据', "Helpers.toast('导出数据(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(8 列,严格对应 BatchInfoItem 的 [DataColumn]) ---- */
function gridTable() {
  /* 链接型件量(点击查看明细) */
  const linkNum = (v, title) =>
    `<a href="javascript:void(0)" class="cell-link" onclick="CheckBatPage.openDetail('${title}', ${v})">${v}</a>`;

  const rows = CHECKBAT_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td class="col--code">${r.batch}</td>
      <td class="col--num">${r.scan}</td>
      <td class="col--num">${linkNum(r.due, '应到件量')}</td>
      <td class="col--num">${linkNum(r.real, '实扫到件量')}</td>
      <td class="col--num ${r.miss > 0 ? 'check-miss' : ''}">${linkNum(r.miss, '未到件量')}</td>
      <td>${r.subSt}</td>
      <td>${r.ctime}</td>
      <td>${r.og}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap bat-grid-wrap">
      <table class="grid bat-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:160px" />  <!-- 批次号 -->
          <col style="width:90px" />   <!-- 扫描票量 -->
          <col style="width:110px" />  <!-- 应到件量 -->
          <col style="width:110px" />  <!-- 实扫到件量 -->
          <col style="width:110px" />  <!-- 未到件量 -->
          <col style="width:80px" />   <!-- 提交人 -->
          <col style="width:150px" />  <!-- 创建时间 -->
          <col style="width:140px" />  <!-- 操作网点 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="CheckBatPage.toggleAll(this)" /></th>
            <th>批次号</th>
            <th>扫描票量</th>
            <th title="点击查看应到明细">应到件量</th>
            <th title="点击查看实扫明细">实扫到件量</th>
            <th title="点击查看未到明细">未到件量</th>
            <th>提交人</th>
            <th>创建时间</th>
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

/* ---- 页面逻辑(展开更多/全选/件量明细) ---- */
const CheckBatPage = {
  toggleMore() {
    const el = document.getElementById('checkBatMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.bat-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 件量明细(链接点击) */
  openDetail(title, count) {
    if (count === 0) {
      Helpers.toast(`${title}:0 件(无明细)`);
      return;
    }
    Helpers.toast(`${title}明细:${count} 件(演示)`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'in-check-bat',
  activeTab: 'in-check-bat',
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
  const tr = e.target.closest('.bat-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
  document.querySelectorAll('.bat-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
