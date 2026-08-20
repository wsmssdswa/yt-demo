/* ============================================
   pick-by-location.js — B2B拣货 · 逐箱拣货「按库位」方案原型
   背景:一个主单的箱可能散在多个库位,多单交错时按「主单」逐单走库,
        同一库位要反复跑;本原型把待拣明细按「存货库位」重新分组,
        走到一个库位把该库位所有主单的箱一次拣完。
   对应线上模块:code/pda/app/page/ccos/toBPickGoods(方案仅改展示分组,
   扫码 ScanPicking / 待发库位 / 完成拣货等主流程不动)。
   ============================================ */

/* ---- 演示数据:刻意构造「多主单 × 库位交错」的典型痛点场景 ----
   主单 A:4 箱散在 3 个库位;主单 B:3 箱在 2 个库位;主单 C:3 箱在 2 个库位
   按主单走库:A-01-02→A-02-05→B-03-11 → A-01-02→A-02-05 → A-01-02→B-03-11(7 次库位访问)
   按库位走库:A-01-02 → A-02-05 → B-03-11(3 次,每个库位只跑一遍) */
const DEMO_TASK = {
  taskId: 1,
  taskNo: 'PJ20260817005',
  businessType: 1,          // 非全程代理:待发库位必选
  waitSlots: ['F-01-01', 'F-01-02'],   // 待发库位候选(线上 GetWarehouseSlotModels)
  waybills: [
    {
      waybill: 'YT2621000070480962', priority: 'A',
      tips: [{ text: '分批', color: '#F59B26' }],
      children: [
        { no: 'YT2621000070480962U001', slot: 'A-01-02', area: 'A区', sortingCode: '12-3-4' },
        { no: 'YT2621000070480962U002', slot: 'A-01-02', area: 'A区', sortingCode: '12-3-4' },
        { no: 'YT2621000070480962U003', slot: 'A-02-05', area: 'A区', sortingCode: '12-3-4' },
        { no: 'YT2621000070480962U004', slot: 'B-03-11', area: 'B区', sortingCode: '12-3-4' },
      ],
    },
    {
      waybill: 'YT2621000070481024', priority: 'B',
      tips: [],
      children: [
        { no: 'YT2621000070481024U001', slot: 'A-01-02', area: 'A区', sortingCode: '45-6-7' },
        { no: 'YT2621000070481024U002', slot: 'A-02-05', area: 'A区', sortingCode: '45-6-7' },
        { no: 'YT2621000070481024U003', slot: 'A-02-05', area: 'A区', sortingCode: '45-6-7' },
      ],
    },
    {
      waybill: 'YT2621000070481176', priority: 'B',
      tips: [{ text: '换单', color: '#F5222D' }],
      children: [
        { no: 'YT2621000070481176U001', slot: 'A-01-02', area: 'A区', sortingCode: '78-9-0' },
        { no: 'YT2621000070481176U002', slot: 'B-03-11', area: 'B区', sortingCode: '78-9-0' },
        { no: 'YT2621000070481176U003', slot: 'B-03-11', area: 'B区', sortingCode: '78-9-0' },
      ],
    },
  ],
};

/* ---- 页面状态 ---- */
const state = {
  tab: 0,                 // 0=按库位(新) 1=按主单(现状,对比用)
  currentSlot: '',        // 当前作业库位(存货库位,扫库位条码/点卡片设定)
  expandedSlot: '',       // 按库位视图当前展开的库位卡片
  dispatchedLocation: '', // 待发库位(拣出后放置的目标库位,沿用线上概念)
  waitSlots: [],
  waybills: [],
};

(function loadTask() {
  const d = JSON.parse(JSON.stringify(DEMO_TASK));
  state.waitSlots = d.waitSlots;
  state.waybills = d.waybills.map(w => ({
    ...w,
    children: w.children.map(c => ({ ...c, picked: false })),
  }));
})();

/* ---- 派生数据 ---- */
const allChildren = () => state.waybills.flatMap(w =>
  w.children.map(c => ({ ...c, waybill: w.waybill, priority: w.priority })));
const pendingChildren = () => allChildren().filter(c => !c.picked);
const findChild = no => allChildren().find(c => c.no === no);

