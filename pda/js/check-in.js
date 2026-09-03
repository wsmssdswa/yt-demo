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

   推荐库位 × LNMS(2026-09 新需求):签入时经 LNMS 实时查「推荐调拨网点」,再以
     签入网点+产品+调拨网点 匹配推荐库位规则(条件行留空=不限);命中多条按创建顺序取第一条的第一个库位。
     LNMS 无返回/超时:静默降级——签入照常,带调拨网点条件的规则匹配不上,不限规则照常兜底。

   签入即到货(2026-08 新需求):有调拨任务的货,签入时自动登记到货(替代单独的到货扫描)
     适用范围:全部调拨货,不区分计费/非计费网点 — 两类网点都是"人工做一个动作、系统补全另一件":
       · 非计费网点:人工签入(采材积) + 系统自动到货
       · 计费网点:货已在源计费仓签过,目的仓只到货不重签;若经 PDA 签入,同样自动带出到货
     触发条件:① 调拨货(主单带中转单号 transitNo,对应 transfer_status=1)
              ② 该箱无到货记录(防重复)
     错仓处理(2026-09-02 调整):目的仓≠本仓不弹窗、不拦截、不做配置 — 照常签入+自动到货,
       系统按中转单聚合发飞书通知相关人员跟进(转运/改单/退回);到货网点=实际签入仓,
       如实回传 OTS(整单到齐判断在 OTS 侧)。现场零打断,仅 toast 提示+记录橙标。

   重量偏差强制拍照(2026-09 新需求):录入重量与预报重量相差 >30% 时,扫码后弹「重量偏差确认」
     弹窗逐单处理:显示录入/预报/偏差对照 + 拍照框,点「确认签入」直接完成(照片此时才绑定子单,
     不需重扫);弹窗模态锁定该单,未处理完扫其他单被拒(防照片错绑);取消丢弃照片回到称重。
     预报重量生产取自 ord_child_order_info.predicted_weight;签入明细接口
     GetCheckInDetailByOrderNo 当前未返回该字段 → 演示数据 PredictedWeight 为预置模拟,
     真实实现需后端在签入链路补充预报重量。
     与超尺寸差异:超尺寸录尺寸当下即可判定(嵌入式拍照框,拍照→扫码,线上已实现不动);
     重量偏差须扫码才知道预报 → 弹窗承载(扫描后逐单处理,对齐仓库现场偏好)。
     双规则同箱:超尺寸照片即偏差照片(同箱一照两用,超尺寸分支先行,不重复弹窗)。
   ============================================ */

/* ---- 演示数据:批次 + 主单 + 子单 ----
   单号格式(AGENTS.md 规范):主单 = YT+16位数字;子单 = 主单+U+3位序号(U001起)
   IsCheckIn=true 表示该箱已签入;abnormal 为问题件标题(生产由后端 ChildAbnormal 返回,'|' 分隔多行)
   productCode = 产品(LNMS 匹配推荐库位用);lnmsDestOrg = LNMS 返回的推荐调拨网点
   (签入时实时查询:'' = LNMS 无返回/该票无推荐)
   PredictedWeight = 预报重量(生产 ord_child_order_info.predicted_weight;签入明细接口当前未返回,
   为新需求演示字段)。重量偏差演示件:62票U002,预报12.35kg,演示面板自动填25kg 触发 >30% */
const BATCH_NO = 'B20260810001';
const MAIN_ORDERS = [
  {
    WaybillNumber: 'YT2621000070480962', OrderPieces: 3, CheckInCount: 1, AbnormalCount: 0,
    productCode: 'US-MATSU-REG', lnmsDestOrg: '上海仓',
    children: [
      { ChildNumber: 'YT2621000070480962U001', IsCheckIn: true,  Length: '60',  Width: '40',  Height: '35',  Weight: '12.35', PredictedWeight: '12.35' },
      { ChildNumber: 'YT2621000070480962U002', IsCheckIn: false, PredictedWeight: '12.35' },
      { ChildNumber: 'YT2621000070480962U003', IsCheckIn: false, PredictedWeight: '12.35' },
    ],
  },
  {
    WaybillNumber: 'YT2621000070480963', OrderPieces: 3, CheckInCount: 1, AbnormalCount: 2,
    productCode: 'US-MATSU-ELC', lnmsDestOrg: '',
    children: [
      { ChildNumber: 'YT2621000070480963U001', IsCheckIn: true,  Length: '58',  Width: '42',  Height: '38',  Weight: '15.20', PredictedWeight: '15.00' },
      { ChildNumber: 'YT2621000070480963U002', IsCheckIn: false, abnormal: '申报不符|涉侵权', PredictedWeight: '15.00' },
      { ChildNumber: 'YT2621000070480963U003', IsCheckIn: false, abnormal: '与实物不符', PredictedWeight: '15.00' },
    ],
  },
  {
    WaybillNumber: 'YT2621000070480964', OrderPieces: 1, CheckInCount: 0, AbnormalCount: 0,
    productCode: 'US-HAIYUN-REG', lnmsDestOrg: '上海仓',
    children: [
      { ChildNumber: 'YT2621000070480964U001', IsCheckIn: false, PredictedWeight: '12.35' },   // 超尺寸件:单边 300CM > 265;该产品无启用规则 → 有调拨网点也暂无推荐库位
    ],
  },
];

