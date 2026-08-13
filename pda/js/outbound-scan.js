/* ============================================
   outbound-scan.js — 退仓扫描页逻辑
   三态分流:场景①关务/TMS 已登记 → 直接放行
            场景③货到仓无指令 → 仓库登记(填原因文本,只登记"其他原因")
            其他 → 拒绝
   兜底口径(2026-08-12):CIS/TMS 原因退仓必先登记(OFP 下发),仓库不代登记;
     没登记的线下沟通补登记;仓库登记只登记"其他原因",填原因文本,纯本地登记。
   原因复用(2026-08-12):抽屉列出同主单已登记原因可点选;勾选「后续子单按此原因
     直接入库」后,本次扫描会话内同票无指令子单直接入库,退出页面清缓存。
   ============================================ */

/* ---- 模拟数据(演示用,真实环境改为调接口) ----
   RETURNABLE_ORDERS   : 已登记退仓单(场景①,直接放行;含关务CIS / TMS运力两种来源)
   SHIPPED_NO_INSTRUCT : 「已发货」但无任何指令(场景③,触发仓库登记)
   SAME_BILL_REASONS   : 演示"同主单已登记原因"(真实环境弹窗时按主单查后端)
   其他                : 非「已发货」状态,拒绝(不属于已发货退仓订单)

   单号格式(B2B 大货):
   - 主单号 = YT + 16位数字(年份2/当年序数3/目的国3/流水7/校验1)
   - 子单号 = 主单号 + U + 3位序号(从 U001 起,多子单累加,无 U000) */

// 场景① 已登记单(真实环境后端返回来源;演示用前缀区分:不标=关务CIS,*=TMS运力)
const RETURNABLE_ORDERS = [
  'YT2621000070480962U001',
  'YT2621000070480962U002',
  'YT2621000070480962U003',
];
// 同一主单下另一箱,演示「TMS 运力退仓」来源(用 |TMS 后缀标记来源,仅演示用)
const RETURNABLE_ORDERS_TMS = [
  'YT2621000070480963U001',
];
const SHIPPED_NO_INSTRUCT = [
  'YT2621000070480964U001',
  'YT2621000070480964U002',
  'YT2621000070480964U004',
];

// 演示"同主单已登记原因"(真实环境弹窗时按主单号查后端返回)
// key=主单号, value=已登记子单的原因列表(展示"U001:原因A"供点选)
const SAME_BILL_REASONS = {
  'YT2621000070480964': [
    { subNo: 'YT2621000070480964U001', reason: '客户要求退回' },
    { subNo: 'YT2621000070480964U003', reason: '尾程派送失败退回' },
  ],
};

// 渲染页面结构
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('退仓扫描')}

  <!-- 信息卡片:单号(扫描态) -->
  <div class="info-card" id="scanCard">
    <div class="info-row">
      <span class="info-label">单号：</span>
      <input type="text" id="orderNo" class="info-input"
             placeholder="扫描子单号/子单跟踪号" autocomplete="off" />
    </div>
  </div>

  <!-- 扫描记录标题(扫描态) -->
  <div class="records-title" id="recordsTitle">
    扫描记录 <span class="records-count" id="scanCount">(0)</span>
  </div>

  <!-- 空状态提示(无记录时显示) -->
  <div class="empty-state" id="emptyState">
    <div class="empty-icon">📭</div>
    <div class="empty-text">暂无扫描记录</div>
    <div class="empty-sub">请在上方扫描或输入子单号</div>
  </div>

  <!-- 扫描记录列表(有记录时显示) -->
  <div class="scan-records hidden" id="scanRecords"></div>
