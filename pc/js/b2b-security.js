/* ============================================
   b2b-security.js — B2B安检记录查询页
   依据:code/pc 生产源码
     · 列表模型 ListSecurityCheckRecordItem(10 列,见 [DataColumn] 标注)
     · 查询条件:简单(单号类型 1运单号/2跟踪号 + 单号 ≤500) + 更多(操作时间 range≤90天 + 服务渠道 + 销售产品 + 操作网点 + 拦截原因 W200 动态)
     · 按钮区:查询 / 子单明细(选中1行) / 导出数据
     · 拦截原因(W200)为动态下拉,演示值含禁运/超限/敏感等典型安检场景
   ============================================ */

/* ---- 演示数据(10 行,覆盖各类拦截原因 / 渠道 / 国家) ---- */
const SEC_ROWS = [
  { no:1,  waybill:'YT2621601300301272', channel:'美森正班',   product:'美森快船-普货', country:'美国', track:'20260804185331460', weight:'12.50', operator:'张三', opTime:'2026-08-04 18:53:17', reason:'W200-A1 申报价值超限',       og:'东腾曼沙项目仓', sel:false },
  { no:2,  waybill:'YT2621601300301249', channel:'美森加班',   product:'美森快船-带电', country:'美国', track:'20260804184711458', weight:'8.30',  operator:'李四', opTime:'2026-08-04 18:46:37', reason:'W200-B2 含电池未提供 MSDS',   og:'东腾曼沙项目仓', sel:true  },
  { no:3,  waybill:'YT2621601300301227', channel:'B2B空运直飞', product:'B2B空运-普货',  country:'英国', track:'20260804174758428', weight:'5.20',  operator:'王五', opTime:'2026-08-04 17:47:52', reason:'W200-C1 侵权品牌',            og:'东腾曼沙项目仓', sel:false },
  { no:4,  waybill:'YT2621601300301201', channel:'以星EXX',    product:'以星快船-普货', country:'美国', track:'20260804174546426', weight:'18.75', operator:'赵六', opTime:'2026-08-04 17:45:35', reason:'W200-A2 重量超出渠道上限',    og:'东腾曼沙项目仓', sel:true  },
  { no:5,  waybill:'YT2621625400300033', channel:'B2B空运直飞', product:'B2B空运-带电', country:'德国', track:'20260804202334515', weight:'3.40',  operator:'张三', opTime:'2026-08-04 20:23:34', reason:'W200-D1 敏感品名需复核',      og:'东腾曼沙项目仓', sel:true  },
  { no:6,  waybill:'YT2621601300101052', channel:'美森正班',   product:'美森快船-普货', country:'美国', track:'20260804170933405', weight:'25.60', operator:'李四', opTime:'2026-08-04 17:09:27', reason:'W200-A3 尺寸超标',            og:'东腾曼沙项目仓', sel:false },
  { no:7,  waybill:'YT2621601300101037', channel:'长荣海运',   product:'长荣海运-普货', country:'加拿大', track:'20260804165039388', weight:'9.80',  operator:'王五', opTime:'2026-08-04 16:50:30', reason:'W200-B3 反倾销产品',          og:'东腾曼沙项目仓', sel:false },
  { no:8,  waybill:'YT2621601300101029', channel:'B2B空运直飞', product:'B2B空运-普货',  country:'美国', track:'20260804164912386', weight:'2.10',  operator:'赵六', opTime:'2026-08-04 16:49:07', reason:'W200-C2 液体粉末类禁运',      og:'东腾曼沙项目仓', sel:false },
  { no:9,  waybill:'YT2621625700100026', channel:'中欧卡航',   product:'中欧卡航-普货', country:'法国', track:'20260804152619320', weight:'6.45',  operator:'张三', opTime:'2026-08-04 15:26:12', reason:'W200-A4 实重与预报不符',      og:'东腾曼沙项目仓', sel:false },
  { no:10, waybill:'YT2621624300300047', channel:'美森正班',   product:'美森快船-带电', country:'美国', track:'20260804151659306', weight:'14.90', operator:'李四', opTime:'2026-08-04 15:16:54', reason:'W200-D2 化妆品需备案',        og:'东腾曼沙项目仓', sel:false },
];

/* ---- 枚举映射(W200 拦截原因分组,用于彩色标签:A 超限/B 合规/C 知产/D 复核) ---- */
const SEC_ENUM = {
  reason: {
    A: { cls:'sec-reason--over' },    /* A 类:超限/不符-危险红 */
    B: { cls:'sec-reason--comply' },  /* B 类:合规/资质-警告橙 */
    C: { cls:'sec-reason--ip' },      /* C 类:知产/禁运-危险红 */
    D: { cls:'sec-reason--review' },  /* D 类:复核/备案-信息蓝 */
  },
};

