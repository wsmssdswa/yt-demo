/* ============================================
   b2b-order.js — B2B 订单管理页
   依据:code/pc 生产源码
     · 列表模型 OrderListItemDto(挑主线 19 列展示,字段全来自此类)
     · 查询条件 ListOrderInput(单号/单号类型/时间/日期类型/产品/渠道/客户/揽收/订单/库操/网点/分批/尾程/换单)
     · 结算模式:客户级属性,取 csi_customer.settlement_type(枚举 S票结/P预付/H半月结/M月结/C现结/W周结,CRM 事件总线同步),
       订单列表按 customer_code 实时关联,同一客户所有订单同值,未同步客户显示 —
     · 窗体 FrmOrderManage(按钮:订单信息/箱号信息/日志/导出/扣件/打印/导出材料明细/确认换单/列表配置/修改材积/服务商标签)
     · 枚举 OrderStatus/OrderOperateStatus/CollectionStatus/OrderChangeMarkType/CheckInStatus/OrderTransferStatus/LastMileMode
   ============================================ */

/* ---- 演示数据(10 行,覆盖各种订单/库操/换单/调拨状态) ---- */
const ORD_ROWS = [
  { no:1,  waybill:'YT2621601300301272', cust:'CST2621601300101272', settle:'月结', b2b:'B2B260804001', track:'20260804185331460', oType:'海运拼柜', oStatus:2, oStatusLabel:'已确认', swap:1, swapLabel:'待换单',
    opStatus:4, opStatusLabel:'已发货', collect:1, collectLabel:'已揽收', pieces:5, checkin:5, weight:128.5, cWeight:135.2, country:'美国', product:'美森快船-普货', channel:'美森正班',
    lastMile:'卡派', batch:false, transfer:0, transferLabel:'未调拨', checkinOg:'东腾曼沙项目仓', created:'2026-08-04 18:53:17', checkinTime:'2026-08-04 19:10:22', sel:false },
  { no:2,  waybill:'YT2621601300301249', cust:'CST2621601300301249', settle:'票结', b2b:'B2B260804002', track:'20260804184711458', oType:'海运整柜', oStatus:2, oStatusLabel:'已确认', swap:2, swapLabel:'已换单',
    opStatus:2, opStatusLabel:'已上架', collect:1, collectLabel:'已揽收', pieces:10, checkin:10, weight:520.0, cWeight:531.8, country:'美国', product:'美森快船-带电', channel:'美森加班',
    lastMile:'卡派', batch:false, transfer:0, transferLabel:'未调拨', checkinOg:'东腾曼沙项目仓', created:'2026-08-04 18:46:37', checkinTime:'2026-08-04 19:05:10', sel:true },
  { no:3,  waybill:'YT2621601300301227', cust:'CST2621601300101227', settle:'预付', b2b:'B2B260804003', track:'20260804174758428', oType:'空运', oStatus:2, oStatusLabel:'已确认', swap:0, swapLabel:'无需换单',
    opStatus:2, opStatusLabel:'已上架', collect:1, collectLabel:'已揽收', pieces:3, checkin:3, weight:45.2, cWeight:48.0, country:'美国', product:'B2B空运-普货', channel:'B2B空运直飞',
    lastMile:'快递', batch:false, transfer:0, transferLabel:'未调拨', checkinOg:'东腾曼沙项目仓', created:'2026-08-04 17:47:52', checkinTime:'2026-08-04 18:00:15', sel:false },
  { no:4,  waybill:'YT2621601300301201', cust:'CST2621601300101272', settle:'月结', b2b:'B2B260804004', track:'20260804174546426', oType:'海运拼柜', oStatus:2, oStatusLabel:'已确认', swap:1, swapLabel:'待换单',
    opStatus:1, opStatusLabel:'已入库', collect:1, collectLabel:'已揽收', pieces:8, checkin:8, weight:312.6, cWeight:0, country:'美国', product:'以星快船-普货', channel:'以星EXX',
    lastMile:'卡派', batch:true, transfer:0, transferLabel:'未调拨', checkinOg:'东腾曼沙项目仓', created:'2026-08-04 17:45:35', checkinTime:'2026-08-04 17:50:40', sel:true },
  { no:5,  waybill:'YT2621625400300033', cust:'PH2608030000051',     settle:'周结', b2b:'B2B260803005', track:'20260804202334515', oType:'空运', oStatus:2, oStatusLabel:'已确认', swap:2, swapLabel:'已换单',
    opStatus:4, opStatusLabel:'已发货', collect:1, collectLabel:'已揽收', pieces:5, checkin:5, weight:88.3, cWeight:92.5, country:'美国', product:'B2B空运-带电', channel:'B2B空运直飞',
    lastMile:'快递', batch:false, transfer:2, transferLabel:'全部调拨中', checkinOg:'东腾曼沙项目仓', created:'2026-08-03 17:22:33', checkinTime:'2026-08-03 17:30:00', sel:true },
  { no:6,  waybill:'YT2621601300101052', cust:'CST2621601300101052', settle:'现结', b2b:'B2B260803006', track:'20260804170933405', oType:'海运拼柜', oStatus:1, oStatusLabel:'已预报', swap:0, swapLabel:'无需换单',
    opStatus:0, opStatusLabel:'待入库', collect:2, collectLabel:'待揽收', pieces:6, checkin:0, weight:0, cWeight:0, country:'美国', product:'美森快船-普货', channel:'美森正班',
    lastMile:'卡派', batch:false, transfer:0, transferLabel:'未调拨', checkinOg:'', created:'2026-08-03 17:09:27', checkinTime:'', sel:false },
  { no:7,  waybill:'YT2621601300101037', cust:'CST2621601300101037', settle:'半月结', b2b:'B2B260803007', track:'20260804165039388', oType:'海运整柜', oStatus:2, oStatusLabel:'已确认', swap:2, swapLabel:'已换单',
    opStatus:3, opStatusLabel:'已拣货', collect:1, collectLabel:'已揽收', pieces:4, checkin:4, weight:240.0, cWeight:245.5, country:'美国', product:'长荣海运-普货', channel:'长荣海运',
    lastMile:'卡派', batch:false, transfer:1, transferLabel:'部分调拨中', checkinOg:'东腾曼沙项目仓', created:'2026-08-03 16:50:30', checkinTime:'2026-08-03 17:00:12', sel:false },
  { no:8,  waybill:'YT2621601300101029', cust:'CST2621601300101029', settle:'', b2b:'B2B260803008', track:'20260804164912386', oType:'空运', oStatus:3, oStatusLabel:'已取消', swap:0, swapLabel:'无需换单',
    opStatus:0, opStatusLabel:'待入库', collect:3, collectLabel:'揽收失败', pieces:2, checkin:0, weight:0, cWeight:0, country:'美国', product:'B2B空运-普货', channel:'B2B空运直飞',
    lastMile:'快递', batch:false, transfer:0, transferLabel:'未调拨', checkinOg:'', created:'2026-08-03 16:49:07', checkinTime:'', sel:false },
  { no:9,  waybill:'YT2621625700100026', cust:'CST2621625700100026', settle:'票结', b2b:'B2B260803009', track:'20260804152619320', oType:'卡航', oStatus:2, oStatusLabel:'已确认', swap:1, swapLabel:'待换单',
    opStatus:2, opStatusLabel:'已上架', collect:1, collectLabel:'已揽收', pieces:2, checkin:2, weight:65.8, cWeight:68.0, country:'德国', product:'中欧卡航-普货', channel:'中欧卡航',
    lastMile:'卡派', batch:false, transfer:0, transferLabel:'未调拨', checkinOg:'东腾曼沙项目仓', created:'2026-08-04 15:26:12', checkinTime:'2026-08-04 15:30:00', sel:false },
  { no:10, waybill:'YT2621624300300047', cust:'CST2621624300300047', settle:'月结', b2b:'B2B260803010', track:'20260804151659306', oType:'海运拼柜', oStatus:4, oStatusLabel:'已退件', swap:0, swapLabel:'无需换单',
    opStatus:5, opStatusLabel:'已退件', collect:1, collectLabel:'已揽收', pieces:3, checkin:3, weight:95.2, cWeight:0, country:'美国', product:'美森快船-带电', channel:'美森正班',
    lastMile:'卡派', batch:false, transfer:0, transferLabel:'未调拨', checkinOg:'东腾曼沙项目仓', created:'2026-08-03 15:16:54', checkinTime:'2026-08-03 15:20:00', sel:false },
];

