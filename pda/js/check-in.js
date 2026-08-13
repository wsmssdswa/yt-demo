/* ============================================
   check-in.js — PDA签入页逻辑
   对应生产代码:code/pda/app/page/ccos/goodsConsolidation/goodsConsolidation.tsx(页面)
              + cancelScan.tsx(撤销扫描)
   流程:计费网点录尺寸重量 → 扫描子单号签入 → 扫描详情/接收明细双Tab → 完成签入
   真实接口(/FBACheckIn/*):
     FBADeviceCheckInPDA      签入扫描(体积长宽高自动按 大/中/小 排序提交)
     GetBsnOrderBusinessByBatchNo  按批次查主单列表(应到/已扫/异常)
     GetCheckInDetailByOrderNo     按主单查子单明细
     CompeteBatchByBatchNo         完成批次签入
     RevokeScan                    撤销扫描
     /pda/CheckChargeOrg           校验当前网点是否计费网点(决定是否录尺寸重量)
   原型为纯静态演示,数据在下方 MAIN_ORDERS 预置,交互 1:1 模拟代码行为。
   ============================================ */

/* ---- 演示数据:批次 + 主单 + 子单 ----
   单号格式(AGENTS.md 规范):主单 = YT+16位数字;子单 = 主单+U+3位序号(U001起)
   IsCheckIn=true 表示该箱已签入;abnormal 为问题件标题(生产由后端 ChildAbnormal 返回,'|' 分隔多行) */
const BATCH_NO = 'B20260810001';
const MAIN_ORDERS = [
  {
    WaybillNumber: 'YT2621000070480962', OrderPieces: 3, CheckInCount: 1, AbnormalCount: 0,
    children: [
      { ChildNumber: 'YT2621000070480962U001', IsCheckIn: true,  Length: '60',  Width: '40',  Height: '35',  Weight: '12.35' },
      { ChildNumber: 'YT2621000070480962U002', IsCheckIn: false },
      { ChildNumber: 'YT2621000070480962U003', IsCheckIn: false },
    ],
  },
  {
    WaybillNumber: 'YT2621000070480963', OrderPieces: 3, CheckInCount: 1, AbnormalCount: 2,
    children: [
      { ChildNumber: 'YT2621000070480963U001', IsCheckIn: true,  Length: '58',  Width: '42',  Height: '38',  Weight: '15.20' },
      { ChildNumber: 'YT2621000070480963U002', IsCheckIn: false, abnormal: '申报不符|涉侵权' },
      { ChildNumber: 'YT2621000070480963U003', IsCheckIn: false, abnormal: '与实物不符' },
    ],
  },
  {
    WaybillNumber: 'YT2621000070480964', OrderPieces: 1, CheckInCount: 0, AbnormalCount: 0,
    children: [
      { ChildNumber: 'YT2621000070480964U001', IsCheckIn: false },   // 超尺寸件:单边 300CM > 265
    ],
  },
];
// 超尺寸阈值:任一边 > 265CM 必须上传照片(新需求,边界 [待确认:大于还是大于等于])
const OVERSIZE_LIMIT = 265;
// 超尺寸演示单号:点击演示时自动填 300*40*35 触发规则
const OVERSIZE_NO = 'YT2621000070480964U001';
// 无效单号(演示拒绝):非当前批次子单
const INVALID_NO = 'YT2621000070480999U005';

