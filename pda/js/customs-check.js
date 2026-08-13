/* ============================================
   customs-check.js — B2B关务查验页
   复刻真实 PDA RN 页面 CustomsCheck.tsx (code/pda 仓库)
   业务:风控拦截查验(Scenario=1) / 库内自主查验(Scenario=0/2)
   ============================================ */

/* ---- 模拟数据(演示用,真实环境改为调接口) ---- */

const WAYBILL = 'YT2621000070480962';

// 查验建议清单(真实页面从 CIS 系统 GetCheckSuggests 拉取)
const SUGGESTIONS = [
  { code: 1, name: '液体' },
  { code: 2, name: '膏体' },
  { code: 3, name: '放行' },
  { code: 4, name: '快递代理退件' },
  { code: 5, name: '安检退件' },
  { code: 6, name: '合单违禁品退件' },
  { code: 7, name: '疑似侵权' },
  { code: 8, name: '退件' },
  { code: 9, name: '侵权' },
  { code: 10, name: '与实物不符' },
  { code: 11, name: '低报件' },
  { code: 12, name: '不能判定' },
];

// 申报信息(发票级数据,真实页面 GetInspectionInvoiceInfo 拉取)
const INVOICE = [
  ['中文品名', '无线蓝牙耳机(带充电仓)'],
  ['英文品名', 'Bluetooth Earbuds'],
  ['申报数量', '200'],
  ['单价', '$8.50'],
  ['总价', '$1700.00'],
  ['币种', 'USD'],
  ['材质', 'ABS塑料'],
  ['品牌', 'Anker'],
  ['备案信息', '无'],
  ['产品用途', '跨境电商零售'],
];

// 问题件类型(真实页面 GetIssuekindItems 拉取,扣件时选)
const ISSUE_TYPES = [
  { name: '风控品名抽查', desc: '品名与申报不符,需关务复核' },
  { name: '电池类限制', desc: '含锂电池,普货渠道禁运' },
  { name: '侵权疑似', desc: '商标/外观涉嫌侵权,待法务确认' },
  { name: '申报价值不符', desc: '申报价值与实际差异超阈值' },
];

