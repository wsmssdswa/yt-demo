/* ============================================
   security-check.js — 安检拦截页逻辑
   拦截原因 = 扫描时应用的理由(非筛选);扫描即生成一条拦截成功记录
   ============================================ */

/* ---- 模拟数据(演示用,真实环境改为调接口) ---- */

// 下拉可选项:扫描时应用的原因(非筛选器)
const REASON_OPTIONS = [
  '普货渠道限制-电池类',
  '普货渠道限制-液体类',
  '普货渠道限制-粉末类',
  '敏感货渠道限制-化妆品',
  '违禁品-危险品',
  '海关查验扣留',
  '其他',
];

// 不同原因对应的销售产品 / 服务渠道(使记录字段更完整真实)
const META_BY_REASON = {
  '普货渠道限制-电池类':   { product: 'B2B空运',    channel: '空运-美森快船' },
  '普货渠道限制-液体类':   { product: 'B2B空运',    channel: '空运-普船' },
  '普货渠道限制-粉末类':   { product: '海运拼柜',    channel: '海运-普船' },
  '敏感货渠道限制-化妆品': { product: '敏感货空运',  channel: '空派' },
  '违禁品-危险品':         { product: '敏感货空运',  channel: '空派' },
  '海关查验扣留':          { product: '海运整柜',    channel: '海运-普船' },
  '其他':                  { product: '全程代理',    channel: 'FBA海卡' },
};

// 初始记录(截图原样:拦截原因未填写,销售产品=B2B空运)
const INITIAL_RECORDS = [
  {
    subNo: 'YT2621501300301324U001',
    time: '2026-08-03 11:16:45',
    status: 'success',         // 仅 success(拦截成功),无待处理
    reason: '',                // 历史记录,原因未填 → 显示占位
    product: 'B2B空运',
    channel: '',
  },
];

// 渲染页面结构
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBarWithMenu('安检拦截')}

  <!-- 拦截原因:扫描时应用的原因(非筛选) -->
  <div class="sec-filter">
    <label class="sec-filter-label">拦截原因：</label>
    <div class="sec-select-wrap">
      <select class="sec-select" id="reasonSelect">
        ${REASON_OPTIONS.map((r, i) =>
          `<option value="${r}" ${i === 0 ? 'selected' : ''}>${r}</option>`
        ).join('')}
      </select>
      <span class="sec-select-arrow">∨</span>
    </div>
  </div>

  <!-- 扫描区域 -->
  <div class="sec-scan-area" id="scanArea">
    <div class="sec-scan-icon" id="scanBtn">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="6" stroke="#00A99D" stroke-width="2.5" fill="none"/>
        <rect x="14" y="14" width="8" height="8" rx="1.5" fill="#00A99D"/>
        <rect x="26" y="14" width="8" height="8" rx="1.5" fill="#00A99D"/>
        <rect x="14" y="26" width="8" height="8" rx="1.5" fill="#00A99D"/>
        <line x1="26" y1="30" x2="34" y2="30" stroke="#00A99D" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="30" y1="26" x2="30" y2="34" stroke="#00A99D" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="sec-scan-text">扫描子单号</div>
  </div>

  <!-- 拦截记录标题(显示总数) -->
  <div class="records-title" id="recordsTitle">
    拦截记录 <span class="records-count" id="recordCount">(1)</span>
  </div>

  <!-- 可滚动记录列表区(记录不随原因筛选变化) -->
  <div class="scroll-area sec-list-area" id="listArea"></div>
`);

// 启动时钟
Helpers.startClock();

/* ---- DOM 引用 ---- */
const reasonSelect  = document.getElementById('reasonSelect');
const recordCount   = document.getElementById('recordCount');
const listArea      = document.getElementById('listArea');
const scanBtn       = document.getElementById('scanBtn');

let records = [...INITIAL_RECORDS];
let currentReason = REASON_OPTIONS[0];   // 当前选择的原因,用于下一条扫描
let scanSeq = 2;                          // 新子单单号序号(从 U002 起)

// 选择原因仅更新 currentReason,不影响已有记录列表
reasonSelect.addEventListener('change', () => {
  currentReason = reasonSelect.value;
});

/* ---- 生成下一条子单号 ---- */
function nextSubNo() {
  const no = 'YT2621501300301324U' + String(scanSeq).padStart(3, '0');
  scanSeq++;
  return no;
}

/* ---- 渲染单条拦截记录卡片(状态固定:拦截成功) ---- */
function recordCardHTML(r) {
  const meta = META_BY_REASON[r.reason] || {};
  const reasonText = r.reason
    ? r.reason
    : '请选择拦截原因';
  const reasonCls = r.reason ? 'sec-field-value' : 'sec-field-value sec-field-placeholder';

  return `
    <div class="sec-card">
      <div class="sec-card-head">
        <span class="sec-card-no">${r.subNo}</span>
        <span class="sec-status sec-status--success">拦截成功</span>
      </div>
      <div class="sec-card-time">${r.time}</div>
      <div class="sec-card-fields">
        <div class="sec-field-row">
          <span class="sec-field-label">拦截原因</span>
          <span class="${reasonCls}">${reasonText}</span>
        </div>
        <div class="sec-field-row">
          <span class="sec-field-label">销售产品</span>
          <span class="sec-field-value">${r.product || (meta.product || '')}</span>
        </div>
        <div class="sec-field-row">
          <span class="sec-field-label">服务渠道</span>
          <span class="sec-field-value">${r.channel || (meta.channel || '')}</span>
        </div>
      </div>
    </div>
  `;
}

/* ---- 渲染列表(展示全部记录,不筛选) ---- */
function render() {
  recordCount.textContent = '(' + records.length + ')';

  if (records.length === 0) {
    listArea.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无拦截记录</div>
        <div class="empty-sub">请扫描子单号</div>
      </div>
    `;
  } else {
    listArea.innerHTML = records.map(recordCardHTML).join('');
  }
}

/* ---- 扫描:按当前选择的原因生成一条拦截成功记录 ---- */
function doScan() {
  const subNo = nextSubNo();
  if (records.some(r => r.subNo === subNo)) {
    Helpers.toast('该子单号已存在拦截记录');
    return;
  }
  const meta = META_BY_REASON[currentReason] || {};
  records.unshift({
    subNo,
    time: Helpers.nowTime(),
    status: 'success',
    reason: currentReason,            // 应用当前选择的原因
    product: meta.product,
    channel: meta.channel,
  });
  render();
  Helpers.toast('已拦截并登记:' + subNo);
}

scanBtn.addEventListener('click', doScan);

/* ---- 键盘支持(实体键PDA):Enter 触发扫描 ---- */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    doScan();
  }
});

render();

/* ---- 演示面板(桌面端) ---- */
const testPanel = document.createElement('div');
testPanel.className = 'test-panel';
testPanel.innerHTML = `
  <div class="test-panel-title">
    <span>演示操作</span>
    <span class="test-panel-tip">点击执行</span>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">扫描(用当前原因)</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-action="scan">模拟扫描子单号</span>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">切换扫描原因</div>
    <div class="test-panel-tags">
      ${REASON_OPTIONS.map(r => `<span class="test-panel-tag" data-reason="${r}">${r}</span>`).join('')}
    </div>
  </div>
`;
document.body.appendChild(testPanel);

testPanel.addEventListener('click', e => {
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  if (tag.dataset.action === 'scan') {
    doScan();
  }
  if (tag.dataset.reason) {
    reasonSelect.value = tag.dataset.reason;
    currentReason = tag.dataset.reason;
  }
});