/* ---- 推荐库位规则(与 PC 配置页「调拨网点方案」演示数据同源,只列启用规则) ----
   匹配口径 = 签入网点 + 条件行全部满足/满足其一(joiner,默认且;产品/调拨网点均为条件项,留空 = 不限);
   LNMS 无返回时,带调拨网点条件的规则自然匹配不上,不限规则照常命中 */
const LR_RULES = [
  { og: 'GZ01', joiner: '且', conds: [{ item: 'product', values: ['US-MATSU-REG'] }, { item: 'destOrg', values: ['上海仓'] }],   locations: ['A-01-01', 'A-01-02'] },
  { og: 'GZ01', joiner: '且', conds: [{ item: 'product', values: ['US-MATSU-REG'] }, { item: 'destOrg', values: ['洛杉矶仓'] }], locations: ['B-02-01'] },
  { og: 'GZ01', joiner: '且', conds: [{ item: 'product', values: ['US-MATSU-ELC'] }],                                           locations: ['B-02-01', 'B-02-04'] },
  // 海运普船(US-HAIYUN-REG)的规则在演示中为停用状态 → 不列入;64票签入时 LNMS 有推荐也无命中 → 暂无推荐库位
];
// LNMS 模拟开关:true = 无返回(签入照常,带调拨网点条件的规则匹配不上,不限规则照常兜底)
let LNMS_DOWN = false;

/* 签入时匹配推荐库位:命中多条按创建顺序取第一条的第一个库位(线上 order by id limit 1 的口径) */
function matchRecommend(og, productCode, destOrg) {
  const ctx = { product: productCode, destOrg };
  const hit = r => {
    const ok = r.conds.map(c => !!ctx[c.item] && c.values.includes(ctx[c.item]));
    return r.joiner === '或' ? ok.some(Boolean) : ok.every(Boolean);
  };
  const rule = LR_RULES.find(r => r.og === og && hit(r));
  return rule ? rule.locations[0] : '';
}
// 超尺寸阈值:任一边 > 265CM 必须上传照片(新需求,边界 [待确认:大于还是大于等于])
const OVERSIZE_LIMIT = 265;
// 超尺寸演示单号:点击演示时自动填 300*40*35 触发规则
const OVERSIZE_NO = 'YT2621000070480964U001';
// 重量偏差阈值:|录入-预报| / 预报 > 30% 必须上传照片(新需求,边界 [待确认:大于还是大于等于])
const WEIGHT_DEV_PCT_LIMIT = 30;
// 重量偏差演示单号(预报 12.35kg):点击演示时自动填重量 25kg(偏差 102%)触发规则
const WEIGHT_DEV_NO = 'YT2621000070480962U002';
// 无效单号(演示拒绝):非当前批次子单
const INVALID_NO = 'YT2621000070480999U005';

/* ---- 签入即到货演示常量 ----
   CUR_ORG:当前操作网点(签入网点);调拨票主单带 transitNo/destOrg/destOrgName
   PRE_ARRIVED_CHILD:预置"已有到货记录"的箱(模拟 OTS 已推送过到货 → 签入时防重复) */