/* ---- 枚举映射(来自代码枚举的 [Description]) ---- */
const ORD_ENUM = {
  /* 订单状态 OrderStatus */
  oStatus: {
    1: { label:'已预报', cls:'ord-o--forecast' },
    2: { label:'已确认', cls:'ord-o--confirm' },
    3: { label:'已取消', cls:'ord-o--cancel' },
    4: { label:'已退件', cls:'ord-o--return' },
  },
  /* 库内操作状态 OrderOperateStatus */
  opStatus: {
    0: { label:'待入库', cls:'ord-op--wait' },
    1: { label:'已入库', cls:'ord-op--in' },
    2: { label:'已上架', cls:'ord-op--shelf' },
    3: { label:'已拣货', cls:'ord-op--pick' },
    4: { label:'已发货', cls:'ord-op--ship' },
    5: { label:'已退件', cls:'ord-op--return' },
  },
  /* 换单 OrderChangeMarkType */
  swap: {
    0: { label:'无需换单', cls:'ord-swap--none' },
    1: { label:'待换单',   cls:'ord-swap--todo' },
    2: { label:'已换单',   cls:'ord-swap--done' },
  },
  /* 调拨状态 OrderTransferStatus */
  transfer: {
    0: { label:'未调拨',     cls:'ord-tf--none' },
    1: { label:'部分调拨中', cls:'ord-tf--part' },
    2: { label:'全部调拨中', cls:'ord-tf--all' },
  },
};

