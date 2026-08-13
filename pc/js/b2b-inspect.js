/* ============================================
   b2b-inspect.js — B2B查验记录页
   依据:code/pc 生产源码
     · 列表模型 InspectionRecordViewItem(8 列:主单号|销售产品|服务渠道|目的国家|查验类型|
       查验时间(最新)|查验人(最新)|查验网点(最新)|问题件类型)
     · 查询条件:简单(单号类型 0主单/1子单 + 单号 ≤3000) + 更多(查验时间 range≤90天 + 销售产品 + 服务渠道 +
       目的国家 + 查验类型 -1全部/1风控拦截/2库内自主 + 查验人 + 查验网点 + 问题件类型)
     · 按钮区:查询 / 子单明细(选中1行) / 导出(≤2000,流式进度窗)
     · 枚举 InspectionBizType:1风控拦截查验 / 2库内自主查验
   ============================================ */

/* ---- 演示数据(10 行,覆盖两种查验类型 + 各类问题件) ---- */
const INSP_ROWS = [
  { no:1,  waybill:'YT2621601300301272', product:'美森快船-普货', channel:'美森正班',   country:'美国', bizType:1, bizLabel:'风控拦截查验',
    inspectTime:'2026-08-04 18:53:17', inspector:'张三', inspectOg:'东腾曼沙项目仓', issueType:'A1-101 申报价值不符',     sel:false },
  { no:2,  waybill:'YT2621601300301249', product:'美森快船-带电', channel:'美森加班',   country:'美国', bizType:1, bizLabel:'风控拦截查验',
    inspectTime:'2026-08-04 18:46:37', inspector:'李四', inspectOg:'东腾曼沙项目仓', issueType:'B2-201 侵权品牌',          sel:false },
  { no:3,  waybill:'YT2621601300301227', product:'B2B空运-普货',  channel:'B2B空运直飞', country:'英国', bizType:2, bizLabel:'库内自主查验',
    inspectTime:'2026-08-04 17:47:52', inspector:'王五', inspectOg:'东腾曼沙项目仓', issueType:'A3-305 申报重量超限',      sel:true  },
  { no:4,  waybill:'YT2621601300301201', product:'以星快船-普货', channel:'以星EXX',    country:'美国', bizType:2, bizLabel:'库内自主查验',
    inspectTime:'2026-08-04 17:45:35', inspector:'赵六', inspectOg:'东腾曼沙项目仓', issueType:'A1-102 包装破损',          sel:false },
  { no:5,  waybill:'YT2621625400300033', product:'B2B空运-带电', channel:'B2B空运直飞', country:'德国', bizType:1, bizLabel:'风控拦截查验',
    inspectTime:'2026-08-04 20:23:34', inspector:'张三', inspectOg:'东腾曼沙项目仓', issueType:'B2-202 反倾销产品',        sel:false },
  { no:6,  waybill:'YT2621601300101052', product:'美森快船-普货', channel:'美森正班',   country:'美国', bizType:2, bizLabel:'库内自主查验',
    inspectTime:'2026-08-04 17:09:27', inspector:'李四', inspectOg:'东腾曼沙项目仓', issueType:'A1-103 尺寸超标',          sel:true  },
  { no:7,  waybill:'YT2621601300101037', product:'长荣海运-普货', channel:'长荣海运',   country:'加拿大', bizType:1, bizLabel:'风控拦截查验',
    inspectTime:'2026-08-04 16:50:30', inspector:'王五', inspectOg:'东腾曼沙项目仓', issueType:'D1-401 无预报到货',        sel:false },
  { no:8,  waybill:'YT2621601300101029', product:'B2B空运-普货',  channel:'B2B空运直飞', country:'美国', bizType:2, bizLabel:'库内自主查验',
    inspectTime:'2026-08-04 16:49:07', inspector:'赵六', inspectOg:'东腾曼沙项目仓', issueType:'A1-104 标签缺失',          sel:false },
  { no:9,  waybill:'YT2621625700100026', product:'中欧卡航-普货', channel:'中欧卡航',   country:'法国', bizType:1, bizLabel:'风控拦截查验',
    inspectTime:'2026-08-04 15:26:12', inspector:'张三', inspectOg:'东腾曼沙项目仓', issueType:'A1-105 实际重量与预报不符', sel:false },
  { no:10, waybill:'YT2621624300300047', product:'美森快船-带电', channel:'美森正班',   country:'美国', bizType:2, bizLabel:'库内自主查验',
    inspectTime:'2026-08-04 15:16:54', inspector:'李四', inspectOg:'东腾曼沙项目仓', issueType:'A1-102 包装破损',          sel:false },
];

/* ---- 枚举映射(InspectionBizType:1风控拦截/2库内自主) ---- */
const INSP_ENUM = {
  bizType: {
    1: { cls:'insp-biz--risk' },   /* 风控拦截-危险红 */
    2: { cls:'insp-biz--self' },   /* 库内自主-信息蓝 */
  },
};