// 模拟照片(真实场景为拍照上传,原型用带内容的 SVG data URI 占位)
const MOCK_PHOTO_COLORS = ['#00A99D', '#FA8C16', '#1677FF'];
function mockPhoto(index) {
  const color = MOCK_PHOTO_COLORS[index % MOCK_PHOTO_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">
    <rect width="320" height="240" fill="${color}"/>
    <text x="160" y="120" font-size="28" fill="#fff" text-anchor="middle" font-family="sans-serif">查验照片 ${index + 1}</text>
    <text x="160" y="152" font-size="14" fill="rgba(255,255,255,.8)" text-anchor="middle" font-family="sans-serif">${new Date().toLocaleString()}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// 申报信息 Tab2 展示的问题件类型清单(本单命中)
const INVOICE_ISSUE_LIST = [
  { cn: '风控品名抽查', desc: '品名"无线蓝牙耳机"触发风控关键词' },
];

/* ---- 页面状态(对应 RN 页面的 scanReturnInfo) ---- */

// 初始态:未扫描(WaybillNumber 为空),子单列表不显示
// 扫描后才填充 waybill / children / 进度,对应 RN isValidObj(scanReturnInfo.WaybillNumber) 条件
let state = {
  scenario: 1,        // 0=NoTask 1=HasPending 2=AllCompleted
  bizType: 1,         // 1=风控拦截 2=库内自主
  batchNo: '',        // 查验批次号(自主场景用)
  suggestCode: -1,    // 当前查验建议 code(-1=未选)
  uploadImages: [],   // 当前处理态已上传照片 URL 数组(最多3张)
  scanned: false,     // 是否已扫到子单(控制主单号/子单列表/进度行显隐)
  waybill: '',        // 主单号(扫描后填充)
  children: [],       // 子单查验明细(扫描后填充)
  flowState: 'S0',    // 流程状态机:S0=扫描态 S1=处理态 S2=完成态
  currentChildNo: '', // S1 态正在处理的子单号
};

// 扫描成功后填充的订单数据(对应 ScanInspection 返回)
const SCANNED_ORDER = {
  waybill: WAYBILL,
  // 风控初始:U001/U002 已查验,U003 待查验
  riskChildren: [
    { no: WAYBILL + 'U001', done: true,  suggestCode: 3 },   // 放行
    { no: WAYBILL + 'U002', done: true,  suggestCode: 7 },   // 疑似侵权
    { no: WAYBILL + 'U003', done: false, suggestCode: 0 },
  ],
};

// 本次会话操作记录(查验记录页用)
let opLogs = [];

/* ---- 渲染:主结构 ---- */

document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBarWithMenu('B2B关务查验')}

  <div class="cc-page">
    <!-- 主单号条(扫描后才显示) -->
    <div class="cc-waybill hide" id="ccWaybill"></div>

    <!-- 扫码区 -->
    <div class="cc-scan-bar">
      <span class="cc-scan-label">子单号</span>
      <input class="cc-scan-input" id="ccScanInput" placeholder="扫描或输入子单号" />
      <button class="cc-cancel-btn" id="ccCancelBtn">撤销</button>
    </div>
    <div class="cc-scan-area">
      <div class="cc-scan-icon" id="ccScanBtn">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <path d="M7 12h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="cc-scan-text">扫描子单号</div>
    </div>

    <!-- 块状 Tab -->
    <div class="cc-tabs">
      <div class="cc-tab cc-tab--on" data-tab="0">待提交(<span id="ccDoneCnt">0</span>)</div>
      <div class="cc-tab" data-tab="1">申报信息</div>
      <div class="cc-tab" data-tab="2">问题件类型</div>
    </div>

    <!-- 内容区 -->
    <div class="cc-body" id="ccBody"></div>

    <!-- 底部按钮区(动态) -->
    <div class="cc-bottom" id="ccBottom"></div>
  </div>

  <!-- 查验建议选择弹窗(底部抽屉) -->
  <div class="drawer hidden" id="ccSuggestPicker">
    <div class="drawer-mask" data-close="suggest"></div>
    <div class="drawer-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:15px;font-weight:600;color:#333;">选择查验建议</span>
        <span data-close="suggest" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div id="ccSuggestList"></div>
    </div>
  </div>

  <!-- 子单处理弹窗(扫描后弹出:子单号 + 拍照 + 建议 + 备注 + 确认) -->
  <div class="drawer hidden" id="ccProcess">
    <div class="drawer-mask" data-close="process"></div>
    <div class="drawer-panel cc-process-panel">
      <div class="cc-process-head">
        <span class="cc-process-title">查验<span class="cc-process-no" id="ccProcessSub"></span></span>
        <span data-close="process" class="cc-process-close">✕</span>
      </div>
      <div class="cc-process-body" id="ccProcessBody"></div>
      <button class="cc-process-submit" id="ccProcessSubmit">确认本箱查验</button>
    </div>
  </div>

  <!-- 查验扣件弹窗 -->
  <div class="drawer hidden" id="ccDetain">
    <div class="drawer-mask" data-close="detain"></div>
    <div class="drawer-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
        <span style="font-size:15px;font-weight:600;color:#333;">选择问题件类型</span>
        <span data-close="detain" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div class="cc-detain-row">
        <span class="cc-req">*</span>
        <span class="cc-detain-label">异常分类</span>
        <span class="cc-detain-value cc-detain-value--on">关务问题件</span>
      </div>
      <div class="cc-detain-row">
        <span class="cc-req">*</span>
        <span class="cc-detain-label">问题件类型</span>
        <span class="cc-detain-value cc-detain-value--ph" id="ccIssueVal">请选择</span>
      </div>
      <button class="cc-detain-submit" id="ccDetainSubmit">提交</button>
    </div>
  </div>

  <!-- 问题件类型选择弹窗(嵌套) -->
  <div class="drawer hidden" id="ccIssuePicker">
    <div class="drawer-mask" data-close="issue"></div>
    <div class="drawer-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
        <span style="font-size:15px;font-weight:600;color:#333;">选择问题件类型</span>
        <span data-close="issue" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div id="ccIssueList"></div>
    </div>
  </div>

  <!-- 操作记录弹层 -->
  <div class="drawer hidden" id="ccLog">
    <div class="drawer-mask" data-close="log"></div>
    <div class="drawer-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:15px;font-weight:600;color:#333;">查验操作记录</span>
        <span data-close="log" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div class="cc-log-list" id="ccLogList"></div>
    </div>
  </div>

  <!-- 导航菜单(清空/查记录) -->
  <div class="drawer hidden" id="ccNavMenu">
    <div class="drawer-mask" data-close="nav"></div>
    <div class="drawer-panel">
      <div id="ccNavMenuList"></div>
    </div>
  </div>
`);

Helpers.startClock();

/* ---- DOM 引用 ---- */
const ccBody       = document.getElementById('ccBody');
const ccBottom     = document.getElementById('ccBottom');
const ccDoneCnt    = document.getElementById('ccDoneCnt');
const ccDetain     = document.getElementById('ccDetain');
const ccSuggestPicker = document.getElementById('ccSuggestPicker');
const ccSuggestList = document.getElementById('ccSuggestList');
const ccIssuePicker= document.getElementById('ccIssuePicker');
const ccIssueVal   = document.getElementById('ccIssueVal');
const ccIssueList  = document.getElementById('ccIssueList');
const ccLog        = document.getElementById('ccLog');
const ccLogList    = document.getElementById('ccLogList');
const ccNavMenu    = document.getElementById('ccNavMenu');
const ccNavMenuList= document.getElementById('ccNavMenuList');

let activeTab = 0;          // 当前 Tab
let pickedIssue = '';       // 扣件已选问题件类型

/* ---- 渲染内容区 ---- */
function renderBody() {
  if (activeTab === 0) renderTab0();
  else if (activeTab === 1) renderTab1();
  else renderTab2();
}

// Tab0 待提交 —— 按 flowState(扫描态/处理态/完成态)分支渲染
function renderTab0() {
  const doneCount = state.children.filter(c => c.done).length;
  // 主单号条:扫到首箱后显示
  const wbEl = document.getElementById('ccWaybill');
  if (state.scanned) {
    wbEl.textContent = '主单号 ' + state.waybill;
    wbEl.classList.remove('hide');
  } else {
    wbEl.classList.add('hide');
  }
  ccDoneCnt.textContent = doneCount;

  // 主页面只有扫描态/完成态(纯进度看板),S1 处理态在弹窗里
  renderScanOrDone();
}

// 扫描态 / 完成态:子单列表 + 进度行(无操作表单)
function renderScanOrDone() {
  const doneCount = state.children.filter(c => c.done).length;
  ccBody.innerHTML = `
    <div class="cc-form">
      <!-- 扫描态:提示引导 -->
      ${state.flowState === 'S0' && !state.scanned ? `
        <div class="cc-hint">请扫描子单号开始查验</div>
      ` : ''}

      ${state.scanned ? `
      <!-- 国家/渠道 -->
      <div class="cc-meta">
        <div>国家：美国</div>
        <div>服务渠道：海运拼柜-美森快船</div>
      </div>

      <!-- 进度行 -->
      <div class="cc-progress">
        <span>子单查验记录</span>
        <span style="color:#555;font-size:13px;">共${state.children.length}箱</span>
        ${progressTagHtml()}
      </div>

      <!-- 子单列表 -->
      <div class="cc-child-list">
        ${state.children.map(c => childItemHtml(c)).join('')}
      </div>

      <!-- S2 完成态:提示 -->
      ${state.flowState === 'S2' ? `
        <div class="cc-hint cc-hint--done">该主单全部子单已查验完毕，请进行主单操作</div>
      ` : ''}
      ` : ''}
    </div>
  `;
}

/* ---- 子单处理弹窗(扫描后弹出) ---- */
function openProcess() {
  const sugName = (SUGGESTIONS.find(s => s.code === state.suggestCode) || {}).name;
  // 单号上提到标题栏副标题,省去 body 内独立高亮条,节省 PDA 竖向空间
  document.getElementById('ccProcessSub').textContent = state.currentChildNo;
  document.getElementById('ccProcessBody').innerHTML = `
    <!-- ② 拍照上传(先拍照) -->
    <div class="cc-field">
      <div class="cc-field-head">
        <span class="cc-req">*</span>
        <span class="cc-field-label">拍照上传</span>
        <span class="cc-upload-count">${state.uploadImages.length > 0 ? '(' + state.uploadImages.length + '/3)' : ''}</span>
      </div>
      <div class="cc-upload-row" id="ccUploadRow"></div>
    </div>

    <!-- ③ 查验建议(点击弹底部选择器) -->
    <div class="cc-field">
      <div class="cc-field-head">
        <span class="cc-req">*</span>
        <span class="cc-field-label">查验建议</span>
      </div>
      <div class="cc-select-wrap" id="ccSuggestTrigger">
        <div class="cc-select-display ${sugName ? '' : 'cc-select-display--ph'}">${sugName || '请选择'}</div>
        <span class="cc-select-arrow">∨</span>
      </div>
    </div>

    <!-- ④ 备注 -->
    <div class="cc-field">
      <div class="cc-field-head">
        <span class="cc-field-label">备注</span>
        <span class="cc-field-optional">选填</span>
      </div>
      <textarea class="cc-remark" id="ccRemark" placeholder="请输入备注(选填)"></textarea>
    </div>
  `;
  document.getElementById('ccSuggestTrigger').addEventListener('click', openSuggestPicker);
  renderUploadRow();
  document.getElementById('ccProcess').classList.remove('hidden');
}

function closeProcess() {
  document.getElementById('ccProcess').classList.add('hidden');
}

function progressTagHtml() {
  const doneCount = state.children.filter(c => c.done).length;
  const total = state.children.length;
  if (state.scenario === 1) {
    // 风控:全部查完显示绿底"已完成",否则红底显示进度
    if (total > 0 && doneCount >= total) {
      return `<span class="cc-progress-tag cc-progress-tag--green">已完成查验</span>`;
    }
    return `<span class="cc-progress-tag cc-progress-tag--risk">需查验${total}箱，已查验${doneCount}箱</span>`;
  }
  if (state.scenario === 0) {
    // 自主无任务:绿底
    return `<span class="cc-progress-tag cc-progress-tag--green">无查验任务</span>`;
  }
  // 全部已完成(scenario=2)
  return `<span class="cc-progress-tag cc-progress-tag--green">已完成查验</span>`;
}

function childItemHtml(c) {
  const sug = SUGGESTIONS.find(s => s.code === c.suggestCode);
  return `
    <div class="cc-child-item">
      <span class="cc-child-no">${c.no}</span>
      <span class="cc-child-done ${c.done ? '' : 'cc-child-done--no'}">✓</span>
      <span class="cc-child-suggest">${c.done && sug ? sug.name : ''}</span>
    </div>
  `;
}

function renderUploadRow() {
  const row = document.getElementById('ccUploadRow');
  if (!row) return;
  const filled = state.uploadImages.length;
  let html = '';
  // 已上传的:缩略图 + 右上角删除按钮(单击图片看大图)
  for (let i = 0; i < filled; i++) {
    html += `
      <div class="cc-upload-item">
        <div class="cc-upload-box cc-upload-box--filled" data-act="preview" data-idx="${i}">
          <img class="cc-upload-thumb" src="${state.uploadImages[i]}" alt="照片${i + 1}" />
        </div>
        <span class="cc-upload-del" data-del="${i}">✕</span>
      </div>`;
  }
  // 未满3张:显示一个"添加照片"入口
  if (filled < 3) {
    html += `<div class="cc-upload-box" data-act="add">+<div class="cc-upload-sub">${filled === 0 ? '拍照上传' : '继续添加'}</div></div>`;
  }
  row.innerHTML = html;
  // 同步标题里的照片计数
  const countEl = row.parentElement.querySelector('.cc-upload-count');
  if (countEl) countEl.textContent = filled > 0 ? '(' + filled + '/3)' : '';
  // 点击:添加 / 预览大图
  row.querySelectorAll('[data-act]').forEach(box => {
    box.addEventListener('click', () => {
      if (box.dataset.act === 'add') {
        state.uploadImages.push(mockPhoto(state.uploadImages.length));
        renderUploadRow();
      } else if (box.dataset.act === 'preview') {
        openPhotoPreview(+box.dataset.idx);
      }
    });
  });
  // 删除按钮(阻止冒泡,不触发预览)
  row.querySelectorAll('[data-del]').forEach(del => {
    del.addEventListener('click', e => {
      e.stopPropagation();
      const idx = +del.dataset.del;
      state.uploadImages.splice(idx, 1);
      renderUploadRow();
      Helpers.toast('已删除照片');
    });
  });
}

/* ---- 照片大图预览 ---- */
function openPhotoPreview(idx) {
  const img = state.uploadImages[idx];
  if (!img) return;
  const mask = document.createElement('div');
  mask.className = 'cc-photo-mask';
  mask.innerHTML = `
    <img class="cc-photo-full" src="${img}" alt="查验照片大图" />
    <span class="cc-photo-close">✕</span>
  `;
  mask.addEventListener('click', () => mask.remove());
  // 挂到 .device 下,遮罩只覆盖设备区域(不铺满整个屏幕)
  document.querySelector('.device').appendChild(mask);
}

// Tab1 申报信息
function renderTab1() {
  ccBody.innerHTML = `
    <div class="cc-kv">
      ${INVOICE.map(([k, v]) =>
        `<div class="cc-kv-row"><span class="cc-kv-label">${k}</span><span class="cc-kv-value">${v}</span></div>`
      ).join('')}
    </div>
  `;
}

// Tab2 问题件类型
function renderTab2() {
  const list = INVOICE_ISSUE_LIST;
  ccBody.innerHTML = list.length
    ? `<div class="cc-kv">${list.map(it =>
        `<div class="cc-kv-row"><span class="cc-kv-label">${it.cn}</span><span class="cc-kv-value">${it.desc}</span></div>`
      ).join('')}</div>`
    : `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">暂无信息</div></div>`;
}