const CUR_ORG = 'GZ01';   // 当前网点 = 广州仓
const PRE_ARRIVED_CHILD = 'YT2621000070481066U003';
const DEMO_MAINS = [
  {
    // 调拨票①:目的仓=本仓(GZ01) → 非计费网点扫 U001/U002 触发自动到货;U003 演示防重复
    WaybillNumber: 'YT2621000070481066', OrderPieces: 3, CheckInCount: 0, AbnormalCount: 0,
    transitNo: 'ZX2608270156', destOrg: 'GZ01', destOrgName: '广州仓',
    children: [
      { ChildNumber: 'YT2621000070481066U001', IsCheckIn: false },
      { ChildNumber: 'YT2621000070481066U002', IsCheckIn: false },
      { ChildNumber: 'YT2621000070481066U003', IsCheckIn: false, arrived: true },   // 已有到货记录
    ],
  },
  {
    // 调拨票②:目的仓=上海仓(SH01)≠本仓 → 签入照常成功,仅提示不拦截、不自动到货
    WaybillNumber: 'YT2621000070481088', OrderPieces: 1, CheckInCount: 0, AbnormalCount: 0,
    transitNo: 'ZX2608270201', destOrg: 'SH01', destOrgName: '上海仓',
    children: [
      { ChildNumber: 'YT2621000070481088U001', IsCheckIn: false },
    ],
  },
];
MAIN_ORDERS.push(...DEMO_MAINS);

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
      <div class="ci-dim-label ci-dim-label--row">
        <span>重量(KG)：</span>
        <!-- 预报重量参照:扫码框有该箱单号时显示(拦截后留框/手输单号未提交时可见),无则隐藏 -->
        <span class="ci-pred-wt hidden" id="ciPredWt"></span>
      </div>
      <div class="ci-dim-row">
        <input type="text" class="ci-weight-input" id="ciWeight" inputmode="decimal" placeholder="0.000" />
        <button class="ci-scale-btn" id="ciScaleBtn">连接电子称</button>
        <label class="ci-switch">
          <input type="checkbox" id="ciWeightLock" />
          <span class="ci-switch-slider"></span>
          <span class="ci-lock-text">锁定</span>
        </label>
      </div>

      <!-- 图片录入:长宽高/重量下方;超尺寸 或 录入重量与预报相差>30% 时出现,必填(未拍照不允许扫描签入) -->
      <div class="ci-oversize-panel hidden" id="ciOversizePanel">
        <div class="ci-oversize-label"><span class="ci-required">*</span>图片<span class="ci-oversize-hint" id="ciOversizeHint">单边超${OVERSIZE_LIMIT}cm需要上传照片</span></div>
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

  <!-- 目的仓不一致不再弹窗(2026-09-02:现场零打断,签入照常+自动到货,系统飞书通知跟进) -->

  <!-- 重量偏差确认弹层:扫码发现录入与预报相差>30% 时弹出,锁定该单逐单处理。
       模态:未拍照确认/取消前不能扫其他单(防照片错绑);照片本地暂存,
       点「确认签入」时才带子单号上传绑定(对齐线上超尺寸 暂存→签入统一上传 的时序) -->
  <div class="ci-mask ci-mask--sheet hidden" id="ciDevMask">
    <div class="ci-dialog ci-dialog--dev">
      <button class="ci-sheet-close" id="ciDevClose">×</button>
      <div class="ci-sheet-grip"></div>
      <div class="ci-dialog-title">重量确认</div>
      <div class="ci-dev-compare" id="ciDevCompare"></div>
      <div class="ci-oversize-label"><span class="ci-required">*</span>图片<span class="ci-oversize-hint">与预报重量相差超${WEIGHT_DEV_PCT_LIMIT}%需要上传照片</span></div>
      <div class="ci-oversize-photos ci-dev-photos" id="ciDevPhotos"></div>
      <div class="ci-dialog-btns">
        <button class="ci-dialog-btn ci-dialog-btn--ok ci-dialog-btn--full" id="ciDevOk">确认签入</button>
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
const weightInput= $('ciWeight'), lockChk = $('ciLock'), scaleBtn = $('ciScaleBtn'), weightLockChk = $('ciWeightLock');
const predWtEl   = $('ciPredWt');
const scanInput  = $('ciScanInput');
const recCount   = $('ciRecCount');
const emptyState = $('ciEmpty'), recordsEl = $('ciRecords');
const revokeMask = $('ciRevokeMask'), revokeInput = $('ciRevokeInput');
const abnMask    = $('ciAbnMask'), abnMain = $('ciAbnMain'), abnList = $('ciAbnList');
const devMask = $('ciDevMask'), devCompare = $('ciDevCompare'),
      devPhotos = $('ciDevPhotos'), devOk = $('ciDevOk'), devClose = $('ciDevClose');