`);

// 启动时钟
Helpers.startClock();

/* ---- DOM 引用(渲染后才拿得到) ---- */
const orderInput   = document.getElementById('orderNo');
const scanCount    = document.getElementById('scanCount');
const emptyState   = document.getElementById('emptyState');
const scanRecords  = document.getElementById('scanRecords');
const scanCard     = document.getElementById('scanCard');
const recordsTitle = document.getElementById('recordsTitle');

let records = [];          // 已扫描记录 { subNo, time, source, reason? }
let pendingSubNo = null;   // 当前待登记的子单号

/* ---- 渲染 ---- */
// 标签按来源区分:关务CIS / 运力TMS / 仓库登记(其他原因)
function srcTagHTML(r) {
  // 场景① 已登记(后端返回来源)
  if (r.from === 'registered') {
    if (r.source === 'TMS') return '<span class="src-tag src-tag--tms">运力退仓</span>';
    return '<span class="src-tag src-tag--cis">关务指令</span>';
  }
  // 场景③ 仓库登记(其他原因,纯本地登记)
  return '<span class="src-tag src-tag--wh">仓库登记</span>';
}
function recordHTML(r) {
  const reasonLine = r.reason
    ? `<div class="record-reason">原因：${r.reason}${r.viaApply ? '<span class="record-apply-tag">勾选复用</span>' : ''}</div>`
    : '';
  return `
    <div class="record-item">
      <div class="record-top">
        <span class="record-no">${r.subNo}</span>
        <span class="record-time">${r.time}</span>
      </div>
      <div class="record-meta">
        ${srcTagHTML(r)}
        ${reasonLine}
      </div>
    </div>
  `;
}

function render() {
  scanCount.textContent = '(' + records.length + ')';
  if (records.length === 0) {
    emptyState.classList.remove('hidden');
    scanRecords.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    scanRecords.classList.remove('hidden');
    scanRecords.innerHTML = records.map(recordHTML).join('');
  }
}

/* ---- 登记态:底部抽屉 + 原因文本输入(场景③) ----
   扫到「已发货无指令」单号 → 弹抽屉,填退仓原因文本 → 确认收货。
   抽屉内:①列出同主单已登记原因(可点选填入) ②勾选「后续子单按此原因直接入库」。
   仓库登记只登记"其他原因"(不选 CIS/TMS 原因列表),纯本地登记。
   抽屉 append 到 .device,不进入设备屏幕结构。 */

// 构建抽屉 DOM(一次构建,反复显隐)
const drawer = document.createElement('div');
drawer.className = 'drawer hidden';
drawer.innerHTML = `
  <div class="drawer-mask" data-action="cancel"></div>
  <div class="drawer-panel">
    <div class="drawer-header">
      <span class="drawer-cancel" data-action="cancel">取消</span>
      <span class="drawer-title">仓库登记退仓</span>
      <span class="drawer-confirm" data-action="confirm">确认</span>
    </div>
    <div class="drawer-tip" id="drawerTip">该子单无退件到仓指令,请填写退仓原因后登记收货</div>
    <textarea id="reasonInput" class="drawer-input" rows="2"
              placeholder="填写退仓原因(其他原因)" autocomplete="off"></textarea>
    <div class="drawer-same-reasons" id="sameReasons">
      <div class="same-reasons-title">同票已登记原因(可点选)</div>
      <div class="same-reasons-list" id="sameReasonsList"></div>
    </div>
    <label class="drawer-apply">
      <input type="checkbox" id="applyReason" />
      <span>本票后续子单按此原因直接入库(本次扫描有效)</span>
    </label>
  </div>