/* ---- 渲染底部按钮(按 flowState + 场景) ---- */
// S0 扫描态:无按钮
// S1 处理态:仅"确认本箱查验"
// 底部按钮:S0 扫描态无按钮(处理在弹窗里),S2 完成态出主单操作
function renderBottom() {
  if (state.flowState !== 'S2') {
    ccBottom.innerHTML = '';
    return;
  }
  // S2 完成态
  if (state.scenario === 1) {
    ccBottom.innerHTML = `
      <button class="cc-btn" data-op="release">主单放行</button>
      <button class="cc-btn cc-btn--danger" data-op="return">主单退件</button>
      <button class="cc-btn cc-btn--fill" data-op="submit">主单提交关务</button>
    `;
  } else {
    ccBottom.innerHTML = `
      <button class="cc-btn cc-btn--fill" data-op="normal">查验正常</button>
      <button class="cc-btn" data-op="detain">查验扣件</button>
    `;
  }
}

function refreshAll() {
  renderBody();
  renderBottom();
}

/* ---- 底部按钮处理 ---- */
ccBottom.addEventListener('click', e => {
  const op = e.target.dataset.op;
  if (!op) return;

  if (op === 'release') {
    addLog('主单放行');
    Helpers.toast('已放行，推送履约轨迹');
    resetForm();
  } else if (op === 'return') {
    addLog('主单退件');
    Helpers.toast('已退件，推送履约（refund=true）');
    resetForm();
  } else if (op === 'submit') {
    addLog('主单提交关务');
    Helpers.toast('已提交关务，待关务系统处置');
    resetForm();
  } else if (op === 'normal') {
    addLog('查验正常');
    Helpers.toast('查验正常，已结案');
    resetForm();
  } else if (op === 'detain') {
    // 扣件:先选问题件类型
    if (!pickedIssue) {
      openDetain();
    } else {
      doDetain();
    }
  }
});

