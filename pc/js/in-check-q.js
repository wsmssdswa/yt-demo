/* ============================================
   in-check-q.js — 签入查询页
   依据:code/pc 生产源码
     · 列表模型 CheckInQueryInfoViewItem(19 列,见 [DataColumn] 标注)
       序8 = 长/宽/高/称重重量/材积重/方数(共 6 个尺寸列,统称"材积信息组")
     · 查询条件:单号(必填≤500)+单号类型(1运单/2子单/3客户)
                 +时间类型(仅操作时间)+时间范围+销售产品+服务渠道+客户代码
     · 窗体按钮:查询 | 材积信息(选中 1 行,默认隐藏)
     · 枚举 CheckInOperationType(操作类型) / CheckInStatus(签入状态)
   ============================================ */

/* ---- 演示数据(8 行,覆盖正常签入/无预报/异常等) ---- */
const CHECKQ_ROWS = [
  { no:1,  no1:'YT2621601300301272', no2:'YT2621601300301272U001', match:'YT2621601300301272U001', opType:1, opTypeLabel:'签入',
    product:'美森快船-普货', channel:'美森正班', carrier:'纵腾网络', len:32, wid:24, hig:18, wt:1.85, volWt:2.30, vol:0.014,
    batch:'CI20260804001', status:1, statusLabel:'成功', err:'', cost:'00:00:03',
    opSt:'张三', og:'东腾曼沙项目仓', opTime:'2026-08-04 18:53:17', ip:'10.18.32.51', mac:'A4-1F-72-B8-09-CC', sortCode:'LAX-A-12', sel:false },
  { no:2,  no1:'YT2621601300301249', no2:'YT2621601300301249U002', match:'YT2621601300301249U002', opType:1, opTypeLabel:'签入',
    product:'美森快船-带电', channel:'美森加班', carrier:'纵腾网络', len:40, wid:30, hig:25, wt:3.20, volWt:5.00, vol:0.030,
    batch:'CI20260804001', status:1, statusLabel:'成功', err:'', cost:'00:00:02',
    opSt:'张三', og:'东腾曼沙项目仓', opTime:'2026-08-04 18:46:37', ip:'10.18.32.51', mac:'A4-1F-72-B8-09-CC', sortCode:'LAX-B-04', sel:true },
  { no:3,  no1:'YT2621601300301227', no2:'YT2621601300301227U001', match:'YT2621601300301227U001', opType:2, opTypeLabel:'复秤',
    product:'B2B空运-普货', channel:'B2B空运直飞', carrier:'云途物流', len:25, wid:18, hig:12, wt:0.95, volWt:0.90, vol:0.005,
    batch:'CI20260804002', status:1, statusLabel:'成功', err:'', cost:'00:00:04',
    opSt:'李四', og:'东腾曼沙项目仓', opTime:'2026-08-04 17:47:52', ip:'10.18.32.52', mac:'B8-27-EB-1A-55-D0', sortCode:'LAX-C-21', sel:false },
  { no:4,  no1:'YT2621601300301201', no2:'YT2621601300301201U001', match:'YT2621601300301201U001', opType:1, opTypeLabel:'签入',
    product:'以星快船-普货', channel:'以星EXX', carrier:'纵腾网络', len:50, wid:40, hig:30, wt:8.50, volWt:10.00, vol:0.060,
    batch:'CI20260804002', status:2, statusLabel:'失败', err:'W203 重量超限(>70kg)', cost:'00:00:05',
    opSt:'李四', og:'东腾曼沙项目仓', opTime:'2026-08-04 17:45:35', ip:'10.18.32.52', mac:'B8-27-EB-1A-55-D0', sortCode:'', sel:false },
  { no:5,  no1:'YT2621625400300033', no2:'YT2621625400300033U001', match:'YT2621625400300033U001', opType:1, opTypeLabel:'签入',
    product:'B2B空运-带电', channel:'B2B空运直飞', carrier:'云途物流', len:30, wid:22, hig:15, wt:1.60, volWt:1.65, vol:0.010,
    batch:'CI20260804003', status:1, statusLabel:'成功', err:'', cost:'00:00:02',
    opSt:'张三', og:'东腾曼沙项目仓', opTime:'2026-08-04 20:23:34', ip:'10.18.32.51', mac:'A4-1F-72-B8-09-CC', sortCode:'LAX-A-08', sel:true },
  { no:6,  no1:'YT2621601300101052', no2:'YT2621601300101052U001', match:'YT2621601300101052U001', opType:3, opTypeLabel:'材积复核',
    product:'美森快船-普货', channel:'美森正班', carrier:'纵腾网络', len:35, wid:26, hig:20, wt:2.10, volWt:3.03, vol:0.018,
    batch:'CI20260804003', status:1, statusLabel:'成功', err:'', cost:'00:00:06',
    opSt:'李四', og:'东腾曼沙项目仓', opTime:'2026-08-04 17:09:33', ip:'10.18.32.52', mac:'B8-27-EB-1A-55-D0', sortCode:'LAX-B-15', sel:false },
  { no:7,  no1:'YT2621601300101037', no2:'YT2621601300101037U001', match:'YT2621601300101037U001', opType:1, opTypeLabel:'签入',
    product:'长荣海运-普货', channel:'长荣海运', carrier:'递四方', len:42, wid:32, hig:28, wt:5.40, volWt:6.27, vol:0.038,
    batch:'CI20260804004', status:2, statusLabel:'失败', err:'W205 子单号不存在', cost:'00:00:01',
    opSt:'张三', og:'东腾曼沙项目仓', opTime:'2026-08-04 16:50:30', ip:'10.18.32.51', mac:'A4-1F-72-B8-09-CC', sortCode:'', sel:false },
  { no:8,  no1:'YT2621601300101029', no2:'YT2621601300101029U001', match:'YT2621601300101029U001', opType:1, opTypeLabel:'签入',
    product:'B2B空运-普货', channel:'B2B空运直飞', carrier:'云途物流', len:28, wid:20, hig:14, wt:1.20, volWt:1.31, vol:0.008,
    batch:'CI20260804004', status:1, statusLabel:'成功', err:'', cost:'00:00:03',
    opSt:'李四', og:'东腾曼沙项目仓', opTime:'2026-08-04 16:49:12', ip:'10.18.32.52', mac:'B8-27-EB-1A-55-D0', sortCode:'LAX-C-09', sel:false },
];