/* ---- 查询区(简单:单号类型 0主单/1子单 + 单号 | 更多:查验时间/产品/渠道/国家/查验类型/查验人/查验网点/问题件类型) ----
   主行默认只显示「单号类型 + 单号 + 查询/更多条件按钮」,其余进更多条件 */
function queryPanel() {
  /* 单个字段:label 在上、控件在下 */
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:只留单号类型 + 单号 + 按钮 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="0">主单号</option><option value="1">子单号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 3000 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="InspectPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="inspMore" style="display:none;">
        ${f('查验时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-06-06" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('销售产品', `<input class="ipt" placeholder="销售产品" />`)}
        ${f('服务渠道', `<select class="sel"><option value="">全部</option><option>美森正班</option><option>美森加班</option><option>以星EXX</option><option>长荣海运</option><option>B2B空运直飞</option><option>中欧卡航</option></select>`)}
        ${f('目的国家', `<input class="ipt" placeholder="国家代码" />`)}
        ${f('查验类型', `<select class="sel"><option value="-1">全部</option><option value="1">风控拦截查验</option><option value="2">库内自主查验</option></select>`)}
        ${f('查验人', `<input class="ipt" />`)}
        ${f('查验网点', `<input class="ipt" placeholder="选择组织" />`)}
        ${f('问题件类型', `<input class="ipt" placeholder="问题件代码" />`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(查询 / 子单明细(选中1行) / 导出) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('📄', '子单明细', "InspectPage.childDetail()")}
      <span class="sep"></span>
      ${btn('⬇', '导出', "InspectPage.exportData()")}
    </div>
  `;
}

/* ---- 数据表格(8 列,严格对应 InspectionRecordViewItem) ---- */
function gridTable() {
  /* 问题件类型:含代码用红色强调 */
  const issueTag = issue => `<span class="insp-issue" title="${issue}">${issue}</span>`;

  const rows = INSP_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code cell-link" title="${r.waybill}">${r.waybill}</td>
      <td>${r.product}</td>
      <td>${r.channel}</td>
      <td>${r.country}</td>
      <td><span class="abn-tag ${r.bizType === 1 ? 'insp-biz--risk' : 'insp-biz--self'}">${r.bizLabel}</span></td>
      <td>${r.inspectTime}</td>
      <td>${r.inspector}</td>
      <td>${r.inspectOg}</td>
      <td>${issueTag(r.issueType)}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap insp-grid-wrap">
      <table class="grid insp-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:170px" />  <!-- 主单号 -->
          <col style="width:140px" />  <!-- 销售产品 -->
          <col style="width:120px" />  <!-- 服务渠道 -->
          <col style="width:80px" />   <!-- 目的国家 -->
          <col style="width:120px" />  <!-- 查验类型 -->
          <col style="width:140px" />  <!-- 查验时间 -->
          <col style="width:70px" />   <!-- 查验人 -->
          <col style="width:130px" />  <!-- 查验网点 -->
          <col style="width:200px" />  <!-- 问题件类型 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>主单号</th>
            <th>销售产品</th>
            <th>服务渠道</th>
            <th>目的国家</th>
            <th>查验类型</th>
            <th title="查验时间(最新)">查验时间</th>
            <th title="查验人(最新)">查验人</th>
            <th title="查验网点(最新)">查验网点</th>
            <th>问题件类型</th>
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
      <span class="pg-info">总记录数: <b>10</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go">
        <input class="ipt" value="" />
        <button class="pg-btn">GO</button>
        <select class="sel"><option>50</option><option>100</option><option>200</option></select>
      </span>
    </div>
  `;
}

/* ---- 页面逻辑(展开更多 / 子单明细选中1行 / 导出 ≤2000) ---- */
const InspectPage = {
  toggleMore() {
    const el = document.getElementById('inspMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  /* 子单明细:必须且仅选中 1 行 */
  childDetail() {
    const selected = document.querySelectorAll('.insp-grid tbody tr.row--selected');
    if (selected.length === 0) {
      Helpers.toast('请选择一条记录！');
      return;
    }
    if (selected.length > 1) {
      Helpers.toast('只能选择一条记录查看子单明细！');
      return;
    }
    const tr = selected[0];
    const no = tr.dataset.no;
    const row = INSP_ROWS.find(r => String(r.no) === String(no));
    Helpers.toast(`子单明细:${row ? row.waybill : '(占位)'}`);
  },
  /* 导出:≤2000(演示流式进度窗) */
  exportData() {
    Helpers.toast('导出已开始,正在处理…(演示,≤2000 行流式导出)');
    setTimeout(() => Helpers.toast('导出完成！(演示)'), 1500);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b2b-inspect',
  activeTab: 'b2b-inspect',
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
  const tr = e.target.closest('.insp-grid tbody tr');
  if (!tr) return;
  document.querySelectorAll('.insp-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
