/* ============================================
   abnormal-order.js — 异常订单管理页
   依据:code/pc 生产源码
     · 列表模型 AbnormalOrderItem(28 列,见 [DataColumn] 标注)
     · 查询条件 ListAbnormalOrdersInput(16 个筛选项)
     · 窗体 FrmIssueOrderManage(按钮:查询/子单信息/查看日志/列表配置/生成异常拣货任务)
     · 枚举 AbnormalHandleStatus / AbnormalHandleType / IssueCategory / OrderInspectionStatus / VasOrderOperateStatus
   ============================================ */

/* ---- 演示数据(10 行,覆盖各种异常状态/分类/处理方式) ---- */
const ABN_ROWS = [
  { no:1,  waybill:'YT2621601300301272', track:'20260804185331460', status:0, statusLabel:'待处理', handle:0, handleLabel:'待处理',
    orderType:'海运拼柜', orderStatus:'已确认', opStatus:'已上架', total:5,  abn:2, og:'东腾曼沙项目仓', cust:'CST2621601300101272',
    country:'美国', product:'美森快船-普货', channel:'美森正班', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'问题件', abnType:'A1-101 申报价值不符', addTime:'2026-08-04 18:53:17', addSt:'张三', vasType:'复核尺寸重量', vasStatus:'未完成',
    handleTime:'', handleSt:'', needCheck:true,  checkStatus:'待查验', canPick:true,  checkinOg:'东腾曼沙项目仓', sel:false },
  { no:2,  waybill:'YT2621601300301249', track:'20260804184711458', status:0, statusLabel:'待处理', handle:0, handleLabel:'待处理',
    orderType:'海运整柜', orderStatus:'已确认', opStatus:'已签入', total:10, abn:3, og:'东腾曼沙项目仓', cust:'CST2621601300301249',
    country:'美国', product:'美森快船-带电', channel:'美森加班', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'关务问题件', abnType:'B2-201 侵权品牌', addTime:'2026-08-04 18:46:37', addSt:'李四', vasType:'换箱', vasStatus:'未完成',
    handleTime:'', handleSt:'', needCheck:false, checkStatus:'', canPick:false, checkinOg:'东腾曼沙项目仓', sel:true },
  { no:3,  waybill:'YT2621601300301227', track:'20260804174758428', status:1, statusLabel:'处理中', handle:2, handleLabel:'放行需增值',
    orderType:'空运',     orderStatus:'已确认', opStatus:'已上架', total:3,  abn:1, og:'东腾曼沙项目仓', cust:'CST2621601300101227',
    country:'美国', product:'B2B空运-普货',   channel:'B2B空运直飞', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'预报订单问题件', abnType:'A3-305 申报重量超限', addTime:'2026-08-04 17:47:52', addSt:'王五', vasType:'贴外件标', vasStatus:'未完成',
    handleTime:'2026-08-04 19:20:00', handleSt:'客服A', needCheck:true,  checkStatus:'查验中', canPick:true,  checkinOg:'东腾曼沙项目仓', sel:false },
  { no:4,  waybill:'YT2621601300301201', track:'20260804174546426', status:1, statusLabel:'处理中', handle:1, handleLabel:'放行',
    orderType:'海运拼柜', orderStatus:'已确认', opStatus:'已签入', total:8,  abn:2, og:'东腾曼沙项目仓', cust:'CST2621601300101201',
    country:'美国', product:'以星快船-普货',   channel:'以星EXX', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'问题件', abnType:'A1-102 包装破损', addTime:'2026-08-04 17:45:35', addSt:'赵六', vasType:'换箱', vasStatus:'未完成',
    handleTime:'2026-08-04 18:00:00', handleSt:'客服B', needCheck:false, checkStatus:'', canPick:false, checkinOg:'东腾曼沙项目仓', sel:true },
  { no:5,  waybill:'YT2621625400300033', track:'20260804202334515', status:2, statusLabel:'已完结', handle:1, handleLabel:'放行',
    orderType:'空运',     orderStatus:'已确认', opStatus:'已发货', total:5,  abn:1, og:'东腾曼沙项目仓', cust:'PH2608030000051',
    country:'美国', product:'B2B空运-带电',   channel:'B2B空运直飞', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'问题件', abnType:'A1-103 尺寸超标', addTime:'2026-08-03 17:22:33', addSt:'张三', vasType:'复核尺寸重量', vasStatus:'已完成',
    handleTime:'2026-08-04 09:15:00', handleSt:'客服C', needCheck:false, checkStatus:'已查验', canPick:true,  checkinOg:'东腾曼沙项目仓', sel:true },
  { no:6,  waybill:'YT2621601300101052', track:'20260804170933405', status:2, statusLabel:'已完结', handle:4, handleLabel:'退件',
    orderType:'海运拼柜', orderStatus:'已确认', opStatus:'已上架', total:6,  abn:2, og:'东腾曼沙项目仓', cust:'CST2621601300101052',
    country:'美国', product:'美森快船-普货',   channel:'美森正班', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'关务问题件', abnType:'B2-202 反倾销产品', addTime:'2026-08-03 17:09:27', addSt:'李四', vasType:'复核尺寸重量', vasStatus:'无需增值',
    handleTime:'2026-08-04 14:30:00', handleSt:'客服A', needCheck:true,  checkStatus:'已查验', canPick:false, checkinOg:'东腾曼沙项目仓', sel:false },
  { no:7,  waybill:'YT2621601300101037', track:'20260804165039388', status:2, statusLabel:'已完结', handle:5, handleLabel:'弃件',
    orderType:'海运整柜', orderStatus:'已确认', opStatus:'已签入', total:4,  abn:4, og:'东腾曼沙项目仓', cust:'CST2621601300101037',
    country:'美国', product:'长荣海运-普货',   channel:'长荣海运', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'无预报件', abnType:'D1-401 无预报到货', addTime:'2026-08-03 16:50:30', addSt:'王五', vasType:'复核尺寸重量', vasStatus:'无需增值',
    handleTime:'2026-08-04 10:00:00', handleSt:'客服B', needCheck:false, checkStatus:'', canPick:false, checkinOg:'东腾曼沙项目仓', sel:false },
  { no:8,  waybill:'YT2621601300101029', track:'20260804164912386', status:3, statusLabel:'已取消', handle:0, handleLabel:'待处理',
    orderType:'空运',     orderStatus:'已确认', opStatus:'已签入', total:2,  abn:1, og:'东腾曼沙项目仓', cust:'CST2621601300101029',
    country:'美国', product:'B2B空运-普货',   channel:'B2B空运直飞', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'问题件', abnType:'A1-104 标签缺失', addTime:'2026-08-03 16:49:07', addSt:'赵六', vasType:'贴外件标', vasStatus:'无需增值',
    handleTime:'2026-08-04 11:20:00', handleSt:'客服C', needCheck:false, checkStatus:'', canPick:false, checkinOg:'东腾曼沙项目仓', sel:false },
  { no:9,  waybill:'YT2621625700100026', track:'20260804152619320', status:0, statusLabel:'待处理', handle:0, handleLabel:'待处理',
    orderType:'卡航',     orderStatus:'已确认', opStatus:'已上架', total:2,  abn:1, og:'东腾曼沙项目仓', cust:'CST2621625700100026',
    country:'美国', product:'中欧卡航-普货',   channel:'中欧卡航', newWaybill:'', addOg:'东腾曼沙项目仓',
    category:'问题件', abnType:'A1-105 实际重量与预报不符', addTime:'2026-08-04 15:26:12', addSt:'张三', vasType:'复核尺寸重量', vasStatus:'未完成',
    handleTime:'', handleSt:'', needCheck:false, checkStatus:'', canPick:true,  checkinOg:'东腾曼沙项目仓', sel:false },
  { no:10, waybill:'YT2621624300300047', track:'20260804151659306', status:1, statusLabel:'处理中', handle:2, handleLabel:'放行需增值',
    orderType:'海运拼柜', orderStatus:'已确认', opStatus:'已上架', total:3,  abn:2, og:'东腾曼沙项目仓', cust:'CST2621624300300047',
    country:'美国', product:'美森快船-带电',   channel:'美森正班', newWaybill:'YT2621624300300099', addOg:'东腾曼沙项目仓',
    category:'问题件', abnType:'A1-102 包装破损', addTime:'2026-08-04 15:16:54', addSt:'李四', vasType:'换箱', vasStatus:'未完成',
    handleTime:'2026-08-04 16:00:00', handleSt:'客服A', needCheck:true,  checkStatus:'待查验', canPick:true,  checkinOg:'东腾曼沙项目仓', sel:false },
];

