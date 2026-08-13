/* ============================================
   in-batch.js — 批量签入页(任务列表)
   依据:code/pc 生产源码
     · 列表模型 BatchOperationDataItem(12 列,见 [DataColumn] 标注)
       本页为"批量任务"列表,非单据查询;结果文件下载为链接
     · 查询条件:操作网点(多选)+任务状态(多选)+创建人+时间范围
       (本页无"单号类型/单号",主行用"操作网点"作为主筛选项以保持主行结构一致)
     · 窗体按钮:查询 | 批量导入(弹窗:导入数据/模板下载/提交≤1000块50/导出)
     · 枚举 BatchOperationStatus(1待执行/2执行中/3已完成)
   ============================================ */

/* ---- 演示数据(8 行,覆盖三种任务状态) ---- */
const BATCH_ROWS = [
  { no:1,  taskNo:'BI20260804001', status:3, statusLabel:'已完成', total:120, ok:118, err:2,  og:'东腾曼沙项目仓', creSt:'张三', tz:'UTC+8', ctime:'2026-08-04 18:40:00', ftime:'2026-08-04 18:42:30', sel:false },
  { no:2,  taskNo:'BI20260804002', status:3, statusLabel:'已完成', total:500, ok:500, err:0,  og:'东腾曼沙项目仓', creSt:'张三', tz:'UTC+8', ctime:'2026-08-04 17:30:00', ftime:'2026-08-04 17:35:10', sel:true },
  { no:3,  taskNo:'BI20260804003', status:2, statusLabel:'执行中', total:1000,ok:640, err:0,  og:'东腾曼沙项目仓', creSt:'李四', tz:'UTC+8', ctime:'2026-08-04 20:15:00', ftime:'',                   sel:false },
  { no:4,  taskNo:'BI20260804004', status:1, statusLabel:'待执行', total:50,  ok:0,  err:0,  og:'东腾曼沙项目仓', creSt:'李四', tz:'UTC+8', ctime:'2026-08-04 16:40:00', ftime:'',                   sel:false },
  { no:5,  taskNo:'BI20260803005', status:3, statusLabel:'已完成', total:300, ok:295, err:5,  og:'东腾曼沙项目仓', creSt:'张三', tz:'UTC+8', ctime:'2026-08-03 14:20:00', ftime:'2026-08-03 14:22:00', sel:true },
  { no:6,  taskNo:'BI20260803006', status:3, statusLabel:'已完成', total:160, ok:160, err:0,  og:'东腾曼沙项目仓', creSt:'王五', tz:'UTC+8', ctime:'2026-08-03 10:05:00', ftime:'2026-08-03 10:06:30', sel:false },
  { no:7,  taskNo:'BI20260802007', status:2, statusLabel:'执行中', total:80,  ok:35, err:0,  og:'东腾曼沙项目仓', creSt:'王五', tz:'UTC+8', ctime:'2026-08-02 19:50:00', ftime:'',                   sel:false },
  { no:8,  taskNo:'BI20260802008', status:1, statusLabel:'待执行', total:1000,ok:0,  err:0,  og:'东腾曼沙项目仓', creSt:'李四', tz:'UTC+8', ctime:'2026-08-02 09:30:00', ftime:'',                   sel:false },
];

/* ---- 枚举映射 ---- */
const BATCH_ENUM = {
  /* 任务状态 BatchOperationStatus */
  status: {
    1: { label:'待执行', cls:'check-status--pending' },
    2: { label:'执行中', cls:'check-status--processing' },
    3: { label:'已完成', cls:'check-status--ok' },
  },
};

