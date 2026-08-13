/* ============================================
   b-push.js — 推送配置页
   依据:code/pc 生产源码
     · 配置区:启用开关 + 触发事件(配载回退/订单退件 复选)+ 路由规则Grid(产品类型+目的国家+通知人)
       + 消息模板(配载回退/订单退件/订单换单,变量锁定)
     · 日志区 ListPushLogItem(10 列):规则类型|主单号|新主单号|产品代码|国家|推送状态|错误信息|推送时间|创建时间|重推(行内)
     · 日志查询 ListPushLogInput:推送时间(≤31天)+ 状态(0未推/1已推/2失败/3无需)
     · 按钮:查询 / 推送配置 / 重推
     · 枚举 PushStatus:0未推 / 1已推 / 2失败 / 3无需
   ============================================ */

/* ---- 配置:路由规则演示数据(3 行) ---- */
const PUSH_RULE_ROWS = [
  { no:1, prodType:'美森快船-普货',  country:'美国',  receiver:'客服A组,关务B组', sel:false },
  { no:2, prodType:'B2B空运-普货',  country:'美国',  receiver:'客服A组',          sel:false },
  { no:3, prodType:'中欧卡航-普货',  country:'德国',  receiver:'运力C组,关务B组',  sel:false },
];

/* ---- 日志演示数据(7 行:覆盖 4 种推送状态 + 三种规则类型) ---- */
const PUSH_LOG_ROWS = [
  { no:1, ruleType:'配载回退', waybill:'YT2621601300301272', newWaybill:'YT2621601300301399', code:'US-MATSU-REG',   country:'美国', status:1, statusLabel:'已推', err:'',        pushTime:'2026-08-05 14:30:22', createTime:'2026-08-05 14:29:50', sel:false },
  { no:2, ruleType:'订单退件', waybill:'YT2621601300301249', newWaybill:'',                 code:'US-MATSU-ELC',   country:'美国', status:1, statusLabel:'已推', err:'',        pushTime:'2026-08-05 13:15:08', createTime:'2026-08-05 13:14:40', sel:false },
  { no:3, ruleType:'订单换单', waybill:'YT2621601300301227', newWaybill:'YT2621601300301411', code:'US-AIR-B2B-GEN', country:'美国', status:2, statusLabel:'失败', err:'消息模板变量 ${主单号} 缺失', pushTime:'2026-08-05 11:45:33', createTime:'2026-08-05 11:45:10', sel:false },
  { no:4, ruleType:'配载回退', waybill:'YT2621601300301201', newWaybill:'YT2621601300301422', code:'US-ZIM-REG',     country:'美国', status:0, statusLabel:'未推', err:'',        pushTime:'',                    createTime:'2026-08-05 10:20:15', sel:false },
  { no:5, ruleType:'订单退件', waybill:'YT2621601300101052', newWaybill:'',                 code:'US-EVER-REG',    country:'美国', status:3, statusLabel:'无需', err:'未匹配到路由规则',     pushTime:'',                    createTime:'2026-08-05 09:08:47', sel:false },
  { no:6, ruleType:'配载回退', waybill:'YT2621625700100026', newWaybill:'YT2621625700100038', code:'EU-TRUCK-REG',   country:'德国', status:1, statusLabel:'已推', err:'',        pushTime:'2026-08-04 18:55:19', createTime:'2026-08-04 18:54:50', sel:false },
  { no:7, ruleType:'订单换单', waybill:'YT2621624300300047', newWaybill:'YT2621624300300058', code:'US-MATSU-PLUS',  country:'美国', status:2, statusLabel:'失败', err:'通知人列表为空',       pushTime:'2026-08-04 16:40:33', createTime:'2026-08-04 16:40:10', sel:false },
];

/* ---- 枚举映射(PushStatus) ---- */
const PUSH_ENUM = {
  status: {
    0: { label:'未推', cls:'push-status--wait'  },  /* 未推-灰 */
    1: { label:'已推', cls:'push-status--done'  },  /* 已推-绿 */
    2: { label:'失败', cls:'push-status--fail'  },  /* 失败-红 */
    3: { label:'无需', cls:'push-status--skip'  },  /* 无需-浅灰 */
  },
};

