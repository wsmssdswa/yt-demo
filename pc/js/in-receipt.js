/* ============================================
   in-receipt.js — 入仓单记录页
   依据:code/pc 生产源码
     · 列表模型 ListWarehouseReceiptItemDto(20 列,见 [DataColumn] 标注)
       PDF地址 / 照片地址 均为链接;照片状态 0未传/1已传
     · 查询条件:单号类型(1入仓单/2运单)+单号(必填≤500)
                 +时间类型(1打印/2上传)+时间范围+预入仓+照片上传网点+照片状态+客服
     · 窗体按钮:查询 | 上传照片(选中,已传则提示用修改)
                       | 修改照片(选中,未传则提示用上传)
                       | 查看日志(选中) | 提示配置
     · 枚举 PhotoStatus(0未传/1已传)
   ============================================ */

/* ---- 演示数据(8 行,覆盖已传/未传照片、件数一致/不一致) ---- */
const RECEIPT_ROWS = [
  { no:1,  rcNo:'WR20260804001', waybill:'YT2621601300301272', cust:'CST2621601300101272', cs:'客服A', pre:'是', preTime:'2026-08-03 10:00:00',
    tickets:5,  pcs:120, wt:185.50, vol:1.420, pdf:'/pdf/WR20260804001.pdf', printTime:'2026-08-04 09:15:00',
    photoSt:1, photoStLabel:'已传', photo:'/photo/WR20260804001.zip', upTime:'2026-08-04 19:10:00', opSt:'张三', og:'东腾曼沙项目仓', match:1, matchLabel:'一致', real:120, remark:'', sel:false },
  { no:2,  rcNo:'WR20260804002', waybill:'YT2621601300301249', cust:'CST2621601300301249', cs:'客服A', pre:'是', preTime:'2026-08-03 11:00:00',
    tickets:3,  pcs:88,  wt:120.30, vol:0.880, pdf:'/pdf/WR20260804002.pdf', printTime:'2026-08-04 09:30:00',
    photoSt:1, photoStLabel:'已传', photo:'/photo/WR20260804002.zip', upTime:'2026-08-04 19:05:10', opSt:'张三', og:'东腾曼沙项目仓', match:0, matchLabel:'不一致', real:85, remark:'少到 3 件,在途', sel:true },
  { no:3,  rcNo:'WR20260804003', waybill:'YT2621601300301227', cust:'CST2621601300101227', cs:'客服B', pre:'否', preTime:'',
    tickets:8,  pcs:200, wt:520.00, vol:3.600, pdf:'/pdf/WR20260804003.pdf', printTime:'2026-08-04 10:00:00',
    photoSt:0, photoStLabel:'未传', photo:'', upTime:'', opSt:'李四', og:'东腾曼沙项目仓', match:1, matchLabel:'一致', real:200, remark:'', sel:false },
  { no:4,  rcNo:'WR20260804004', waybill:'YT2621601300301201', cust:'CST2621601300101201', cs:'客服B', pre:'是', preTime:'2026-08-03 14:00:00',
    tickets:2,  pcs:45,  wt:380.20, vol:2.700, pdf:'/pdf/WR20260804004.pdf', printTime:'2026-08-04 11:20:00',
    photoSt:0, photoStLabel:'未传', photo:'', upTime:'', opSt:'李四', og:'东腾曼沙项目仓', match:0, matchLabel:'不一致', real:40, remark:'破损少件 5', sel:false },
  { no:5,  rcNo:'WR20260803005', waybill:'YT2621625400300033', cust:'PH2608030000051', cs:'客服A', pre:'是', preTime:'2026-08-02 09:00:00',
    tickets:10, pcs:300, wt:680.00, vol:4.500, pdf:'/pdf/WR20260803005.pdf', printTime:'2026-08-03 08:30:00',
    photoSt:1, photoStLabel:'已传', photo:'/photo/WR20260803005.zip', upTime:'2026-08-03 18:00:00', opSt:'张三', og:'东腾曼沙项目仓', match:1, matchLabel:'一致', real:300, remark:'', sel:true },
  { no:6,  rcNo:'WR20260803006', waybill:'YT2621601300101052', cust:'CST2621601300101052', cs:'客服C', pre:'否', preTime:'',
    tickets:6,  pcs:156, wt:210.40, vol:1.560, pdf:'/pdf/WR20260803006.pdf', printTime:'2026-08-03 09:00:00',
    photoSt:1, photoStLabel:'已传', photo:'/photo/WR20260803006.zip', upTime:'2026-08-03 16:30:00', opSt:'李四', og:'东腾曼沙项目仓', match:1, matchLabel:'一致', real:156, remark:'', sel:false },
  { no:7,  rcNo:'WR20260802007', waybill:'YT2621601300101037', cust:'CST2621601300101037', cs:'客服C', pre:'是', preTime:'2026-08-01 15:00:00',
    tickets:4,  pcs:72,  wt:160.50, vol:1.080, pdf:'/pdf/WR20260802007.pdf', printTime:'2026-08-02 14:00:00',
    photoSt:0, photoStLabel:'未传', photo:'', upTime:'', opSt:'张三', og:'东腾曼沙项目仓', match:1, matchLabel:'一致', real:72, remark:'', sel:false },
  { no:8,  rcNo:'WR20260802008', waybill:'YT2621601300101029', cust:'CST2621601300101029', cs:'客服A', pre:'是', preTime:'2026-08-01 08:00:00',
    tickets:20, pcs:500, wt:1250.00, vol:8.400, pdf:'/pdf/WR20260802008.pdf', printTime:'2026-08-02 09:00:00',
    photoSt:1, photoStLabel:'已传', photo:'/photo/WR20260802008.zip', upTime:'2026-08-02 17:45:00', opSt:'李四', og:'东腾曼沙项目仓', match:0, matchLabel:'不一致', real:498, remark:'少到 2 件', sel:false },
];