/* ---- 枚举映射(来自代码枚举的 [Description]) ---- */
const ENUM = {
  /* 异常状态 AbnormalHandleStatus */
  status: {
    0: { label:'待处理', cls:'abn-status--pending' },
    1: { label:'处理中', cls:'abn-status--processing' },
    2: { label:'已完结', cls:'abn-status--done' },
    3: { label:'已取消', cls:'abn-status--cancel' },
  },
  /* 处理方式 AbnormalHandleType(含代码里的 Color 标注) */
  handle: {
    0: { label:'待处理', cls:'abn-handle--none' },
    1: { label:'放行',   cls:'abn-handle--clear' },
    2: { label:'放行需增值', cls:'abn-handle--vas' },
    4: { label:'退件',   cls:'abn-handle--return' },
    5: { label:'弃件',   cls:'abn-handle--drop' },
  },
  /* 异常分类 IssueCategory */
  category: {
    1:'问题件', 2:'关务问题件', 3:'预报订单问题件', 4:'无预报件',
  },
  /* 查验状态 OrderInspectionStatus */
  check: {
    0:'', 1:'待查验', 2:'查验中', 3:'已查验',
  },
};

/* ---- 查询区(对应 ListAbnormalOrdersInput 的 16 个字段) ----
   布局:字段纵向(label 上、控件下),与 B2B 订单页统一。
   主行默认只显示「单号类型 + 单号 + 查询/更多条件按钮」,其余进更多条件 */
