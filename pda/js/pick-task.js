/* ============================================
   pick-task.js — B2B拣货 · 拣货任务列表
   复刻线上 PDA toBPickGoods.tsx (code/pda/app/page/ccos/toBPickGoods)
   业务:待拣货/拣货中双 Tab + 筛选(任务号/日期/优先级/业务模式)
        + 查看库位 + 去拣货;线上扫枪扫码=按任务号筛选(ScanUtil)
   ============================================ */

/* ---- 模拟数据(演示用;真实环境为 getListPickingTask 接口返回) ----
   任务号格式以线上实际返回为准,原型用「PJ+日期+序号」占位 */
const TASKS = [
  {
    taskId: 1, taskNo: 'PJ20260817001',
    priority: 'A',                       // 优先级 A-高 B-中 C-低
    businessType: 1, businessTypeDesc: '海运拼柜',
    status: 0,                           // 0=待拣货 1=拣货中
    totalBox: 10, pickedBox: 0,          // 已拣/需求(箱)
    shippingDate: '2026-08-18',
    createTime: '2026-08-17',
    locations: ['A-01-01', 'A-01-02', 'A-01-03'],
  },
  {
    taskId: 2, taskNo: 'PJ20260817002',
    priority: 'B',
    businessType: 2, businessTypeDesc: '海运整柜',
    status: 1,
    totalBox: 12, pickedBox: 4,
    shippingDate: '2026-08-18',
    createTime: '2026-08-17',
    locations: ['B-03-11', 'B-03-12'],
  },
  {
    taskId: 3, taskNo: 'PJ20260817003',
    priority: 'C',
    businessType: 1, businessTypeDesc: '海运拼柜',
    status: 0,
    totalBox: 6, pickedBox: 0,
    shippingDate: '2026-08-19',
    createTime: '2026-08-18',
    locations: ['A-02-05', 'C-05-02'],
  },
  {
    taskId: 4, taskNo: 'PJ20260817004',
    priority: 'B',
    businessType: 5, businessTypeDesc: '全程代理',
    status: 1,
    totalBox: 8, pickedBox: 8,
    shippingDate: '2026-08-17',
    createTime: '2026-08-16',
    locations: ['D-01-01'],
  },
];

// 筛选枚举(线上来自 usePickPriorityInfo 钩子)
const PRIORITY_OPTIONS = [
  { name: '全部', value: '' },
  { name: 'A-高', value: 'A' },
  { name: 'B-中', value: 'B' },
  { name: 'C-低', value: 'C' },
];
const BUSINESS_OPTIONS = [
  { name: '全部', value: '' },
  { name: '海运拼柜', value: '海运拼柜' },
  { name: '海运整柜', value: '海运整柜' },
  { name: '大货空运', value: '大货空运' },
  { name: '全程代理', value: '全程代理' },
];

/* ---- 页面状态 ---- */
const state = {
  type: 1,                    // 1=整单拣货 2=逐箱拣货(来自 pick-select 跳转参数)
  tab: 0,                     // 0=待拣货 1=拣货中
  pendingCount: 0,            // 待拣货任务数(Tab 角标)
  pickingCount: 0,            // 拣货中任务数(Tab 角标)
  filterOpen: false,
  // 已应用(生效)的筛选条件
  filter: { keyword: '', priority: '', businessType: '', startDate: '', endDate: '' },
  // 筛选弹层内的工作副本(打开面板时回填,确定才生效,取消回退)
  draft: { keyword: '', priority: '', businessType: '', startDate: '', endDate: '' },
};

/* ---- 统计角标(对应线上 GetPickingTaskCount) ---- */
function refreshCounts() {
  state.pendingCount = TASKS.filter(t => t.status === 0).length;
  state.pickingCount = TASKS.filter(t => t.status === 1).length;
}

/* ---- 渲染主结构 ---- */
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('拣货任务列表')}
  <div class="pk-page">
    <!-- 双 Tab:待拣货(n) / 拣货中(n) -->
    <div class="pk-tabs" id="pkTabs"></div>

    <!-- 筛选入口 -->
    <div class="pk-filter-toggle" id="pkFilterToggle">
      <span>筛选</span>
      <span class="pk-filter-arrow" id="pkFilterArrow">▼</span>
    </div>

    <!-- 筛选面板 -->
    <div class="pk-filter-panel hidden" id="pkFilterPanel"></div>

    <!-- 任务列表(线上无扫码输入框,PDA 硬件扫码 ScanUtil 扫任务号=按任务号筛选) -->
    <div class="pk-list" id="pkList"></div>
  </div>

  <!-- 库位明细弹窗(查看库位) -->
  <div class="drawer hidden" id="pkLocModal">
    <div class="drawer-mask" data-close="loc"></div>
    <div class="drawer-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:15px;font-weight:600;color:#333;">库位明细</span>
        <span data-close="loc" style="font-size:18px;color:#999;line-height:1;">✕</span>
      </div>
      <div class="pk-loc-detail-text" id="pkLocText"></div>
    </div>
  </div>