/* 按库位分组(全量:含已拣箱,拣完的库位仍保留显示),库位号自然排序 */
function slotGroups() {
  const map = new Map();
  allChildren().forEach(c => {
    if (!map.has(c.slot)) map.set(c.slot, { slot: c.slot, area: c.area || '', boxes: [] });
    map.get(c.slot).boxes.push(c);
  });
  return [...map.values()].sort((a, b) => a.slot.localeCompare(b.slot, 'en', { numeric: true }));
}
/* 库位组箱数统计 */
const slotPending = g => g.boxes.filter(b => !b.picked).length;
const slotPicked = g => g.boxes.filter(b => b.picked).length;

/* 全局统计:库位/主单/子单 已拣/总(全量口径) */
function countStats() {
  const all = allChildren();
  const slots = new Set(all.map(c => c.slot));
  const pendingSlots = new Set(all.filter(c => !c.picked).map(c => c.slot));
  return {
    slot: { picked: slots.size - pendingSlots.size, total: slots.size },
    wb: { picked: state.waybills.filter(w => w.children.every(c => c.picked)).length, total: state.waybills.length },
    box: { picked: all.filter(c => c.picked).length, total: all.length },
  };
}

/* ---- 渲染主结构 ---- */
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('拣货操作(逐箱·按库位)')}
  <div class="pbl-page">

    <!-- 视图切换:按库位(新)/ 按主单(现状) -->
    <div class="pk-tabs" id="pblTabs"></div>

    <!-- 统计条:库位/主单/子单 已拣/总 -->
    <div class="pko-stats pbl-stats" id="pblStats"></div>

    <!-- 库位进度:当前库位 + 进度 -->
    <div class="pbl-progress" id="pblProgress"></div>

    <!-- 待发库位选择条(沿用线上:拣出货物放置的目标库位) -->
    <div class="pko-loc-bar" id="pblWaitBar"></div>

    <!-- 扫库位条:定位当前库位 -->
    <div class="pbl-locscan-bar">
      <input class="pbl-locscan-input" id="pblLocInput" placeholder="扫库位条码,定位当前库位" />
      <button class="pbl-locscan-btn" id="pblLocBtn">定位</button>
    </div>

    <!-- 扫箱拣货(线上 ScanPicking 逻辑不变) -->
    <div class="pko-scan-bar">
      <input class="pko-scan-input" id="pblScanInput" placeholder="扫描或输入子单号拣货" />
      <button class="pk-scan-btn" id="pblScanBtn">拣货</button>
    </div>

    <!-- 列表 -->
    <div class="pbl-list" id="pblList"></div>

    <!-- 底部:完成拣货 -->
    <div class="pko-bar">
      <button class="pko-finish" id="pblFinish">完成拣货</button>
    </div>
  </div>

  <!-- 待发库位选择弹窗 -->
  <div class="drawer hidden" id="pblWaitPick">
    <div class="drawer-mask" data-close="waitpick"></div>
    <div class="drawer-panel" style="height:250px;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:15px;font-weight:600;color:#333;">选择待发库位</span>
        <span data-close="waitpick" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div id="pblWaitBody"></div>
    </div>
  </div>

  <!-- 完成确认弹窗 -->
  <div class="drawer hidden" id="pblConfirm" style="z-index:1100;">
    <div class="drawer-mask" data-close="confirm"></div>
    <div class="drawer-panel" style="height:220px;display:flex;flex-direction:column;justify-content:center;padding:0 24px;">
      <div id="pblConfirmText" style="font-size:15px;color:#333;line-height:1.7;text-align:center;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button style="flex:1;height:40px;border:none;border-radius:6px;background:#f2f2f2;color:#666;font-size:14px;" data-close="confirm">取消</button>
        <button id="pblConfirmOk" style="flex:1;height:40px;border:none;border-radius:6px;background:#00A99D;color:#fff;font-size:14px;font-weight:600;">确认完成</button>
      </div>
    </div>
  </div>