const oversizePanel = $('ciOversizePanel'), oversizeHint = $('ciOversizeHint'), oversizePhotos = $('ciOversizePhotos');
const photoInput = $('ciPhotoInput');
const finishBtn  = $('ciFinishBtn');

/* ---- 状态 ---- */
let isCharge = true;          // 当前网点是否计费网点(CheckChargeOrg 返回 IsChargeOrg)
let locked = false;           // 尺寸锁定(锁定时长宽高禁用)
let weightLocked = false;     // 重量锁定(独立于尺寸锁定:锁定时电子称不覆盖、签入成功不清空重量)
let blueStatus = 3;           // 电子称:1=连接中 2=已连接 3=未连接
let batchNumber = BATCH_NO;   // 当前批次号(首次扫描成功后由后端返回;原型预置演示批次)
let currentTab = 0;           // 0=扫描详情 1=接收明细
// 已签入记录 {scanCode, pkgVolume, pkgWeight, childAbnormal, imgs[], recommend}
// 初始预置与 MAIN_ORDERS 预置已扫(62U001/63U001)一致,保证扫描详情/接收明细/统计联动
let scanRecords = [
  { scanCode: 'YT2621000070480962U001', pkgVolume: '60*40*35', pkgWeight: '12.35', childAbnormal: null, imgs: [], predWt: '12.35', destOrgTip: '上海仓', recommend: 'A-01-01' },
  { scanCode: 'YT2621000070480963U001', pkgVolume: '58*42*38', pkgWeight: '15.20', childAbnormal: null, imgs: [], predWt: '15.00', destOrgTip: '', recommend: 'B-02-01' },
];
let expandMain = '';          // 接收明细当前展开的主单号
let abnMainNo = '';           // 异常弹层当前主单号
let photoTargetIdx = -1;      // 记录上"拍照"补图的目标记录索引
let photoMode = '';           // 当前拍照目标:'oversize'=超尺寸拍照上传框 / 'dev'=偏差确认弹窗 / 'record'=记录补图
let oversizeImgs = [];        // 超尺寸箱拍照上传框中的照片(上传完才允许扫描签入,签入后清空)
let devPending = '';          // 偏差确认弹窗锁定的子单号(弹窗打开期间不能扫其他单)
let devImgs = [];             // 偏差弹窗本地暂存照片(点「确认签入」时才绑定子单;取消即丢弃)

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

/* 图片录入(强制拍照必填):拍照框样式与扫描记录一致(虚线方框,上传显示缩略图,最多5张) */
function renderOversizePanel() {
  oversizePhotos.innerHTML = oversizeImgs.map((src, j) => `
    <span class="ci-photo" style="background-image:url('${src}')">
      <i class="ci-oversize-del" data-p="${j}">×</i>
    </span>`).join('')
    + (oversizeImgs.length < 5 ? `<button class="ci-photo-add">拍照</button>` : '');
}
/* 录入区预报重量参照(重量行右侧灰字):以扫码框当前子单为准,无单号/无预报则隐藏 */
function renderPredWt() {
  const hit = findChild(scanInput.value);
  const pred = hit && hit.child.PredictedWeight ? hit.child.PredictedWeight : '';
  predWtEl.textContent = pred ? `预报 ${pred}kg` : '';
  predWtEl.classList.toggle('hidden', !pred);
}

/* 超尺寸拍照面板:仅超尺寸(任一边>265)触发——录尺寸当下即可判定,拍照后再扫码。
   重量偏差不走此面板:预报重量跟箱走,扫码才知道 → 扫码后弹「重量偏差确认」弹窗逐单处理。
   (扫码框单号同时偏差超时,面板文案并列提示,告知一照两用) */