/* ---- 查询区 ----
   布局:字段纵向(label 上、控件下),与异常订单页统一。
   主行:操作网点(多选,本页主筛选项) + 查询/更多条件按钮;其余进更多条件 */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:操作网点 + 按钮(本页无单号查询,主筛选即网点) -->
      <div class="qp-row qp-row--main">
        ${f('操作网点', `<select class="sel" multiple style="height:26px;"><option selected>东腾曼沙项目仓</option></select>`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="BatchPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="batchMore" style="display:none;">
        ${f('任务状态', `<select class="sel" multiple style="height:48px;"><option>待执行</option><option>执行中</option><option>已完成</option></select>`)}
        ${f('创建人', `<input class="ipt" />`)}
        ${f('时间范围', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
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
      ${btn('📥', '批量导入', "BatchPage.openImport()")}
    </div>
  `;
}

/* ---- 数据表格(12 列,严格对应 BatchOperationDataItem 的 [DataColumn]) ---- */
function gridTable() {
  /* 任务状态标签 */
  const statusTag = s => {
    const e = BATCH_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="check-tag ${e.cls}">${e.label}</span>`;
  };
  /* 结果文件下载链接 */
  const dlLink = r => {
    if (r.status !== 3) return '<span style="color:#bbb;">—</span>';
    return `<a href="javascript:void(0)" class="cell-link" onclick="BatchPage.downloadResult('${r.taskNo}')">下载结果</a>`;
  };

  const rows = BATCH_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td class="col--code">${r.taskNo}</td>
      <td>${statusTag(r.status)}</td>
      <td class="col--num">${r.total}</td>
      <td class="col--num check-ok">${r.ok}</td>
      <td class="col--num ${r.err > 0 ? 'check-err' : ''}">${r.err}</td>
      <td>${dlLink(r)}</td>
      <td>${r.og}</td>
      <td>${r.creSt}</td>
      <td>${r.tz}</td>
      <td>${r.ctime}</td>
      <td>${r.ftime || '<span style="color:#bbb;">—</span>'}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap inbatch-grid-wrap">
      <table class="grid inbatch-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:160px" />  <!-- 任务批次号 -->
          <col style="width:80px" />   <!-- 任务状态 -->
          <col style="width:80px" />   <!-- 单号总数 -->
          <col style="width:70px" />   <!-- 成功数 -->
          <col style="width:70px" />   <!-- 异常数 -->
          <col style="width:100px" />  <!-- 结果文件下载 -->
          <col style="width:140px" />  <!-- 操作网点 -->
          <col style="width:80px" />   <!-- 创建人 -->
          <col style="width:70px" />   <!-- 时区 -->
          <col style="width:150px" />  <!-- 创建时间 -->
          <col style="width:150px" />  <!-- 任务完成时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="BatchPage.toggleAll(this)" /></th>
            <th>任务批次号</th>
            <th>任务状态</th>
            <th>单号总数</th>
            <th>成功数</th>
            <th>异常数</th>
            <th>结果文件下载</th>
            <th>操作网点</th>
            <th>创建人</th>
            <th>时区</th>
            <th>创建时间</th>
            <th>任务完成时间</th>
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

/* ---- 批量导入弹窗 ---- */
function importModal() {
  return `
    <div class="rw-modal" id="importModal">
      <div class="rw-modal-mask" onclick="BatchPage.closeImport()"></div>
      <div class="rw-modal-panel">
        <div class="rw-modal-header">
          <span class="rw-modal-title">批量签入导入</span>
          <span class="rw-modal-close" onclick="BatchPage.closeImport()">✕</span>
        </div>
        <div class="rw-modal-body">
          <div style="margin-bottom:12px;">
            <button class="btn" onclick="Helpers.toast('模板下载(占位)')">📥 模板下载</button>
          </div>
          <div class="rw-form-row">
            <span class="rw-form-label">选择文件<span class="rw-req">*</span></span>
            <input class="rw-form-ipt" type="file" placeholder="选择批量签入文件" />
          </div>
          <div class="rw-modal-tip">
            · 仅支持 .xlsx 格式,单次提交 ≤ 1000 行<br/>
            · 每块最多 50 行,超出将自动分块执行<br/>
            · 文件需包含:运单号、操作网点 等必填列
          </div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="Helpers.toast('导出导入数据(占位)')">导出</button>
          <button class="btn btn--primary" onclick="BatchPage.submitImport()">提交</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑(展开更多/全选/批量导入) ---- */
const BatchPage = {
  toggleMore() {
    const el = document.getElementById('batchMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.inbatch-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 打开批量导入弹窗 */
  openImport() {
    document.body.insertAdjacentHTML('beforeend', importModal());
  },
  closeImport() {
    const el = document.getElementById('importModal');
    if (el) el.remove();
  },
  /* 提交导入:校验文件已选(演示,单次≤1000、分块50 在后端) */
  submitImport() {
    const file = document.querySelector('#importModal input[type="file"]').value;
    if (!file) {
      Helpers.toast('请先选择导入文件！');
      return;
    }
    this.closeImport();
    Helpers.toast('批量导入已提交,任务创建中(演示)');
  },
  /* 下载结果文件 */
  downloadResult(taskNo) {
    Helpers.toast(`下载结果文件:${taskNo}(演示)`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'in-batch',
  activeTab: 'in-batch',
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
  const tr = e.target.closest('.inbatch-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
  document.querySelectorAll('.inbatch-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
