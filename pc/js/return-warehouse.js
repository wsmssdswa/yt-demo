/* ============================================
   return-warehouse.js — 退仓管理页
   依据:code/pc 生产源码 + 前序需求讨论
     · 表 pt_return_warehouse_tasks / pt_return_warehouse_tasks_business
     · 字段:task_code / biz_code(子单) / waybill_number(主单) / return_reason /
            operation_status(0待到货 1已扫描)
     · 来源:OFP 下发(关务CIS);仓库登记只登记"其他原因"(原因文本自由填)
     · 窗体(新建):列表 + 查询 + [登记退仓] 预登记弹窗 + 日志 + 作废
     · 登记弹窗逻辑在公共模块 return-register.js(订单管理页共用)
   ============================================ */

/* ---- 演示数据(10 行,覆盖三种来源 + 两种状态) ----
   状态:0=待到货(预登记等货) 1=已退仓(PDA扫描完成,一个事务搞定,无中间态)
   source:CIS=关务 WH=仓库登记(兜底单,原因自由填) */
let RW_ROWS = [
  { no:1,  child:'YT2621601300301272U001', waybill:'YT2621601300301272', cust:'CST2621601300101272', source:'CIS', sourceFrom:'OFP下发',
    reason:'申报不符', og:'东腾曼沙项目仓', status:1, statusLabel:'已退仓', batch:true,
    regSt:'关务系统', regTime:'2026-08-03 09:15:00', scanTime:'2026-08-04 19:10:22', scanSt:'庄亚运', scanOg:'东腾曼沙项目仓', logs:[{'t':'2026-08-03 09:15:00','u':'庄亚运','c':'登记退仓,退回原因申报不符','s':'登记','og':'东腾曼沙项目仓'},{'t':'2026-08-04 19:10:22','u':'庄亚运','c':'已发货退仓,PDA扫描收货','s':'扫描','og':'东腾曼沙项目仓'}],
    country:'美国', product:'美森快船-普货', taskCode:'RW20260803001',回流:'已回流', sel:false },
  { no:3,  child:'YT2621601300301227U001', waybill:'YT2621601300301227', cust:'CST2621601300101227', source:'CIS', sourceFrom:'OFP下发',
    reason:'海关抽查', og:'东腾曼沙项目仓', status:1, statusLabel:'已退仓', batch:false,
    regSt:'关务系统', regTime:'2026-08-04 08:30:00', scanTime:'2026-08-04 18:00:15', scanSt:'庄亚运', scanOg:'东腾曼沙项目仓', logs:[{'t':'2026-08-04 08:30:00','u':'庄亚运','c':'登记退仓,退回原因海关抽查','s':'登记','og':'东腾曼沙项目仓'},{'t':'2026-08-04 18:00:15','u':'庄亚运','c':'已发货退仓,PDA扫描收货','s':'扫描','og':'东腾曼沙项目仓'}],
    country:'美国', product:'B2B空运-普货', taskCode:'RW20260804003',回流:'待回流', sel:false },
  { no:5,  child:'YT2621625400300033U001', waybill:'YT2621625400300033', cust:'PH2608030000051', source:'WH', sourceFrom:'仓库预登记',
    reason:'侵权', og:'东腾曼沙项目仓', status:0, statusLabel:'待到货', batch:false,
    regSt:'庄亚运', regTime:'2026-08-05 08:00:00', scanTime:'', scanSt:'', scanOg:'', logs:[{'t':'2026-08-05 08:00:00','u':'庄亚运','c':'登记退仓,退回原因侵权','s':'登记','og':'东腾曼沙项目仓'}],
    country:'美国', product:'B2B空运-带电', taskCode:'CCOS20260805001',回流:'待回流', sel:true },
  { no:6,  child:'YT2621601300101052U001', waybill:'YT2621601300101052', cust:'CST2621601300101052', source:'WH', sourceFrom:'仓库预登记',
    reason:'尾程无法送达', og:'东腾曼沙项目仓', status:0, statusLabel:'待到货', batch:false,
    regSt:'庄亚运', regTime:'2026-08-05 08:30:00', scanTime:'', scanSt:'', scanOg:'', logs:[{'t':'2026-08-05 08:30:00','u':'庄亚运','c':'登记退仓,退回原因尾程无法送达','s':'登记','og':'东腾曼沙项目仓'}],
    country:'美国', product:'美森快船-普货', taskCode:'CCOS20260805002',回流:'待回流', sel:false },
  { no:7,  child:'YT2621601300101037U001', waybill:'YT2621601300101037', cust:'CST2621601300101037', source:'WH', sourceFrom:'仓库预登记',
    reason:'涉动植物', og:'东腾曼沙项目仓', status:0, statusLabel:'待到货', batch:false,
    regSt:'李四', regTime:'2026-08-05 09:00:00', scanTime:'', scanSt:'', scanOg:'', logs:[{'t':'2026-08-05 09:00:00','u':'李四','c':'登记退仓,退回原因涉动植物','s':'登记','og':'东腾曼沙项目仓'}],
    country:'美国', product:'长荣海运-普货', taskCode:'CCOS20260805003',回流:'待回流', sel:false },
  { no:8,  child:'YT2621601300101029U001', waybill:'YT2621601300101029', cust:'CST2621601300101029', source:'CIS', sourceFrom:'OFP下发',
    reason:'特殊布控', og:'东腾曼沙项目仓', status:1, statusLabel:'已退仓', batch:false,
    regSt:'关务系统', regTime:'2026-08-02 14:00:00', scanTime:'2026-08-03 15:20:00', scanSt:'庄亚运', scanOg:'深圳宝安仓', logs:[{'t':'2026-08-02 14:00:00','u':'庄亚运','c':'登记退仓,退回原因特殊布控','s':'登记','og':'东腾曼沙项目仓'},{'t':'2026-08-03 15:20:00','u':'庄亚运','c':'已发货退仓,PDA扫描收货','s':'扫描','og':'深圳宝安仓'}],
    country:'美国', product:'B2B空运-普货', taskCode:'RW20260802008',回流:'已回流', sel:false },
  { no:10, child:'YT2621624300300047U001', waybill:'YT2621624300300047', cust:'CST2621624300300047', source:'CIS', sourceFrom:'OFP下发',
    reason:'涉医疗食品', og:'东腾曼沙项目仓', status:0, statusLabel:'待到货', batch:false,
    regSt:'关务系统', regTime:'2026-08-04 16:00:00', scanTime:'', scanSt:'', scanOg:'', logs:[{'t':'2026-08-04 16:00:00','u':'庄亚运','c':'登记退仓,退回原因涉医疗食品','s':'登记','og':'东腾曼沙项目仓'}],
    country:'美国', product:'美森快船-带电', taskCode:'RW20260804010',回流:'待回流', sel:false },
];