`);

Helpers.startClock();

/* ---- 双 Tab 渲染与切换 ---- */
function renderTabs() {
  document.getElementById('pkTabs').innerHTML = [
    { idx: 0, name: '待拣货', count: state.pendingCount },
    { idx: 1, name: '拣货中', count: state.pickingCount },
  ].map(t => `
    <div class="pk-tab ${state.tab === t.idx ? 'pk-tab--on' : ''}" data-tab="${t.idx}">
      ${t.name}${t.count > 0 ? '(' + t.count + ')' : ''}
    </div>
  `).join('');
}

function onToggleTab(idx) {
  if (state.tab === idx) return;
  state.tab = idx;
  // 对齐线上 onToggleTab:切 Tab 重置筛选条件后重新请求
  resetFilter();
  closeFilterPanel();
  render();
}

/* ---- 筛选面板 ---- */
const fmtDate = d => {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
// 线上 PickFilter 打开时默认日期:昨天 00:00 ~ 明天 23:59
function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

function openFilterPanel() {
  // 打开时回填已应用条件;日期取线上默认区间
  state.draft = {
    ...state.filter,
    ...defaultRange(),
  };
  state.filterOpen = true;
  renderFilterPanel();
}

function closeFilterPanel() {
  state.filterOpen = false;
  renderFilterPanel();
}

function renderFilterPanel() {
  const panel = document.getElementById('pkFilterPanel');
  const arrow = document.getElementById('pkFilterArrow');
  panel.classList.toggle('hidden', !state.filterOpen);
  arrow.classList.toggle('pk-filter-arrow--up', state.filterOpen);
  if (!state.filterOpen) return;
  const d = state.draft;
  panel.innerHTML = `
    <div class="pk-filter-row">
      <div class="pk-filter-label">搜索计划名称</div>
      <input class="pk-filter-input" id="pkFKeyword" placeholder="请输入任务号" value="${d.keyword}" />
    </div>
    <div class="pk-filter-row">
      <div class="pk-filter-label">开始日期</div>
      <input class="pk-filter-input" type="date" id="pkFStart" value="${d.startDate}" />
    </div>
    <div class="pk-filter-row">
      <div class="pk-filter-label">结束日期</div>
      <input class="pk-filter-input" type="date" id="pkFEnd" value="${d.endDate}" />
    </div>
    <div class="pk-filter-row">
      <div class="pk-filter-label">优先级</div>
      <select class="pk-filter-input" id="pkFPriority">
        ${PRIORITY_OPTIONS.map(o => `<option value="${o.value}" ${o.value === d.priority ? 'selected' : ''}>${o.name}</option>`).join('')}
      </select>
    </div>
    <div class="pk-filter-row">
      <div class="pk-filter-label">业务模式</div>
      <select class="pk-filter-input" id="pkFBusiness">
        ${BUSINESS_OPTIONS.map(o => `<option value="${o.value}" ${o.value === d.businessType ? 'selected' : ''}>${o.name}</option>`).join('')}
      </select>
    </div>
    <div class="pk-filter-row pk-filter-row--btns">
      <button class="pk-filter-btn pk-filter-btn--cancel" id="pkFCancel">取消</button>
      <button class="pk-filter-btn pk-filter-btn--ok" id="pkFOK">确定</button>
    </div>
  `;
  document.getElementById('pkFCancel').addEventListener('click', () => {
    closeFilterPanel();
  });
  document.getElementById('pkFOK').addEventListener('click', () => {
    state.filter = {
      keyword: document.getElementById('pkFKeyword').value.trim(),
      priority: document.getElementById('pkFPriority').value,
      businessType: document.getElementById('pkFBusiness').value,
      startDate: document.getElementById('pkFStart').value,
      endDate: document.getElementById('pkFEnd').value,
    };
    closeFilterPanel();
    render();
  });
}

function resetFilter() {
  state.filter = { keyword: '', priority: '', businessType: '', startDate: '', endDate: '' };
}

/* ---- 任务列表渲染 ---- */
function applyFilter(task) {
  const f = state.filter;
  if (f.keyword && !task.taskNo.toLowerCase().includes(f.keyword.toLowerCase())) return false;
  if (f.priority && task.priority !== f.priority) return false;
  if (f.businessType && task.businessTypeDesc !== f.businessType) return false;
  // 线上筛选用 ShippingDate;BusinessType=5 列表展示创建日期,筛选口径不变
  if (f.startDate && task.shippingDate < f.startDate) return false;
  if (f.endDate && task.shippingDate > f.endDate) return false;
  return true;
}

function renderList() {
  const list = document.getElementById('pkList');
  const tasks = TASKS.filter(t => t.status === state.tab).filter(applyFilter);
  if (tasks.length === 0) {
    list.innerHTML = `<div class="pk-empty">暂无数据</div>`;
    return;
  }
  list.innerHTML = tasks.map(t => {
    const dateLabel = t.businessType == 5 ? '创建日期:' : '发货日期:';
    const dateValue = t.businessType == 5 ? t.createTime : t.shippingDate;
    return `
      <div class="pk-task-card">
        <div class="pk-row"><span class="pk-row-label">任务号:</span><span class="pk-row-value pk-row-value--no">${t.taskNo}</span></div>
        <div class="pk-row"><span class="pk-row-label">优先级:</span><span class="pk-row-value pk-row-value--pri">${t.priority}</span></div>
        <div class="pk-row"><span class="pk-row-label">已拣/需求(箱):</span><span class="pk-row-value pk-row-value--gray">${t.pickedBox}/${t.totalBox}</span></div>
        <div class="pk-row"><span class="pk-row-label">业务模式:</span><span class="pk-row-value pk-row-value--gray">${t.businessTypeDesc}</span></div>
        <div class="pk-row"><span class="pk-row-label">${dateLabel}</span><span class="pk-row-value pk-row-value--gray">${dateValue}</span></div>
        <div class="pk-row">
          <span class="pk-row-label">库位:</span>
          <span class="pk-row-value pk-row-value--loc" data-loc="${t.taskId}">查看库位</span>
        </div>
        <div class="pk-go-row">
          <button class="pk-go-btn" data-go="${t.taskId}">去拣货</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ---- 扫码:线上扫枪扫到任务号 → PickName=code 筛选(ScanUtil) ----
   code: 任务号,由 PDA 扫码传入;原型用测试面板模拟 */
