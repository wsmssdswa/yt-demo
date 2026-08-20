/* ============================================
   pick-operation.js — B2B拣货 · 拣货作业
   复刻线上 PDA PickOperation.tsx (code/pda/app/page/ccos/toBPickGoods)
   业务:待拣明细/已拣明细双 Tab + 待发库位 + 扫码拣货
        + 子单明细/异常拦截/异常详情/完成拣货
   ============================================ */

/* ---- 模拟数据(演示用;真实环境为对应接口返回) ----
   任务号格式以线上实际返回为准;主/子单号遵循 B2B 单号规则(YT+16位数字/U+3位序号) */
const TASK_DETAILS = {
  // 任务1:待拣货 · 海运拼柜 · 优先级A
  1: {
    taskId: 1, taskNo: 'PJ20260817001',
    businessType: 1, businessTypeDesc: '海运拼柜',
    // 待发库位候选(线上 GetWarehouseSlotModels)
    waitSlots: ['A-01-01', 'A-01-02', 'A-01-03', 'A-02-05'],
    waybills: [
      {
        waybill: 'YT2621000070480962',
        priority: 'A', slot: 'A-01-02', sortingCode: '12A3',
        tips: [{ text: '分批', color: '#F59B26' }],
        children: [
          { no: 'YT2621000070480962U001', area: 'A区', slot: 'A-01-02', priority: 'A' },
          { no: 'YT2621000070480962U002', area: 'A区', slot: 'A-01-02', priority: 'A' },
          { no: 'YT2621000070480962U003', area: 'A区', slot: 'A-01-03', priority: 'A' },
        ],
      },
      {
        waybill: 'YT2621000070481024',
        // 单分多库位:主单卡片显示聚合库位(对齐线上 SlotNo 逗号拼接)
        priority: 'B', slot: 'A-01-02, B-03-11', sortingCode: '45B6',
        tips: [{ text: '换单', color: '#F5222D' }],
        children: [
          { no: 'YT2621000070481024U001', area: 'A区', slot: 'A-01-02', priority: 'B' },
          { no: 'YT2621000070481024U002', area: 'B区', slot: 'B-03-11', priority: 'B' },
        ],
      },
      {
        // SHEIN 类客户:无 YT 标签,箱上只有客户箱唛(box_number)+客户单号(customer_hawbcode,FH- 前缀)
        // 主单块标题按客户类型自动切换:显示「客户单:FH…」而非 YT 主单号;扫码扫箱号即可拣货
        waybill: 'YT2621000070481980',
        customerHawbcode: 'FH260811356489',
        isCustomerBoxProduct: true,
        priority: 'A', slot: 'A-02-05', sortingCode: '66H7',
        tips: [],
        children: [
          { no: 'YT2621000070481980U001', box: 'SSDZX260813002507', area: 'A区', slot: 'A-02-05' },
          { no: 'YT2621000070481980U002', box: 'SSDZX260813002508', area: 'A区', slot: 'A-02-05' },
        ],
      },
    ],
  },
  // 任务2:拣货中 · 海运整柜 · 优先级B(有异常件)
  2: {
    taskId: 2, taskNo: 'PJ20260817002',
    businessType: 2, businessTypeDesc: '海运整柜',
    waitSlots: ['B-03-11', 'B-03-12', 'B-04-01'],
    waybills: [
      {
        waybill: 'YT2621000070481176',
        priority: 'B', slot: 'B-03-11', sortingCode: '78C9',
        tips: [],
        children: [
          { no: 'YT2621000070481176U001', area: 'B区', slot: 'B-03-11', priority: 'B', picked: true },
          { no: 'YT2621000070481176U002', area: 'B区', slot: 'B-03-12', priority: 'B' },
          { no: 'YT2621000070481176U003', area: 'B区', slot: 'B-03-12', priority: 'B' },
        ],
      },
      {
        waybill: 'YT2621000070481298',
        priority: 'B', slot: 'B-04-01', sortingCode: '11D2',
        tips: [],
        children: [
          { no: 'YT2621000070481298U001', area: 'B区', slot: 'B-04-01', priority: 'B' },
          { no: 'YT2621000070481298U002', area: 'B区', slot: 'B-04-01', priority: 'B' },
        ],
      },
    ],
  },
  // 任务3:待拣货 · 海运拼柜 · 优先级C
  3: {
    taskId: 3, taskNo: 'PJ20260817003',
    businessType: 1, businessTypeDesc: '海运拼柜',
    waitSlots: ['A-02-05', 'C-05-02'],
    waybills: [
      {
        waybill: 'YT2621000070481337',
        priority: 'C', slot: 'C-05-02', sortingCode: '22E3',
        tips: [{ text: '分批', color: '#F59B26' }],
        children: [
          { no: 'YT2621000070481337U001', area: 'C区', slot: 'C-05-02', priority: 'C' },
          { no: 'YT2621000070481337U002', area: 'C区', slot: 'C-05-02', priority: 'C' },
          { no: 'YT2621000070481337U003', area: 'C区', slot: 'C-05-02', priority: 'C' },
        ],
      },
    ],
  },
  // 任务4:拣货中 · 全程代理(BusinessType=5,待发库位选填) · 已全部拣完
  4: {
    taskId: 4, taskNo: 'PJ20260817004',
    businessType: 5, businessTypeDesc: '全程代理',
    waitSlots: ['D-01-01', 'D-01-02'],
    waybills: [
      {
        waybill: 'YT2621000070481426',
        priority: 'B', slot: 'D-01-01', sortingCode: '33F4',
        tips: [],
        children: [
          { no: 'YT2621000070481426U001', area: 'D区', slot: 'D-01-01', priority: 'B', picked: true },
          { no: 'YT2621000070481426U002', area: 'D区', slot: 'D-01-01', priority: 'B', picked: true },
          { no: 'YT2621000070481426U003', area: 'D区', slot: 'D-01-02', priority: 'B', picked: true },
          { no: 'YT2621000070481426U004', area: 'D区', slot: 'D-01-02', priority: 'B', picked: true },
          { no: 'YT2621000070481426U005', area: 'D区', slot: 'D-01-02', priority: 'B', picked: true },
        ],
      },
      {
        waybill: 'YT2621000070481530',
        priority: 'B', slot: 'D-01-02', sortingCode: '44G5',
        tips: [],
        children: [
          { no: 'YT2621000070481530U001', area: 'D区', slot: 'D-01-02', priority: 'B', picked: true },
          { no: 'YT2621000070481530U002', area: 'D区', slot: 'D-01-02', priority: 'B', picked: true },
          { no: 'YT2621000070481530U003', area: 'D区', slot: 'D-01-02', priority: 'B', picked: true },
        ],
      },
    ],
  },
};

