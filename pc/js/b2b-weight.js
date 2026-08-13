/* ============================================
   b2b-weight.js — B2B重量勘误页
   依据:code/pc 生产源码
     · 列表模型 WeightFixListModel(勾选主键 + 12 列:主单号|子单号|状态|确认勘误操作人|确认勘误时间|客户代码|
       勘误前(重量/长/宽/高/子单计费重/主单计费重/单位)|勘误后(同)|勘误备注|创建人|创建时间)
     · 查询条件:简单(单号类型 0主单/1子单 + 单号 ≤2000) + 更多(创建时间 range≤90天 + 客户代码 + 状态 -1全部/0待生效/1勘误中/2已完结)
     · 按钮区:查询 / 下载模板 / 批量导入 / 确认勘误(勾选 ≤1000,须待生效,二次确认) / 查看日志(选中1行)
     · 枚举 WeightFixStatus:0待生效 / 1勘误中 / 2已完结
   ============================================ */

/* ---- 演示数据(10 行,覆盖待生效/勘误中/已完结 三种状态 + 主子单) ---- */
const WT_ROWS = [
  { no:1,  waybill:'YT2621601300301272', child:'YT2621601300301272-1', status:0, statusLabel:'待生效',
    fixOp:'', fixTime:'', cust:'CST2621601300101272',
    bWeight:'12.50', bL:'30', bW:'25', bH:'18', bChildCW:'12.50', bMainCW:'37.50', unit:'kg',
    aWeight:'13.80', aL:'31', aW:'26', aH:'19', aChildCW:'13.80', aMainCW:'41.40',
    remark:'复核称重偏差', creator:'张三', createTime:'2026-08-04 18:53:17', sel:true  },
  { no:2,  waybill:'YT2621601300301249', child:'YT2621601300301249-1', status:0, statusLabel:'待生效',
    fixOp:'', fixTime:'', cust:'CST2621601300301249',
    bWeight:'8.30',  bL:'28', bW:'22', bH:'15', bChildCW:'8.30',  bMainCW:'24.90', unit:'kg',
    aWeight:'9.10',  aL:'28', aW:'22', aH:'15', aChildCW:'9.10',  aMainCW:'27.30',
    remark:'尺寸测量更正', creator:'李四', createTime:'2026-08-04 18:46:37', sel:false },
  { no:3,  waybill:'YT2621601300301227', child:'YT2621601300301227-1', status:1, statusLabel:'勘误中',
    fixOp:'客服A', fixTime:'2026-08-04 19:20:00', cust:'CST2621601300101227',
    bWeight:'5.20',  bL:'20', bW:'18', bH:'12', bChildCW:'5.20',  bMainCW:'15.60', unit:'kg',
    aWeight:'5.60',  aL:'21', aW:'18', aH:'12', aChildCW:'5.60',  aMainCW:'16.80',
    remark:'运力回传重量更正', creator:'王五', createTime:'2026-08-04 17:47:52', sel:false },
  { no:4,  waybill:'YT2621601300301201', child:'YT2621601300301201-1', status:0, statusLabel:'待生效',
    fixOp:'', fixTime:'', cust:'CST2621601300101201',
    bWeight:'18.75', bL:'40', bW:'32', bH:'25', bChildCW:'18.75', bMainCW:'56.25', unit:'kg',
    aWeight:'20.10', aL:'41', aW:'33', bH:'26', aChildCW:'20.10', aMainCW:'60.30',
    remark:'大件复核更正', creator:'赵六', createTime:'2026-08-04 17:45:35', sel:false },
  { no:5,  waybill:'YT2621625400300033', child:'YT2621625400300033-1', status:2, statusLabel:'已完结',
    fixOp:'客服C', fixTime:'2026-08-04 09:15:00', cust:'PH2608030000051',
    bWeight:'3.40',  bL:'18', bW:'14', bH:'10', bChildCW:'3.40',  bMainCW:'10.20', unit:'kg',
    aWeight:'3.65',  aL:'18', aW:'15', bH:'10', aChildCW:'3.65',  aMainCW:'10.95',
    remark:'签入复核修正', creator:'张三', createTime:'2026-08-03 17:22:33', sel:true  },
  { no:6,  waybill:'YT2621601300101052', child:'YT2621601300101052-1', status:1, statusLabel:'勘误中',
    fixOp:'客服A', fixTime:'2026-08-04 14:30:00', cust:'CST2621601300101052',
    bWeight:'25.60', bL:'45', bW:'38', bH:'30', bChildCW:'25.60', bMainCW:'76.80', unit:'kg',
    aWeight:'27.20', aL:'46', aW:'39', aH:'31', aChildCW:'27.20', aMainCW:'81.60',
    remark:'整柜复核更正', creator:'李四', createTime:'2026-08-03 17:09:27', sel:false },
  { no:7,  waybill:'YT2621601300101037', child:'YT2621601300101037-1', status:2, statusLabel:'已完结',
    fixOp:'客服B', fixTime:'2026-08-04 10:00:00', cust:'CST2621601300101037',
    bWeight:'9.80',  bL:'26', bW:'22', bH:'16', bChildCW:'9.80',  bMainCW:'29.40', unit:'kg',
    aWeight:'10.45', aL:'27', aW:'22', aH:'16', aChildCW:'10.45', aMainCW:'31.35',
    remark:'无预报件实测更正', creator:'王五', createTime:'2026-08-03 16:50:30', sel:false },
  { no:8,  waybill:'YT2621601300101029', child:'YT2621601300101029-1', status:2, statusLabel:'已完结',
    fixOp:'客服C', fixTime:'2026-08-04 11:20:00', cust:'CST2621601300101029',
    bWeight:'2.10',  bL:'15', bW:'12', bH:'8',  bChildCW:'2.10',  bMainCW:'6.30',  unit:'kg',
    aWeight:'2.30',  aL:'15', aW:'12', aH:'9',  aChildCW:'2.30',  aMainCW:'6.90',
    remark:'标签缺失复核', creator:'赵六', createTime:'2026-08-03 16:49:07', sel:false },
  { no:9,  waybill:'YT2621625700100026', child:'YT2621625700100026-1', status:0, statusLabel:'待生效',
    fixOp:'', fixTime:'', cust:'CST2621625700100026',
    bWeight:'6.45',  bL:'24', bW:'20', bH:'14', bChildCW:'6.45',  bMainCW:'19.35', unit:'kg',
    aWeight:'6.90',  aL:'24', aW:'20', aH:'15', aChildCW:'6.90',  aMainCW:'20.70',
    remark:'卡航称重更正', creator:'张三', createTime:'2026-08-04 15:26:12', sel:false },
  { no:10, waybill:'YT2621624300300047', child:'YT2621624300300047-1', status:1, statusLabel:'勘误中',
    fixOp:'客服A', fixTime:'2026-08-04 16:00:00', cust:'CST2621624300300047',
    bWeight:'14.90', bL:'35', bW:'28', bH:'22', bChildCW:'14.90', bMainCW:'44.70', unit:'kg',
    aWeight:'15.80', aL:'36', aW:'29', aH:'23', aChildCW:'15.80', aMainCW:'47.40',
    remark:'带电产品复称更正', creator:'李四', createTime:'2026-08-04 15:16:54', sel:false },
];

