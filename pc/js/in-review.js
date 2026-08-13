/* ============================================
   in-review.js — 复核记录页
   依据:code/pc 生产源码
     · 列表模型 ListChildOrderReviewRecordResponse(17 列,见 [DataColumn] 标注)
       原签入/复核各 6 列尺寸(长/宽/高/重量/材积重/方数)
     · 查询条件:单号(必填)+单号类型(1运单/2子单/3箱号)
                 +时间范围+复核网点
     · 窗体按钮:查询 | 导出数据详情
     · 枚举 ReviewResult(0正常/1异常)
   ============================================ */

/* ---- 演示数据(8 行,覆盖正常/异常,差异值有正有负) ---- */
const REVIEW_ROWS = [
  { no:1,  box:'BOX20260804001', child:'YT2621601300301272U001', waybill:'YT2621601300301272', cust:'CST2621601300101272', result:0, resultLabel:'正常',
    oLen:32, oWid:24, oHig:18, oWt:1.85, oVolWt:2.30, oVol:0.014, rLen:32, rWid:24, rHig:18, rWt:1.85, rVolWt:2.30, rVol:0.014,
    opSt:'张三', dLen:0,    dWt:0.00, og:'东腾曼沙项目仓', rTime:'2026-08-04 19:10:00', sel:false },
  { no:2,  box:'BOX20260804002', child:'YT2621601300301249U002', waybill:'YT2621601300301249', cust:'CST2621601300301249', result:1, resultLabel:'异常',
    oLen:40, oWid:30, oHig:25, oWt:3.20, oVolWt:5.00, oVol:0.030, rLen:42, rWid:31, rHig:26, rWt:3.55, rVolWt:5.65, rVol:0.034,
    opSt:'张三', dLen:+3,   dWt:+0.35, og:'东腾曼沙项目仓', rTime:'2026-08-04 19:05:10', sel:true },
  { no:3,  box:'BOX20260804003', child:'YT2621601300301227U001', waybill:'YT2621601300301227', cust:'CST2621601300101227', result:1, resultLabel:'异常',
    oLen:25, oWid:18, oHig:12, oWt:0.95, oVolWt:0.90, oVol:0.005, rLen:25, rWid:18, rHig:12, rWt:0.78, rVolWt:0.90, rVol:0.005,
    opSt:'李四', dLen:0,    dWt:-0.17, og:'东腾曼沙项目仓', rTime:'2026-08-04 18:00:15', sel:false },
  { no:4,  box:'BOX20260804004', child:'YT2621601300301201U001', waybill:'YT2621601300301201', cust:'CST2621601300101201', result:0, resultLabel:'正常',
    oLen:50, oWid:40, oHig:30, oWt:8.50, oVolWt:10.00, oVol:0.060, rLen:50, rWid:40, rHig:30, rWt:8.50, rVolWt:10.00, rVol:0.060,
    opSt:'李四', dLen:0,    dWt:0.00, og:'东腾曼沙项目仓', rTime:'2026-08-04 17:50:40', sel:false },
  { no:5,  box:'BOX20260804005', child:'YT2621625400300033U001', waybill:'YT2621625400300033', cust:'PH2608030000051', result:1, resultLabel:'异常',
    oLen:30, oWid:22, oHig:15, oWt:1.60, oVolWt:1.65, oVol:0.010, rLen:28, rWid:20, rHig:14, rWt:1.60, rVolWt:1.31, rVol:0.008,
    opSt:'张三', dLen:-4,   dWt:0.00, og:'东腾曼沙项目仓', rTime:'2026-08-04 20:30:00', sel:true },
  { no:6,  box:'BOX20260804006', child:'YT2621601300101052U001', waybill:'YT2621601300101052', cust:'CST2621601300101052', result:0, resultLabel:'正常',
    oLen:35, oWid:26, oHig:20, oWt:2.10, oVolWt:3.03, oVol:0.018, rLen:35, rWid:26, rHig:20, rWt:2.10, rVolWt:3.03, rVol:0.018,
    opSt:'李四', dLen:0,    dWt:0.00, og:'东腾曼沙项目仓', rTime:'2026-08-04 17:15:00', sel:false },
  { no:7,  box:'BOX20260804007', child:'YT2621601300101037U001', waybill:'YT2621601300101037', cust:'CST2621601300101037', result:1, resultLabel:'异常',
    oLen:42, oWid:32, oHig:28, oWt:5.40, oVolWt:6.27, oVol:0.038, rLen:42, rWid:32, rHig:28, rWt:5.85, rVolWt:6.27, rVol:0.038,
    opSt:'张三', dLen:0,    dWt:+0.45, og:'东腾曼沙项目仓', rTime:'2026-08-04 17:00:00', sel:false },
  { no:8,  box:'BOX20260804008', child:'YT2621601300101029U001', waybill:'YT2621601300101029', cust:'CST2621601300101029', result:0, resultLabel:'正常',
    oLen:28, oWid:20, oHig:14, oWt:1.20, oVolWt:1.31, oVol:0.008, rLen:28, rWid:20, rHig:14, rWt:1.20, rVolWt:1.31, rVol:0.008,
    opSt:'李四', dLen:0,    dWt:0.00, og:'东腾曼沙项目仓', rTime:'2026-08-04 16:55:00', sel:false },
];