// 异常拦截子单(线上扫码返回 PromptType=2,弹拦截确认后才算拣货完成)
const INTERCEPT_MAP = {
  'YT2621000070481024U002': '该子单存在安检拦截：疑似含违禁品\n请联系异常组处理',
};
// 主单异常件(已拣明细里点「异常提示」看详情,线上 ListChildAbnormal)
const ABN_DATA = {
  'YT2621000070481176': [
    { kind: '含锂电池', count: 1, children: ['YT2621000070481176U002'] },
  ],
};

/* ---- 页面状态 ---- */
const state = {
  taskId: 0, taskNo: '', type: 1, businessType: 1,
  tab: 0,                         // 0=按库位待拣 1=按单待拣 2=已拣明细
  dispatchedLocation: '',         // 待发库位(当前作业库位,全程代理选填)
  waitSlots: [],                  // 待发库位候选
  waybills: [],                   // 任务主单及子单(拣货状态实时变化)
  childModal: null,               // 子单明细弹窗当前主单
  locPickMode: 0,                 // 0=待发库位 1=修改主单待发库位
  locPickWaybill: '',             // 修改待发库位对应的主单号
  expandedWbs: {},                // 按库位视图:主单块展开状态(slot::waybill -> true)
  pendingScan: null,              // 拦截确认后待补拣的子单
  pendingScanWb: null,
  notShowList: [],                // 勾选「本次操作不再提示」的子单(线上 notShowList)
};