/* ---- 扫描模拟 ---- */
document.getElementById('ccScanBtn').addEventListener('click', doScan);
document.getElementById('ccScanInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); doScan(); }
});

function doScan() {
  // S1 处理态下不允许直接扫下一箱(需先确认或撤销当前箱)
  if (state.flowState === 'S1') {
    Helpers.toast('请先完成当前子单的查验');
    return;
  }
  // S2 完成态下不允许再扫(所有箱已查完)
  if (state.flowState === 'S2') {
    Helpers.toast('所有子单已查验完毕');
    return;
  }

  // 首次扫描:加载订单数据(模拟 ScanInspection 返回)
  if (!state.scanned) {
    state.scanned = true;
    state.waybill = SCANNED_ORDER.waybill;
    state.children = SCANNED_ORDER.riskChildren.map(c => ({ ...c, done: false, suggestCode: 0 }));
  }

  // 读取扫码框的值(真实 PDA 扫的是具体子单号,而非自动找下一个)
  const scanInput = document.getElementById('ccScanInput');
  const scanNo = (scanInput.value || '').trim();
  if (!scanNo) {
    Helpers.toast('请扫描或输入子单号');
    return;
  }

  // 校验:扫入的子单必须属于本主单
  const matched = state.children.find(c => c.no === scanNo);
  if (!matched) {
    Helpers.toast('这不是本单的子单号，请先查验完本单的子单号');
    return;
  }
  // 重复扫描沿用线上:不拦截,后端 ON DUPLICATE KEY UPDATE 静默覆盖,前端重新弹窗处理
  // (已查验子单再扫 → 重新进入处理弹窗,确认时覆盖旧记录)

  // 匹配通过 → 弹出处理弹窗
  state.currentChildNo = matched.no;
  state.suggestCode = -1;
  state.uploadImages = [];
  scanInput.value = '';
  refreshAll();        // 刷新主页面进度
  openProcess();       // 弹出处理弹窗
  Helpers.toast('已扫入：' + matched.no);
}