`;
document.querySelector('.device').appendChild(drawer);

const drawerTip     = drawer.querySelector('#drawerTip');
const reasonInput   = drawer.querySelector('#reasonInput');
const sameReasons   = drawer.querySelector('#sameReasons');
const sameList      = drawer.querySelector('#sameReasonsList');
const applyCheckbox = drawer.querySelector('#applyReason');

// 勾选生效的会话内复用:key=主单号, value=原因文本(仅本次扫描,退出页面即失效)
let applyReasonMap = {};

// 打开抽屉:查同主单已登记原因并渲染
function openDrawer(subNo) {
  pendingSubNo = subNo;
  reasonInput.value = '';
  applyCheckbox.checked = false;
  /* 按主单号查同票已登记原因(演示用映射;真实环境调后端) */
  const waybill = subNo.replace(/U\d+$/, '');
  const reasons = SAME_BILL_REASONS[waybill] || [];
  if (reasons.length === 0) {
    sameReasons.classList.add('hidden');
    sameList.innerHTML = '';
  } else {
    sameReasons.classList.remove('hidden');
    sameList.innerHTML = reasons.map((r, i) =>
      `<div class="same-reason-item" data-idx="${i}">
         <span class="same-reason-sub">${i + 1}</span>
         <span class="same-reason-text">${r.reason}</span>
       </div>`).join('');
  }
  drawerTip.innerHTML = `<b>${subNo}</b>无退件到仓指令,请填写退仓原因后登记收货`;
  drawer.classList.remove('hidden');
  /* 延后聚焦:等 slide-up 动画(.25s)结束后再 focus,避免动画期间聚焦引发背景滚动跳动 */
  setTimeout(() => reasonInput.focus(), 260);
}

// 点选已有原因 → 填入输入框
sameList.addEventListener('click', e => {
  const item = e.target.closest('.same-reason-item');
  if (!item) return;
  const waybill = pendingSubNo.replace(/U\d+$/, '');
  const reasons = SAME_BILL_REASONS[waybill] || [];
  const r = reasons[Number(item.dataset.idx)];
  if (r) { reasonInput.value = r.reason; reasonInput.focus(); }
});

function closeDrawer(focusInput = true) {
  drawer.classList.add('hidden');
  if (focusInput) { orderInput.value = ''; orderInput.focus(); }
  pendingSubNo = null;
}

// 登记一条仓库登记记录(共用)
function addFallbackRecord(subNo, reason, viaApply = false) {
  records.unshift({
    subNo, time: Helpers.nowTime(), source: 'WH', reason,
    viaApply,   // 是否勾选复用直接入库
  });
  render();
}

// 抽屉按钮(取消/确认) + 遮罩点击
drawer.addEventListener('click', e => {
  const action = e.target.dataset.action;
  if (action === 'cancel') { closeDrawer(true); return; }
  if (action === 'confirm') {
    if (!pendingSubNo) return;
    const reason = reasonInput.value.trim();
    if (!reason) { Helpers.toast('请填写退仓原因'); return; }
    addFallbackRecord(pendingSubNo, reason);
    /* 勾选:本次扫描会话内,同票后续无指令子单直接入库 */
    if (applyCheckbox.checked) {
      const waybill = pendingSubNo.replace(/U\d+$/, '');
      applyReasonMap[waybill] = reason;
    }
    closeDrawer(false);
    Helpers.toast('已登记退仓并收货(仓库登记,纯本地)');
  }
});

/* ---- 扫描校验:三态分流 ---- */
function handleScan() {
  const subNo = orderInput.value.trim();
  if (!subNo) return;

  // 已扫过:重复扫描
  if (records.some(r => r.subNo === subNo)) {
    Helpers.toast('该退仓子单已经处理完成,无需重复操作');
    orderInput.value = '';
    orderInput.focus();
    return;
  }
  // 场景①:已登记 → 直接放行(区分来源 CIS/TMS)
  if (RETURNABLE_ORDERS.includes(subNo)) {
    records.unshift({ subNo, time: Helpers.nowTime(), from: 'registered', source: 'CIS' });
    render();
    orderInput.value = '';
    orderInput.focus();
    return;
  }
  if (RETURNABLE_ORDERS_TMS.includes(subNo)) {
    records.unshift({ subNo, time: Helpers.nowTime(), from: 'registered', source: 'TMS' });
    render();
    orderInput.value = '';
    orderInput.focus();
    return;
  }
  // 场景③:已发货但无任何指令 → 仓库登记
  if (SHIPPED_NO_INSTRUCT.includes(subNo)) {
    /* 勾选复用:同票已有原因 → 直接入库,不弹窗 */
    const waybill = subNo.replace(/U\d+$/, '');
    const saved = applyReasonMap[waybill];
    if (saved) {
      addFallbackRecord(subNo, saved, true);
      orderInput.value = '';
      orderInput.focus();
      Helpers.toast('已按原因"' + saved + '"直接入库(勾选复用)');
      return;
    }
    openDrawer(subNo);
    orderInput.blur();   // 先失焦背景输入框,避免抽屉弹出时焦点滚动
    orderInput.value = '';
    return;
  }
  // 其他:非已发货状态,拒绝
  Helpers.toast('子单' + subNo + '不属于已发货退仓订单,无法扫描');
  orderInput.select();
}

/* ---- 全局键盘:适配实体键PDA ---- */
document.addEventListener('keydown', e => {
  // 抽屉打开时:Enter在原因备注框内为换行,Esc取消
  if (!drawer.classList.contains('hidden')) {
    if (e.key === 'Enter' && document.activeElement !== reasonInput) {
      // 焦点不在原因框(如刚扫完未聚焦)时,Enter 走确认
      e.preventDefault();
      drawer.querySelector('.drawer-confirm').click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDrawer(true);
    }
    return;
  }
  // 扫描态下:Enter提交扫描(输入框内)
  if (e.key === 'Enter' && document.activeElement === orderInput) {
    e.preventDefault();
    handleScan();
  }
});

render();

/* ---- 演示单号:放到设备框外侧(桌面端留白区),点击复制 ----
   仅桌面端可见(移动端真实 PDA 无外侧留白,隐藏) */
const testPanel = document.createElement('div');
testPanel.className = 'test-panel';
testPanel.innerHTML = `
  <div class="test-panel-title">
    <span>演示单号</span>
    <span class="test-panel-tip">点击演示</span>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">关务退仓 · 放行</div>
    <div class="test-panel-tags">
      ${RETURNABLE_ORDERS.map(no => `<span class="test-panel-tag" data-no="${no}">${no}</span>`).join('')}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">运力退仓 · 放行</div>
    <div class="test-panel-tags">
      ${RETURNABLE_ORDERS_TMS.map(no => `<span class="test-panel-tag" data-no="${no}">${no}</span>`).join('')}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">未登记 · 仓库登记</div>
    <div class="test-panel-tags">
      ${SHIPPED_NO_INSTRUCT.map(no => `<span class="test-panel-tag" data-no="${no}">${no}</span>`).join('')}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">无效单号</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-no="YT2621000070480999U005">YT2621000070480999U005</span>
    </div>
  </div>
`;
document.body.appendChild(testPanel);

// 点击演示单号 → 填入并直接触发查询(评审演示一步到位)
testPanel.addEventListener('click', e => {
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  orderInput.value = tag.dataset.no;
  handleScan();
});
