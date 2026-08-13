/* ============================================
   wh-print.js — 打印记录页(库内操作组)
   依据:docs/page-fields-reference.md
     · 列表模型 ListPrintRecordItemDto(16 列)
         扫描单号|匹配单号|匹配主单号|销售产品|服务渠道|打印对象|打印类型|
         打印时间|打印状态|打印份数|错误信息|耗时(ms)|打印文件地址(链接)|
         数据来源|操作网点|操作人
     · 查询条件:单号类型(1主单/2匹配)+单号(≤5000)+打印时间(≤90天)+打印状态+
         打印对象+打印类型+数据来源+操作网点+操作人
     · 按钮:查询(仅查询,无其它操作)
     · 枚举 PrintStatus:1打印中 / 2成功 / 3失败
   ============================================ */

/* ---- 演示数据(8 行,覆盖打印中/成功/失败三种状态) ---- */
const PRINT_ROWS = [
  { no:1,  scanNo:'YT2621601300301272', matchNo:'YT2621601300301272', mainNo:'YT2621601300301272', product:'美森快船-普货', channel:'美森正班', obj:'箱标',  type:'子单打印', time:'2026-08-04 18:53:17', status:2, statusLabel:'成功', cnt:1, err:'', cost:128,  src:'工作台', og:'东腾曼沙项目仓', op:'张三' },
  { no:2,  scanNo:'YT2621601300301249', matchNo:'YT2621601300301249', mainNo:'YT2621601300301249', product:'美森快船-带电', channel:'美森加班', obj:'箱标',  type:'整单打印', time:'2026-08-04 18:47:11', status:3, statusLabel:'失败', cnt:1, err:'打印机离线', cost:5003, src:'工作台', og:'东腾曼沙项目仓', op:'李四' },
  { no:3,  scanNo:'YT2621601300301227', matchNo:'YT2621601300301227', mainNo:'YT2621601300301227', product:'B2B空运-普货',  channel:'B2B空运直飞', obj:'拣货单', type:'拣货单打印', time:'2026-08-04 17:47:52', status:2, statusLabel:'成功', cnt:2, err:'', cost:215, src:'拣货任务', og:'东腾曼沙项目仓', op:'王五' },
  { no:4,  scanNo:'YT2621601300301201', matchNo:'YT2621601300301201', mainNo:'YT2621601300301201', product:'以星快船-普货', channel:'以星EXX', obj:'箱标',  type:'子单打印', time:'2026-08-04 17:45:35', status:2, statusLabel:'成功', cnt:1, err:'', cost:96,  src:'工作台', og:'东腾曼沙项目仓', op:'赵六' },
  { no:5,  scanNo:'YT2621625400300033', matchNo:'YT2621625400300033', mainNo:'YT2621625400300033', product:'B2B空运-带电',  channel:'B2B空运直飞', obj:'箱标',  type:'整单打印', time:'2026-08-04 20:23:34', status:1, statusLabel:'打印中', cnt:1, err:'', cost:0,   src:'工作台', og:'东腾曼沙项目仓', op:'张三' },
  { no:6,  scanNo:'YT2621601300101052', matchNo:'YT2621601300101052', mainNo:'YT2621601300101052', product:'美森快船-普货', channel:'美森正班', obj:'面单',  type:'子单打印', time:'2026-08-03 17:22:33', status:2, statusLabel:'成功', cnt:1, err:'', cost:142, src:'工作台', og:'东腾曼沙项目仓', op:'李四' },
  { no:7,  scanNo:'YT2621601300101037', matchNo:'YT2621601300101037', mainNo:'YT2621601300101037', product:'长荣海运-普货', channel:'长荣海运', obj:'箱标',  type:'子单打印', time:'2026-08-03 16:50:30', status:3, statusLabel:'失败', cnt:1, err:'模板不存在', cost:3120, src:'批量打印', og:'东腾曼沙项目仓', op:'王五' },
  { no:8,  scanNo:'YT2621601300101029', matchNo:'YT2621601300101029', mainNo:'YT2621601300101029', product:'B2B空运-普货',  channel:'B2B空运直飞', obj:'箱标',  type:'整单打印', time:'2026-08-03 16:49:07', status:2, statusLabel:'成功', cnt:3, err:'', cost:187, src:'批量打印', og:'东腾曼沙项目仓', op:'赵六' },
];