/* ---- 枚举映射(WeightFixStatus:0待生效/1勘误中/2已完结) ---- */
const WT_ENUM = {
  status: {
    0: { label:'待生效', cls:'wt-status--pending' },
    1: { label:'勘误中', cls:'wt-status--processing' },
    2: { label:'已完结', cls:'wt-status--done' },
  },
};

/* ---- 查询区(简单:单号类型 0主单/1子单 + 单号 | 更多:创建时间/客户代码/状态) ----
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
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 2000 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="WeightPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="wtMore" style="display:none;">
        ${f('创建时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-06-06" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('客户代码', `<input class="ipt" placeholder="客户代码" />`)}
        ${f('状态', `<select class="sel"><option value="-1">全部</option><option value="0">待生效</option><option value="1">勘误中</option><option value="2">已完结</option></select>`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(查询 / 下载模板 / 批量导入 / 确认勘误 / 查看日志) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('⬇', '下载模板', "WeightPage.downloadTemplate()")}
      ${btn('⬆', '批量导入', "WeightPage.batchImport()")}
      <span class="sep"></span>
      ${btn('✓', '确认勘误', "WeightPage.confirmFix()")}
      <span class="sep"></span>
      ${btn('🗒', '查看日志', "WeightPage.viewLog()")}
    </div>
  `;
}

/* ---- 数据表格(勾选主键 + 列严格对应 WeightFixListModel) ---- */
function gridTable() {
  /* 状态标签 */
  const statusTag = s => {
    const e = WT_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };
  /* 勘误前后对比:有变化用强调色,无变化灰显 */
  const cmp = (before, after) => {
    if (before === after) return `<span style="color:#bbb;">${after}</span>`;
    return `<span class="wt-changed">${after}</span> <span class="wt-from">(原 ${before})</span>`;
  };

  const rows = WT_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} data-status="${r.status}" /></td>
      <td class="col--num">${r.no}</td>
      <td class="col--code cell-link" title="${r.waybill}">${r.waybill}</td>
      <td class="col--code">${r.child}</td>
      <td>${statusTag(r.status)}</td>
      <td>${r.fixOp || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.fixTime || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--code">${r.cust}</td>
      <td class="col--num">${r.bWeight}</td>
      <td class="col--num">${r.bL}</td>
      <td class="col--num">${r.bW}</td>
      <td class="col--num">${r.bH}</td>
      <td class="col--num">${r.bChildCW}</td>
      <td class="col--num">${r.bMainCW}</td>
      <td>${r.unit}</td>
      <td class="col--num">${cmp(r.bWeight, r.aWeight)}</td>
      <td class="col--num">${cmp(r.bL, r.aL)}</td>
      <td class="col--num">${cmp(r.bW, r.aW)}</td>
      <td class="col--num">${cmp(r.bH, r.aH)}</td>
      <td class="col--num">${cmp(r.bChildCW, r.aChildCW)}</td>
      <td class="col--num">${cmp(r.bMainCW, r.aMainCW)}</td>
      <td class="wt-remark" title="${r.remark}">${r.remark}</td>
      <td>${r.creator}</td>
      <td>${r.createTime}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wt-grid-wrap">
      <table class="grid wt-grid">
        <colgroup>
          <col style="width:32px" />   <!-- 勾选主键 -->
          <col style="width:36px" />   <!-- NO -->
          <col style="width:170px" />  <!-- 主单号 -->
          <col style="width:180px" />  <!-- 子单号 -->
          <col style="width:70px" />   <!-- 状态 -->
          <col style="width:70px" />   <!-- 确认勘误操作人 -->
          <col style="width:140px" />  <!-- 确认勘误时间 -->
          <col style="width:160px" />  <!-- 客户代码 -->
          <col style="width:80px" />   <!-- 勘误前重量 -->
          <col style="width:60px" />   <!-- 勘误前长 -->
          <col style="width:60px" />   <!-- 勘误前宽 -->
          <col style="width:60px" />   <!-- 勘误前高 -->
          <col style="width:100px" />  <!-- 勘误前子单计费重 -->
          <col style="width:100px" />  <!-- 勘误前主单计费重 -->
          <col style="width:50px" />   <!-- 单位 -->
          <col style="width:110px" />  <!-- 勘误后重量 -->
          <col style="width:90px" />   <!-- 勘误后长 -->
          <col style="width:90px" />   <!-- 勘误后宽 -->
          <col style="width:90px" />   <!-- 勘误后高 -->
          <col style="width:120px" />  <!-- 勘误后子单计费重 -->
          <col style="width:120px" />  <!-- 勘误后主单计费重 -->
          <col style="width:150px" />  <!-- 勘误备注 -->
          <col style="width:70px" />   <!-- 创建人 -->
          <col style="width:140px" />  <!-- 创建时间 -->
        </colgroup>
        <thead>
          <tr>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="WeightPage.toggleAll(this)" /></th>
            <th>NO.</th>
            <th>主单号</th>
            <th>子单号</th>
            <th>状态</th>
            <th title="确认勘误操作人">确认勘误人</th>
            <th title="确认勘误时间">确认勘误时间</th>
            <th>客户代码</th>
            <th title="勘误前重量">前重量</th>
            <th title="勘误前长(cm)">前长</th>
            <th title="勘误前宽(cm)">前宽</th>
            <th title="勘误前高(cm)">前高</th>
            <th title="勘误前子单计费重">前子计费重</th>
            <th title="勘误前主单计费重">前主计费重</th>
            <th>单位</th>
            <th title="勘误后重量">后重量</th>
            <th title="勘误后长(cm)">后长</th>
            <th title="勘误后宽(cm)">后宽</th>
            <th title="勘误后高(cm)">后高</th>
            <th title="勘误后子单计费重">后子计费重</th>
            <th title="勘误后主单计费重">后主计费重</th>
            <th>勘误备注</th>
            <th>创建人</th>
            <th>创建时间</th>
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

/* ---- 页面逻辑(展开更多 / 全选 / 下载模板 / 批量导入 / 确认勘误 / 查看日志) ---- */
const WeightPage = {
  toggleMore() {
    const el = document.getElementById('wtMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.wt-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 下载模板 */
  downloadTemplate() {
    Helpers.toast('模板下载已开始！(演示)');
  },
  /* 批量导入 */
  batchImport() {
    Helpers.toast('批量导入(占位,待上传文件)');
  },
  /* 确认勘误:勾选 ≤1000,且所选行均须为「待生效」状态,二次确认 */
  confirmFix() {
    const checked = document.querySelectorAll('.wt-grid tbody input[type="checkbox"]:checked');
    if (checked.length === 0) {
      Helpers.toast('请勾选要确认勘误的记录！');
      return;
    }
    if (checked.length > 1000) {
      Helpers.toast(`所选 ${checked.length} 条超过上限 1000 条！`);
      return;
    }
    /* 校验:所选行均须为待生效(状态 0) */
    const invalid = Array.from(checked).filter(c => String(c.dataset.status) !== '0');
    if (invalid.length > 0) {
      Helpers.toast(`所选记录中有 ${invalid.length} 条非"待生效"状态,无法确认勘误！`);
      return;
    }
    const ok = confirm(`确定对已选 ${checked.length} 条待生效记录执行确认勘误,是否继续？`);
    if (!ok) return;
    Helpers.toast('确认勘误成功！(演示)');
  },
  /* 查看日志:必须且仅选中 1 行 */
  viewLog() {
    const selected = document.querySelectorAll('.wt-grid tbody tr.row--selected');
    if (selected.length === 0) {
      Helpers.toast('请选择一条记录！');
      return;
    }
    if (selected.length > 1) {
      Helpers.toast('只能选择一条记录查看日志！');
      return;
    }
    const tr = selected[0];
    const no = tr.dataset.no;
    const row = WT_ROWS.find(r => String(r.no) === String(no));
    Helpers.toast(`查看日志:${row ? row.waybill : '(占位)'}`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b2b-weight',
  activeTab: 'b2b-weight',
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

/* 表格行点击 → 选中态(点复选框/INPUT 不切换选中态) */
document.addEventListener('click', e => {
  const tr = e.target.closest('.wt-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.wt-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