function doScan(code) {
  code = (code || '').trim();
  if (!code) {
    Helpers.toast('请扫描任务号');
    return;
  }
  const hit = TASKS.find(t => t.taskNo === code);
  if (!hit) {
    Helpers.toast('未找到该拣货任务');
    return;
  }
  state.filter = { ...state.filter, keyword: code };
  closeFilterPanel();
  render();
  Helpers.toast('已扫入：' + code);
}

function render() {
  renderTabs();
  renderList();
}

/* ---- 事件绑定 ---- */
document.getElementById('pkTabs').addEventListener('click', e => {
  const tab = e.target.closest('.pk-tab');
  if (tab) onToggleTab(+tab.dataset.tab);
});
document.getElementById('pkFilterToggle').addEventListener('click', () => {
  state.filterOpen ? closeFilterPanel() : openFilterPanel();
});
// 查看库位 / 去拣货(事件委托)
document.getElementById('pkList').addEventListener('click', e => {
  const loc = e.target.closest('[data-loc]');
  if (loc) {
    const task = TASKS.find(t => t.taskId == loc.dataset.loc);
    document.getElementById('pkLocText').textContent = task.locations.join('，');
    document.getElementById('pkLocModal').classList.remove('hidden');
    return;
  }
  const go = e.target.closest('[data-go]');
  if (go) {
    const task = TASKS.find(t => t.taskId == go.dataset.go);
    location.href = `./pick-operation.html?taskId=${task.taskId}&taskNo=${task.taskNo}&type=${state.type}&businessType=${task.businessType}`;
  }
});
// 弹窗关闭(统一 data-close)
document.addEventListener('click', e => {
  const close = e.target.dataset.close;
  if (close === 'loc') document.getElementById('pkLocModal').classList.add('hidden');
});

/* ---- 初始化 ---- */
state.type = parseInt(new URLSearchParams(location.search).get('type') || '1');
refreshCounts();
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
    <div class="test-panel-label">模拟扫码</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-scan="PJ20260817001">扫 PJ20260817001</span>
      <span class="test-panel-tag" data-scan="PJ20260817004">扫 PJ20260817004</span>
    </div>
  </div>
  <div class="test-panel-group">
    <div class="test-panel-label">操作</div>
    <div class="test-panel-tags">
      <span class="test-panel-tag" data-act="tab">切到拣货中</span>
      <span class="test-panel-tag" data-act="reset">重置筛选</span>
    </div>
  </div>
`;
document.body.appendChild(testPanel);

testPanel.addEventListener('click', e => {
  const tag = e.target.closest('.test-panel-tag');
  if (!tag) return;
  if (tag.dataset.scan) {
    // 模拟 PDA 硬件扫码:扫任务号 → 按任务号筛选(线上 ScanUtil)
    doScan(tag.dataset.scan);
  }
  if (tag.dataset.act === 'tab') onToggleTab(state.tab === 0 ? 1 : 0);
  if (tag.dataset.act === 'reset') {
    resetFilter();
    closeFilterPanel();
    render();
    Helpers.toast('已重置筛选');
  }
});
