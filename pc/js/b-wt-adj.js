/* ============================================
   b-wt-adj.js — 重量调整页
   依据:code/pc 生产源码
     · 列表模型 WeightAdjustRuleListResponse(9 列,见 [DataColumn] 标注)
     · 查询 ListWeightAdjustRuleInput(修改时间 + 销售产品 + 服务渠道)
     · 窗体 FrmWeightAdjustManage(按钮:查询/新增/修改/启用/禁用/查看日志)
     · 编辑弹窗:销售产品(必填)+服务渠道(必填)+重量调整%(>0≤100整数)+长/宽/高(>0整数)
     · 公式:调整后 = 原值 - 规则值(向下截取,≥0);体积重除数 6000
     · 备注:"在原基础上减少相应数值"
   ============================================ */

/* ---- 演示数据(7 行:覆盖启用/禁用两种状态 + 多个真实产品/渠道) ---- */
const WT_ROWS = [
  { no:1,  product:'美森快船-普货',     channel:'美森正班',     status:1, statusLabel:'启用', wtPct:5,  len:2, wid:2, hei:1, modTime:'2026-07-28 15:30:22', modUser:'庄亚运', sel:false },
  { no:2,  product:'美森快船-带电',     channel:'美森加班',     status:1, statusLabel:'启用', wtPct:3,  len:1, wid:1, hei:1, modTime:'2026-07-28 16:10:08', modUser:'庄亚运', sel:false },
  { no:3,  product:'B2B空运-普货',     channel:'B2B空运直飞',  status:0, statusLabel:'禁用', wtPct:8,  len:3, wid:2, hei:2, modTime:'2026-07-25 09:45:11', modUser:'李四',   sel:false },
  { no:4,  product:'以星快船-普货',     channel:'以星EXX',      status:1, statusLabel:'启用', wtPct:4,  len:2, wid:1, hei:1, modTime:'2026-07-24 14:20:35', modUser:'李四',   sel:false },
  { no:5,  product:'长荣海运-普货',     channel:'长荣海运',     status:0, statusLabel:'禁用', wtPct:6,  len:2, wid:2, hei:2, modTime:'2026-07-20 11:08:47', modUser:'王五',   sel:false },
  { no:6,  product:'中欧卡航-普货',     channel:'中欧卡航',     status:1, statusLabel:'启用', wtPct:2,  len:1, wid:1, hei:0, modTime:'2026-07-18 16:55:19', modUser:'王五',   sel:false },
  { no:7,  product:'美森快船-普货',     channel:'美森正班',     status:1, statusLabel:'启用', wtPct:10, len:3, wid:3, hei:2, modTime:'2026-08-01 10:25:33', modUser:'庄亚运', sel:false },
];

/* ---- 枚举映射(启用/禁用) ---- */
const WT_ENUM = {
  status: {
    0: { label:'禁用', cls:'prod-status--off' },  /* 禁用-灰 */
    1: { label:'启用', cls:'prod-status--on'  },  /* 启用-绿 */
  },
};

/* ---- 查询区(主行:销售产品 + 服务渠道 + 查询;更多:修改时间) ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('销售产品', `<input class="ipt" placeholder="产品代码/名称" />`)}
        ${f('服务渠道', `<select class="sel"><option value="">全部</option><option>美森正班</option><option>美森加班</option><option>B2B空运直飞</option><option>以星EXX</option><option>长荣海运</option><option>中欧卡航</option></select>`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="WtAdjPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>
      <div class="qp-row qp-more" id="wtMore" style="display:none;">
        ${f('修改时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-07-01" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-06 23:59:59" /></span>`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(对应 FrmWeightAdjustManage 的按钮) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('➕', '新增', "WtAdjPage.openEdit('add')")}
      ${btn('✏', '修改', "WtAdjPage.openEdit('edit')")}
      <span class="sep"></span>
      ${btn('▶', '启用', "WtAdjPage.toggleStatus(1)")}
      ${btn('■', '禁用', "WtAdjPage.toggleStatus(0)")}
      <span class="sep"></span>
      ${btn('🗒', '查看日志', "WtAdjPage.requireSelect('查看日志')")}
      ${btn('⚙', '列表配置', "Helpers.toast('列表配置(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(9 列,严格对应 WeightAdjustRuleListResponse) ---- */