/* ---- 枚举映射 ---- */
const RECEIPT_ENUM = {
  /* 照片状态 PhotoStatus */
  photoSt: {
    0: { label:'未传', cls:'check-status--pending' },
    1: { label:'已传', cls:'check-status--ok' },
  },
  /* 实到件数是否一致 */
  match: {
    1: { label:'一致', cls:'check-match--ok' },
    0: { label:'不一致', cls:'check-match--fail' },
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
        ${f('单号类型', `<select class="sel"><option value="1">入仓单号</option><option value="2">运单号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 500 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="ReceiptPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="receiptMore" style="display:none;">
        ${f('时间类型', `<select class="sel"><option value="1">打印时间</option><option value="2">上传时间</option></select>`)}
        ${f('时间范围', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('预入仓', `<select class="sel"><option value="">全部</option><option value="1">是</option><option value="0">否</option></select>`)}
        ${f('照片上传网点', `<input class="ipt" placeholder="选择组织" />`)}
        ${f('照片状态', `<select class="sel"><option value="">全部</option><option value="0">未传</option><option value="1">已传</option></select>`)}
        ${f('客服', `<input class="ipt" />`)}
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
      ${btn('📷', '上传照片', "ReceiptPage.uploadPhoto()")}
      ${btn('✏', '修改照片', "ReceiptPage.modifyPhoto()")}
      <span class="sep"></span>
      ${btn('🗒', '查看日志', "ReceiptPage.requireSelect('查看日志')")}
      <span class="sep"></span>
      ${btn('⚙', '提示配置', "Helpers.toast('提示配置(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(20 列,严格对应 ListWarehouseReceiptItemDto 的 [DataColumn]) ---- */
function gridTable() {
  /* 照片状态标签 */
  const photoTag = s => {
    const e = RECEIPT_ENUM.photoSt[s] || { label:'', cls:'' };
    return `<span class="check-tag ${e.cls}">${e.label}</span>`;
  };
  /* 一致性标签 */
  const matchTag = m => {
    const e = RECEIPT_ENUM.match[m] || { label:'', cls:'' };
    return `<span class="check-match ${e.cls}">${e.label}</span>`;
  };
  /* PDF 链接 */
  const pdfLink = r => `<a href="javascript:void(0)" class="cell-link" onclick="ReceiptPage.openPdf('${r.rcNo}')">查看PDF</a>`;
  /* 照片链接 */
  const photoLink = r => r.photoSt === 1
    ? `<a href="javascript:void(0)" class="cell-link" onclick="ReceiptPage.openPhoto('${r.rcNo}')">查看照片</a>`
    : '<span style="color:#bbb;">—</span>';

  const rows = RECEIPT_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td class="col--code">${r.rcNo}</td>
      <td class="col--code">${r.waybill}</td>
      <td class="col--code">${r.cust}</td>
      <td>${r.cs}</td>
      <td>${r.pre}</td>
      <td>${r.preTime || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--num">${r.tickets}</td>
      <td class="col--num">${r.pcs}</td>
      <td class="col--num">${r.wt}</td>
      <td class="col--num">${r.vol}</td>
      <td>${pdfLink(r)}</td>
      <td>${r.printTime || '<span style="color:#bbb;">—</span>'}</td>
      <td>${photoTag(r.photoSt)}</td>
      <td>${photoLink(r)}</td>
      <td>${r.upTime || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.opSt}</td>
      <td>${r.og}</td>
      <td>${matchTag(r.match)}</td>
      <td class="col--num ${r.match === 0 ? 'check-err' : ''}">${r.real}</td>
      <td class="${r.remark ? 'check-remark' : ''}">${r.remark || '<span style="color:#bbb;">—</span>'}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap receipt-grid-wrap">
      <table class="grid receipt-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:150px" />  <!-- 入仓单号 -->
          <col style="width:160px" />  <!-- 主单号 -->
          <col style="width:160px" />  <!-- 客户代码 -->
          <col style="width:70px" />   <!-- 客服 -->
          <col style="width:60px" />   <!-- 预入仓 -->
          <col style="width:140px" />  <!-- 预计入仓时间 -->
          <col style="width:60px" />   <!-- 总票数 -->
          <col style="width:60px" />   <!-- 总件数 -->
          <col style="width:80px" />   <!-- 总重量 -->
          <col style="width:70px" />   <!-- 总方数 -->
          <col style="width:80px" />   <!-- PDF地址 -->
          <col style="width:140px" />  <!-- 打印时间 -->
          <col style="width:60px" />   <!-- 照片状态 -->
          <col style="width:80px" />   <!-- 照片地址 -->
          <col style="width:140px" />  <!-- 上传时间 -->
          <col style="width:70px" />   <!-- 操作人 -->
          <col style="width:130px" />  <!-- 操作网点 -->
          <col style="width:80px" />   <!-- 实到件数是否一致 -->
          <col style="width:70px" />   <!-- 实到件数 -->
          <col style="width:160px" />  <!-- 备注 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="ReceiptPage.toggleAll(this)" /></th>
            <th>入仓单号</th>
            <th>主单号</th>
            <th>客户代码</th>
            <th>客服</th>
            <th>预入仓</th>
            <th>预计入仓时间</th>
            <th>总票数</th>
            <th>总件数</th>
            <th title="总重量(kg)">总重量</th>
            <th title="总方数(m³)">总方数</th>
            <th>PDF地址</th>
            <th>打印时间</th>
            <th>照片状态</th>
            <th>照片地址</th>
            <th>上传时间</th>
            <th>操作人</th>
            <th>操作网点</th>
            <th>实到件数是否一致</th>
            <th>实到件数</th>
            <th>备注</th>
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

/* ---- 页面逻辑(展开更多/全选/上传·修改照片/查看日志/PDF·照片) ---- */
const ReceiptPage = {
  toggleMore() {
    const el = document.getElementById('receiptMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.receipt-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 取选中行数据(校验单选) */
  _getSelected() {
    const checked = document.querySelectorAll('.receipt-grid tbody input[type="checkbox"]:checked');
    if (checked.length === 0) {
      Helpers.toast('请选择一行！');
      return null;
    }
    if (checked.length > 1) {
      Helpers.toast('只能选择一行！');
      return null;
    }
    const tr = checked[0].closest('tr');
    const no = Number(tr.dataset.no);
    return RECEIPT_ROWS.find(x => x.no === no);
  },
  /* 上传照片:选中行若已传则提示用修改 */
  uploadPhoto() {
    const r = this._getSelected();
    if (!r) return;
    if (r.photoSt === 1) {
      Helpers.toast('该入仓单已上传照片,请使用「修改照片」！');
      return;
    }
    Helpers.toast(`上传照片:${r.rcNo}(演示)`);
  },
  /* 修改照片:选中行若未传则提示用上传 */
  modifyPhoto() {
    const r = this._getSelected();
    if (!r) return;
    if (r.photoSt === 0) {
      Helpers.toast('该入仓单未上传照片,请使用「上传照片」！');
      return;
    }
    Helpers.toast(`修改照片:${r.rcNo}(演示)`);
  },
  /* 查看日志:选中 1 行 */
  requireSelect(label) {
    const r = this._getSelected();
    if (!r) return;
    Helpers.toast(`${label}:${r.rcNo}(演示)`);
  },
  /* PDF 链接 */
  openPdf(rcNo) {
    Helpers.toast(`打开 PDF:${rcNo}(演示)`);
  },
  /* 照片链接 */
  openPhoto(rcNo) {
    Helpers.toast(`查看照片:${rcNo}(演示)`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'in-receipt',
  activeTab: 'in-receipt',
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
  const tr = e.target.closest('.receipt-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
  document.querySelectorAll('.receipt-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