/* ---- 查询区(简单:单号类型 + 单号 | 更多:操作时间/服务渠道/销售产品/操作网点/拦截原因) ----
   主行默认只显示「单号类型 + 单号 + 查询/更多条件按钮」,其余进更多条件 */
function queryPanel() {
  /* 单个字段:label 在上、控件在下 */
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:只留单号类型 + 单号 + 按钮 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">运单号</option><option value="2">跟踪号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 500 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="SecurityPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏) -->
      <div class="qp-row qp-more" id="secMore" style="display:none;">
        ${f('操作时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-06-06" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
        ${f('服务渠道', `<select class="sel"><option value="">全部</option><option>美森正班</option><option>美森加班</option><option>以星EXX</option><option>长荣海运</option><option>B2B空运直飞</option><option>中欧卡航</option></select>`)}
        ${f('销售产品', `<input class="ipt" placeholder="销售产品" />`)}
        ${f('操作网点', `<input class="ipt" placeholder="选择组织" />`)}
        ${f('拦截原因', `<select class="sel"><option value="">全部</option><option>W200-A 申报价值/重量超限</option><option>W200-B 资质合规问题</option><option>W200-C 侵权/禁运</option><option>W200-D 复核/备案</option></select>`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(查询 / 子单明细(选中1行) / 导出数据) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('📄', '子单明细', "SecurityPage.childDetail()")}
      <span class="sep"></span>
      ${btn('⬇', '导出数据', "SecurityPage.exportData()")}
    </div>
  `;
}

/* ---- 数据表格(10 列,严格对应 ListSecurityCheckRecordItem) ---- */
function gridTable() {
  /* 拦截原因标签(按 W200 分组前缀上色) */
  const reasonTag = reason => {
    const grp = reason.slice(4, 5); /* W200-X ... */
    const e = SEC_ENUM.reason[grp] || { cls:'' };
    return `<span class="abn-tag ${e.cls}">${reason}</span>`;
  };

  const rows = SEC_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code cell-link" title="${r.waybill}">${r.waybill}</td>
      <td>${r.channel}</td>
      <td>${r.product}</td>
      <td>${r.country}</td>
      <td class="col--code">${r.track}</td>
      <td class="col--num">${r.weight}</td>
      <td>${r.operator}</td>
      <td>${r.opTime}</td>
      <td>${reasonTag(r.reason)}</td>
      <td>${r.og}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap sec-grid-wrap">
      <table class="grid sec-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:170px" />  <!-- 运单号 -->
          <col style="width:120px" />  <!-- 服务渠道 -->
          <col style="width:140px" />  <!-- 产品 -->
          <col style="width:80px" />   <!-- 目的国家 -->
          <col style="width:150px" />  <!-- 跟踪号 -->
          <col style="width:90px" />   <!-- 称重重量 -->
          <col style="width:70px" />   <!-- 操作人 -->
          <col style="width:140px" />  <!-- 操作时间 -->
          <col style="width:230px" />  <!-- 拦截原因 -->
          <col style="width:130px" />  <!-- 操作网点 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>运单号</th>
            <th>服务渠道</th>
            <th>产品</th>
            <th>目的国家</th>
            <th>跟踪号</th>
            <th title="称重重量(kg)">称重重量(kg)</th>
            <th>操作人</th>
            <th>操作时间</th>
            <th title="拦截原因(W200)">拦截原因</th>
            <th>操作网点</th>
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

/* ---- 页面逻辑(展开更多 / 子单明细选中1行 / 导出数据) ---- */
const SecurityPage = {
  toggleMore() {
    const el = document.getElementById('secMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  /* 子单明细:必须且仅选中 1 行 */
  childDetail() {
    const selected = document.querySelectorAll('.sec-grid tbody tr.row--selected');
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
    const row = SEC_ROWS.find(r => String(r.no) === String(no));
    Helpers.toast(`子单明细:${row ? row.waybill : '(占位)'}`);
  },
  /* 导出数据 */
  exportData() {
    Helpers.toast('导出数据成功！(演示)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b2b-security',
  activeTab: 'b2b-security',
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
  const tr = e.target.closest('.sec-grid tbody tr');
  if (!tr) return;
  document.querySelectorAll('.sec-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