function syncOversizePanel() {
  const { max } = sortDims(lenInput.value || '0', widInput.value || '0', heiInput.value || '0');
  const isOversize = isCharge && max > OVERSIZE_LIMIT;
  oversizePanel.classList.toggle('hidden', !isOversize);
  const devPct = weightDevPct(scanInput.value);
  const isWeightDev = isCharge && devPct !== null && devPct > WEIGHT_DEV_PCT_LIMIT;
  const reasons = [];
  if (isOversize) reasons.push(`单边超${OVERSIZE_LIMIT}cm`);
  if (isOversize && isWeightDev) reasons.push(`与预报重量相差超${WEIGHT_DEV_PCT_LIMIT}%`);
  oversizeHint.textContent = reasons.length ? reasons.join('、') + '需要上传照片' + (isWeightDev ? '(一照两用)' : '') : '';
  renderOversizePanel();
  if (!isOversize) { oversizeImgs = []; }
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
        <span class="ci-rec-tags">
          ${r.arrivalDone ? `<span class="ci-rec-tag ${r.orgMismatch ? 'ci-rec-tag--mismatch' : 'ci-rec-tag--arrival'}">${r.orgMismatch ? '错仓·已到货' : '已自动到货'}</span>` : ''}
        </span>
      </div>
      ${isCharge ? `
      <div class="ci-rec-meta">
        <span>体积(CM)：${r.pkgVolume}</span>
        <span>重量(KG)：${r.pkgWeight}</span>
        ${r.predWt ? `<span>预报(KG)：${r.predWt}</span>` : ''}
      </div>` : ''}
      <div class="ci-rec-recommend${r.destOrgTip ? '' : ' ci-rec-recommend--hide'}">${r.destOrgTip ? `推荐调拨：<b>${r.destOrgTip}</b>` : ''}</div>
      <div class="ci-rec-recommend${r.recommend ? '' : ' ci-rec-recommend--none'}">推荐库位：${r.recommend ? `<b>${r.recommend}</b>` : '暂无推荐库位'}</div>
      ${r.transitNo ? `
      <div class="ci-rec-transfer">中转单:${r.transitNo} · <span${r.orgMismatch ? ' class="ci-rec-dest--warn"' : ''}>目的仓:${r.destOrgName}</span></div>` : ''}
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
        ${m.transitNo ? `
        <div class="ci-main-transit">
          <span class="ci-transit-badge">调拨</span>
          <span>中转单:${m.transitNo}</span>
          <span>目的仓:${m.destOrgName}</span>
        </div>` : ''}
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
                ? `${c.Length ? `<span class="ci-child-kv">体积(CM)：${c.Length}*${c.Width}*${c.Height}　重量(KG)：${c.Weight}</span>` : ''}
                   <span class="ci-child-state">已扫描</span>`
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
/* ---- 重量锁定:独立于尺寸锁定;锁定时输入禁用、电子称不覆盖、签入成功不清空(复刻 isWeightLocked) ---- */
weightLockChk.addEventListener('change', () => {
  weightLocked = weightLockChk.checked;
  weightInput.disabled = weightLocked;
  weightInput.classList.toggle('ci-dim-input--locked', weightLocked);
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
    if (!weightLocked) weightInput.value = '12.350';   // 模拟电子称回传重量(重量锁定时不覆盖)
    Helpers.toast('电子称已连接,重量已回传');
  }, 1500);
});
setScaleBtn();
syncOversizePanel();   // 首渲染:按当前输入落定拍照框显隐与提示文案

/* ---- 主单映射:子单号 → 主单号(子单 = 主单 + U + 3位序号) ---- */
function findChild(subNo) {
  const mainNo = subNo.slice(0, 18);
  const main = MAIN_ORDERS.find(m => m.WaybillNumber === mainNo);
  if (!main) return null;
  const child = main.children.find(c => c.ChildNumber === subNo);
  return child ? { main, child } : null;
}

/* 录入重量 vs 预报重量偏差百分比(相对预报;预报缺失/为0 → null,不触发拍照) */
function weightDevPct(code) {
  const hit = findChild(code || '');
  if (!hit || !hit.child.PredictedWeight) return null;
  const pred = parseFloat(hit.child.PredictedWeight);
  const wt = parseFloat(weightInput.value);
  if (!(pred > 0) || !(wt > 0)) return null;
  return Math.abs(wt - pred) / pred * 100;
}

