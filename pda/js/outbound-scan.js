/* ============================================
   outbound-scan.js — 退仓扫描页逻辑
   三态分流:场景①直接放行 / 场景③无指令登记 / 其他拒绝
   ============================================ */

/* ---- 模拟数据(演示用,真实环境改为调接口) ----
   RETURNABLE_ORDERS   : 在「退件到仓指令」本地清单(场景①,直接放行)
   SHIPPED_NO_INSTRUCT : 「已发货」但无指令(场景③,触发仓库主动登记旁路)
   其他                : 非「已发货」状态,拒绝(不属于已发货退仓订单)

   单号格式(B2B 大货):
   - 主单号 = YT + 16位数字(年份2/当年序数3/目的国3/流水7/校验1)
   - 子单号 = 主单号 + U + 3位序号(从 U001 起,多子单累加,无 U000) */
const RETURNABLE_ORDERS = [
  'YT2621000070480962U001',
  'YT2621000070480962U002',
  'YT2621000070480962U003',
];
const SHIPPED_NO_INSTRUCT = [
  'YT2621000070480963U001',
  'YT2621000070480963U002',
];

// 退件原因枚举(头程发出后、尾程前的退回;仓库主动登记时必选)
const REASONS = [
  '客户取消', '货物破损', '包装异常',
  '违禁/敏感品', '仓库错发', '其他',
];

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
let chosenReason = null;   // 当前选中的退件原因