/* ---- 页面骨架 ---- */
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('PDA签入')}

  <div class="ci-page">
    <!-- 计费网点状态徽标(CheckChargeOrg 返回 IsChargeOrg 决定是否录尺寸重量) -->
    <div class="ci-mode" id="ciModeTag">
      <span class="ci-mode-dot"></span>
      <span id="ciModeText">计费网点</span>
    </div>

    <!-- 尺寸重量区:仅计费网点显示;锁定后长宽高禁用(连续扫同尺寸货) -->
    <div class="ci-dim" id="ciDimArea">
      <div class="ci-dim-label">长 宽 高(CM)：</div>
      <div class="ci-dim-row">
        <input type="text" class="ci-dim-input" id="ciLen" inputmode="decimal" placeholder="长" />
        <input type="text" class="ci-dim-input" id="ciWid" inputmode="decimal" placeholder="宽" />
        <input type="text" class="ci-dim-input" id="ciHei" inputmode="decimal" placeholder="高" />
        <label class="ci-switch">
          <input type="checkbox" id="ciLock" />
          <span class="ci-switch-slider"></span>
          <span class="ci-lock-text">锁定</span>
        </label>
      </div>
      <div class="ci-dim-label">重量(KG)：</div>
      <div class="ci-dim-row">
        <input type="text" class="ci-weight-input" id="ciWeight" inputmode="decimal" placeholder="0.000" />
        <button class="ci-scale-btn" id="ciScaleBtn">连接电子称</button>
      </div>

      <!-- 图片录入:长宽高/重量下方;尺寸任一边>265 时出现,必填(未拍照不允许扫描签入) -->
      <div class="ci-oversize-panel hidden" id="ciOversizePanel">
        <div class="ci-oversize-label"><span class="ci-required">*</span>图片<span class="ci-oversize-hint">单边超${OVERSIZE_LIMIT}cm需要上传照片</span></div>
        <div class="ci-oversize-photos" id="ciOversizePhotos"></div>
      </div>
    </div>

    <!-- 双 Tab:扫描详情 / 接收明细 -->
    <div class="ci-tabs">
      <div class="ci-tab ci-tab--on" data-tab="0">扫描详情</div>
      <div class="ci-tab" data-tab="1">接收明细</div>
    </div>

    <!-- Tab0 扫描详情 -->
    <div class="ci-pane" id="ciPaneScan">
      <div class="ci-scan-area">
        <span class="ci-scan-label">扫描子单号</span>
        <input type="text" class="ci-scan-input" id="ciScanInput" placeholder="扫码枪扫描 / 输入子单号" autocomplete="off" />
      </div>
      <div class="ci-list-head">
        <span class="ci-list-title">扫描记录 <span class="ci-rec-count" id="ciRecCount">(0)</span></span>
        <button class="ci-revoke-btn" id="ciRevokeBtn">撤销扫描</button>
      </div>
      <div class="ci-empty" id="ciEmpty">
        <div class="ci-empty-icon">📥</div>
        <div class="ci-empty-text">扫描对应子单号</div>
        <div class="ci-empty-sub">进行签入操作</div>
      </div>
      <div class="ci-records hidden" id="ciRecords"></div>
    </div>

    <!-- Tab1 接收明细 -->
    <div class="ci-pane hidden" id="ciPaneRecv">
      <div class="ci-recv-stats">
        <div class="ci-stat">扫描票量：<b id="ciStatTicket">0</b></div>
        <div class="ci-stat">应到件数：<b id="ciStatShould">0</b></div>
        <div class="ci-stat">实扫件数：<b id="ciStatReal">0</b></div>
      </div>
      <div class="ci-batch" id="ciBatchBar"></div>
      <div class="ci-main-list" id="ciMainList"></div>
      <div class="ci-empty hidden" id="ciRecvEmpty">
        <div class="ci-empty-text">暂无数据</div>
      </div>
    </div>

    <!-- 底部:完成签入(无批次号时置灰,对应代码 Button 颜色 #aaa/#008081) -->
    <button class="ci-finish" id="ciFinishBtn">完成签入</button>
  </div>

  <!-- 撤销扫描弹层 -->
  <div class="ci-mask hidden" id="ciRevokeMask">
    <div class="ci-dialog">
      <div class="ci-dialog-title">撤销扫描</div>
      <div class="ci-dialog-tip">扫描需撤销的子单号(已签入的子单可撤销)</div>
      <input type="text" class="ci-dialog-input" id="ciRevokeInput" placeholder="扫码 / 输入子单号" autocomplete="off" />
      <div class="ci-dialog-btns">
        <button class="ci-dialog-btn ci-dialog-btn--cancel" id="ciRevokeCancel">取消</button>
        <button class="ci-dialog-btn ci-dialog-btn--ok" id="ciRevokeOk">确认撤销</button>
      </div>
    </div>
  </div>

  <!-- 异常件详情弹层 -->
  <div class="ci-mask hidden" id="ciAbnMask">
    <div class="ci-dialog">
      <div class="ci-dialog-title">异常件详情</div>
      <div class="ci-dialog-tip" id="ciAbnMain"></div>
      <div class="ci-abn-list" id="ciAbnList"></div>
      <div class="ci-dialog-btns">
        <button class="ci-dialog-btn ci-dialog-btn--ok ci-dialog-btn--full" id="ciAbnClose">知道了</button>
      </div>
    </div>
  </div>

  <!-- 照片选择(拍照上传,隐藏 input) -->
  <input type="file" accept="image/*" capture="environment" class="hidden" id="ciPhotoInput" />
`);

Helpers.startClock();

/* ---- DOM 引用 ---- */
const $ = id => document.getElementById(id);
const modeTag    = $('ciModeTag'), modeText = $('ciModeText');
const dimArea    = $('ciDimArea');
const lenInput   = $('ciLen'), widInput = $('ciWid'), heiInput = $('ciHei');
const weightInput= $('ciWeight'), lockChk = $('ciLock'), scaleBtn = $('ciScaleBtn');
const scanInput  = $('ciScanInput');
const recCount   = $('ciRecCount');
const emptyState = $('ciEmpty'), recordsEl = $('ciRecords');
const revokeMask = $('ciRevokeMask'), revokeInput = $('ciRevokeInput');
const abnMask    = $('ciAbnMask'), abnMain = $('ciAbnMain'), abnList = $('ciAbnList');
const oversizePanel = $('ciOversizePanel'), oversizePhotos = $('ciOversizePhotos');
const photoInput = $('ciPhotoInput');
const finishBtn  = $('ciFinishBtn');

/* ---- 状态 ---- */
let isCharge = true;          // 当前网点是否计费网点(CheckChargeOrg 返回 IsChargeOrg)
let locked = false;           // 尺寸锁定(锁定时长宽高禁用)
let blueStatus = 3;           // 电子称:1=连接中 2=已连接 3=未连接
let batchNumber = BATCH_NO;   // 当前批次号(首次扫描成功后由后端返回;原型预置演示批次)
let currentTab = 0;           // 0=扫描详情 1=接收明细
// 已签入记录 {scanCode, pkgVolume, pkgWeight, childAbnormal, imgs[]}
// 初始预置与 MAIN_ORDERS 预置已扫(62U001/63U001)一致,保证扫描详情/接收明细/统计联动
let scanRecords = [
  { scanCode: 'YT2621000070480962U001', pkgVolume: '60*40*35', pkgWeight: '12.35', childAbnormal: null, imgs: [] },
  { scanCode: 'YT2621000070480963U001', pkgVolume: '58*42*38', pkgWeight: '15.20', childAbnormal: null, imgs: [] },
];
let expandMain = '';          // 接收明细当前展开的主单号
let abnMainNo = '';           // 异常弹层当前主单号
let photoTargetIdx = -1;      // 记录上"拍照"补图的目标记录索引
let photoMode = '';           // 当前拍照目标:'oversize'=超尺寸拍照上传框 / 'record'=记录补图
let oversizeImgs = [];        // 超尺寸箱拍照上传框中的照片(上传完才允许扫描签入,签入后清空)

/* ---- 工具:数值格式化(复刻代码 floatText3:3位小数/9999.999上限) ---- */
function fmtNum(text) {
  let v = String(text);
  v = v.replace(/[^\d.]/g, '');
  v = v.replace(/\.{2,}/g, '.');
  const firstDot = v.indexOf('.');
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
  }
  const m = v.match(/^(\d+)(?:\.(\d{0,3}))?/);
  v = m ? m[1] + (m[2] !== undefined ? '.' + m[2] : '') : '';
  if (parseFloat(v || '0') > 9999.999) v = '9999.999';
  return v;
}

/* 体积长宽高自动排序(大/中/小,复刻代码 compareNumbers + max/middle/min) */
function sortDims(a, b, c) {
  const arr = [parseFloat(a) || 0, parseFloat(b) || 0, parseFloat(c) || 0].sort((x, y) => x - y);
  return { max: arr[2], middle: arr[1], min: arr[0] };
}

/* 图片录入(超尺寸必填):拍照框样式与扫描记录一致(虚线方框,上传显示缩略图,最多5张) */
function renderOversizePanel() {
  oversizePhotos.innerHTML = oversizeImgs.map((src, j) => `
    <span class="ci-photo" style="background-image:url('${src}')">
      <i class="ci-oversize-del" data-p="${j}">×</i>
    </span>`).join('')
    + (oversizeImgs.length < 5 ? `<button class="ci-photo-add">拍照</button>` : '');
}
function syncOversizePanel() {
  const { max } = sortDims(lenInput.value || '0', widInput.value || '0', heiInput.value || '0');
  const active = isCharge && max > OVERSIZE_LIMIT;
  oversizePanel.classList.toggle('hidden', !active);
  renderOversizePanel();
  if (!active) { oversizeImgs = []; }
}

/* ---- 渲染:扫描详情 ---- */
function renderRecords() {
  recCount.textContent = '(' + scanRecords.length + ')';
  const empty = scanRecords.length === 0;
  emptyState.classList.toggle('hidden', !empty);
  recordsEl.classList.toggle('hidden', empty);
  if (empty) { recordsEl.innerHTML = ''; return; }
  recordsEl.innerHTML = scanRecords.map((r, i) => `
    <div class="ci-record">
      <div class="ci-rec-top">
        <span class="ci-rec-no">${r.scanCode}</span>
        <span class="ci-rec-tag">已扫描</span>
      </div>
      ${isCharge ? `
      <div class="ci-rec-meta">
        <span>体积(CM)：${r.pkgVolume}</span>
        <span>重量(KG)：${r.pkgWeight}</span>
      </div>` : ''}
      ${r.childAbnormal ? `
      <div class="ci-rec-abn">
        <span class="ci-abn-icon">异</span>
        <span class="ci-abn-text">${r.childAbnormal.IssueKindName.split('|').join('\n')}</span>
      </div>` : ''}
      <div class="ci-rec-photos" id="ciPhotos${i}">
        ${(r.imgs || []).map((src, j) => `
          <span class="ci-photo" style="background-image:url('${src}')">
            <i class="ci-photo-del" data-idx="${i}" data-p="${j}">×</i>
          </span>`).join('')}
        ${(r.imgs || []).length < 5 ? `<button class="ci-photo-add" data-idx="${i}">拍照</button>` : ''}
      </div>
    </div>`).join('');
}

/* ---- 渲染:接收明细 ---- */
function renderRecv() {
  // 统计:扫描票量=本次签入记录数;应到件数/实扫件数=Σ主单(批次结束后归零)
  const hasBatch = !!batchNumber;
  const should = hasBatch ? MAIN_ORDERS.reduce((s, m) => s + m.OrderPieces, 0) : 0;
  const real = hasBatch ? MAIN_ORDERS.reduce((s, m) => s + m.CheckInCount, 0) : 0;
  $('ciStatTicket').textContent = hasBatch ? scanRecords.length : 0;
  $('ciStatShould').textContent = should;
  $('ciStatReal').textContent = real;

  $('ciBatchBar').innerHTML = batchNumber
    ? `<span class="ci-batch-label">批次号：</span><b>${batchNumber}</b>`
    : '';
  const noData = !batchNumber || MAIN_ORDERS.length === 0;
  $('ciRecvEmpty').classList.toggle('hidden', !noData);
  $('ciMainList').classList.toggle('hidden', noData);
  if (noData) return;

  $('ciMainList').innerHTML = MAIN_ORDERS.map(m => {
    const done = m.CheckInCount === m.OrderPieces;
    const expanded = expandMain === m.WaybillNumber;
    return `
      <div class="ci-main">
        <div class="ci-main-head" data-main="${m.WaybillNumber}">
          <span class="ci-main-no" style="color:${done ? '#353535' : '#e64e58'}">主单号：${m.WaybillNumber}</span>
          <span class="ci-main-count" style="color:${done ? '#353535' : '#e64e58'}">${m.CheckInCount}/${m.OrderPieces}</span>
          <span class="ci-main-arrow">${expanded ? '▴' : '▾'}</span>
        </div>
        ${m.AbnormalCount > 0 ? `
        <div class="ci-main-abn" data-abn="${m.WaybillNumber}">
          <span class="ci-abn-icon">异</span>
          <span class="ci-abn-entry">异常件详情 &gt;</span>
        </div>` : ''}
        ${expanded ? `
        <div class="ci-child-list">
          ${m.children.map(c => `
            <div class="ci-child">
              <span class="ci-child-no">${c.ChildNumber}</span>
              ${c.IsCheckIn
                ? `<span class="ci-child-kv">体积(CM)：${c.Length}*${c.Width}*${c.Height}　重量(KG)：${c.Weight}</span>
                   <span class="ci-child-state ci-child-state--ok">已扫描</span>`
                : `<span class="ci-child-state">未扫描</span>`}
            </div>`).join('')}
        </div>` : ''}
      </div>`;
  }).join('');
}

/* ---- 渲染:批次/按钮状态 ---- */
function renderFinishBtn() {
  const can = !!batchNumber && scanRecords.length > 0;
  finishBtn.classList.toggle('ci-finish--on', can);
}

/* ---- 渲染全部 ---- */
function render() {
  renderRecords();
  renderRecv();
  renderFinishBtn();
}

/* ---- Tab 切换 ---- */
document.querySelectorAll('.ci-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ci-tab').forEach(t => t.classList.remove('ci-tab--on'));
    tab.classList.add('ci-tab--on');
    currentTab = Number(tab.dataset.tab);
    $('ciPaneScan').classList.toggle('hidden', currentTab !== 0);
    $('ciPaneRecv').classList.toggle('hidden', currentTab !== 1);
    if (currentTab === 1) renderRecv();
  });
});

/* ---- 尺寸输入:实时格式化 + 超尺寸拍照框联动 + 锁定开关 ---- */
[lenInput, widInput, heiInput, weightInput].forEach(input => {
  input.addEventListener('input', () => { input.value = fmtNum(input.value); syncOversizePanel(); });
});
lockChk.addEventListener('change', () => {
  locked = lockChk.checked;
  [lenInput, widInput, heiInput].forEach(i => {
    i.disabled = locked;
    i.classList.toggle('ci-dim-input--locked', locked);
  });
});

/* ---- 电子称(模拟蓝牙秤:连接→自动回传重量;复刻代码 WeightUtil) ---- */
function setScaleBtn() {
  scaleBtn.textContent = blueStatus === 1 ? '正在连接中' : blueStatus === 2 ? '断开电子称' : '连接电子称';
  scaleBtn.classList.toggle('ci-scale-btn--on', blueStatus === 2);
  scaleBtn.classList.toggle('ci-scale-btn--busy', blueStatus === 1);
}
scaleBtn.addEventListener('click', () => {
  if (blueStatus === 2) { blueStatus = 3; setScaleBtn(); Helpers.toast('已断开电子称'); return; }
  if (blueStatus === 1) return;
  blueStatus = 1; setScaleBtn();
  setTimeout(() => {
    blueStatus = 2; setScaleBtn();
    weightInput.value = '12.350';   // 模拟电子称回传重量
    Helpers.toast('电子称已连接,重量已回传');
  }, 1500);
});
setScaleBtn();

/* ---- 主单映射:子单号 → 主单号(子单 = 主单 + U + 3位序号) ---- */
function findChild(subNo) {
  const mainNo = subNo.slice(0, 18);
  const main = MAIN_ORDERS.find(m => m.WaybillNumber === mainNo);
  if (!main) return null;
  const child = main.children.find(c => c.ChildNumber === subNo);
  return child ? { main, child } : null;
}

/* ---- 签入扫描(复刻 onScan:先校验尺寸重量 → FBADeviceCheckInPDA → 入列表) ---- */
function onScan() {
  const code = scanInput.value.trim();
  if (!code) return;

  // 校验:计费网点必须录尺寸重量,且不能为 0(复刻代码 EmptyPrompt/ZeroPrompt)
  if (isCharge) {
    const L = lenInput.value, W = widInput.value, H = heiInput.value, Wt = weightInput.value;
    if (!L || !W || !H || !Wt) { Helpers.toast('长、宽、高、重量不可为空'); return; }
    if (parseFloat(L) === 0 || parseFloat(W) === 0 || parseFloat(H) === 0 || parseFloat(Wt) === 0) {
      Helpers.toast('长宽高重量不可为0'); return;
    }
  }

  // 重复扫描:已签入的子单拒绝
  if (scanRecords.some(r => r.scanCode === code)) {
    Helpers.toast('该子单已签入,请勿重复扫描'); scanInput.select(); return;
  }

  // 无效单号:非当前批次子单(生产环境后端返回 Message,此处演示拒绝)
  const hit = findChild(code);
  if (!hit) {
    Helpers.toast('子单' + code + '不属于当前签入批次,无法签入');
    scanInput.select();
    return;
  }

  // 超尺寸强制拍照:录尺寸时拍照上传框已出现(尺寸任一边>265 即触发)。
  // 未上传照片 → 拦截签入(签入尚未发生,符合代码时序);已上传 → 照片随签入绑定。
  const { max } = sortDims(lenInput.value || '0', widInput.value || '0', heiInput.value || '0');
  if (isCharge && max > OVERSIZE_LIMIT) {
    if (oversizeImgs.length === 0) {
      Helpers.toast('单边超' + OVERSIZE_LIMIT + 'CM,请先在拍照框上传照片,再扫描签入');
      syncOversizePanel();
      return;
    }
    doSignIn(code, oversizeImgs.slice(), { L: lenInput.value, W: widInput.value, H: heiInput.value, Wt: weightInput.value });
    return;
  }

  // 正常签入
  doSignIn(code, [], { L: lenInput.value, W: widInput.value, H: heiInput.value, Wt: weightInput.value });
}

// 执行签入(复刻 FBADeviceCheckInPDA 成功后:记录入列表 + 更新接收明细 + 清空尺寸)
function doSignIn(code, imgs, dims) {
  const { main, child } = findChild(code);
  const { max, middle, min } = sortDims(dims.L, dims.W, dims.H);
  const rec = {
    scanCode: code,
    pkgVolume: `${max}*${middle}*${min}`,
    pkgWeight: dims.Wt || '0',
    childAbnormal: child.abnormal
      ? { IssueKindName: child.abnormal, FontColor: '#e64e58' }
      : null,
    imgs: imgs,
  };
  scanRecords.unshift(rec);
  if (!child.IsCheckIn) { child.IsCheckIn = true; main.CheckInCount++; }
  child.Length = dims.L; child.Width = dims.W; child.Height = dims.H;
  child.Weight = dims.Wt;

  // 未锁定 → 清空尺寸重量,方便连续扫下一箱(复刻代码 setPackLength('') 等)
  if (!locked) {
    [lenInput, widInput, heiInput, weightInput].forEach(i => i.value = '');
  }
  scanInput.value = '';
  render();
  // 超尺寸箱签入后清空拍照框(每箱一照;锁尺寸连续扫时下一箱仍需拍照)
  oversizeImgs = [];
  renderOversizePanel();
  syncOversizePanel();
  scanInput.focus();
  Helpers.toast('签入成功:' + code);
}

/* ---- 图片录入(超尺寸必填)交互:拍照为签入前置,上传完再扫描 ---- */
oversizePhotos.addEventListener('click', e => {
  const add = e.target.closest('.ci-photo-add');
  if (add) { photoMode = 'oversize'; photoInput.click(); return; }
  const del = e.target.closest('.ci-oversize-del');
  if (del) {
    oversizeImgs.splice(Number(del.dataset.p), 1);
    renderOversizePanel();
  }
});

/* ---- 扫描输入:回车提交(扫码枪/实体键盘) ---- */
scanInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); onScan(); }
});

/* ---- 撤销扫描(复刻 cancelScan.tsx + RevokeScan) ---- */
function openRevoke() {
  revokeInput.value = '';
  revokeMask.classList.remove('hidden');
  revokeInput.focus();
}
function closeRevoke() {
  revokeMask.classList.add('hidden');
  scanInput.focus();
}
function doRevoke() {
  const code = revokeInput.value.trim();
  if (!code) return;
  const idx = scanRecords.findIndex(r => r.scanCode === code);
  if (idx === -1) { Helpers.toast('该子单未签入,无需撤销'); revokeInput.select(); return; }
  // 移除记录 + 接收明细回退(IsCheckIn=false, CheckInCount-1)
  const rec = scanRecords[idx];
  scanRecords.splice(idx, 1);
  const hit = findChild(code);
  if (hit && hit.child.IsCheckIn) {
    hit.child.IsCheckIn = false;
    hit.main.CheckInCount = Math.max(0, hit.main.CheckInCount - 1);
  }
  closeRevoke();
  render();
  Helpers.toast('已撤销扫描:' + code);
}
$('ciRevokeBtn').addEventListener('click', openRevoke);
$('ciRevokeCancel').addEventListener('click', closeRevoke);
$('ciRevokeOk').addEventListener('click', doRevoke);
revokeMask.addEventListener('click', e => { if (e.target === revokeMask) closeRevoke(); });
revokeInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); doRevoke(); }
  if (e.key === 'Escape') closeRevoke();
});

/* ---- 异常件详情弹层(复刻 AbnormalInfoModal:按主单号查异常件) ---- */
$('ciMainList').addEventListener('click', e => {
  const mainHead = e.target.closest('.ci-main-head');
  if (mainHead) {
    const mainNo = mainHead.dataset.main;
    expandMain = expandMain === mainNo ? '' : mainNo;
    renderRecv();
    return;
  }
  const abnEntry = e.target.closest('.ci-main-abn');
  if (abnEntry) {
    abnMainNo = abnEntry.dataset.abn;
    const main = MAIN_ORDERS.find(m => m.WaybillNumber === abnMainNo);
    abnMain.textContent = '主单号：' + abnMainNo;
    abnList.innerHTML = main.children
      .filter(c => c.abnormal)
      .map(c => `
        <div class="ci-abn-item">
          <span class="ci-abn-icon">异</span>
          <div class="ci-abn-item-body">
            <div class="ci-abn-item-no">${c.ChildNumber}</div>
            <div class="ci-abn-item-text">${c.abnormal.split('|').join('\n')}</div>
          </div>
        </div>`).join('');
    abnMask.classList.remove('hidden');
    return;
  }
});
$('ciAbnClose').addEventListener('click', () => abnMask.classList.add('hidden'));
abnMask.addEventListener('click', e => { if (e.target === abnMask) abnMask.classList.add('hidden'); });

/* ---- 拍照上传(生产:imgBindingToCodeWithFile,子单最多5张) ---- */
recordsEl.addEventListener('click', e => {
  const add = e.target.closest('.ci-photo-add');
  if (add) { photoTargetIdx = Number(add.dataset.idx); photoMode = 'record'; photoInput.click(); return; }
  const del = e.target.closest('.ci-photo-del');
  if (del) {
    const rec = scanRecords[Number(del.dataset.idx)];
    if (rec && rec.imgs) rec.imgs.splice(Number(del.dataset.p), 1);
    renderRecords();
    return;
  }
});
photoInput.addEventListener('change', () => {
  if (!photoInput.files || !photoInput.files[0]) { photoInput.value = ''; return; }
  const url = URL.createObjectURL(photoInput.files[0]);
  if (photoMode === 'oversize') {
    // 超尺寸拍照上传框:照片先上传暂存,扫描签入时绑定到子单
    oversizeImgs.push(url);
    renderOversizePanel();
    Helpers.toast('照片已上传,可扫描子单号签入');
  } else {
    // 记录补图:签入成功后的留档照片(生产:imgBindingToCodeWithFile,子单最多5张)
    const rec = scanRecords[photoTargetIdx];
    if (rec) {
      rec.imgs = rec.imgs || [];
      if (rec.imgs.length < 5) rec.imgs.push(url);
      renderRecords();
    }
  }
  photoInput.value = '';
});

/* ---- 完成签入(复刻 CompeteBatchByBatchNo:无批次号时按钮置灰不可点) ---- */
finishBtn.addEventListener('click', () => {
  if (!batchNumber || scanRecords.length === 0) { Helpers.toast('暂无可完成的签入批次'); return; }
  // 完成批次 → 清空批次/记录/明细(复刻代码成功后置空全部状态)
  batchNumber = '';
  scanRecords = [];
  expandMain = '';
  MAIN_ORDERS.forEach(m => {
    m.CheckInCount = 0;
    m.children.forEach(c => {
      c.IsCheckIn = false;
      c.Length = c.Width = c.Height = c.Weight = undefined;
    });
  });
  render();
  Helpers.toast('批次签入已完成');
});

/* ---- 全局键盘:Escape 关弹层 ---- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!revokeMask.classList.contains('hidden')) closeRevoke();
    if (!abnMask.classList.contains('hidden')) abnMask.classList.add('hidden');
  }
});

render();

/* ============================================
   演示面板(桌面端设备框外侧,评审用;移动端隐藏)
   ============================================ */
const testPanel = document.createElement('div');
testPanel.className = 'test-panel';
testPanel.innerHTML = `
  <div class="test-panel-title">
    <span>签入演示</span>
    <span class="test-panel-tip">点击单号即签入</span>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">计费网点模式切换</div>
    <div class="test-panel-tags">
      <button class="test-panel-btn" data-mode="1">计费网点(录尺寸)</button>
      <button class="test-panel-btn" data-mode="0">非计费网点(免录)</button>
      <button class="test-panel-btn" data-reset="1">重置演示</button>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">正常签入(尺寸先填好)</div>
    <div class="test-panel-tags">
      ${MAIN_ORDERS.flatMap(m => m.children.filter(c => !c.abnormal).map(c => c.ChildNumber))
        .map(no => `<span class="test-panel-tag" data-no="${no}">${no}</span>`).join('')}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">问题件(签入带异常标记)</div>
    <div class="test-panel-tags">
      ${MAIN_ORDERS.flatMap(m => m.children.filter(c => c.abnormal).map(c => c.ChildNumber))
        .map(no => `<span class="test-panel-tag" data-no="${no}">${no}</span>`).join('')}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">超尺寸件(单边&gt;${OVERSIZE_LIMIT}需先拍照)</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-no="${OVERSIZE_NO}">${OVERSIZE_NO}</span>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">无效单号(拒绝)</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-no="${INVALID_NO}">${INVALID_NO}</span>
    </div>
  </div>
`;
document.body.appendChild(testPanel);

// 演示面板点击:单号 → 填入并触发签入;模式切换 → 切换计费形态
testPanel.addEventListener('click', e => {
  const modeBtn = e.target.closest('[data-mode]');
  if (modeBtn) {
    isCharge = modeBtn.dataset.mode === '1';
    modeText.textContent = isCharge ? '计费网点' : '非计费网点';
    modeTag.classList.toggle('ci-mode--plain', !isCharge);
    dimArea.classList.toggle('hidden', !isCharge);
    Helpers.toast(isCharge ? '已切换为计费网点(需录尺寸重量)' : '已切换为非计费网点(免录尺寸重量)');
    render();
    syncOversizePanel();
    return;
  }
  if (e.target.closest('[data-reset]')) {
    batchNumber = BATCH_NO;
    scanRecords = [
      { scanCode: 'YT2621000070480962U001', pkgVolume: '60*40*35', pkgWeight: '12.35', childAbnormal: null, imgs: [] },
      { scanCode: 'YT2621000070480963U001', pkgVolume: '58*42*38', pkgWeight: '15.20', childAbnormal: null, imgs: [] },
    ];
    expandMain = '';
    lenInput.value = widInput.value = heiInput.value = weightInput.value = '';
    oversizeImgs = [];
    syncOversizePanel();
    MAIN_ORDERS.forEach(m => {
      const init = { 'YT2621000070480962': 1, 'YT2621000070480963': 1, 'YT2621000070480964': 0 }[m.WaybillNumber] || 0;
      m.CheckInCount = init;
      const is62 = m.WaybillNumber === 'YT2621000070480962';
      m.children.forEach((c, i) => {
        c.IsCheckIn = i < init;   // 前 init 箱预置已扫(64 主单无预置)
        if (c.IsCheckIn) {
          c.Length = is62 ? '60' : '58';
          c.Width  = is62 ? '40' : '42';
          c.Height = is62 ? '35' : '38';
          c.Weight = is62 ? '12.35' : '15.20';
        } else { c.Length = c.Width = c.Height = c.Weight = undefined; }
      });
    });
    render();
    Helpers.toast('已重置演示批次');
    return;
  }
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  // 计费模式下自动预填一组尺寸,保证点击即成功(演示便利)
  // 超尺寸件填 300*40*35(>265 触发拍照框);其余填 60*40*35
  if (isCharge && (!lenInput.value || !widInput.value || !heiInput.value || !weightInput.value)) {
    if (tag.dataset.no === OVERSIZE_NO) { lenInput.value = '300'; widInput.value = '40'; heiInput.value = '35'; }
    else { lenInput.value = '60'; widInput.value = '40'; heiInput.value = '35'; }
    weightInput.value = '12.35';
  }
  syncOversizePanel();
  scanInput.value = tag.dataset.no;
  onScan();
});
