/* ============================================
   b-charge-net.js — 计费网点维护页
   依据:code/pc 生产源码
     · 列表模型 ChargeOrgQueryResponse(4 列,见 [DataColumn] 标注)
     · 查询 ListChargeOrgInput(计费网点组织树单选)
     · 窗体 FrmChargeOrgManage(按钮:查询/新增弹窗多选网点/删除勾选二次确认)
   ============================================ */

/* ---- 演示数据(6 行:东腾曼沙项目仓为主,含深圳福永仓等真实网点) ---- */
const CN_ROWS = [
  { no:1,  og:'东腾曼沙项目仓',     code:'CN-DTM-001',  createTime:'2026-07-15 09:30:22', createUser:'庄亚运', sel:false },
  { no:2,  og:'深圳福永仓',         code:'CN-SZFY-002', createTime:'2026-07-15 10:12:08', createUser:'庄亚运', sel:false },
  { no:3,  og:'东莞沙田仓',         code:'CN-DGST-003', createTime:'2026-07-16 08:45:11', createUser:'李四',   sel:false },
  { no:4,  og:'广州白云仓',         code:'CN-GZBY-004', createTime:'2026-07-18 14:20:35', createUser:'李四',   sel:false },
  { no:5,  og:'上海浦东仓',         code:'CN-SHPD-005', createTime:'2026-07-22 11:08:47', createUser:'王五',   sel:false },
  { no:6,  og:'宁波北仑仓',         code:'CN-NJBL-006', createTime:'2026-07-25 16:55:19', createUser:'王五',   sel:false },
];

/* ---- 查询区(对应 ListChargeOrgInput)
   查询条件只有一个「计费网点」组织树,主行直接放它 + 查询 + 新增按钮 ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('计费网点', `<input class="ipt" value="东腾曼沙项目仓" placeholder="选择组织" />`, 'qf--og')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn btn--primary" onclick="ChargeNetPage.openAdd()">➕ 新增</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 工具栏(对应 FrmChargeOrgManage 的按钮) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('🗑', '删除', "ChargeNetPage.remove()")}
      <span class="sep"></span>
      ${btn('⚙', '列表配置', "Helpers.toast('列表配置(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(4 列,严格对应 ChargeOrgQueryResponse) ---- */
function gridTable() {
  const rows = CN_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td>${r.og}</td>
      <td class="col--code">${r.code}</td>
      <td>${r.createTime}</td>
      <td>${r.createUser}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap cn-grid-wrap">
      <table class="grid cn-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:240px" />  <!-- 操作网点 -->
          <col style="width:180px" />  <!-- 网点编码 -->
          <col style="width:180px" />  <!-- 创建时间 -->
          <col style="width:120px" />  <!-- 创建人 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="ChargeNetPage.toggleAll(this)" /></th>
            <th>操作网点</th>
            <th>网点编码</th>
            <th>创建时间</th>
            <th>创建人</th>
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
      <span class="pg-info">总记录数: <b>6</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go">
        <input class="ipt" value="" />
        <button class="pg-btn">GO</button>
        <select class="sel"><option>50</option><option>100</option></select>
      </span>
    </div>
  `;
}

/* ---- 新增弹窗(多选网点组织树) ---- */
function addDialog() {
  /* 候选组织(演示用:左侧组织树节点,勾选后加入计费网点) */
  const CANDIDATES = [
    '佛山里水仓', '中山民众仓', '珠海高栏仓', '惠州大亚湾仓', '厦门海沧仓', '青岛黄岛仓',
  ];
  return `
    <div class="cn-modal hidden" id="cnModal">
      <div class="rw-modal-mask" onclick="ChargeNetPage.closeAdd()"></div>
      <div class="rw-modal-panel">
        <div class="rw-modal-header">
          <span class="rw-modal-title">新增计费网点</span>
          <span class="rw-modal-close" onclick="ChargeNetPage.closeAdd()">✕</span>
        </div>
        <div class="rw-modal-body">
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>选择网点</label>
            <div class="cn-org-tree">
              ${CANDIDATES.map((c, i) => `
                <label class="cn-org-item">
                  <input type="checkbox" value="${c}" />
                  <span>${c}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="rw-modal-tip">勾选组织树节点后保存,即加入计费网点维护列表。</div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="ChargeNetPage.closeAdd()">取消</button>
          <button class="btn btn--primary" onclick="ChargeNetPage.confirmAdd()">确认新增</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const ChargeNetPage = {
  toggleAll(master) {
    document.querySelectorAll('.cn-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  getChecked() {
    return document.querySelectorAll('.cn-grid tbody input[type="checkbox"]:checked');
  },
  /* 新增弹窗(对应 btn_add_Click → 弹窗多选网点) */
  openAdd() {
    document.getElementById('cnModal').classList.remove('hidden');
    document.querySelectorAll('#cnModal .cn-org-item input').forEach(c => c.checked = false);
  },
  closeAdd() {
    document.getElementById('cnModal').classList.add('hidden');
  },
  confirmAdd() {
    const checked = document.querySelectorAll('#cnModal .cn-org-item input:checked');
    if (checked.length === 0) { Helpers.toast('请至少选择一个网点'); return; }
    this.closeAdd();
    Helpers.toast(`新增成功 ${checked.length} 个计费网点(演示)`);
  },
  /* 删除(二次确认) */
  remove() {
    const checked = this.getChecked();
    if (checked.length === 0) { Helpers.toast('请选择要删除的网点！'); return; }
    const ok = confirm(`确定删除选中的 ${checked.length} 个计费网点,是否继续？`);
    if (!ok) return;
    Helpers.toast(`删除成功 ${checked.length} 条(演示)`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-charge-net',
  activeTab: 'b-charge-net',
  tabs: Layout.tabs.standard(),
  content: `
    ${queryPanel()}
    ${gridToolbar()}
    ${gridTable()}
    ${pager()}
    ${addDialog()}
  `,
});

/* 启动底部时钟 */
Helpers.startClock();

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.cn-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.cn-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