/* ---- 签入扫描(复刻 onScan:先校验尺寸重量 → FBADeviceCheckInPDA → 入列表) ---- */
function onScan() {
  const code = scanInput.value.trim();
  if (!code) return;

  // 偏差弹窗模态锁:该单未处理完前不许扫其他单(照片只属于锁定单,防错绑)
  if (!devMask.classList.contains('hidden')) {
    if (code !== devPending) Helpers.toast('请先处理当前偏差件:' + devPending + '(拍照签入或取消)');
    scanInput.select();
    return;
  }

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

  // 超尺寸强制拍照(线上原交互,不动):录尺寸时拍照框已出现,未拍照拦截,拍了随签入绑定。
  // 双规则同箱(超尺寸+偏差):照片按子单绑定,超尺寸照片即偏差照片,一照两用,不重复弹窗。
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

  // 重量偏差(纯偏差场景):扫码才发现(预报重量跟箱走)→ 弹「重量偏差确认」弹窗,
  // 锁定该单拍照确认,不用重扫;取消=丢弃照片回到称重(称错了重称)
  const devPct = weightDevPct(code);
  if (isCharge && devPct !== null && devPct > WEIGHT_DEV_PCT_LIMIT) {
    openDevDialog(code, devPct);
    return;
  }

  // 正常签入(错仓调拨货同样走这里:照常签入+自动到货,系统另发飞书通知)
  doSignIn(code, [], { L: lenInput.value, W: widInput.value, H: heiInput.value, Wt: weightInput.value });
}

/* ---- 重量偏差确认弹窗:锁定该单逐单处理 ----
   打开:记录锁定单号+对照信息,照片清零本地暂存;
   确认签入:照片≥1 才可点 → 带子单号随签入绑定(演示直接绑定;生产为 点确认→上传→签入,失败回滚);
   取消:丢弃暂存照片,弹窗关闭,扫码框保留单号 → 改重量重扫 或 扫其他单 */
function renderDevPhotos() {
  devPhotos.innerHTML = devImgs.map((src, j) => `
    <span class="ci-photo" style="background-image:url('${src}')">
      <i class="ci-oversize-del" data-p="${j}">×</i>
    </span>`).join('')
    + (devImgs.length < 5 ? `<button class="ci-photo-add">拍照</button>` : '');
  devOk.classList.toggle('ci-dialog-btn--disabled', devImgs.length === 0);
}
function openDevDialog(code, devPct) {
  devPending = code;
  devImgs = [];
  devCompare.innerHTML = `
    <div class="ci-dev-item"><span>录入重量(KG)</span><b>${weightInput.value}</b></div>
    <div class="ci-dev-item"><span>预报重量(KG)</span><b>${findChild(code).child.PredictedWeight}</b></div>
    <div class="ci-dev-item ci-dev-item--warn"><span>偏差</span><b>${devPct >= 0 ? '+' : ''}${devPct.toFixed(1)}%</b></div>`;
  renderDevPhotos();
  devMask.classList.remove('hidden');
}
function closeDevDialog() {
  devMask.classList.add('hidden');
  devPending = '';
  devImgs = [];
  scanInput.select();
}
devClose.addEventListener('click', () => { closeDevDialog(); Helpers.toast('已关闭,照片已丢弃;可重新称重后再扫'); });
devOk.addEventListener('click', () => {
  if (devImgs.length === 0) { Helpers.toast('请先上传至少1张照片'); return; }
  const code = devPending;
  const imgs = devImgs.slice();   // 先取快照:closeDevDialog 会清空暂存
  closeDevDialog();
  doSignIn(code, imgs, { L: lenInput.value, W: widInput.value, H: heiInput.value, Wt: weightInput.value });
});
devPhotos.addEventListener('click', e => {
  const add = e.target.closest('.ci-photo-add');
  if (add) { photoMode = 'dev'; photoInput.click(); return; }
  const del = e.target.closest('.ci-oversize-del');
  if (del) { devImgs.splice(Number(del.dataset.p), 1); renderDevPhotos(); }
});