/* ---- 渲染 ---- */
function recordHTML(r) {
  const tag = r.source === 'warehouse'
    ? '<span class="src-tag src-tag--warehouse">仓库登记</span>'
    : '<span class="src-tag src-tag--cis">关务指令</span>';
  const reasonLine = r.reason
    ? `<div class="record-reason">原因：${r.reason}</div>`
    : '';
  return `
    <div class="record-item">
      <div class="record-top">
        <span class="record-no">${r.subNo}</span>
        <span class="record-time">${r.time}</span>
      </div>
      <div class="record-meta">
        ${tag}
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

/* ---- 登记态:底部抽屉 + 滚轮 picker(场景③) ----
   扫到「已发货无指令」单号 → 从底部弹出抽屉,滚轮选择退件原因 → 确认收货。
   抽屉 append 到 body,不进入设备屏幕结构。 */
const ITEM_H = 40;   // picker 每项高度(px,需与 CSS .picker-item height 一致)

// 构建抽屉 DOM(一次构建,反复显隐)
const drawer = document.createElement('div');
drawer.className = 'drawer hidden';
drawer.innerHTML = `
  <div class="drawer-mask" data-action="cancel"></div>
  <div class="drawer-panel">
    <div class="drawer-header">
      <span class="drawer-cancel" data-action="cancel">取消</span>
      <span class="drawer-title">选择退件原因</span>
      <span class="drawer-confirm" data-action="confirm">确认</span>
    </div>
    <div class="drawer-tip" id="drawerTip">该子单无退件到仓指令,请选择退件原因后登记收货</div>
    <div class="picker" id="picker">
      <div class="picker-highlight"></div>
      <div class="picker-wheel" id="pickerWheel"></div>
    </div>
  </div>
`;
document.querySelector('.device').appendChild(drawer);

const drawerTip    = drawer.querySelector('#drawerTip');
const pickerEl     = drawer.querySelector('#picker');
const pickerWheel  = drawer.querySelector('#pickerWheel');
let pickerIdx = 0;       // 当前选中索引
let wheelTimer = null;   // 滚动结束判定计时器

// 渲染滚轮项(带序号,对应实体数字键 1-N)
function renderPicker() {
  pickerWheel.innerHTML = REASONS.map((r, i) =>
    `<div class="picker-item"><span class="picker-num">${i + 1}</span>${r}</div>`
  ).join('');
}
renderPicker();

// 滚动到指定索引(居中)
function scrollToIdx(idx, smooth = true) {
  pickerIdx = Math.max(0, Math.min(REASONS.length - 1, idx));
  pickerWheel.scrollTo({ top: pickerIdx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
  updatePickerHighlight();
}

// 根据 scrollTop 实时高亮中间项(scrollTop / ITEM_H = 当前居中项索引)
function updatePickerHighlight() {
  const idx = Math.round(pickerWheel.scrollTop / ITEM_H);
  [...pickerWheel.children].forEach((el, i) => {
    el.classList.toggle('picker-item--active', i === idx);
  });
}

// 滚动结束 → 吸附到最近项
pickerWheel.addEventListener('scroll', () => {
  updatePickerHighlight();
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => {
    const idx = Math.round(pickerWheel.scrollTop / ITEM_H);
    if (idx * ITEM_H !== pickerWheel.scrollTop) scrollToIdx(idx);
    pickerIdx = idx;
  }, 120);
});

// 点击某项 → 滚到该项
pickerWheel.addEventListener('click', e => {
  const item = e.target.closest('.picker-item');
  if (!item) return;
  const idx = [...pickerWheel.children].indexOf(item);
  scrollToIdx(idx);
});

// 打开/关闭抽屉
function openDrawer(subNo) {
  pendingSubNo = subNo;
  chosenReason = null;
  drawerTip.innerHTML = `<b>${subNo}</b>无退件到仓指令,请选择退件原因后登记收货`;
  drawer.classList.remove('hidden');
  // 默认选中第一个
  setTimeout(() => scrollToIdx(0, false), 0);
}

function closeDrawer(focusInput = true) {
  drawer.classList.add('hidden');
  if (focusInput) { orderInput.value = ''; orderInput.focus(); }
  pendingSubNo = null;
  chosenReason = null;
}

// 抽屉按钮(取消/确认) + 遮罩点击
drawer.addEventListener('click', e => {
  const action = e.target.dataset.action;
  if (action === 'cancel') { closeDrawer(true); return; }
  if (action === 'confirm') {
    if (!pendingSubNo) return;
    chosenReason = REASONS[pickerIdx];
    records.unshift({
      subNo: pendingSubNo,
      time: Helpers.nowTime(),
      source: 'warehouse',
      reason: chosenReason,
    });
    closeDrawer(false);
    render();
    orderInput.value = ''; orderInput.focus();
    Helpers.toast('已登记退件并收货');
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
  // 场景①:在本地清单 → 直接放行
  if (RETURNABLE_ORDERS.includes(subNo)) {
    records.unshift({ subNo, time: Helpers.nowTime(), source: 'cis' });
    render();
    orderInput.value = '';
    orderInput.focus();
    return;
  }
  // 场景③:已发货但无指令 → 弹出底部抽屉选退件原因
  if (SHIPPED_NO_INSTRUCT.includes(subNo)) {
    openDrawer(subNo);
    orderInput.value = '';
    return;
  }
  // 其他:非已发货状态,拒绝
  Helpers.toast('子单' + subNo + '不属于已发货退仓订单,无法扫描');
  orderInput.select();
}

/* ---- 全局键盘:适配实体键PDA ---- */
document.addEventListener('keydown', e => {
  // 抽屉打开时:数字键1-6/↑↓选原因,Enter确认,Esc取消
  if (!drawer.classList.contains('hidden')) {
    const num = Number(e.key);
    if (num >= 1 && num <= REASONS.length) {
      // 数字键 1-N 直接选中第 N 个原因
      e.preventDefault();
      scrollToIdx(num - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      scrollToIdx(pickerIdx - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      scrollToIdx(pickerIdx + 1);
    } else if (e.key === 'Enter') {
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
    <span class="test-panel-tip">点击复制</span>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">直接放行</div>
    <div class="test-panel-tags">
      ${RETURNABLE_ORDERS.map(no => `<span class="test-panel-tag" data-no="${no}">${no}</span>`).join('')}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">触发登记</div>
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

testPanel.addEventListener('click', async e => {
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  const no = tag.dataset.no;
  try {
    await navigator.clipboard.writeText(no);
    Helpers.toast('已复制:' + no);
  } catch (err) {
    orderInput.value = no;
    orderInput.focus();
    orderInput.select();
    Helpers.toast('复制失败,已填入输入框');
  }
});