/* ---- 确认本箱查验:弹窗内校验 → 落库 → 关弹窗 → 刷新主页面 ---- */
function confirmBox() {
  // 校验:照片 + 建议(对应仓库新顺序 扫→拍→选)
  if (state.uploadImages.length === 0) {
    Helpers.toast('请先上传查验照片');
    return;
  }
  if (state.suggestCode === -1) {
    Helpers.toast('请选择查验建议');
    return;
  }
  // 落库:标记当前子单已查验
  const child = state.children.find(c => c.no === state.currentChildNo);
  if (child) { child.done = true; child.suggestCode = state.suggestCode; }
  state.currentChildNo = '';

  // 关弹窗,判断是否进 S2(出主单按钮):
  //   风控(BizType=1):要求全部子单查完(对齐线上前端 BizType===1 校验)
  //   自主(BizType=2):扫至少 1 个即可(对齐线上自主链路不校验全部查完)
  closeProcess();
  const doneCount = state.children.filter(c => c.done).length;
  const enterS2 = state.bizType === 1
    ? state.children.every(c => c.done)        // 风控:全查完
    : doneCount >= 1;                          // 自主:至少1个
  state.flowState = enterS2 ? 'S2' : 'S0';
  refreshAll();
  Helpers.toast(enterS2 ? '本箱已确认，可进行主单操作' : '本箱已确认，请扫描下一箱');
}