function gridTable() {
  const statusTag = s => {
    const e = WT_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };

  const rows = WT_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td>${r.product}</td>
      <td>${r.channel}</td>
      <td>${statusTag(r.status)}</td>
      <td class="col--num wt-pct">${r.wtPct}%</td>
      <td class="col--num">${r.len}</td>
      <td class="col--num">${r.wid}</td>
      <td class="col--num">${r.hei}</td>
      <td>${r.modTime}</td>
      <td>${r.modUser}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wt-grid-wrap">
      <table class="grid wt-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:160px" />  <!-- 销售产品 -->
          <col style="width:140px" />  <!-- 服务渠道 -->
          <col style="width:80px"  />  <!-- 状态 -->
          <col style="width:100px" />  <!-- 重量调整% -->
          <col style="width:90px"  />  <!-- 长调整CM -->
          <col style="width:90px"  />  <!-- 宽调整CM -->
          <col style="width:90px"  />  <!-- 高调整CM -->
          <col style="width:150px" />  <!-- 最后修改时间 -->
          <col style="width:100px" />  <!-- 最后修改人 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>销售产品</th>
            <th>服务渠道</th>
            <th>状态</th>
            <th title="重量调整(%)">重量调整%</th>
            <th title="长调整(厘米)">长调整CM</th>
            <th title="宽调整(厘米)">宽调整CM</th>
            <th title="高调整(厘米)">高调整CM</th>
            <th>最后修改时间</th>
            <th>最后修改人</th>
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
      <span class="pg-info">总记录数: <b>7</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go">
        <input class="ipt" value="" />
        <button class="pg-btn">GO</button>
        <select class="sel"><option>50</option><option>100</option></select>
      </span>
    </div>
  `;
}

/* ---- 编辑弹窗(新增/修改共用) ----
   字段:销售产品(必填)+服务渠道(必填)+重量调整%(>0≤100整数)+长/宽/高(>0整数)
   备注:"在原基础上减少相应数值"(公式:调整后=原值-规则值) */
function editDialog() {
  return `
    <div class="cn-modal hidden" id="wtModal">
      <div class="rw-modal-mask" onclick="WtAdjPage.closeEdit()"></div>
      <div class="rw-modal-panel">
        <div class="rw-modal-header">
          <span class="rw-modal-title" id="wtModalTitle">新增重量调整规则</span>
          <span class="rw-modal-close" onclick="WtAdjPage.closeEdit()">✕</span>
        </div>
        <div class="rw-modal-body">
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>销售产品</label>
            <input class="ipt rw-form-ipt" id="wtProduct" placeholder="产品代码/名称" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>服务渠道</label>
            <select class="sel rw-form-ipt" id="wtChannel">
              <option value="">请选择</option>
              <option>美森正班</option><option>美森加班</option>
              <option>B2B空运直飞</option><option>以星EXX</option>
              <option>长荣海运</option><option>中欧卡航</option>
            </select>
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>重量调整%</label>
            <input class="ipt rw-form-ipt" id="wtPct" type="number" min="1" max="100" placeholder=">0 且 ≤100 的整数" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>长(CM)</label>
            <input class="ipt rw-form-ipt" id="wtLen" type="number" min="0" placeholder=">0 的整数" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>宽(CM)</label>
            <input class="ipt rw-form-ipt" id="wtWid" type="number" min="0" placeholder=">0 的整数" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>高(CM)</label>
            <input class="ipt rw-form-ipt" id="wtHei" type="number" min="0" placeholder=">0 的整数" />
          </div>
        </div>
        <div class="rw-modal-tip">
          备注:在原基础上减少相应数值。<br />
          计算公式:调整后 = 原值 - 规则值(向下截取,不四舍五入,≥0);体积重除数 6000。
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="WtAdjPage.closeEdit()">取消</button>
          <button class="btn btn--primary" onclick="WtAdjPage.confirmEdit()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const WtAdjPage = {
  editMode: 'add',   /* 'add' | 'edit' */
  toggleMore() {
    const el = document.getElementById('wtMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  getChecked() {
    return document.querySelectorAll('.wt-grid tbody input[type="checkbox"]:checked');
  },
  /* 注:本列表无复选列,选中态靠行点击;这里回退到取行选中 */
  getSelectedRows() {
    return document.querySelectorAll('.wt-grid tbody tr.row--selected');
  },
  requireSelect(action) {
    if (this.getSelectedRows().length === 0) { Helpers.toast('请选择一行数据！'); return; }
    Helpers.toast(`${action}(占位)`);
  },
  /* 打开编辑弹窗 */
  openEdit(mode) {
    this.editMode = mode;
    document.getElementById('wtModalTitle').textContent = mode === 'add' ? '新增重量调整规则' : '修改重量调整规则';
    if (mode === 'edit') {
      const rows = this.getSelectedRows();
      if (rows.length === 0) { Helpers.toast('请选择一行数据！'); return; }
      const no = rows[0].dataset.no;
      const r = WT_ROWS.find(x => x.no == no);
      if (r) {
        document.getElementById('wtProduct').value = r.product;
        document.getElementById('wtChannel').value = r.channel;
        document.getElementById('wtPct').value = r.wtPct;
        document.getElementById('wtLen').value = r.len;
        document.getElementById('wtWid').value = r.wid;
        document.getElementById('wtHei').value = r.hei;
      }
    } else {
      ['wtProduct','wtChannel','wtPct','wtLen','wtWid','wtHei'].forEach(id => document.getElementById(id).value = '');
    }
    document.getElementById('wtModal').classList.remove('hidden');
  },
  closeEdit() {
    document.getElementById('wtModal').classList.add('hidden');
  },
  confirmEdit() {
    const product = document.getElementById('wtProduct').value.trim();
    const channel = document.getElementById('wtChannel').value;
    const pct = parseInt(document.getElementById('wtPct').value, 10);
    const len = parseInt(document.getElementById('wtLen').value, 10);
    const wid = parseInt(document.getElementById('wtWid').value, 10);
    const hei = parseInt(document.getElementById('wtHei').value, 10);
    if (!product) { Helpers.toast('请填写销售产品'); return; }
    if (!channel) { Helpers.toast('请选择服务渠道'); return; }
    if (!(pct > 0 && pct <= 100)) { Helpers.toast('重量调整%须为 >0 且 ≤100 的整数'); return; }
    if (!(len > 0)) { Helpers.toast('长须为 >0 的整数'); return; }
    if (!(wid > 0)) { Helpers.toast('宽须为 >0 的整数'); return; }
    if (!(hei > 0)) { Helpers.toast('高须为 >0 的整数'); return; }
    this.closeEdit();
    Helpers.toast(`${this.editMode === 'add' ? '新增' : '修改'}成功(演示)`);
  },
  /* 启用/禁用(二次确认) */
  toggleStatus(target) {
    const rows = this.getSelectedRows();
    if (rows.length === 0) { Helpers.toast('请选择一行数据！'); return; }
    const label = target === 1 ? '启用' : '禁用';
    const ok = confirm(`确定${label}选中的 ${rows.length} 条规则,是否继续？`);
    if (!ok) return;
    Helpers.toast(`${label}成功 ${rows.length} 条(演示)`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-wt-adj',
  activeTab: 'b-wt-adj',
  tabs: Layout.tabs.standard(),
  content: `
    ${queryPanel()}
    ${gridToolbar()}
    ${gridTable()}
    ${pager()}
    ${editDialog()}
  `,
});

/* 启动底部时钟 */
Helpers.startClock();

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.wt-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.wt-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