/* ---- 枚举映射 ---- */
const REVIEW_ENUM = {
  /* 复核结果 ReviewResult */
  result: {
    0: { label:'正常', cls:'check-status--ok' },
    1: { label:'异常', cls:'check-status--fail' },
  },
};

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
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">子单号</option><option value="3">箱号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="ReviewPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="reviewMore" style="display:none;">
        ${f('时间范围', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('复核网点', `<input class="ipt" placeholder="选择组织" />`)}
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
      ${btn('📤', '导出数据详情', "Helpers.toast('导出数据详情(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(17 列,严格对应 ListChildOrderReviewRecordResponse 的 [DataColumn]) ---- */
function gridTable() {
  /* 复核结果标签 */
  const resultTag = r => {
    const e = REVIEW_ENUM.result[r] || { label:'', cls:'' };
    return `<span class="check-tag ${e.cls}">${e.label}</span>`;
  };
  /* 差异值:0 灰显,正数红,负数绿 */
  const diff = v => {
    if (v === 0) return '<span style="color:#bbb;">0</span>';
    return `<span class="${v > 0 ? 'check-diff--up' : 'check-diff--down'}">${v > 0 ? '+' : ''}${v}</span>`;
  };
  const diffWt = v => {
    if (v === 0) return '<span style="color:#bbb;">0.00</span>';
    return `<span class="${v > 0 ? 'check-diff--up' : 'check-diff--down'}">${v > 0 ? '+' : ''}${v.toFixed(2)}</span>`;
  };

  const rows = REVIEW_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td class="col--code">${r.box}</td>
      <td class="col--code">${r.child}</td>
      <td class="col--code">${r.waybill}</td>
      <td class="col--code">${r.cust}</td>
      <td>${resultTag(r.result)}</td>
      <td class="col--num">${r.oLen}</td>
      <td class="col--num">${r.oWid}</td>
      <td class="col--num">${r.oHig}</td>
      <td class="col--num">${r.oWt}</td>
      <td class="col--num">${r.oVolWt}</td>
      <td class="col--num">${r.oVol}</td>
      <td class="col--num">${r.rLen}</td>
      <td class="col--num">${r.rWid}</td>
      <td class="col--num">${r.rHig}</td>
      <td class="col--num">${r.rWt}</td>
      <td class="col--num">${r.rVolWt}</td>
      <td class="col--num">${r.rVol}</td>
      <td>${r.opSt}</td>
      <td class="col--num">${diff(r.dLen)}</td>
      <td class="col--num">${diffWt(r.dWt)}</td>
      <td>${r.og}</td>
      <td>${r.rTime}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap review-grid-wrap">
      <table class="grid review-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:150px" />  <!-- 箱号 -->
          <col style="width:190px" />  <!-- 子单号 -->
          <col style="width:160px" />  <!-- 主单号 -->
          <col style="width:160px" />  <!-- 客户单号 -->
          <col style="width:70px" />   <!-- 复核结果 -->
          <col style="width:48px" />   <!-- 原长 -->
          <col style="width:48px" />   <!-- 原宽 -->
          <col style="width:48px" />   <!-- 原高 -->
          <col style="width:64px" />   <!-- 原重量 -->
          <col style="width:64px" />   <!-- 原材积重 -->
          <col style="width:56px" />   <!-- 原方数 -->
          <col style="width:48px" />   <!-- 复核长 -->
          <col style="width:48px" />   <!-- 复核宽 -->
          <col style="width:48px" />   <!-- 复核高 -->
          <col style="width:64px" />   <!-- 复核重量 -->
          <col style="width:64px" />   <!-- 复核材积重 -->
          <col style="width:56px" />   <!-- 复核方数 -->
          <col style="width:70px" />   <!-- 复核操作人 -->
          <col style="width:80px" />   <!-- 复核尺寸差异 -->
          <col style="width:90px" />   <!-- 复核重量差异 -->
          <col style="width:130px" />  <!-- 复核网点 -->
          <col style="width:140px" />  <!-- 复核时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="ReviewPage.toggleAll(this)" /></th>
            <th>箱号</th>
            <th>子单号</th>
            <th>主单号</th>
            <th>客户单号</th>
            <th>复核结果</th>
            <th title="原签入长(cm)">原长</th>
            <th title="原签入宽(cm)">原宽</th>
            <th title="原签入高(cm)">原高</th>
            <th title="原签入重量(kg)">原重量</th>
            <th title="原签入材积重(kg)">原材积重</th>
            <th title="原签入方数(m³)">原方数</th>
            <th title="复核长(cm)">复核长</th>
            <th title="复核宽(cm)">复核宽</th>
            <th title="复核高(cm)">复核高</th>
            <th title="复核重量(kg)">复核重量</th>
            <th title="复核材积重(kg)">复核材积重</th>
            <th title="复核方数(m³)">复核方数</th>
            <th>复核操作人</th>
            <th title="复核尺寸差异(cm)">尺寸差异</th>
            <th title="复核重量差异(kg)">重量差异</th>
            <th>复核网点</th>
            <th>复核时间</th>
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

/* ---- 页面逻辑(展开更多/全选) ---- */
const ReviewPage = {
  toggleMore() {
    const el = document.getElementById('reviewMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.review-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'in-review',
  activeTab: 'in-review',
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
  const tr = e.target.closest('.review-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.review-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
