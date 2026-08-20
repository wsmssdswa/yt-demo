/* ============================================
   outbound-scan.js — 退仓扫描页逻辑
   两态分流:① 已登记(关务CIS 下发过指令)→ 直接放行
            ② 其他(无指令/非已发货)→ 拒绝
   登记口径(2026-08-13):退仓登记仅在 PC 端进行(退仓管理页/订单管理页),
     PDA 不承担登记;扫到无指令子单,提示需先在 PC 端登记退仓。
   ============================================ */

/* ---- 模拟数据(演示用,真实环境改为调接口) ----
   RETURNABLE_ORDERS   : 已登记退仓单(直接放行;关务CIS 来源)
   其他                : 无指令 / 非「已发货」状态,拒绝

   单号格式(B2B 大货):
   - 主单号 = YT + 16位数字(年份2/当年序数3/目的国3/流水7/校验1)
   - 子单号 = 主单号 + U + 3位序号(从 U001 起,多子单累加,无 U000) */

// 已登记单(真实环境后端返回来源;演示用前缀区分:不标=关务CIS)
const RETURNABLE_ORDERS = [
  'YT2621000070480962U001',
  'YT2621000070480962U002',
  'YT2621000070480962U003',
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

let records = [];          // 已扫描记录 { subNo, time, source }

/* ---- 渲染 ---- */
// 标签:关务CIS 来源
function srcTagHTML() {
  return '<span class="src-tag src-tag--cis">关务指令</span>';
}
function recordHTML(r) {
  return `
    <div class="record-item">
      <div class="record-top">
        <span class="record-no">${r.subNo}</span>
        <span class="record-time">${r.time}</span>
      </div>
      <div class="record-meta">
        ${srcTagHTML(r)}
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

/* ---- 扫描校验:两态分流 ---- */
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
  // ① 已登记 → 直接放行(关务CIS 来源)
  if (RETURNABLE_ORDERS.includes(subNo)) {
    records.unshift({ subNo, time: Helpers.nowTime(), source: 'CIS' });
    render();
    orderInput.value = '';
    orderInput.focus();
    return;
  }
  // ② 无指令:退仓登记仅在 PC 端,提示后拒绝
  Helpers.toast('该子单无退仓指令,请先在 PC 端登记退仓');
  orderInput.select();
}

/* ---- 全局键盘:适配实体键PDA ---- */
document.addEventListener('keydown', e => {
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
    <div class="test-panel-label">无指令 · 需PC登记</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-no="YT2621000070480964U001">YT2621000070480964U001</span>
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
