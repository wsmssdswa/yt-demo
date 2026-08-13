/* ============================================
   b-prod-ccos.js — 销售产品-CCOS 页
   依据:code/pc 生产源码
     · 列表模型 ProductListItem(10 列,见 [DataColumn] 标注)
     · 查询 ListProductInput(产品代码批量≤500 + 产品名称模糊 + 生效状态 0未启用/1启用)
     · 窗体 FrmProductManage(按钮:查询/修改/查看日志)
     · 枚举 ProductStatus:0未启用 / 1启用
   ============================================ */

/* ---- 演示数据(8 行:覆盖启用/未启用 + YT/WT 平台 + 真实产品代码 US-MATSU-REG 等) ---- */
const PC_ROWS = [
  { no:1,  status:1, statusLabel:'启用',   code:'US-MATSU-REG',   cnName:'美森快船-普货',     enName:'Matsu Regular',   platform:'YT', remark:'美国海运主力产品', createUser:'庄亚运', createTime:'2026-06-10 09:30:22', modUser:'庄亚运', modTime:'2026-07-28 15:30:22', sel:false },
  { no:2,  status:1, statusLabel:'启用',   code:'US-MATSU-ELC',   cnName:'美森快船-带电',     enName:'Matsu Electronic',platform:'YT', remark:'带电产品专线',    createUser:'庄亚运', createTime:'2026-06-10 10:12:08', modUser:'李四',   modTime:'2026-07-25 16:10:08', sel:false },
  { no:3,  status:1, statusLabel:'启用',   code:'US-AIR-B2B-GEN', cnName:'B2B空运-普货',     enName:'B2B Air General', platform:'WT', remark:'B2B空运直飞',     createUser:'李四',   createTime:'2026-06-15 08:45:11', modUser:'李四',   modTime:'2026-07-20 09:45:11', sel:false },
  { no:4,  status:0, statusLabel:'未启用', code:'US-AIR-B2B-ELC', cnName:'B2B空运-带电',     enName:'B2B Air Electronic',platform:'WT', remark:'暂未上线',        createUser:'李四',   createTime:'2026-06-15 14:20:35', modUser:'王五',   modTime:'2026-07-18 14:20:35', sel:false },
  { no:5,  status:1, statusLabel:'启用',   code:'US-ZIM-REG',     cnName:'以星快船-普货',     enName:'Zim Regular',     platform:'YT', remark:'以星EXX航线',     createUser:'王五',   createTime:'2026-06-20 11:08:47', modUser:'王五',   modTime:'2026-07-15 11:08:47', sel:false },
  { no:6,  status:1, statusLabel:'启用',   code:'US-EVER-REG',    cnName:'长荣海运-普货',     enName:'Evergreen Regular',platform:'YT', remark:'长荣海运直发',    createUser:'王五',   createTime:'2026-06-22 16:55:19', modUser:'王五',   modTime:'2026-07-12 16:55:19', sel:false },
  { no:7,  status:0, statusLabel:'未启用', code:'EU-TRUCK-REG',   cnName:'中欧卡航-普货',     enName:'China-Europe Truck',platform:'YT', remark:'试运行中',        createUser:'庄亚运', createTime:'2026-07-01 10:25:33', modUser:'庄亚运', modTime:'2026-07-30 10:25:33', sel:false },
  { no:8,  status:1, statusLabel:'启用',   code:'US-MATSU-PLUS',  cnName:'美森快船-加急',     enName:'Matsu Plus',      platform:'YT', remark:'加急服务',        createUser:'庄亚运', createTime:'2026-07-05 13:40:18', modUser:'李四',   modTime:'2026-08-01 13:40:18', sel:false },
];

/* ---- 枚举映射(ProductStatus) ---- */
const PC_ENUM = {
  status: {
    0: { label:'未启用', cls:'prod-status--off' },  /* 未启用-灰 */
    1: { label:'启用',   cls:'prod-status--on'  },  /* 启用-绿 */
  },
};

/* ---- 查询区(主行:产品代码 textarea + 产品名称 + 生效状态 + 查询) ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('产品代码', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 500 个"></textarea>`, 'qf--waybill')}
        ${f('产品名称', `<input class="ipt" placeholder="中/英文模糊匹配" />`)}
        ${f('生效状态', `<select class="sel"><option value="">全部</option><option value="1">启用</option><option value="0">未启用</option></select>`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 工具栏(对应 FrmProductManage 的按钮) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('✏', '修改', "ProdCcosPage.openEdit()")}
      ${btn('🗒', '查看日志', "ProdCcosPage.requireSelect('查看日志')")}
      <span class="sep"></span>
      ${btn('⚙', '列表配置', "Helpers.toast('列表配置(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(10 列,严格对应 ProductListItem) ---- */