/* ---- 枚举映射 ---- */
const CHECKQ_ENUM = {
  /* 签入状态 CheckInStatus */
  status: {
    1: { label:'成功', cls:'check-status--ok' },
    2: { label:'失败', cls:'check-status--fail' },
  },
  /* 操作类型 CheckInOperationType */
  opType: {
    1:'签入', 2:'复秤', 3:'材积复核',
  },
};

/* ---- 查询区(对应签入查询的筛选项) ----
   布局:字段纵向(label 上、控件下),与异常订单页统一。
   主行默认只显示「单号类型 + 单号 + 查询/更多条件按钮」,其余进更多条件 */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:只留单号类型 + 单号 + 按钮 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">子单号</option><option value="3">客户单号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 500 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="CheckQPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="checkQMore" style="display:none;">
        ${f('时间范围', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('销售产品', `<input class="ipt" />`)}
        ${f('服务渠道', `<input class="ipt" />`)}
        ${f('客户代码', `<input class="ipt" placeholder="客户代码" />`)}
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
      ${btn('📐', '材积信息', "CheckQPage.showVolInfo()")}
    </div>
  `;
}

/* ---- 数据表格(19 列,严格对应 CheckInQueryInfoViewItem 的 [DataColumn]) ---- */
function gridTable() {
  /* 状态标签 */
  const statusTag = s => {
    const e = CHECKQ_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="check-tag ${e.cls}">${e.label}</span>`;
  };

  const rows = CHECKQ_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td class="col--code">${r.no1}</td>
      <td class="col--code">${r.no2}</td>
      <td class="col--code">${r.match}</td>
      <td>${r.opTypeLabel}</td>
      <td>${r.product}</td>
      <td>${r.channel}</td>
      <td>${r.carrier}</td>
      <td class="col--num">${r.len}</td>
      <td class="col--num">${r.wid}</td>
      <td class="col--num">${r.hig}</td>
      <td class="col--num">${r.wt}</td>
      <td class="col--num">${r.volWt}</td>
      <td class="col--num">${r.vol}</td>
      <td class="col--code">${r.batch}</td>
      <td>${statusTag(r.status)}</td>
      <td class="${r.err ? 'check-err' : ''}">${r.err || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--num">${r.cost}</td>
      <td>${r.opSt}</td>
      <td>${r.og}</td>
      <td>${r.opTime}</td>
      <td class="col--code">${r.ip}</td>
      <td class="col--code">${r.mac}</td>
      <td class="col--code">${r.sortCode || '<span style="color:#bbb;">—</span>'}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap check-grid-wrap">
      <table class="grid check-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:160px" />  <!-- 单号1 -->
          <col style="width:190px" />  <!-- 单号2 -->
          <col style="width:190px" />  <!-- 匹配单号 -->
          <col style="width:80px" />   <!-- 操作类型 -->
          <col style="width:130px" />  <!-- 销售产品 -->
          <col style="width:110px" />  <!-- 服务渠道 -->
          <col style="width:100px" />  <!-- 服务商 -->
          <col style="width:50px" />   <!-- 长 -->
          <col style="width:50px" />   <!-- 宽 -->
          <col style="width:50px" />   <!-- 高 -->
          <col style="width:70px" />   <!-- 称重重量 -->
          <col style="width:70px" />   <!-- 材积重 -->
          <col style="width:60px" />   <!-- 方数 -->
          <col style="width:140px" />  <!-- 签入批次 -->
          <col style="width:60px" />   <!-- 签入状态 -->
          <col style="width:180px" />  <!-- 错误信息 -->
          <col style="width:70px" />   <!-- 耗时 -->
          <col style="width:70px" />   <!-- 操作人 -->
          <col style="width:130px" />  <!-- 操作网点 -->
          <col style="width:140px" />  <!-- 操作时间 -->
          <col style="width:110px" />  <!-- 操作人IP -->
          <col style="width:140px" />  <!-- 操作人MAC -->
          <col style="width:110px" />  <!-- B2B主单预分拣码 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="CheckQPage.toggleAll(this)" /></th>
            <th>单号1</th>
            <th>单号2</th>
            <th>匹配单号</th>
            <th>操作类型</th>
            <th>销售产品</th>
            <th>服务渠道</th>
            <th>服务商</th>
            <th title="长(cm)">长</th>
            <th title="宽(cm)">宽</th>
            <th title="高(cm)">高</th>
            <th title="称重重量(kg)">称重重量</th>
            <th title="材积重(kg)">材积重</th>
            <th title="方数(m³)">方数</th>
            <th>签入批次</th>
            <th>签入状态</th>
            <th>错误信息</th>
            <th>耗时</th>
            <th>操作人</th>
            <th>操作网点</th>
            <th>操作时间</th>
            <th>操作人IP</th>
            <th>操作人MAC</th>
            <th>B2B主单预分拣码</th>
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

/* ---- 页面逻辑(展开更多/全选/材积信息) ---- */
const CheckQPage = {
  toggleMore() {
    const el = document.getElementById('checkQMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.check-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 材积信息:需选中 1 行 */
  showVolInfo() {
    const checked = document.querySelectorAll('.check-grid tbody input[type="checkbox"]:checked');
    if (checked.length === 0) {
      Helpers.toast('请选择一行查看材积信息！');
      return;
    }
    if (checked.length > 1) {
      Helpers.toast('只能选择一行查看材积信息！');
      return;
    }
    Helpers.toast('材积信息(演示,选中行尺寸详情)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'in-check-q',
  activeTab: 'in-check-q',
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
  const tr = e.target.closest('.check-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.check-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