/* ---- 撤销:S1 态放弃当前箱回 S0;S0 态撤销最后一个已查验箱 ---- */
document.getElementById('ccCancelBtn').addEventListener('click', () => {
  // 撤销最后一个已查验箱(弹窗内的放弃直接用 ✕ 关闭即可)
  const lastDone = [...state.children].reverse().find(c => c.done);
  if (!lastDone) {
    Helpers.toast('无已查验子单可撤销');
    return;
  }
  lastDone.done = false;
  lastDone.suggestCode = 0;
  state.flowState = 'S0';
  refreshAll();
  Helpers.toast('已撤销：' + lastDone.no);
});

/* ---- 查验建议选择弹窗 ---- */
function openSuggestPicker() {
  ccSuggestList.innerHTML = SUGGESTIONS.map(s => `
    <div class="action-sheet-item cc-pick-item ${s.code === state.suggestCode ? 'cc-pick-item--on' : ''}"
         data-suggest="${s.code}" style="text-align:left;color:${s.code === state.suggestCode ? '#00A99D' : '#333'};font-size:15px;">
      ${s.name}${s.code === state.suggestCode ? '<span style="float:right;color:#00A99D;">✓</span>' : ''}
    </div>
  `).join('');
  ccSuggestPicker.classList.remove('hidden');
}

ccSuggestList.addEventListener('click', e => {
  const item = e.target.closest('[data-suggest]');
  if (!item) return;
  state.suggestCode = +item.dataset.suggest;
  ccSuggestPicker.classList.add('hidden');
  // 处理弹窗打开时,只刷新弹窗内的建议显示框(不重建整个弹窗,避免丢失已拍照片)
  const procOpen = !document.getElementById('ccProcess').classList.contains('hidden');
  if (procOpen) {
    const disp = document.querySelector('#ccProcessBody .cc-select-display');
    const sugName = (SUGGESTIONS.find(s => s.code === state.suggestCode) || {}).name;
    if (disp && sugName) {
      disp.textContent = sugName;
      disp.classList.remove('cc-select-display--ph');
    }
  } else {
    renderBody();
    renderBottom();
  }
});