/* ---- 读取 URL 参数并装载任务 ---- */
const params = new URLSearchParams(location.search);
state.taskId = parseInt(params.get('taskId') || '1');
state.taskNo = params.get('taskNo') || '';
state.type = parseInt(params.get('type') || '1');
state.businessType = parseInt(params.get('businessType') || '1');
(function loadTask() {
  const d = JSON.parse(JSON.stringify(TASK_DETAILS[state.taskId] || TASK_DETAILS[1]));
  state.waitSlots = d.waitSlots;
  state.waybills = d.waybills.map(w => ({
    ...w,
    children: w.children.map(c => ({ ...c, picked: !!c.picked })),
  }));
})();

const PH_TEXT = '请选择待发库位';   // 非全程代理:必选
const TARGET_TEXT = '请选择目标库位'; // 全程代理(BusinessType=5):选填
const titleSuffix = state.type == 1 ? '(整单)' : '(逐箱)';

/* ---- 渲染主结构 ---- */
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('拣货操作' + titleSuffix)}
  <div class="pko-page">
    <!-- 双 Tab -->
    <div class="pk-tabs" id="pkoTabs"></div>

    <!-- 统计行:子单总数 / 待拣子单数 / 已拣子单数 -->
    <div class="pko-stats" id="pkoStats"></div>

    <!-- 顶栏:待发库位(按库位/按单待拣 Tab 显示,已拣明细隐藏) -->
    <div class="pko-topbar" id="pkoTopbar">
      <div class="pko-loc-bar" id="pkoLocBar"></div>
    </div>

    <!-- 列表(线上无扫码输入框,PDA 硬件扫码 ScanUtil 直接扫) -->
    <div class="pko-list" id="pkoList"></div>

    <!-- 底部:完成拣货 -->
    <div class="pko-bar">
      <button class="pko-finish" id="pkoFinish">完成拣货</button>
    </div>
  </div>

  <!-- 待发库位选择弹窗(点击即选中生效,无需确定) -->
  <div class="drawer hidden" id="pkoLocPick">
    <div class="drawer-mask" data-close="locpick"></div>
    <div class="drawer-panel" style="max-height:70%;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:15px;font-weight:600;color:#333;">选择待发库位</span>
        <span data-close="locpick" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div id="pkoLocPickBody" style="max-height:50vh;overflow-y:auto;"></div>
    </div>
  </div>

  <!-- 子单明细弹窗(childItemModal) -->
  <div class="drawer hidden" id="pkoChildModal">
    <div class="drawer-mask" data-close="child"></div>
    <div class="drawer-panel" style="height:400px;display:flex;flex-direction:column;">
      <div id="pkoChildBody" style="flex:1;min-height:0;overflow-y:auto;padding:0 12px;"></div>
    </div>
  </div>

  <!-- 异常详情弹窗(abnormalInfoModal) -->
  <div class="drawer hidden" id="pkoAbnModal">
    <div class="drawer-mask" data-close="abn"></div>
    <div class="drawer-panel" style="max-height:70%;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:15px;font-weight:600;color:#373737;">异常详情</span>
        <span data-close="abn" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div id="pkoAbnBody" style="padding:0 16px 16px;overflow-y:auto;"></div>
    </div>
  </div>

  <!-- 异常拦截弹窗(居中,releaseInterceptionModal) -->
  <div class="pko-center-mask hidden" id="pkoIntercept">
    <div class="pko-center-box">
      <div class="pko-intercept">
        <div class="pko-intercept-text" id="pkoInterceptText"></div>
        <div class="pko-intercept-check" id="pkoInterceptCheck">
          <span class="pko-checkbox" id="pkoInterceptCb">✓</span>
          <span>本次操作不再提示</span>
        </div>
        <button class="pko-intercept-btn" id="pkoInterceptOk">确认</button>
      </div>
    </div>
  </div>

  <!-- 提示确认弹窗(居中,ConfirmModal) -->
  <div class="pko-center-mask hidden" id="pkoConfirm">
    <div class="pko-center-box">
      <div class="pko-confirm">
        <div class="pko-confirm-text" id="pkoConfirmText"></div>
        <button class="pko-confirm-btn" id="pkoConfirmOk">确认</button>
      </div>
    </div>
  </div>