/* ---- 枚举映射 ---- */
const RW_ENUM = {
  /* 退仓主状态(对应 pt_return_warehouse_tasks_business.operation_status) */
  status: {
    0: { label:'待到货', cls:'rw-st--wait' },     // 预登记后等货到(PDA 未扫)
    1: { label:'已退仓', cls:'rw-st--scanned' },   // PDA 扫描完成
  },
  /* 来源(CIS/WH)定义在公共模块 return-register.js 的 RW_SOURCE */
};

/* ---- 查询区 ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">子单号</option><option value="2">主单号</option><option value="3">客户单号</option><option value="4">任务号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="ReturnPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>
      <div class="qp-row qp-more" id="rwMore" style="display:none;">
        ${f('退仓状态', `<select class="sel"><option value="">全部</option><option>待到货</option><option>已退仓</option></select>`)}
        ${f('来源', `<select class="sel"><option value="">全部</option><option>关务</option><option>仓库登记</option></select>`)}
        ${f('登记时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-05 23:59:59" /></span>`)}
        ${f('到货扫描时间', `<span class="qf-range"><input class="ipt ipt--date" value="" placeholder="开始" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="" placeholder="结束" /></span>`)}
        ${f('退回网点', `<input class="ipt" placeholder="选择组织" />`)}
      </div>
    </div>
  `;
}

/* ---- 登记退仓入口:弹窗+校验+结果逻辑全在公共模块 return-register.js ----
   调用 ReturnRegister.open() 打开登记弹窗(本页自由输入模式) */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('➕', '登记退仓', "ReturnRegister.open()")}
      <span class="sep"></span>
      ${btn('🗑', '删除', "ReturnPage.remove()")}
      ${btn('🗒', '查看日志', "ReturnPage.viewLog()")}
    </div>
  `;
}

/* ---- 数据表格 ---- */
function gridTable() {
  const statusTag = s => { const e = RW_ENUM.status[s] || {label:'',cls:''}; return `<span class="rw-tag ${e.cls}">${e.label}</span>`; };
  const sourceTag = src => { const e = RW_SOURCE[src] || {label:'',cls:''}; return `<span class="rw-tag ${e.cls}">${e.label}</span>`; };

  const rows = RW_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td>${statusTag(r.status)}</td>
      <td>${sourceTag(r.source)}</td>
      <td class="col--code cell-link" title="${r.child}">${r.child}</td>
      <td class="col--code">${r.waybill}</td>
      <td class="col--code">${r.cust}</td>
      <td>${r.reason}</td>
      <td class="col--code">${r.source === 'WH' ? '<span style="color:#bbb;">—</span>' : r.taskCode}</td>
      <td>${r.og}</td>
      <td>${r.scanOg || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.regSt}</td>
      <td>${r.regTime}</td>
      <td>${r.scanTime || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.scanSt || '<span style="color:#bbb;">—</span>'}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap rw-grid-wrap">
      <table class="grid rw-grid">
        <colgroup>
          <col style="width:36px" /><col style="width:32px" />
          <col style="width:90px" /><col style="width:80px" />
          <col style="width:185px" /><col style="width:170px" /><col style="width:160px" />
          <col style="width:110px" /><col style="width:150px" />
          <col style="width:120px" /><col style="width:120px" /><col style="width:70px" /><col style="width:140px" />
          <col style="width:140px" /><col style="width:70px" />
        </colgroup>
        <thead><tr>
          <th>NO.</th><th class="col-chk"><input type="checkbox" id="chkAll" onclick="ReturnPage.toggleAll(this)" /></th>
          <th>退仓状态</th><th>来源</th>
          <th>子单号</th><th>主单号</th><th>客户单号</th>
          <th>退仓原因</th><th>任务号</th>
          <th>退回网点</th><th>到货网点</th><th>登记人</th><th>登记时间</th>
          <th>到货扫描时间</th><th>扫描人</th>
        </tr></thead>
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
      <span class="pg-info">总记录数: <b>${RW_ROWS.length}</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go"><input class="ipt" value="" /><button class="pg-btn">GO</button><select class="sel"><option>50</option><option>100</option></select></span>
    </div>
  `;
}