/* ---- 查验扣件弹窗 ---- */
function openDetain() {
  pickedIssue = '';
  ccIssueVal.textContent = '请选择';
  ccIssueVal.className = 'cc-detain-value cc-detain-value--ph';
  ccDetain.classList.remove('hidden');
}

ccIssueVal.addEventListener('click', () => {
  ccIssueList.innerHTML = ISSUE_TYPES.map(it => `
    <div class="action-sheet-item" data-issue="${it.name}" style="text-align:left;padding:14px 16px;color:#333;font-size:14px;line-height:1.6;">
      <div style="font-weight:500;">${it.name}</div>
      <div style="font-size:12px;color:#999;margin-top:2px;">${it.desc}</div>
    </div>
  `).join('');
  ccIssuePicker.classList.remove('hidden');
});

ccIssueList.addEventListener('click', e => {
  const item = e.target.closest('[data-issue]');
  if (!item) return;
  pickedIssue = item.dataset.issue;
  ccIssueVal.textContent = pickedIssue;
  ccIssueVal.className = 'cc-detain-value cc-detain-value--on';
  ccIssuePicker.classList.add('hidden');
});

document.getElementById('ccDetainSubmit').addEventListener('click', () => {
  if (!pickedIssue) {
    Helpers.toast('请选择问题件类型');
    return;
  }
  ccDetain.classList.add('hidden');
  doDetain();
});

function doDetain() {
  addLog('查验扣件（' + pickedIssue + '）');
  pickedIssue = '';
  Helpers.toast('扣件成功，已生成异常件并推送POMS');
  resetForm();
}

/* ---- 弹窗关闭(统一处理 data-close) ---- */
document.addEventListener('click', e => {
  const close = e.target.dataset.close;
  if (!close) return;
  if (close === 'process') closeProcess();
  if (close === 'suggest') ccSuggestPicker.classList.add('hidden');
  if (close === 'detain') ccDetain.classList.add('hidden');
  if (close === 'issue')  ccIssuePicker.classList.add('hidden');
  if (close === 'log')    ccLog.classList.add('hidden');
  if (close === 'nav')    ccNavMenu.classList.add('hidden');
});

// 处理弹窗:确认按钮
document.getElementById('ccProcessSubmit').addEventListener('click', confirmBox);

/* ---- Tab 切换 ---- */
document.querySelectorAll('.cc-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('cc-tab--on'));
    tab.classList.add('cc-tab--on');
    activeTab = +tab.dataset.tab;
    renderBody();
  });
});

/* ---- 导航右侧菜单(☰) ---- */
document.getElementById('navMenuBtn').addEventListener('click', () => {
  ccNavMenuList.innerHTML = `
    <div class="action-sheet-item" data-nav="clear" style="color:#F5222D;">清空数据</div>
    <div class="action-sheet-item" data-nav="log">查验操作记录</div>
  `;
  ccNavMenu.classList.remove('hidden');
});

ccNavMenuList.addEventListener('click', e => {
  const nav = e.target.dataset.nav;
  if (!nav) return;
  ccNavMenu.classList.add('hidden');
  if (nav === 'clear') {
    resetAll();
    Helpers.toast('已清空数据');
  } else if (nav === 'log') {
    openLog();
  }
});

/* ---- 操作记录 ---- */
function addLog(op) {
  opLogs.unshift({
    waybill: WAYBILL,
    op,
    time: Helpers.nowTime(),
  });
}

function openLog() {
  if (opLogs.length === 0) {
    ccLogList.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-text">暂无操作记录</div></div>`;
  } else {
    ccLogList.innerHTML = opLogs.map(l => `
      <div class="cc-log-item">
        <div class="cc-log-waybill">${l.waybill}</div>
        <div class="cc-log-op">${l.op}</div>
        <div class="cc-log-time">${l.time}</div>
      </div>
    `).join('');
  }
  ccLog.classList.remove('hidden');
}