`);

Helpers.startClock();

const el = id => document.getElementById(id);
const show = id => el(id).classList.remove('hidden');
const hide = id => el(id).classList.add('hidden');

/* ---- 统计与派生列表 ---- */
function counts() {
  let total = 0, unsorted = 0, sorted = 0;
  state.waybills.forEach(w => w.children.forEach(c => {
    total++;
    c.picked ? sorted++ : unsorted++;
  }));
  return { total, unsorted, sorted };
}
const pendingWaybills = () => state.waybills.filter(w => w.children.some(c => !c.picked));
const pickedWaybills = () => state.waybills.filter(w => w.children.some(c => c.picked));
const wbCountText = w => {
  const total = w.children.length;
  const picked = w.children.filter(c => c.picked).length;
  return { total, picked };
};

/* ---- 渲染 ---- */
function renderTabs() {
  el('pkoTabs').innerHTML = [
    { idx: 0, name: '按库位拣' },
    { idx: 1, name: '按单拣' },
    { idx: 2, name: '已拣明细' },
  ].map(t => `
    <div class="pk-tab ${state.tab === t.idx ? 'pk-tab--on' : ''}" data-tab="${t.idx}">${t.name}</div>
  `).join('');
}

function renderStats() {
  const c = counts();
  el('pkoStats').innerHTML = `
    <span class="pko-stat">子单总数<b>${c.total}</b></span>
    <span class="pko-stat">待拣子单数<b>${c.unsorted}</b></span>
    <span class="pko-stat">已拣子单数<b>${c.sorted}</b></span>
  `;
}

const tipsHtml = tips => (Array.isArray(tips) && tips.length)
  ? `<div class="pko-tips">${tips.map(t =>
      `<span class="pko-tip ${t.color === '#F5222D' ? 'pko-tip--red' : ''}">${t.text}</span>`
    ).join('')}</div>`
  : '';

function renderPendingItem(w) {
  const { total, picked } = wbCountText(w);
  return `
    <div class="pko-card">
      <div class="pko-wb-row">
        <span class="pko-wb-no">主单：${w.waybill}</span>
        <span class="pko-wb-count pko-wb-count--pending" data-child="${w.waybill}">${total}\\${picked}<span class="pko-wb-arrow">▾</span></span>
      </div>
      <div class="pko-row"><span class="pko-row-label">优先级：</span><span class="pko-row-value">${w.priority}</span></div>
      <div class="pko-row"><span class="pko-row-label">库位：</span><span class="pko-row-value">${w.slot}</span></div>
      <div class="pko-row"><span class="pko-row-label">分拣码:</span><span class="pko-row-value">${w.sortingCode}</span></div>
      ${tipsHtml(w.tips)}
    </div>
  `;
}

function renderPickedItem(w) {
  const { total, picked } = wbCountText(w);
  const done = total === picked;
  const abn = ABN_DATA[w.waybill];
  return `
    <div class="pko-card">
      <div class="pko-wb-row">
        <span class="pko-wb-no ${done ? 'pko-wb-no--done' : ''}">主单：${w.waybill}</span>
        <span class="pko-wb-count ${done ? 'pko-wb-count--done' : 'pko-wb-count--pending'}" data-child="${w.waybill}">${total}\\${picked}<span class="pko-wb-arrow">▾</span></span>
      </div>
      <div class="pko-row"><span class="pko-row-label">优先级：</span><span class="pko-row-value pko-row-value--gray">${w.priority}</span></div>
      <div class="pko-row"><span class="pko-row-label">待发库位：</span><span class="pko-row-value pko-row-value--gray">${w.slot}</span></div>
      <div class="pko-loc-edit" data-locedit="${w.waybill}">修改待发库位</div>
      ${abn && abn.length ? `
        <div class="pko-abn" data-abn="${w.waybill}">
          <span>异常提示</span>
          <b>异常${abn.reduce((s, a) => s + a.count, 0)}箱</b>
        </div>` : ''}
    </div>
  `;
}

function renderList() {
  const list = el('pkoList');
  // 0=按库位待拣:库位分组视图
  if (state.tab === 0) {
    renderSlotView();
    return;
  }
  // 1=按单待拣:主单卡片(线上现状)
  if (state.tab === 1) {
    const wbs = pendingWaybills();
    if (wbs.length === 0) {
      list.innerHTML = `<div class="pko-empty">全部拣完啦！</div>`;
      return;
    }
    list.innerHTML = wbs.map(renderPendingItem).join('');
    return;
  }
  // 2=已拣明细:主单视角原样
  const wbs = pickedWaybills();
  if (wbs.length === 0) {
    list.innerHTML = `<div class="pko-empty">暂无已拣货数据<div class="pko-empty-sub">拣货后可在「按库位待拣/按单待拣」扫码拣货</div></div>`;
    return;
  }
  list.innerHTML = wbs.map(renderPickedItem).join('');
}

function render() {
  renderTabs();
  renderStats();
  renderTopbar();
  renderList();
}

/* ---- 顶栏:待发库位(已拣明细 Tab 隐藏,走卡片内「修改待发库位」入口) ---- */
function renderTopbar() {
  const bar = el('pkoTopbar');
  bar.classList.toggle('hidden', state.tab === 2);
  const isOverseaAgent = state.businessType == 5;
  const text = isOverseaAgent
    ? (state.dispatchedLocation || TARGET_TEXT)
    : (state.dispatchedLocation || PH_TEXT);
  el('pkoLocBar').innerHTML = `
    ${isOverseaAgent ? '' : '<span class="pko-loc-required">*</span>'}
    <span class="pko-loc-text">${text}</span>
    <span class="pko-loc-arrow">▾</span>
  `;
  el('pkoLocBar').classList.toggle('pko-loc-bar--ph', !state.dispatchedLocation);
}

/* ---- 按库位视图:待拣子单按取货库位分组 ---- */
// 库位智能比较:按"-"拆分,数字段按数值比较(A-01-02 < A-01-10),对齐线上 LocationSortHelper
function compareSlot(a, b) {
  const ta = a.split('-'), tb = b.split('-');
  const n = Math.max(ta.length, tb.length);
  for (let i = 0; i < n; i++) {
    const x = ta[i] || '', y = tb[i] || '';
    const xn = parseInt(x, 10), yn = parseInt(y, 10);
    if (!isNaN(xn) && !isNaN(yn)) {
      if (xn !== yn) return xn - yn;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

function buildSlotGroups() {
  const map = {};   // slot -> { area, waybills: [{ wb, boxes: [] }] }
  state.waybills.forEach(w => {
    w.children.filter(c => !c.picked).forEach(c => {
      const key = c.slot || '无库位';
      const grp = (map[key] = map[key] || { area: c.area || '', waybills: [] });
      let wbItem = grp.waybills.find(x => x.wb.waybill === w.waybill);
      if (!wbItem) { wbItem = { wb: w, boxes: [] }; grp.waybills.push(wbItem); }
      wbItem.boxes.push(c);
    });
  });
  const groups = Object.keys(map).map(slot => ({ slot, area: map[slot].area, waybills: map[slot].waybills }));
  // 组间:库位智能排序;组内:主单按分拣码升序(相同则按主单号),主单内箱按子单号
  groups.sort((a, b) => compareSlot(a.slot, b.slot));
  groups.forEach(g => {
    g.waybills.sort((x, y) => {
      const sc = (x.wb.sortingCode || '').localeCompare(y.wb.sortingCode || '');
      return sc !== 0 ? sc : x.wb.waybill.localeCompare(y.wb.waybill);
    });
    g.waybills.forEach(item => item.boxes.sort((a, b) => a.no.localeCompare(b.no)));
  });
  return groups;
}

function renderSlotView() {
  const list = el('pkoList');
  const groups = buildSlotGroups();
  const totalPending = groups.reduce((s, g) => s + g.waybills.reduce((s2, w) => s2 + w.boxes.length, 0), 0);
  if (totalPending === 0) {
    list.innerHTML = `<div class="pko-empty">全部拣完啦！</div>`;
    return;
  }
  list.innerHTML = groups.map(g => {
    const boxesInGroup = g.waybills.reduce((s, w) => s + w.boxes.length, 0);
    return `
    <div class="pko-slot-group">
      <div class="pko-slot-head">
        <span class="pko-slot-no">${g.slot}</span>
        <span class="pko-slot-count">待拣<b>${boxesInGroup}</b>箱</span>
      </div>
      ${g.waybills.map(({ wb, boxes }) => {
        const expKey = g.slot + '::' + wb.waybill;
        const expanded = !!state.expandedWbs[expKey];
        return `
        <div class="pko-slot-wb">
          <div class="pko-slot-wb-title" data-wbkey="${expKey}">
            <span class="pko-slot-wb-arrow">${expanded ? '▾' : '▸'}</span>
            <span class="pko-slot-wb-name">主单：${wb.isCustomerBoxProduct ? (wb.customerHawbcode || wb.waybill) : wb.waybill}</span>
            <span class="pko-slot-wb-count">${boxes.length}箱</span>
            <span class="pko-slot-wb-sort">${wb.sortingCode}</span>
          </div>
          ${expanded ? `<div class="pko-slot-wb-boxes">${boxes.map(c => `
            <div class="pko-slot-box">
              <span class="pko-slot-box-no">${wb.isCustomerBoxProduct ? (c.box || c.no) : c.no}</span>
            </div>
          `).join('')}</div>` : ''}
        </div>
      `}).join('')}
    </div>
  `}).join('');
}

/* ---- 扫码拣货(线上 ScanUtil 硬件扫码 → handleScan → ScanPicking) ----
   code: 子单号,由 PDA 扫码传入;原型用测试面板模拟 */
function doScan(code) {
  code = (code || '').trim();
  if (!code) { Helpers.toast('请扫描子单号'); return; }

  // 1. 未选待发库位禁止拣货(全程代理 BusinessType=5 选填,对齐线上)
  if (state.businessType != 5 && !state.dispatchedLocation) {
    Helpers.toast('请选择待发库位');
    return;
  }

  // 2. 定位子单:先子单号,再客户箱唛(box_number,对齐线上拣货接入客户箱号解析后,SHEIN 等扫箱号可拣货)
  let hit = null, hitWb = null;
  for (const w of state.waybills) {
    for (const c of w.children) {
      if (c.no === code || c.box === code) { hit = c; hitWb = w; break; }
    }
    if (hit) break;
  }
  if (!hit) { Helpers.toast('未找到该子单'); return; }
  if (hit.picked) { Helpers.toast('该子单已拣货'); return; }

  // 3. 异常拦截子单:弹拦截确认(线上 PromptType=2,确认后才算拣货完成)
  const interceptMsg = INTERCEPT_MAP[code];
  if (interceptMsg && !state.notShowList.includes(code)) {
    state.pendingScan = hit;
    state.pendingScanWb = hitWb;
    el('pkoInterceptText').textContent = interceptMsg;
    el('pkoInterceptCb').textContent = '';
    show('pkoIntercept');
    return;
  }

  // 4. 正常拣货成功(线上 PromptType=0 直接刷新)
  pickChild(hit, hitWb);
}

function pickChild(child, wb) {
  child.picked = true;
  render();
  const wbDone = wb.children.every(c => c.picked);
  Helpers.toast(wbDone ? '拣货成功：' + child.no + '（主单已拣完）' : '拣货成功：' + child.no);
}

/* ---- 异常拦截弹窗 ---- */
document.getElementById('pkoInterceptCheck').addEventListener('click', () => {
  const cb = el('pkoInterceptCb');
  cb.textContent = cb.textContent ? '' : '✓';
});
document.getElementById('pkoInterceptOk').addEventListener('click', () => {
  const checked = el('pkoInterceptCb').textContent === '✓';
  const child = state.pendingScan;
  if (checked && child) state.notShowList.push(child.no);
  if (child) pickChild(child, state.pendingScanWb);
  state.pendingScan = null;
  state.pendingScanWb = null;
  hide('pkoIntercept');
});

/* ---- 完成拣货(线上 CompletePickGoodsTask) ---- */
document.getElementById('pkoFinish').addEventListener('click', () => {
  const unsorted = counts().unsorted;
  if (unsorted > 0) {
    el('pkoConfirmText').textContent = `任务尚有 ${unsorted} 个子单未拣，确认完成拣货？`;
    show('pkoConfirm');
  } else {
    Helpers.toast('拣货完成，任务已完结');
    setTimeout(() => history.length > 1 ? history.back() : (location.href = './pick-task.html?type=' + state.type), 900);
  }
});
document.getElementById('pkoConfirmOk').addEventListener('click', () => {
  hide('pkoConfirm');
  Helpers.toast('拣货完成，任务已完结');
  setTimeout(() => history.length > 1 ? history.back() : (location.href = './pick-task.html?type=' + state.type), 900);
});

/* ---- 待发库位选择弹窗:点待发库位条直接弹出库位列表,点一下即选中生效 ---- */
function openLocPick(mode, waybill) {
  state.locPickMode = mode;
  state.locPickWaybill = waybill || '';
  const wb = mode === 1 ? state.waybills.find(w => w.waybill === waybill) : null;
  const current = mode === 0 ? state.dispatchedLocation : (wb ? wb.slot : '');
  el('pkoLocPickBody').innerHTML = state.waitSlots.map(s => `
    <div class="pko-loc-opt ${s === current ? 'pko-loc-opt--on' : ''}" data-slot="${s}">
      <span>${s}</span>
      ${s === current ? '<span style="color:#00A99D;">✓</span>' : ''}
    </div>
  `).join('');
  // 点击库位即选中生效(免去展开+确定两步)
  el('pkoLocPickBody').querySelectorAll('[data-slot]').forEach(opt => {
    opt.addEventListener('click', () => {
      const slot = opt.dataset.slot;
      if (state.locPickMode === 0) {
        state.dispatchedLocation = slot;
      } else {
        const w = state.waybills.find(x => x.waybill === state.locPickWaybill);
        if (w) w.slot = slot;
      }
      hide('pkoLocPick');
      render();
      Helpers.toast('待发库位：' + slot);
    });
  });
  show('pkoLocPick');
}

/* ---- 子单明细弹窗(childItemModal) ---- */
function openChildModal(waybill) {
  const w = state.waybills.find(x => x.waybill === waybill);
  if (!w) return;
  state.childModal = w;
  const { total, picked } = wbCountText(w);
  const done = total === picked;
  el('pkoChildBody').innerHTML = `
    <div class="pko-child-head">
      <span class="pko-child-waybill ${done ? '' : 'pko-child-waybill--pending'}">主单：${w.waybill}</span>
      <span class="pko-child-count ${done ? '' : 'pko-child-count--pending'}">${total}\\${picked}</span>
    </div>
    <div class="pko-child-edit" data-locedit2="${w.waybill}">修改待发库位</div>
    <div class="pko-child-list">
      ${w.children.map(c => `
        <div class="pko-child-item">
          <span class="pko-child-icon">📦</span>
          <div class="pko-child-info">
            <div class="pko-child-no">${c.no}${c.priority ? '（优先级' + c.priority + '）' : ''}</div>
            <div class="pko-child-meta">库区：${c.area}　库位：${c.slot}</div>
            <div class="pko-child-tips">${tipsHtml(w.tips)}</div>
          </div>
          <span class="pko-child-state ${c.picked ? 'pko-child-state--picked' : ''}">${c.picked ? '已拣货' : '待拣货'}</span>
        </div>
      `).join('')}
    </div>
  `;
  show('pkoChildModal');
}

/* ---- 异常详情弹窗(abnormalInfoModal) ---- */
function openAbnModal(waybill) {
  const list = ABN_DATA[waybill] || [];
  el('pkoAbnBody').innerHTML = list.map(g => `
    <div class="pko-abn-group-title">${g.kind}(${g.count})</div>
    ${g.children.map(no => `<div class="pko-abn-group-child">${no}</div>`).join('')}
  `).join('') || '<div style="padding:20px 0;text-align:center;color:#999;">暂无异常明细</div>';
  show('pkoAbnModal');
}

/* ---- 事件绑定 ---- */
el('pkoTabs').addEventListener('click', e => {
  const tab = e.target.closest('.pk-tab');
  if (tab) state.tab = +tab.dataset.tab, render();
});
el('pkoLocBar').addEventListener('click', () => openLocPick(0));
// 列表事件:子单明细 / 修改待发库位 / 异常详情 / 主单块展开收起
el('pkoList').addEventListener('click', e => {
  const wbkey = e.target.closest('[data-wbkey]');
  if (wbkey) {
    const k = wbkey.dataset.wbkey;
    state.expandedWbs[k] = !state.expandedWbs[k];
    render();
    return;
  }
  const child = e.target.closest('[data-child]');
  if (child) { openChildModal(child.dataset.child); return; }
  const locedit = e.target.closest('[data-locedit]');
  if (locedit) { openLocPick(1, locedit.dataset.locedit); return; }
  const abn = e.target.closest('[data-abn]');
  if (abn) { openAbnModal(abn.dataset.abn); return; }
});
// 子单明细弹窗:修改待发库位
el('pkoChildBody').addEventListener('click', e => {
  const locedit2 = e.target.closest('[data-locedit2]');
  if (locedit2) openLocPick(1, locedit2.dataset.locedit2);
});
// 弹窗关闭(统一 data-close)
document.addEventListener('click', e => {
  const close = e.target.dataset.close;
  if (close === 'locpick') hide('pkoLocPick');
  if (close === 'child') hide('pkoChildModal');
  if (close === 'abn') hide('pkoAbnModal');
});

/* ---- 初始化 ---- */
render();

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
    <div class="test-panel-label">扫码</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-act="scan">模拟扫下一箱</span>
      <span class="test-panel-tag" data-act="scanbox">扫 SHEIN 箱号</span>
      ${INTERCEPT_MAP[Object.keys(INTERCEPT_MAP)[0]] ? `<span class="test-panel-tag" data-act="intercept">扫拦截子单</span>` : ''}
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">操作</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-act="tab">切 Tab(循环)</span>
      <span class="test-panel-tag" data-act="reset">重置拣货状态</span>
    </div>
  </div>
`;
document.body.appendChild(testPanel);

testPanel.addEventListener('click', e => {
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  const act = tag.dataset.act;
  if (act === 'scan') {
    // 模拟 PDA 硬件扫码:自动扫下一个待拣子单(线上 ScanUtil)
    const next = pendingWaybills().flatMap(w => w.children).find(c => !c.picked);
    if (next) {
      doScan(next.no);
    } else {
      Helpers.toast('全部子单已拣完');
    }
  }
  if (act === 'intercept') {
    const no = Object.keys(INTERCEPT_MAP)[0];
    doScan(no);
  }
  if (act === 'scanbox') {
    // 模拟 SHEIN 客户扫客户箱唛(box_number)拣货
    doScan('SSDZX260813002507');
  }
  if (act === 'tab') {
    state.tab = (state.tab + 1) % 3;
    render();
    Helpers.toast(['按库位待拣', '按单待拣', '已拣明细'][state.tab]);
  }
  if (act === 'reset') {
    state.waybills.forEach(w => w.children.forEach(c => c.picked = false));
    state.dispatchedLocation = '';
    state.notShowList = [];
    state.expandedWbs = {};
    state.tab = 0;
    render();
    Helpers.toast('已重置拣货状态');
  }
});