function gridTable() {
  const statusTag = s => {
    const e = PC_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };
  /* 平台标签:YT/WT 用不同色 */
  const platformTag = p => {
    const cls = p === 'YT' ? 'pc-plat--yt' : 'pc-plat--wt';
    return `<span class="pc-plat ${cls}">${p}</span>`;
  };

  const rows = PC_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td>${statusTag(r.status)}</td>
      <td class="col--code">${r.code}</td>
      <td>${r.cnName}</td>
      <td>${r.enName}</td>
      <td>${platformTag(r.platform)}</td>
      <td>${r.remark}</td>
      <td>${r.createUser}</td>
      <td>${r.createTime}</td>
      <td>${r.modUser}</td>
      <td>${r.modTime}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap pc-grid-wrap">
      <table class="grid pc-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:80px"  />  <!-- 产品状态 -->
          <col style="width:160px" />  <!-- 产品代码 -->
          <col style="width:140px" />  <!-- 中文名称 -->
          <col style="width:160px" />  <!-- 英文名称 -->
          <col style="width:70px"  />  <!-- 平台用户 -->
          <col style="width:160px" />  <!-- 备注 -->
          <col style="width:90px"  />  <!-- 创建人 -->
          <col style="width:140px" />  <!-- 创建时间 -->
          <col style="width:90px"  />  <!-- 最后修改人 -->
          <col style="width:140px" />  <!-- 最后修改时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>产品状态</th>
            <th>产品代码</th>
            <th>中文名称</th>
            <th>英文名称</th>
            <th title="平台用户:YT=纵腾 / WT=其他">平台</th>
            <th>备注</th>
            <th>创建人</th>
            <th>创建时间</th>
            <th>最后修改人</th>
            <th>最后修改时间</th>
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
        <select class="sel"><option>50</option><option>100</option></select>
      </span>
    </div>
  `;
}

/* ---- 修改弹窗 ---- */
function editDialog() {
  return `
    <div class="cn-modal hidden" id="pcModal">
      <div class="rw-modal-mask" onclick="ProdCcosPage.closeEdit()"></div>
      <div class="rw-modal-panel">
        <div class="rw-modal-header">
          <span class="rw-modal-title">修改销售产品</span>
          <span class="rw-modal-close" onclick="ProdCcosPage.closeEdit()">✕</span>
        </div>
        <div class="rw-modal-body">
          <div class="rw-form-row">
            <label class="rw-form-label">产品代码</label>
            <input class="ipt rw-form-ipt" id="pcCode" readonly />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>中文名称</label>
            <input class="ipt rw-form-ipt" id="pcCnName" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>英文名称</label>
            <input class="ipt rw-form-ipt" id="pcEnName" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label">备注</label>
            <input class="ipt rw-form-ipt" id="pcRemark" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>生效状态</label>
            <select class="sel rw-form-ipt" id="pcStatus">
              <option value="1">启用</option>
              <option value="0">未启用</option>
            </select>
          </div>
        </div>
        <div class="rw-modal-tip">产品代码不可修改,为唯一标识。修改保存后即时生效。</div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="ProdCcosPage.closeEdit()">取消</button>
          <button class="btn btn--primary" onclick="ProdCcosPage.confirmEdit()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const ProdCcosPage = {
  getSelectedRows() {
    return document.querySelectorAll('.pc-grid tbody tr.row--selected');
  },
  requireSelect(action) {
    if (this.getSelectedRows().length === 0) { Helpers.toast('请选择一行数据！'); return; }
    Helpers.toast(`${action}(占位)`);
  },
  openEdit() {
    const rows = this.getSelectedRows();
    if (rows.length === 0) { Helpers.toast('请选择一行数据！'); return; }
    const no = rows[0].dataset.no;
    const r = PC_ROWS.find(x => x.no == no);
    if (r) {
      document.getElementById('pcCode').value = r.code;
      document.getElementById('pcCnName').value = r.cnName;
      document.getElementById('pcEnName').value = r.enName;
      document.getElementById('pcRemark').value = r.remark;
      document.getElementById('pcStatus').value = r.status;
    }
    document.getElementById('pcModal').classList.remove('hidden');
  },
  closeEdit() {
    document.getElementById('pcModal').classList.add('hidden');
  },
  confirmEdit() {
    const cn = document.getElementById('pcCnName').value.trim();
    const en = document.getElementById('pcEnName').value.trim();
    if (!cn) { Helpers.toast('请填写中文名称'); return; }
    if (!en) { Helpers.toast('请填写英文名称'); return; }
    this.closeEdit();
    Helpers.toast('修改成功(演示)');
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-prod-ccos',
  activeTab: 'b-prod-ccos',
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
  const tr = e.target.closest('.pc-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT') return;
  document.querySelectorAll('.pc-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