/* ---- 重置 ---- */
// 主单操作成功后:清空当前查验会话,回到 S0 初始空态,开始下一票
function resetForm() {
  state.scanned = false;
  state.waybill = '';
  state.children = [];
  state.suggestCode = -1;
  state.uploadImages = [];
  state.flowState = 'S0';
  state.currentChildNo = '';
  activeTab = 0;
  switchTabOn(0);
  refreshAll();
}

// 全量重置(清空数据按钮):回到 S0 初始空态
function resetAll() {
  state.scenario = 1;
  state.bizType = 1;
  state.batchNo = '';
  state.scanned = false;
  state.waybill = '';
  state.children = [];
  state.suggestCode = -1;
  state.uploadImages = [];
  state.flowState = 'S0';
  state.currentChildNo = '';
  activeTab = 0;
  switchTabOn(0);
  refreshAll();
}

function switchTabOn(idx) {
  document.querySelectorAll('.cc-tab').forEach((t, i) => {
    t.classList.toggle('cc-tab--on', i === idx);
  });
}

/* ---- 初始化 ---- */
refreshAll();

/* ============================================
   演示面板(桌面端)
   ============================================ */
const testPanel = document.createElement('div');
testPanel.className = 'test-panel';
testPanel.innerHTML = `
  <div class="test-panel-title">
    <span>演示操作</span>
    <span class="test-panel-tip">点击执行</span>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">场景切换(底部按钮+进度联动)</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-scene="1">风控拦截(三按钮)</span>
      <span class="test-panel-tag" data-scene="3">风控拦截-全完成(三按钮)</span>
      <span class="test-panel-tag" data-scene="0">自主-无任务(两按钮)</span>
      <span class="test-panel-tag" data-scene="2">自主-全完成(两按钮)</span>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">操作</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-act="scan">模拟扫描下一箱</span>
      <span class="test-panel-tag" data-act="detain">打开查验扣件弹窗</span>
      <span class="test-panel-tag" data-act="log">查看操作记录</span>
      <span class="test-panel-tag" data-act="reset">重置(恢复风控初始)</span>
    </div>
  </div>
`;
document.body.appendChild(testPanel);

testPanel.addEventListener('click', e => {
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  if (tag.dataset.scene) {
    const sc = +tag.dataset.scene;
    // 风控类(1/3)→ scenario=1;自主类(0/2)→ scenario=0/2。sc=3 是"风控全完成",scenario 仍 1
    state.scenario = (sc === 1 || sc === 3) ? 1 : sc;
    state.bizType = (sc === 1 || sc === 3) ? 1 : 2;   // 风控类(1/3)=风控;自主类(0/2)=自主
    // 演示场景切换:加载订单数据
    state.scanned = true;
    state.waybill = SCANNED_ORDER.waybill;
    const base = SCANNED_ORDER.riskChildren.map(c => ({ ...c }));
    state.children = base.map(c => ({ ...c, done: false, suggestCode: 0 }));
    state.suggestCode = -1;
    state.uploadImages = [];
    state.currentChildNo = '';
    // 全完成场景(2自主/3风控):子单全部已查验,直接进 S2 预览主单按钮;否则 S0 等扫描
    const isDoneScene = (sc === 2 || sc === 3);
    state.flowState = isDoneScene ? 'S2' : 'S0';
    if (isDoneScene) {
      state.children = base.map((c, i) => ({ ...c, done: true, suggestCode: c.suggestCode || (i % 2) + 1 }));
    }
    activeTab = 0;
    switchTabOn(0);
    refreshAll();
    Helpers.toast('已切换到场景：' + ({0:'自主-无任务',1:'风控拦截',2:'自主-全完成',3:'风控拦截-全完成'})[sc]);
  }
  if (tag.dataset.act === 'scan') {
    // 演示用:自动填入下一个待查子单号,再触发扫描(真实场景是扫枪输入)
    const next = state.children.find(c => !c.done);
    if (next) document.getElementById('ccScanInput').value = next.no;
    doScan();
  }
  if (tag.dataset.act === 'detain') openDetain();
  if (tag.dataset.act === 'log') openLog();
  if (tag.dataset.act === 'reset') { resetAll(); Helpers.toast('已重置'); }
});