/* ---- 登记退仓弹窗/结果弹窗:在公共模块 return-register.js,本页不重复 ----
   ReturnRegister.open() 动态注入弹窗,交互:填退仓原因文本(兜底只兜"其他原因",
   不选 CIS 原因列表),退回网点只读,确认时统一校验 */

/* ---- 校验模拟数据:在公共模块 return-register.js(RW_EXISTING/RW_INVALID/RW_MASTER_EXPAND) ---- */

/* ---- 页面逻辑 ---- */
const ReturnPage = {
  toggleMore() {
    const el = document.getElementById('rwMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.rw-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  getChecked() {
    return document.querySelectorAll('.rw-grid tbody input[type="checkbox"]:checked');
  },
  requireSelect(action) {
    if (this.getChecked().length === 0) { Helpers.toast('请选择要操作的退仓单！'); return; }
    Helpers.toast(`${action}(占位)`);
  },
  /* 删除:仅"仓库登记 + 待到货(未扫描收货)"的记录可删,防止误登记
     已收货/关务下发的不可删 */
  remove() {
    const checked = this.getChecked();
    if (checked.length === 0) { Helpers.toast('请选择要删除的退仓单！'); return; }
    const nos = [...checked].map(c => +c.closest('tr').dataset.no);
    const targets = RW_ROWS.filter(r => nos.includes(r.no));
    const notDeletable = targets.filter(r => !(r.source === 'WH' && r.status === 0));
    if (notDeletable.length > 0) {
      Helpers.toast('仅仓库登记且待到货的退仓单可删除,已收货/下发的不可删');
      return;
    }
    if (!confirm(`确定删除 ${targets.length} 条仓库登记退仓单?`)) return;
    RW_ROWS = RW_ROWS.filter(r => !nos.includes(r.no));
    /* 重新渲染整页(列表数据已变) */
    document.getElementById('app').innerHTML = Layout.window({
      title: 'Nebula YT-UAT',
      activeLeft: 'return-wh',
      activeTab: 'return-wh',
      tabs: Layout.tabs.standard(),
      content: `
        ${queryPanel()}
        ${gridToolbar()}
        ${gridTable()}
        ${pager()}
      `,
    });
    Helpers.toast(`已删除 ${targets.length} 条仓库登记退仓单`);
  },
  /* 查看日志:展示选中退仓子单的操作日志(登记/扫描)
     对齐线上 frmNote 通用日志窗体:行头序号 + 4 列(操作人/操作时间/操作网点/操作内容)
     (线上操作模块列 Visible=false 隐藏;内容列 HeaderText=操作内容;RowHeaders 显示行号)
     数据维度=子单日志(ChildLog,按 child_number 查,对应退仓列表一行一子单) */
  viewLog() {
    const checked = this.getChecked();
    if (checked.length === 0) { Helpers.toast('请选择要查看日志的退仓单！'); return; }
    if (checked.length > 1) { Helpers.toast('请选择单条退仓单查看日志'); return; }
    const no = +checked[0].closest('tr').dataset.no;
    const r = RW_ROWS.find(x => x.no === no);
    if (!r || !r.logs || r.logs.length === 0) { Helpers.toast('该退仓单暂无日志'); return; }
    const rowsHtml = r.logs.map((l, i) => `
      <tr>
        <td class="col--num">${i + 1}</td>
        <td class="col--code">${l.u}</td>
        <td>${l.t}</td>
        <td>${l.og || '<span style="color:#bbb;">—</span>'}</td>
        <td>${l.c}</td>
      </tr>`).join('');
    const modal = document.createElement('div');
    modal.className = 'rw-modal';
    modal.innerHTML = `
      <div class="rw-modal-mask" onclick="this.parentElement.remove()"></div>
      <div class="rw-modal-panel rw-modal-panel--wide">
        <div class="rw-modal-header">
          <span class="rw-modal-title">操作日志 · ${r.child}</span>
          <span class="rw-modal-close" onclick="this.closest('.rw-modal').remove()">✕</span>
        </div>
        <div class="rw-modal-body">
          <table class="grid rw-log-grid" style="width:100%;">
            <thead><tr><th>NO.</th><th>操作人</th><th>操作时间</th><th>操作网点</th><th>操作内容</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="rw-modal-footer">
          <button class="btn btn--primary" onclick="this.closest('.rw-modal').remove()">关闭</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },
  /* 登记退仓:弹窗+校验+结果逻辑在公共模块 return-register.js,调 ReturnRegister.open() */
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'return-wh',
  activeTab: 'return-wh',
  tabs: Layout.tabs.standard(),
  content: `
    ${queryPanel()}
    ${gridToolbar()}
    ${gridTable()}
    ${pager()}
  `,
});

Helpers.startClock();

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.rw-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.rw-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