// 执行签入(复刻 FBADeviceCheckInPDA 成功后:记录入列表 + 更新接收明细 + 清空尺寸)
function doSignIn(code, imgs, dims) {
  const { main, child } = findChild(code);
  const { max, middle, min } = sortDims(dims.L, dims.W, dims.H);
  /* LNMS 推荐调拨网点:签入时实时查询(无返回/超时 = 空,静默不阻塞) */
  const destOrgTip = LNMS_DOWN ? '' : (main.lnmsDestOrg || '');
  const rec = {
    scanCode: code,
    pkgVolume: `${max}*${middle}*${min}`,
    pkgWeight: dims.Wt || '0',
    childAbnormal: child.abnormal
      ? { IssueKindName: child.abnormal, FontColor: '#e64e58' }
      : null,
    imgs: imgs,
    predWt: child.PredictedWeight || '',                    // 预报重量(留档对照;无预报的子单留空不显示)
    destOrgTip,                                                  // LNMS 推荐调拨网点
    recommend: matchRecommend(CUR_ORG, main.productCode, destOrgTip),   // 推荐库位(签入网点+产品+调拨网点匹配)
    // 签入即到货字段(渲染用)
    transitNo: main.transitNo || '',
    destOrgName: main.destOrgName || '',
    arrivalDone: false,                                             // 本次签入触发了自动到货
    orgMismatch: !!main.transitNo && main.destOrg !== CUR_ORG,      // 调拨目的仓≠本仓(仅提示)
  };
  scanRecords.unshift(rec);
  if (!child.IsCheckIn) { child.IsCheckIn = true; main.CheckInCount++; }
  child.Length = dims.L; child.Width = dims.W; child.Height = dims.H;
  child.Weight = dims.Wt;

  // ===== 签入即到货判断(全部调拨货适用,不区分网点类型;错仓照常到货,另发飞书通知) =====
  let toastMsg = '签入成功:' + code;
  if (main.transitNo) {
    if (child.arrived) {
      toastMsg = '签入成功,该箱已有到货记录,未重复到货';
    } else {
      child.arrived = true;
      rec.arrivalDone = true;
      toastMsg = rec.orgMismatch
        ? '签入成功,已自动到货(目的仓非本仓,已通知跟进)'
        : '签入成功,已自动到货';
    }
  }

  // 未锁定 → 清空尺寸,方便连续扫下一箱;重量独立锁定(复刻代码:尺寸 setPackLength('') 等,重量看 isWeightLocked)
  if (!locked) {
    [lenInput, widInput, heiInput].forEach(i => i.value = '');
  }
  if (!weightLocked) {
    weightInput.value = '';
  }
  scanInput.value = '';
  render();
  // 超尺寸箱签入后清空拍照框(每箱一照);面板随后按下一箱输入重新判定(锁尺寸连续扫仍需拍照)
  oversizeImgs = [];
  renderOversizePanel();
  syncOversizePanel();
  renderPredWt();   // 扫码框已清空 → 录入区预报参照随之隐藏
  scanInput.focus();
  Helpers.toast(toastMsg);
}

/* ---- 图片录入(强制拍照必填)交互:拍照为签入前置,上传完再扫描 ---- */
oversizePhotos.addEventListener('click', e => {
  const add = e.target.closest('.ci-photo-add');
  if (add) { photoMode = 'oversize'; photoInput.click(); return; }
  const del = e.target.closest('.ci-oversize-del');
  if (del) {
    oversizeImgs.splice(Number(del.dataset.p), 1);
    renderOversizePanel();
  }
});