/* ---- 枚举映射(来自 PrintStatus) ---- */
const PRINT_ENUM = {
  status: {
    1: { label:'打印中', cls:'print-status--doing' },
    2: { label:'成功',   cls:'print-status--ok' },
    3: { label:'失败',   cls:'print-status--fail' },
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
        ${f('单号类型', `<select class="sel"><option value="1">主单号</option><option value="2">匹配单号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 5000 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="PrintPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="printMore" style="display:none;">
        ${f('打印时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('打印状态', `<select class="sel"><option value="">全部</option><option value="1">打印中</option><option value="2">成功</option><option value="3">失败</option></select>`)}
        ${f('打印对象', `<select class="sel"><option value="">全部</option><option>箱标</option><option>面单</option><option>拣货单</option></select>`)}
        ${f('打印类型', `<select class="sel"><option value="">全部</option><option>子单打印</option><option>整单打印</option><option>拣货单打印</option></select>`)}
        ${f('数据来源', `<select class="sel"><option value="">全部</option><option>工作台</option><option>批量打印</option><option>拣货任务</option></select>`)}
        ${f('操作网点', `<input class="ipt" placeholder="选择组织" />`)}
        ${f('操作人', `<input class="ipt" placeholder="操作人" />`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(查询,本页仅查询按钮) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('🔍', '查询', "Helpers.toast('查询(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(16 列) ---- */
function gridTable() {
  /* 打印状态标签 */
  const statusTag = s => {
    const e = PRINT_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };
  /* 错误信息:有则红,无则灰横杠 */
  const errCell = err =>
    err ? `<span class="print-err">${err}</span>` : '<span style="color:#bbb;">—</span>';
  /* 打印文件地址:链接 */
  const fileCell = r =>
    `<a class="cell-link" onclick="Helpers.toast('打开打印文件(占位)')">查看文件</a>`;
  /* 耗时:失败/打印中(0)灰色,正常显示 */
  const costCell = (r) => {
    if (r.cost === 0) return '<span style="color:#bbb;">—</span>';
    return `${r.cost}`;
  };

  const rows = PRINT_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code">${r.scanNo}</td>
      <td class="col--code">${r.matchNo}</td>
      <td class="col--code">${r.mainNo}</td>
      <td>${r.product}</td>
      <td>${r.channel}</td>
      <td>${r.obj}</td>
      <td>${r.type}</td>
      <td>${r.time}</td>
      <td>${statusTag(r.status)}</td>
      <td class="col--num">${r.cnt}</td>
      <td>${errCell(r.err)}</td>
      <td class="col--num">${costCell(r)}</td>
      <td>${fileCell(r)}</td>
      <td>${r.src}</td>
      <td>${r.og}</td>
      <td>${r.op}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:160px" />  <!-- 扫描单号 -->
          <col style="width:160px" />  <!-- 匹配单号 -->
          <col style="width:160px" />  <!-- 匹配主单号 -->
          <col style="width:130px" />  <!-- 销售产品 -->
          <col style="width:110px" />  <!-- 服务渠道 -->
          <col style="width:80px" />   <!-- 打印对象 -->
          <col style="width:90px" />   <!-- 打印类型 -->
          <col style="width:150px" />  <!-- 打印时间 -->
          <col style="width:70px" />   <!-- 打印状态 -->
          <col style="width:60px" />   <!-- 打印份数 -->
          <col style="width:110px" />  <!-- 错误信息 -->
          <col style="width:70px" />   <!-- 耗时 -->
          <col style="width:80px" />   <!-- 打印文件地址 -->
          <col style="width:80px" />   <!-- 数据来源 -->
          <col style="width:130px" />  <!-- 操作网点 -->
          <col style="width:70px" />   <!-- 操作人 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>扫描单号</th>
            <th>匹配单号</th>
            <th>匹配主单号</th>
            <th>销售产品</th>
            <th>服务渠道</th>
            <th>打印对象</th>
            <th>打印类型</th>
            <th>打印时间</th>
            <th>打印状态</th>
            <th class="col--center">打印份数</th>
            <th>错误信息</th>
            <th title="耗时(ms)">耗时(ms)</th>
            <th>打印文件地址</th>
            <th>数据来源</th>
            <th>操作网点</th>
            <th>操作人</th>
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
const PrintPage = {
  toggleMore() {
    const el = document.getElementById('printMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'wh-print',
  activeTab: 'wh-print',
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