`);

Helpers.startClock();

const el = id => document.getElementById(id);
const show = id => el(id).classList.remove('hidden');
const hide = id => el(id).classList.add('hidden');

/* ---- 渲染 ---- */
function renderTabs() {
  el('pblTabs').innerHTML = [
    { idx: 0, name: '按库位' },
    { idx: 1, name: '按主单(现状)' },
  ].map(t => `<div class="pk-tab ${state.tab === t.idx ? 'pk-tab--on' : ''}" data-tab="${t.idx}">${t.name}</div>`).join('');
}

function renderStats() {
  const s = countStats();
  el('pblStats').innerHTML = `
    <span class="pko-stat">库位<b>${s.slot.picked}/${s.slot.total}</b></span>
    <span class="pko-stat">主单<b>${s.wb.picked}/${s.wb.total}</b></span>
    <span class="pko-stat">子单<b>${s.box.picked}/${s.box.total}</b></span>`;
}

function renderProgress() {
  const groups = slotGroups();
  const pendingCount = groups.filter(g => slotPending(g) > 0).length;
  const nextSlot = groups.find(g => g.slot !== state.currentSlot && slotPending(g) > 0)?.slot || '';
  el('pblProgress').innerHTML = `
    <div class="pbl-progress-loc">
      <span class="pbl-progress-tag ${state.currentSlot ? '' : 'pbl-progress-tag--none'}">当前库位</span>
      <span class="pbl-progress-slot ${state.currentSlot ? '' : 'pbl-progress-slot--none'}">${state.currentSlot || '未定位(可扫库位条码)'}</span>
    </div>
    <div class="pbl-progress-next">${pendingCount ? `待拣库位 ${pendingCount} 个${nextSlot ? ' · 下一库位 ' + nextSlot : ''}` : '全部库位已拣完'}</div>
  `;
}

function renderWaitBar() {
  const text = state.dispatchedLocation || '请选择待发库位';
  el('pblWaitBar').innerHTML = `
    <span class="pko-loc-required">*</span>
    <span class="pko-loc-text">待发库位:${text}</span>
    <span class="pko-loc-arrow">▾</span>
  `;
  el('pblWaitBar').classList.toggle('pko-loc-bar--ph', !state.dispatchedLocation);
}

/* 按库位视图:库位分组卡片(全量箱,已拣灰态) */
function renderBySlot() {
  const groups = slotGroups();
  const list = el('pblList');
  if (!groups.length || groups.every(g => slotPending(g) === 0)) {
    list.innerHTML = `<div class="pko-empty">全部拣完啦!<div class="pko-empty-sub">可点击底部「完成拣货」结束任务</div></div>`;
    return;
  }
  list.innerHTML = groups.map(g => {
    const orders = [...new Set(g.boxes.map(b => b.waybill))];
    const active = g.slot === state.currentSlot;
    const expanded = g.slot === state.expandedSlot;
    const done = slotPending(g) === 0;
    const pickedN = slotPicked(g);
    const totalN = g.boxes.length;
    // 库位内按主单分组展示箱子
    const blocks = orders.map(wb => {
      const boxes = g.boxes.filter(b => b.waybill === wb);
      const w = state.waybills.find(x => x.waybill === wb);
      const wbPicked = boxes.filter(b => b.picked).length;
      const tips = (w.tips || []).map(t => `<span class="pko-tip ${t.color === '#F5222D' ? 'pko-tip--red' : ''}">${t.text}</span>`).join('');
      return `
        <div class="pbl-wb-block">
          <div class="pbl-wb-title">
            <span class="pbl-wb-name">主单:${wb}${tips ? `<span class="pbl-wb-tips">${tips}</span>` : ''}</span>
            <span class="pbl-wb-count">本库位已拣 ${wbPicked}/${boxes.length} 箱</span>
          </div>
          ${boxes.map(b => `
            <div class="pbl-box-row ${b.picked ? 'pbl-box-row--done' : ''}">
              <span class="pbl-box-no">${b.no}</span>
              <span class="pbl-box-sort">分拣码 ${b.sortingCode}</span>
              <span class="pbl-box-state ${b.picked ? 'pbl-box-state--done' : 'pbl-box-state--pick'}">${b.picked ? '已拣' : '待拣'}</span>
            </div>`).join('')}
        </div>`;
    }).join('');
    return `
      <div class="pbl-slot-card ${active ? 'pbl-slot-card--active' : ''} ${done ? 'pbl-slot-card--done' : ''}" data-slotcard="${g.slot}">
        <div class="pbl-slot-head" data-slothead="${g.slot}">
          <span class="pbl-slot-no">${g.slot}<span class="pbl-slot-area">(${g.area})</span></span>
          <span class="pbl-slot-meta">
            <span class="pbl-slot-count ${done ? 'pbl-slot-count--done' : ''}">已拣 ${pickedN}/${totalN} 箱</span>
            <div class="pbl-slot-orders">涉及 ${orders.length} 个主单${active ? ' · 当前作业' : ''}${done ? ' · 已拣完' : ''}</div>
          </span>
        </div>
        <div class="pbl-slot-body ${expanded ? '' : 'hidden'}">${blocks}</div>
      </div>`;
  }).join('');
}

/* 按主单视图(现状对比,简化复刻线上待拣明细) */
function renderByOrder() {
  const list = el('pblList');
  const pend = state.waybills.filter(w => w.children.some(c => !c.picked));
  if (!pend.length) {
    list.innerHTML = `<div class="pko-empty">全部拣完啦!</div>`;
    return;
  }
  list.innerHTML = pend.map(w => {
    const slots = [...new Set(w.children.filter(c => !c.picked).map(c => c.slot))].join(',');
    return `
      <div class="pko-card">
        <div class="pko-wb-row">
          <span class="pko-wb-no">主单:${w.waybill}</span>
          <span class="pko-wb-count pko-wb-count--pending">${w.children.length}\\${w.children.filter(c => c.picked).length}<span class="pko-wb-arrow">▾</span></span>
        </div>
        <div class="pko-row"><span class="pko-row-label">优先级:</span><span class="pko-row-value">${w.priority}</span></div>
        <div class="pko-row"><span class="pko-row-label">库位:</span><span class="pko-row-value">${slots}</span></div>
        ${(w.tips || []).length ? `<div class="pko-tips">${w.tips.map(t => `<span class="pko-tip ${t.color === '#F5222D' ? 'pko-tip--red' : ''}">${t.text}</span>`).join('')}</div>` : ''}
        <div style="font-size:11px;color:#bbb;margin-top:6px;">现状视图:按单拣需逐单走完该单全部库位,再回到下一单</div>
      </div>`;
  }).join('');
}

function render() {
  renderTabs();
  renderStats();
  renderProgress();
  renderWaitBar();
  state.tab === 0 ? renderBySlot() : renderByOrder();
}

/* ---- 扫箱拣货(线上 ScanPicking,校验与推送逻辑不变) ---- */
function doScan() {
  const input = el('pblScanInput');
  const code = (input.value || '').trim();
  if (!code) { Helpers.toast('请扫描或输入子单号'); return; }
  if (!state.dispatchedLocation) { Helpers.toast('请先选择待发库位'); return; }

  const hit = findChild(code);
  if (!hit) { Helpers.toast('未找到该子单'); return; }
  if (hit.picked) { Helpers.toast('该子单已拣货'); return; }

  hit.picked = true;

  // 软提醒:扫的箱不在当前定位库位(不拦截,与线上扫码校验不冲突)
  if (state.currentSlot && hit.slot !== state.currentSlot) {
    Helpers.toast(`注意:该箱在库位 ${hit.slot},不在当前库位 ${state.currentSlot}`);
  } else {
    Helpers.toast('拣货成功:' + code);
  }

  // 库位拣完自动提示下一库位(指向下一个仍有待拣箱的库位)
  const groups = slotGroups();
  const cur = groups.find(g => g.slot === hit.slot);
  const finished = cur && slotPending(cur) === 0;
  const next = groups.find(g => g.slot !== hit.slot && slotPending(g) > 0);
  if (finished && next) {
    setTimeout(() => Helpers.toast(`库位 ${hit.slot} 已拣完,下一库位:${next.slot}`), 900);
  }
  input.value = '';
  render();
}

/* ---- 扫库位定位 ---- */
function doLocate(code) {
  const slot = (code || '').trim();
  if (!slot) { Helpers.toast('请扫描或输入库位号'); return; }
  const g = slotGroups().find(x => x.slot === slot);
  if (!g) { Helpers.toast('该库位不在本任务中'); return; }
  state.currentSlot = slot;
  state.expandedSlot = slot;
  state.tab = 0;
  render();
  const pending = slotPending(g);
  Helpers.toast(pending ? `已定位库位 ${slot},本库位待拣 ${pending} 箱` : `库位 ${slot} 已拣完`);
}

/* ---- 待发库位弹窗 ---- */
function openWaitPick() {
  el('pblWaitBody').innerHTML = `
    <div style="padding:12px 16px;">
      ${state.waitSlots.map(s => `
        <div class="pko-loc-opt" data-wait="${s}" style="padding:10px 12px;border:1px solid #eee;border-radius:6px;margin-bottom:8px;font-size:14px;color:#333;cursor:pointer;">${s}</div>`).join('')}
    </div>`;
  el('pblWaitBody').querySelectorAll('[data-wait]').forEach(o => {
    o.addEventListener('click', () => {
      state.dispatchedLocation = o.dataset.wait;
      hide('pblWaitPick');
      render();
      Helpers.toast('待发库位已选择:' + o.dataset.wait);
    });
  });
  show('pblWaitPick');
}

/* ---- 完成拣货 ---- */
el('pblFinish').addEventListener('click', () => {
  const n = pendingChildren().length;
  if (n > 0) {
    el('pblConfirmText').textContent = `任务尚有 ${n} 个子单未拣,确认完成拣货?`;
    show('pblConfirm');
  } else {
    Helpers.toast('拣货完成,任务已完结');
  }
});
el('pblConfirmOk').addEventListener('click', () => {
  hide('pblConfirm');
  Helpers.toast('拣货完成,任务已完结');
});

/* ---- 事件绑定 ---- */
el('pblTabs').addEventListener('click', e => {
  const tab = e.target.closest('.pk-tab');
  if (tab) { state.tab = +tab.dataset.tab; render(); }
});
el('pblWaitBar').addEventListener('click', openWaitPick);
el('pblScanBtn').addEventListener('click', doScan);
el('pblScanInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); doScan(); }
});
el('pblLocBtn').addEventListener('click', () => { doLocate(el('pblLocInput').value); el('pblLocInput').value = ''; });
el('pblLocInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); doLocate(el('pblLocInput').value); el('pblLocInput').value = ''; }
});
// 库位卡片:点头部 = 定位当前库位 + 展开收起
el('pblList').addEventListener('click', e => {
  const head = e.target.closest('[data-slothead]');
  if (head) {
    const slot = head.dataset.slothead;
    state.currentSlot = slot;
    state.expandedSlot = state.expandedSlot === slot ? '' : slot;
    render();
  }
});
document.addEventListener('click', e => {
  if (e.target.dataset.close === 'waitpick') hide('pblWaitPick');
  if (e.target.dataset.close === 'confirm') hide('pblConfirm');
});

/* ---- 初始化 ---- */
render();

/* ============================================
   演示面板(桌面端)
   ============================================ */
const testPanel = document.createElement('div');
testPanel.className = 'test-panel';
testPanel.innerHTML = `
  <div class="test-panel-title"><span>演示操作</span><span class="test-panel-tip">点击执行</span></div>
  <div class="test-panel-group">
    <div class="test-panel-label">按库位作业</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-act="locate">定位下一库位</span>
      <span class="test-panel-tag" data-act="scan">扫当前库位下一箱</span>
      <span class="test-panel-tag" data-act="wait">选择待发库位</span>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">操作</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-act="tab">切换视图</span>
      <span class="test-panel-tag" data-act="wrongslot">扫非当前库位的箱</span>
      <span class="test-panel-tag" data-act="reset">重置演示</span>
    </div>
  </div>