/* ---- 扫描输入:回车提交(扫码枪/实体键盘);手输单号时同步刷新预报重量参照 ---- */
scanInput.addEventListener('input', renderPredWt);
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
    // 超尺寸拍照框:照片先本地暂存,扫描签入时带子单号上传绑定
    oversizeImgs.push(url);
    renderOversizePanel();
    Helpers.toast('照片已上传,可扫描子单号签入');
  } else if (photoMode === 'dev') {
    // 偏差确认弹窗:照片本地暂存,点「确认签入」时才绑定锁定单(取消即丢弃)
    devImgs.push(url);
    renderDevPhotos();
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
      c.arrived = undefined;
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
    if (!devMask.classList.contains('hidden')) { closeDevDialog(); Helpers.toast('已关闭,照片已丢弃;可重新称重后再扫'); }
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
    <div class="test-panel-label">LNMS 推荐调拨网点(签入时实时查询)</div>
    <div class="test-panel-tags">
      <button class="test-panel-btn" data-lnms="1">正常返回</button>
      <button class="test-panel-btn" data-lnms="0">无返回(降级)</button>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">签入即到货(全部调拨货适用,不分网点类型)</div>
    <div class="test-panel-tags">
      <button class="test-panel-btn" data-demo="${DEMO_MAINS[0].children[0].ChildNumber}">一键:调拨货自动到货</button>
      <span class="test-panel-tag" data-demo="YT2621000070481066U002">…066U002 自动到货</span>
      <span class="test-panel-tag" data-demo="${PRE_ARRIVED_CHILD}">…066U003 已有到货(防重复)</span>
      <span class="test-panel-tag" data-demo="YT2621000070481088U001">…088U001 错仓·飞书通知</span>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">正常签入(尺寸先填好;计费模式演示需录尺寸)</div>
    <div class="test-panel-tags">
      ${MAIN_ORDERS.flatMap(m => m.transitNo ? [] : m.children.filter(c => !c.abnormal).map(c => c.ChildNumber))
        .map(no => `<span class="test-panel-tag" data-no="${no}">${no}</span>`).join('')}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">问题件(签入带异常标记)</div>
    <div class="test-panel-tags">
      ${MAIN_ORDERS.flatMap(m => m.transitNo ? [] : m.children.filter(c => c.abnormal).map(c => c.ChildNumber))
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
    <div class="test-panel-label">重量偏差件(扫码后弹窗确认,预报12.35kg,自动填25kg)</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-no="${WEIGHT_DEV_NO}">${WEIGHT_DEV_NO}(预报12.35kg,自动填25kg)</span>
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

// 演示面板点击:单号 → 填入并触发签入;模式切换 → 切换计费形态;签入即到货 → 自动切非计费再扫
testPanel.addEventListener('click', e => {
  // LNMS 模拟切换:无返回时,62票(规则带调拨网点条件)将显「暂无推荐库位」;63票(不限规则)照常兜底
  const lnmsBtn = e.target.closest('[data-lnms]');
  if (lnmsBtn) {
    LNMS_DOWN = lnmsBtn.dataset.lnms === '0';
    Helpers.toast(LNMS_DOWN ? '已模拟 LNMS 无返回:带调拨网点条件的规则匹配不上,不限规则照常' : '已模拟 LNMS 正常返回');
    return;
  }
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
  // 签入即到货演示:不切网点模式(全部调拨货都适用);计费模式下自动预填尺寸保证签入成功
  const demoBtn = e.target.closest('[data-demo]');
  if (demoBtn) {
    if (isCharge && (!lenInput.value || !widInput.value || !heiInput.value || !weightInput.value)) {
      lenInput.value = '60'; widInput.value = '40'; heiInput.value = '35';
      weightInput.value = '12.35';
    }
    syncOversizePanel();
    scanInput.value = demoBtn.dataset.demo;
    onScan();
    return;
  }
  if (e.target.closest('[data-reset]')) {
    batchNumber = BATCH_NO;
    if (!devMask.classList.contains('hidden')) closeDevDialog();   // 偏差弹窗开着则一并关闭还原
    /* 预置已扫记录的推荐库位按当前 LNMS 状态实时计算,保持与签入计算口径一致 */
    const preScan = [
      { code: 'YT2621000070480962U001', vol: '60*40*35', wt: '12.35', main: 'YT2621000070480962' },
      { code: 'YT2621000070480963U001', vol: '58*42*38', wt: '15.20', main: 'YT2621000070480963' },
    ];
    scanRecords = preScan.map(p => {
      const m = MAIN_ORDERS.find(x => x.WaybillNumber === p.main);
      const tip = LNMS_DOWN ? '' : (m.lnmsDestOrg || '');
      return { scanCode: p.code, pkgVolume: p.vol, pkgWeight: p.wt, childAbnormal: null, imgs: [],
        predWt: m.children.find(c => c.ChildNumber === p.code).PredictedWeight || '',   // 与子单预置同源,防两处写死漂移
        destOrgTip: tip, recommend: matchRecommend(CUR_ORG, m.productCode, tip) };
    });
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
        c.arrived = c.ChildNumber === PRE_ARRIVED_CHILD ? true : undefined;  // 恢复"已有到货记录"预置
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
  // 计费模式下自动预填一组尺寸,保证点击即成功(演示便利;输入框已有值则不覆盖,便于拦截后重扫放行)
  // 超尺寸件填 300*40*35(>265 触发拍照框);重量偏差件填 60*40*35+25kg(与预报12.35相差102% 触发拍照框);其余填 60*40*35 + 12.35
  if (isCharge && (!lenInput.value || !widInput.value || !heiInput.value || !weightInput.value)) {
    lenInput.value = tag.dataset.no === OVERSIZE_NO ? '300' : '60';
    widInput.value = '40';
    heiInput.value = '35';
    weightInput.value = tag.dataset.no === WEIGHT_DEV_NO ? '25.000' : '12.35';
  }
  syncOversizePanel();
  scanInput.value = tag.dataset.no;
  onScan();
});