/* ---- 查询区(对应 ListOrderInput) ----
   布局:字段纵向(label 上、控件下)。
   主行默认只显示「单号类型 + 单号 + 查询/更多条件按钮」,其余进更多条件 */
function queryPanel() {
  /* 单个字段:label 在上、控件在下 */
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:只留单号类型 + 单号 + 按钮 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">客户单号</option><option value="4">平台单号</option><option value="5">子单号</option><option value="6">箱号</option><option value="7">B2B订单号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 5000 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="OrderPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多条件(默认隐藏) -->
      <div class="qp-row qp-more" id="ordMore" style="display:none;">
        ${f('时间', `<span class="qf-time"><select class="sel sel--inline"><option value="1">创建时间</option><option value="2" selected>首次签入时间</option><option value="3">计费签入时间</option><option value="4">费用确认时间</option><option value="5">揽收时间</option><option value="6">上架时间(首仓)</option></select><span class="qf-range"><input class="ipt ipt--date" value="2026-08-04" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span></span>`)}
        ${f('客户代码', `<input class="ipt" placeholder="多个换行分隔" />`)}
        ${f('结算模式', `<select class="sel"><option value="">全部</option><option value="S">票结</option><option value="P">预付</option><option value="H">半月结</option><option value="M">月结</option><option value="C">现结</option><option value="W">周结</option></select>`)}
        ${f('销售产品', `<input class="ipt" />`)}
        ${f('服务渠道', `<input class="ipt" />`)}
        ${f('订单状态', `<select class="sel"><option value="">全部</option><option>已预报</option><option>已确认</option><option>已取消</option><option>已退件</option></select>`)}
        ${f('库内操作状态', `<select class="sel"><option value="">全部</option><option>待入库</option><option>已入库</option><option>已上架</option><option>已拣货</option><option>已发货</option><option>已退件</option></select>`)}
        ${f('揽收状态', `<select class="sel"><option value="">全部</option><option>已揽收</option><option>待揽收</option><option>揽收失败</option></select>`)}
        ${f('是否换单', `<select class="sel"><option value="">全部</option><option>无需换单</option><option>待换单</option><option>已换单</option></select>`)}
        ${f('调拨状态', `<select class="sel"><option value="">全部</option><option>未调拨</option><option>部分调拨中</option><option>全部调拨中</option></select>`)}
        ${f('尾程模式', `<select class="sel"><option value="">全部</option><option>快递</option><option>卡派</option></select>`)}
        ${f('是否分批发货', `<select class="sel"><option value="">全部</option><option value="1">是</option><option value="0">否</option></select>`)}
        ${f('网点', `<input class="ipt" placeholder="选择组织" />`)}
        <label class="qp-cb"><input type="checkbox" /> 查询库位号</label>
      </div>
    </div>
  `;
}

/* ---- 工具栏(对应 FrmOrderManage 的 10 个按钮) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('📄', '订单信息', "OrderPage.requireSelect('订单信息')")}
      ${btn('📦', '箱号信息', "OrderPage.requireSelect('箱号信息')")}
      ${btn('🗒', '查看日志', "OrderPage.requireSelect('查看日志')")}
      <span class="sep"></span>
      ${btn('📤', '导出数据', "Helpers.toast('导出数据(占位)')")}
      ${btn('📤', '导出材料明细', "OrderPage.exportChildDetails()")}
      ${btn('🖨', '打印标签', "OrderPage.requireSelect('打印标签')")}
      <span class="sep"></span>
      ${btn('✂', '扣件',     "OrderPage.hold()")}
      ${btn('✓', '确认换单', "OrderPage.changeOrder()")}
      ${btn('➕', '登记退仓', "OrderPage.registerReturn()")}
      <span class="sep"></span>
      ${btn('⚖', '修改材料重量', "OrderPage.modifyVolume()")}
      ${btn('🏷', '服务商标签条码', "OrderPage.requireSelect('服务商标签条码')")}
      ${btn('⚙', '列表配置', "Helpers.toast('列表配置(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(19 列,来自 OrderListItemDto) ---- */
function gridTable() {
  const oStatusTag = v => { const e = ORD_ENUM.oStatus[v] || {label:'',cls:''}; return `<span class="ord-tag ${e.cls}">${e.label}</span>`; };
  const opStatusTag = v => { const e = ORD_ENUM.opStatus[v] || {label:'',cls:''}; return `<span class="ord-tag ${e.cls}">${e.label}</span>`; };
  const swapTag = v => { const e = ORD_ENUM.swap[v] || {label:'',cls:''}; return `<span class="ord-tag ${e.cls}">${e.label}</span>`; };
  const tfTag = v => { const e = ORD_ENUM.transfer[v] || {label:'',cls:''}; return `<span class="ord-tag ${e.cls}">${e.label}</span>`; };

  const rows = ORD_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td class="col--code cell-link" title="${r.waybill}">${r.waybill}</td>
      <td class="col--code">${r.cust}</td>
      <td class="col--code">${r.b2b}</td>
      <td class="col--code">${r.track}</td>
      <td>${r.oType}</td>
      <td>${oStatusTag(r.oStatus)}</td>
      <td>${swapTag(r.swap)}</td>
      <td>${opStatusTag(r.opStatus)}</td>
      <td>${r.collectLabel}</td>
      <td>${r.settle || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--num">${r.pieces}</td>
      <td class="col--num">${r.checkin}/${r.pieces}</td>
      <td class="col--num">${r.weight > 0 ? r.weight.toFixed(1) : '—'}</td>
      <td class="col--num">${r.cWeight > 0 ? r.cWeight.toFixed(1) : '—'}</td>
      <td>${r.country}</td>
      <td>${r.product}</td>
      <td>${r.channel}</td>
      <td>${r.lastMile}</td>
      <td>${tfTag(r.transfer)}</td>
      <td>${r.batch ? '是' : '否'}</td>
      <td>${r.checkinOg || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.created}</td>
      <td>${r.checkinTime || '<span style="color:#bbb;">—</span>'}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap ord-grid-wrap">
      <table class="grid ord-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:170px" />  <!-- 运单号 -->
          <col style="width:160px" />  <!-- 客户单号 -->
          <col style="width:130px" />  <!-- B2B订单号 -->
          <col style="width:150px" />  <!-- 跟踪号 -->
          <col style="width:80px" />   <!-- 订单类型 -->
          <col style="width:70px" />   <!-- 订单状态 -->
          <col style="width:80px" />   <!-- 是否换单 -->
          <col style="width:80px" />   <!-- 库内操作状态 -->
          <col style="width:70px" />   <!-- 揽收状态 -->
          <col style="width:64px" />   <!-- 结算模式 -->
          <col style="width:56px" />   <!-- 件数 -->
          <col style="width:70px" />   <!-- 签入/总件 -->
          <col style="width:64px" />   <!-- 重量 -->
          <col style="width:64px" />   <!-- 计费重 -->
          <col style="width:60px" />   <!-- 目的国 -->
          <col style="width:130px" />  <!-- 产品 -->
          <col style="width:110px" />  <!-- 渠道 -->
          <col style="width:56px" />   <!-- 尾程 -->
          <col style="width:90px" />   <!-- 调拨状态 -->
          <col style="width:56px" />   <!-- 分批 -->
          <col style="width:120px" />  <!-- 签入网点 -->
          <col style="width:140px" />  <!-- 创建时间 -->
          <col style="width:140px" />  <!-- 签入时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="OrderPage.toggleAll(this)" /></th>
            <th>运单号</th>
            <th>客户单号</th>
            <th>B2B订单号</th>
            <th>跟踪号</th>
            <th>订单类型</th>
            <th>订单状态</th>
            <th>是否换单</th>
            <th>库内操作状态</th>
            <th>揽收状态</th>
            <th>结算模式</th>
            <th>件数</th>
            <th>签入/总件</th>
            <th>重量(kg)</th>
            <th>计费重</th>
            <th>目的国</th>
            <th>销售产品</th>
            <th>服务渠道</th>
            <th>尾程</th>
            <th>调拨状态</th>
            <th>分批</th>
            <th>签入网点</th>
            <th>创建时间</th>
            <th>签入时间</th>
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

/* ---- 页面逻辑 ---- */
const OrderPage = {
  toggleMore() {
    const el = document.getElementById('ordMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.ord-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 选中校验(对应代码里 GetCheckedRowDatas/GetCurrentRowData 的空校验) */
  getChecked() {
    return document.querySelectorAll('.ord-grid tbody input[type="checkbox"]:checked');
  },
  requireSelect(action) {
    if (this.getChecked().length === 0) { Helpers.toast('请选择要操作的订单！'); return; }
    Helpers.toast(`${action}(占位)`);
  },
  /* 扣件 frmCreateIssue:需勾选行 */
  hold() {
    if (this.getChecked().length === 0) { Helpers.toast('请选择要操作的订单！'); return; }
    Helpers.toast('扣件登记(占位)');
  },
  /* 确认换单 btnChangeOrder_Click:校验状态 + 最多50 + 二次确认 */
  changeOrder() {
    const checked = this.getChecked();
    if (checked.length === 0) { Helpers.toast('请选择要操作的订单！'); return; }
    if (checked.length > 50) { Helpers.toast('单次最多修改50条数据！'); return; }
    const ok = confirm('此功能用于将子单的换单状态从待换单改成已换单,确定要操作吗?');
    if (!ok) return;
    Helpers.toast('操作成功！(演示)');
  },
  /* 登记退仓:勾选订单 → 主单维度预登记
     打开公共登记弹窗(return-register.js)简化模式:不显示单号,
     确认时按勾选订单的实际状态判断登记结果(可登记的登记,不可登记的列原因) */
  registerReturn() {
    const checked = this.getChecked();
    if (checked.length === 0) { Helpers.toast('请选择要操作的订单！'); return; }
    if (checked.length > 200) { Helpers.toast('单次最多登记200个主单！'); return; }
    /* 勾选行 → 订单状态数据(确认时按状态判结果) */
    const items = [...checked].map(c => c.closest('tr').dataset.no)
      .map(no => ORD_ROWS.find(r => r.no === +no))
      .filter(Boolean)
      .map(r => ({ waybill: r.waybill, oStatus: r.oStatus, opStatus: r.opStatus }));
    ReturnRegister.open({ simple: true, items });
  },
  /* 导出材料明细 btn_exprot_child_details_Click:需勾选行 */
  exportChildDetails() {
    if (this.getChecked().length === 0) { Helpers.toast('请选择要操作的订单！'); return; }
    Helpers.toast('导出材料明细(占位)');
  },
  /* 修改材料重量 btnUpdateVolume_Click:必须全部"已预报"且"非审核通过",最多10个 */
  modifyVolume() {
    const checked = this.getChecked();
    if (checked.length === 0) { Helpers.toast('请选择要操作的订单！'); return; }
    if (checked.length > 10) { Helpers.toast('已超过批量修改上限10个订单/次！'); return; }
    Helpers.toast('修改材料重量(占位)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b2b-order',
  activeTab: 'b2b-order',
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
  const tr = e.target.closest('.ord-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.ord-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