/* ---- 查询区(日志查询:推送时间 + 状态 + 查询 + 推送配置按钮) ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;
  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('推送时间', `<span class="qf-range"><input class="ipt ipt--date" value="2026-07-06" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-06 23:59:59" /></span>`)}
        ${f('状态', `<select class="sel"><option value="">全部</option><option value="0">未推</option><option value="1">已推</option><option value="2">失败</option><option value="3">无需</option></select>`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn btn--primary" onclick="PushPage.openConfig()">⚙ 推送配置</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 工具栏(日志区按钮:重推) ---- */
function gridToolbar() {
  const btn = (icon, text, onClick) =>
    `<button class="btn" onclick="${onClick || `Helpers.toast('${text}(占位)')`}">
       <span class="ic">${icon}</span><span>${text}</span>
     </button>`;
  return `
    <div class="grid-toolbar">
      ${btn('🔁', '重推', "PushPage.repush()")}
      <span class="sep"></span>
      ${btn('⚙', '列表配置', "Helpers.toast('列表配置(占位)')")}
    </div>
  `;
}

/* ---- 数据表格(10 列,严格对应 ListPushLogItem;重推为行内按钮) ---- */
function gridTable() {
  const statusTag = s => {
    const e = PUSH_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };

  const rows = PUSH_LOG_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td>${r.ruleType}</td>
      <td class="col--code">${r.waybill}</td>
      <td class="col--code">${r.newWaybill || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--code">${r.code}</td>
      <td>${r.country}</td>
      <td>${statusTag(r.status)}</td>
      <td class="push-err">${r.err || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.pushTime || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.createTime}</td>
      <td class="col--center">
        <button class="btn btn--text" onclick="PushPage.repushRow(${r.no})">重推</button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap push-grid-wrap">
      <table class="grid push-grid">
        <colgroup>
          <col style="width:36px"  />  <!-- NO -->
          <col style="width:100px" />  <!-- 规则类型 -->
          <col style="width:170px" />  <!-- 主单号 -->
          <col style="width:170px" />  <!-- 新主单号 -->
          <col style="width:150px" />  <!-- 产品代码 -->
          <col style="width:80px"  />  <!-- 国家 -->
          <col style="width:80px"  />  <!-- 推送状态 -->
          <col style="width:200px" />  <!-- 错误信息 -->
          <col style="width:150px" />  <!-- 推送时间 -->
          <col style="width:150px" />  <!-- 创建时间 -->
          <col style="width:70px"  />  <!-- 重推 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>规则类型</th>
            <th>主单号</th>
            <th>新主单号</th>
            <th>产品代码</th>
            <th>国家</th>
            <th>推送状态</th>
            <th>错误信息</th>
            <th>推送时间</th>
            <th>创建时间</th>
            <th>操作</th>
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

/* ---- 推送配置弹窗(启用开关 + 触发事件 + 路由规则Grid + 消息模板) ---- */
function configDialog() {
  const ruleRows = PUSH_RULE_ROWS.map(r => `
    <tr data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td>${r.prodType}</td>
      <td>${r.country}</td>
      <td>${r.receiver}</td>
      <td class="col--center">
        <button class="btn btn--text" onclick="Helpers.toast('编辑规则(占位)')">编辑</button>
        <button class="btn btn--text" onclick="PushPage.delRule(${r.no})">删除</button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="cn-modal hidden" id="pushModal">
      <div class="rw-modal-mask" onclick="PushPage.closeConfig()"></div>
      <div class="rw-modal-panel rw-modal-panel--wide">
        <div class="rw-modal-header">
          <span class="rw-modal-title">推送配置</span>
          <span class="rw-modal-close" onclick="PushPage.closeConfig()">✕</span>
        </div>
        <div class="rw-modal-body">
          <!-- 启用开关 -->
          <div class="push-cfg-row">
            <label class="push-cfg-label"><span class="rw-req">*</span>启用推送</label>
            <label class="qp-cb"><input type="checkbox" checked /> 启用(总开关,关闭后所有推送停止)</label>
          </div>
          <!-- 触发事件 -->
          <div class="push-cfg-row">
            <label class="push-cfg-label"><span class="rw-req">*</span>触发事件</label>
            <div class="push-cfg-events">
              <label class="qp-cb"><input type="checkbox" checked /> 配载回退</label>
              <label class="qp-cb"><input type="checkbox" checked /> 订单退件</label>
              <label class="qp-cb"><input type="checkbox" /> 订单换单</label>
            </div>
          </div>
          <!-- 路由规则 Grid -->
          <div class="push-cfg-row">
            <label class="push-cfg-label">路由规则</label>
            <div class="push-cfg-grid">
              <div class="grid-toolbar" style="padding:0 0 6px;">
                <button class="btn" onclick="Helpers.toast('新增规则(占位)')"><span class="ic">➕</span><span>新增</span></button>
              </div>
              <div class="grid-wrap" style="max-height:160px;">
                <table class="grid">
                  <colgroup>
                    <col style="width:36px" /><col style="width:160px" />
                    <col style="width:100px" /><col style="width:200px" /><col style="width:120px" />
                  </colgroup>
                  <thead><tr>
                    <th>NO.</th><th>产品类型</th><th>目的国家</th><th>通知人</th><th>操作</th>
                  </tr></thead>
                  <tbody>${ruleRows}</tbody>
                </table>
              </div>
            </div>
          </div>
          <!-- 消息模板 -->
          <div class="push-cfg-row">
            <label class="push-cfg-label">消息模板</label>
            <div class="push-cfg-templates">
              <div class="push-tpl-item">
                <div class="push-tpl-head">配载回退</div>
                <textarea class="ipt push-tpl-body" rows="2">主单号 ${'$'}{主单号} 已配载回退,新主单号 ${'$'}{新主单号},请关注。</textarea>
              </div>
              <div class="push-tpl-item">
                <div class="push-tpl-head">订单退件</div>
                <textarea class="ipt push-tpl-body" rows="2">主单号 ${'$'}{主单号}(${'$'}{产品代码}) 发生退件,原因 ${'$'}{退件原因}。</textarea>
              </div>
              <div class="push-tpl-item">
                <div class="push-tpl-head">订单换单</div>
                <textarea class="ipt push-tpl-body" rows="2">主单号 ${'$'}{主单号} 已换单为新单 ${'$'}{新主单号},渠道 ${'$'}{服务渠道}。</textarea>
              </div>
            </div>
          </div>
          <div class="rw-modal-tip">模板变量 ${'$'}{主单号} / ${'$'}{新主单号} / ${'$'}{产品代码} 等为系统锁定,不可删除,仅可调整外文案。</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="PushPage.closeConfig()">取消</button>
          <button class="btn btn--primary" onclick="PushPage.saveConfig()">保存配置</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑 ---- */
const PushPage = {
  getChecked() {
    return document.querySelectorAll('.push-grid tbody input[type="checkbox"]:checked');
  },
  /* 推送配置弹窗 */
  openConfig() {
    document.getElementById('pushModal').classList.remove('hidden');
  },
  closeConfig() {
    document.getElementById('pushModal').classList.add('hidden');
  },
  saveConfig() {
    this.closeConfig();
    Helpers.toast('推送配置已保存(演示)');
  },
  delRule(no) {
    const ok = confirm(`确定删除路由规则 ${no},是否继续？`);
    if (!ok) return;
    Helpers.toast(`删除规则 ${no} 成功(演示)`);
  },
  /* 工具栏:批量重推(对选中行;无复选列则回退到行选中) */
  repush() {
    const rows = document.querySelectorAll('.push-grid tbody tr.row--selected');
    if (rows.length === 0) { Helpers.toast('请选择要重推的记录！'); return; }
    const ok = confirm(`确定重推选中的 ${rows.length} 条记录,是否继续？`);
    if (!ok) return;
    Helpers.toast(`重推成功 ${rows.length} 条(演示)`);
  },
  /* 行内重推按钮 */
  repushRow(no) {
    Helpers.toast(`重推主单 ${PUSH_LOG_ROWS[no-1].waybill}(演示)`);
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-push',
  activeTab: 'b-push',
  tabs: Layout.tabs.standard(),
  content: `
    ${queryPanel()}
    ${gridToolbar()}
    ${gridTable()}
    ${pager()}
    ${configDialog()}
  `,
});

/* 启动底部时钟 */
Helpers.startClock();

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.push-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
  document.querySelectorAll('.push-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