`;
document.body.appendChild(testPanel);

testPanel.addEventListener('click', e => {
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  const act = tag.dataset.act;
  if (act === 'locate') {
    const g = slotGroups().find(x => x.slot !== state.currentSlot && slotPending(x) > 0)
      || slotGroups().find(x => slotPending(x) > 0);
    if (g) doLocate(g.slot); else Helpers.toast('全部库位已拣完');
  }
  if (act === 'scan') {
    if (!state.dispatchedLocation) { Helpers.toast('请先选择待发库位'); return; }
    const next = pendingChildren().find(c => c.slot === state.currentSlot)
      || pendingChildren()[0];
    if (next) { el('pblScanInput').value = next.no; doScan(); }
    else Helpers.toast('全部子单已拣完');
  }
  if (act === 'wait') {
    if (!state.dispatchedLocation) { state.dispatchedLocation = state.waitSlots[0]; render(); Helpers.toast('待发库位已选择:' + state.waitSlots[0]); }
    else Helpers.toast('待发库位:' + state.dispatchedLocation);
  }
  if (act === 'tab') { state.tab = state.tab === 0 ? 1 : 0; render(); }
  if (act === 'wrongslot') {
    const other = pendingChildren().find(c => c.slot !== state.currentSlot);
    if (other) {
      if (!state.dispatchedLocation) state.dispatchedLocation = state.waitSlots[0];
      el('pblScanInput').value = other.no;
      doScan();
    } else Helpers.toast('没有非当前库位的待拣箱了');
  }
  if (act === 'reset') {
    state.waybills.forEach(w => w.children.forEach(c => c.picked = false));
    state.dispatchedLocation = '';
    state.currentSlot = '';
    state.expandedSlot = '';
    state.tab = 0;
    render();
    Helpers.toast('已重置演示');
  }
});