function queryPanel() {
  /* 单个字段:label 在上、控件在下 */
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:只留单号类型 + 单号 + 按钮 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">跟踪号</option><option value="3">客户单号</option><option value="4">子单号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 3000 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="AbnormalPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏,对应 btnMore.MoreFlag) -->
      <div class="qp-row qp-more" id="abnMore" style="display:none;">
        ${f('异常登记时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-08-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('异常状态', `<select class="sel"><option value="">全部</option><option>待处理</option><option>处理中</option><option>已完结</option><option>已取消</option></select>`)}
        ${f('处理方式', `<select class="sel"><option value="">全部</option><option>待处理</option><option>放行</option><option>放行需增值</option><option>退件</option><option>弃件</option></select>`)}
        ${f('订单类型', `<select class="sel"><option value="">全部</option><option>海运拼柜</option><option>海运整柜</option><option>空运</option><option>卡航</option></select>`)}
        ${f('订单状态', `<select class="sel"><option value="">全部</option><option>已确认</option></select>`)}
        ${f('库内操作状态', `<select class="sel"><option value="">全部</option><option>已签入</option><option>已上架</option><option>已发货</option></select>`)}
        ${f('查验状态', `<select class="sel"><option value="">全部</option><option>待查验</option><option>查验中</option><option>已查验</option></select>`)}
        ${f('异常分类', `<select class="sel"><option value="">全部</option><option>问题件</option><option>关务问题件</option><option>预报订单问题件</option><option>无预报件</option></select>`)}
        ${f('异常类型', `<input class="ipt" placeholder="问题件代码" />`)}
        ${f('增值服务', `<select class="sel"><option value="">全部</option><option>复核尺寸重量</option><option>换箱</option><option>贴外件标</option><option>换单</option></select>`)}
        ${f('增值状态', `<select class="sel"><option value="">全部</option><option>未完成</option><option>已完成</option><option>无需增值</option></select>`)}
        ${f('是否需查验', `<select class="sel"><option value="">全部</option><option value="1">是</option><option value="0">否</option></select>`)}
        ${f('是否可拣货', `<select class="sel"><option value="">全部</option><option value="1">是</option><option value="0">否</option></select>`)}
        ${f('客户代码', `<input class="ipt" placeholder="多个换行分隔" />`)}
        ${f('目的国家', `<input class="ipt" placeholder="国家代码" />`)}
        ${f('销售产品', `<input class="ipt" />`)}
        ${f('服务渠道', `<input class="ipt" />`)}
        ${f('网点类型', `<select class="sel"><option value="">全部</option><option>签入网点</option><option>操作网点</option></select>`)}
        ${f('网点', `<input class="ipt" placeholder="选择组织" />`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(对应 FrmIssueOrderManage 的按钮) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('📄', '子单信息',   "Helpers.toast('子单信息(占位)')")}
      ${btn('🗒', '查看日志',   "Helpers.toast('查看日志(占位)')")}
      <span class="sep"></span>
      ${btn('📦', '生成异常拣货任务', "AbnormalPage.genPickingTask()")}
      <span class="sep"></span>
      ${btn('⚙', '列表配置', "Helpers.toast('列表配置(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(28 列,严格对应 AbnormalOrderItem 的 [DataColumn]) ---- */
function gridTable() {
  /* 状态标签 */
  const statusTag = s => {
    const e = ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };
  /* 处理方式标签(带代码里的颜色语义) */
  const handleTag = h => {
    const e = ENUM.handle[h] || { label:'', cls:'' };
    return e.label ? `<span class="abn-handle ${e.cls}">${e.label}</span>` : '<span style="color:#bbb;">—</span>';
  };
  /* 查验状态 */
  const checkTag = r => {
    if (!r.needCheck) return '<span style="color:#bbb;">否</span>';
    return `<span style="color:#E81123;">是</span>`;
  };

  const rows = ABN_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td>${statusTag(r.status)}</td>
      <td>${handleTag(r.handle)}</td>
      <td class="col--code cell-link" title="${r.waybill}">${r.waybill}</td>
      <td class="col--code">${r.track}</td>
      <td class="col--num">${r.total}</td>
      <td class="col--num abn--alert">${r.abn}</td>
      <td>${r.og}</td>
      <td>${r.orderType}</td>
      <td>${r.orderStatus}</td>
      <td>${r.opStatus}</td>
      <td class="col--code">${r.cust}</td>
      <td>${r.country}</td>
      <td>${r.product}</td>
      <td>${r.channel}</td>
      <td class="col--code">${r.newWaybill || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.addOg}</td>
      <td class="abn--category">${r.category}</td>
      <td class="abn--type" title="${r.abnType}">${r.abnType}</td>
      <td>${r.addTime}</td>
      <td>${r.addSt}</td>
      <td>${r.vasType}</td>
      <td>${r.vasStatus === '已完成' ? '<span class="abn-vas--done">'+r.vasStatus+'</span>' : r.vasStatus === '无需增值' ? '<span style="color:#bbb;">'+r.vasStatus+'</span>' : '<span class="abn-vas--todo">'+r.vasStatus+'</span>'}</td>
      <td>${r.handleTime || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.handleSt || '<span style="color:#bbb;">—</span>'}</td>
      <td>${checkTag(r)}</td>
      <td>${r.checkStatus || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.canPick ? '<span style="color:#2E7D32;">是</span>' : '<span style="color:#bbb;">否</span>'}</td>
      <td>${r.checkinOg}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap abn-grid-wrap">
      <table class="grid abn-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:70px" />   <!-- 异常状态 -->
          <col style="width:90px" />   <!-- 处理方式 -->
          <col style="width:170px" />  <!-- 主单号 -->
          <col style="width:150px" />  <!-- 跟踪号 -->
          <col style="width:56px" />   <!-- 总件数 -->
          <col style="width:56px" />   <!-- 异常件数 -->
          <col style="width:130px" />  <!-- 操作网点 -->
          <col style="width:80px" />   <!-- 订单类型 -->
          <col style="width:70px" />   <!-- 订单状态 -->
          <col style="width:70px" />   <!-- 库内操作状态 -->
          <col style="width:160px" />  <!-- 客户代码 -->
          <col style="width:70px" />   <!-- 目的国家 -->
          <col style="width:130px" />  <!-- 产品 -->
          <col style="width:110px" />  <!-- 服务渠道 -->
          <col style="width:150px" />  <!-- 新主单号 -->
          <col style="width:120px" />  <!-- 异常登记网点 -->
          <col style="width:100px" />  <!-- 异常分类 -->
          <col style="width:180px" />  <!-- 异常类型 -->
          <col style="width:140px" />  <!-- 登记时间 -->
          <col style="width:70px" />   <!-- 登记人 -->
          <col style="width:100px" />  <!-- 增值服务 -->
          <col style="width:70px" />   <!-- 增值状态 -->
          <col style="width:140px" />  <!-- 处理时间 -->
          <col style="width:70px" />   <!-- 处理人 -->
          <col style="width:60px" />   <!-- 是否查验 -->
          <col style="width:70px" />   <!-- 查验状态 -->
          <col style="width:70px" />   <!-- 是否可拣货 -->
          <col style="width:120px" />  <!-- 签入网点 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="AbnormalPage.toggleAll(this)" /></th>
            <th>异常状态</th>
            <th>处理方式</th>
            <th>主单号</th>
            <th>跟踪号</th>
            <th>总件数</th>
            <th title="异常件数">异常件数</th>
            <th>操作网点</th>
            <th>订单类型</th>
            <th>订单状态</th>
            <th>库内操作状态</th>
            <th>客户代码</th>
            <th>目的国家</th>
            <th>产品</th>
            <th>服务渠道</th>
            <th>新主单号</th>
            <th>异常登记网点</th>
            <th>异常分类</th>
            <th>异常类型</th>
            <th title="异常登记时间(最早)">登记时间</th>
            <th title="异常登记人(最早)">登记人</th>
            <th>增值服务</th>
            <th>增值状态</th>
            <th title="异常处理时间(最新)">处理时间</th>
            <th title="异常处理人(最新)">处理人</th>
            <th>是否查验</th>
            <th>查验状态</th>
            <th>是否可拣货</th>
            <th>签入网点</th>
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

/* ---- 页面逻辑(展开更多/全选/生成拣货任务) ---- */
const AbnormalPage = {
  toggleMore() {
    const el = document.getElementById('abnMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多查询条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.abn-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 对应 btn_gen_picking_task_Click:选中行 → 确认弹窗 → 生成异常拣货任务 */
  genPickingTask() {
    const checked = document.querySelectorAll('.abn-grid tbody input[type="checkbox"]:checked');
    if (checked.length === 0) {
      Helpers.toast('请选择要操作的订单！');
      return;
    }
    const ok = confirm(`确定生成异常拣货任务(已选 ${checked.length} 单),是否继续？`);
    if (!ok) return;
    Helpers.toast('生成拣货任务成功！(演示)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'abnormal',
  activeTab: 'abnormal',
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
  const tr = e.target.closest('.abn-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.abn-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
