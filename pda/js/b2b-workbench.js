/* ============================================
   b2b-workbench.js — B2B工作台页逻辑
   仓库需操作任务汇总:Tab分类 + 可折叠筛选 + 表格式任务列表
   ============================================ */

// Tab 分类及任务角标数(演示数据;count 应与下方 TASKS 各分类实际数量一致)
const TABS = [
  { key: 'all',    text: '全部', count: 9999 },
  { key: 'swap',   text: '换单', count: 2 },
  { key: 'check',  text: '查验', count: 1500 },
  { key: 'count',  text: '盘点', count: 4 },
  { key: 'return', text: '退件', count: 2 },
  { key: 'vas',    text: '增值', count: 3 },
];

// 角标数字格式化:超过 999 显示 999+
function fmtCount(n) {
  return n > 999 ? '999+' : String(n);
}

// 任务列表(演示数据;time 只存时分)
// 单号格式:no/subNo 均为子单号 = 主单号(YT+16位数字) + U + 3位序号(从U001起累加)
// 分拣码格式:3位数字+1位字母(如 028A);库位格式:三级 AA-BB-001
// 分拣码是主单级字段(线上存放于主单表,分拣码=格口号,一票一个) → 同一主单的子单行共用同一个
const TASKS = [
  { no: 'YT2621000070480966U001', sortCode: '028A', loc: 'AA-BB-001', time: '09:18', type: 'swap'   },
  { no: 'YT2621000070480967U001', sortCode: '114B', loc: 'CC-DD-012', time: '09:25', type: 'check'  },
  { no: 'YT2621000070480966U003', sortCode: '028A', loc: 'EE-FF-023', time: '09:30', type: 'swap'   },
  { no: 'YT2621000070480967U005', sortCode: '114B', loc: 'GG-HH-045', time: '09:55', type: 'check'  },
  // 退件不进本数组:TASKS 是子单级任务,退件按主单聚合,见下方 RETURN_ORDERS
  // 增值服务(vas):按子单粒度操作,故用 subNo/mainNo 区分;vasItems 为该子单的增值服务清单与状态
  // 单号格式:主单号 = YT + 16位数字;子单号 = 主单号 + U + 3位序号(从U001起累加)
  { subNo: 'YT2621000070480964U001', mainNo: 'YT2621000070480964', sortCode: '620G', warehouse: '东莞寮步项目仓', loc: 'MM-NN-102', time: '10:30', datetime: '2026-07-28 10:30:05', type: 'vas',
    vasItems: [
      { name: '贴外箱标', status: 'done' },
      { name: '换箱',     status: 'todo' },
      { name: '复核尺寸', status: 'todo' },
      { name: '复核重量', status: 'todo' },
    ] },
  { subNo: 'YT2621000070480964U002', mainNo: 'YT2621000070480964', sortCode: '620G', warehouse: '东莞寮步项目仓', loc: 'OO-PP-134', time: '10:48', datetime: '2026-07-28 10:48:18', type: 'vas',
    vasItems: [
      { name: '贴内件标', status: 'done' },
      { name: '清点拍照', status: 'done' },
      { name: '复核尺寸', status: 'todo' },
    ] },
  { subNo: 'YT2621000070480965U001', mainNo: 'YT2621000070480965', sortCode: '845I', warehouse: '东莞寮步项目仓', loc: 'QQ-RR-156', time: '11:05', datetime: '2026-07-28 11:05:42', type: 'vas',
    vasItems: [
      { name: '换箱',     status: 'done' },
      { name: '贴外箱标', status: 'done' },
      { name: '复核重量', status: 'done' },
    ] },
];

// 退件列表(演示数据;主单一行 + 展开看箱)
// 退件是整票退:退货执行覆盖该主单全部子单("只要有一个子单退件,推送全部子单"/退货总单按全部子单生成),
// 故列表按主单聚合、一行一票;分拣码是主单级字段(仓库找货主要看它),展示在票行上;
// 库位是箱子级的(线下找货靠它),展开后按箱列出
// 退件原因 = 该票异常件的异常类型(A1-客户要求暂扣 / Y5-异形件)
const RETURN_ORDERS = [
  { mainNo: 'YT2621000070480971', sortCode: '402E', datetime: '2026-10-08 16:05',
    children: [
      { no: 'YT2621000070480971U001', loc: 'II-JJ-067', reason: 'A1-客户要求暂扣' },
      { no: 'YT2621000070480971U002', loc: 'KK-LL-089', reason: 'A1-客户要求暂扣' },
      { no: 'YT2621000070480971U003', loc: 'KK-LL-090', reason: 'A1-客户要求暂扣' },
      { no: 'YT2621000070480971U004', loc: 'MM-NN-102', reason: 'A1-客户要求暂扣' },
      { no: 'YT2621000070480971U005', loc: 'MM-NN-103', reason: 'A1-客户要求暂扣' },
    ] },
  { mainNo: 'YT2621000070480972', sortCode: '518F', datetime: '2026-10-09 09:40',
    children: [
      { no: 'YT2621000070480972U001', loc: 'OO-PP-134', reason: 'Y5-异形件' },
      { no: 'YT2621000070480972U002', loc: 'OO-PP-135', reason: 'Y5-异形件' },
    ] },
];

// 盘点任务列表(独立数据,与截图一致)
const COUNT_TASKS = [
  { no: 'PD20260715006', warehouse: '东莞寮步项目仓', status: '进行中', datetime: '2026/7/15 17:42:58' },
  { no: 'PD20260715004', warehouse: '东莞寮步项目仓', status: '进行中', datetime: '2026/7/15 10:25:18' },
  { no: 'PD20260715003', warehouse: '东莞寮步项目仓', status: '进行中', datetime: '2026/7/15 10:11:18' },
  { no: 'PD20260715001', warehouse: '东莞寮步项目仓', status: '进行中', datetime: '2026/7/15 09:27:26' },
];

// 渲染页面
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('B2B工作台')}

  <!-- Tab 分类(带角标) -->
  <div class="wb-tabs" id="wbTabs">
    ${TABS.map((t, i) => `
      <div class="wb-tab ${i === 0 ? 'wb-tab--on' : ''}" data-key="${t.key}">
        <span class="wb-tab-text">${t.text}<span class="wb-tab-badge">${fmtCount(t.count)}</span></span>
      </div>
    `).join('')}
  </div>

  <!-- 筛选条(默认折叠,点击展开;实时筛选) -->
  <div class="filter-bar" id="filterBar">
    <div class="filter-toggle" id="filterToggle">
      <span>筛选条件</span>
      <span class="filter-arrow">▾</span>
    </div>
    <div class="filter-panel hidden" id="filterPanel">
      <div class="filter-row">
        <div class="filter-input-wrap">
          <input type="text" class="filter-input" data-field="no" placeholder="请输入单号" />
          <span class="filter-clear" data-clear="no">×</span>
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-input-wrap">
          <input type="text" class="filter-input" data-field="loc" placeholder="请输入库位" />
          <span class="filter-clear" data-clear="loc">×</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 任务列表(表格行式 / 盘点卡片式);表头按 Tab 动态渲染 -->
  <div class="scroll-area">
    <div class="task-table" id="taskTable">
      <div class="task-thead" id="taskThead"></div>
      <div class="task-tbody" id="taskTbody"></div>
    </div>
  </div>

  <!-- 盘点 Tab 底部操作栏 -->
  <div class="count-bar hidden" id="countBar">
    <button class="count-create" id="countCreate">创建任务</button>
  </div>

  <!-- 全部/增值 Tab 底部操作栏(文案按 Tab 动态切换);退件 Tab 为只读列表,无底部按钮 -->
  <div class="count-bar hidden" id="actionBar">
    <button class="count-create" id="actionGo"></button>
  </div>

  <!-- 底部操作选择面板(iOS ActionSheet 风格;点"去操作"唤起) -->
  <div class="action-sheet-mask hidden" id="actionSheetMask">
    <div class="action-sheet">
      <div class="action-sheet-title">请选择操作类型</div>
      <div class="action-sheet-list" id="actionSheetList"></div>
      <div class="action-sheet-gap"></div>
      <div class="action-sheet-cancel" id="actionSheetCancel">取消</div>
    </div>
  </div>
`);

// 各 Tab 底部按钮配置:全部 tab 弹操作面板;增值直达增值服务页(退件为只读列表,不配底部按钮)
// 操作面板 3 项:换单/查验为线上既有入口,增值服务为本次新增(下级页不在本工作台需求范围)
// 退仓链路整体下线:原「退仓」页签与面板里的「退仓扫描」入口都不再保留
const ACTION_BY_TAB = {
  all:    { text: '去操作', panel: true },
  vas:    { text: '去增值服务', href: './vas.html' },
};
// 「去操作」面板选项
const ACTION_OPTIONS = [
  { text: '换单作业', href: './swap.html' },
  { text: '关务查验', href: './check.html' },
  { text: '增值服务', href: './vas.html' },
];

Helpers.startClock();

/* ---- Tab 切换 + 实时筛选 ---- */
const taskTbody = document.getElementById('taskTbody');
let currentTab = 'all';
const filters = { no: '', loc: '' };   // 当前筛选项值

// 表头按 Tab 渲染:其余 Tab 为 单号/分拣码/库位/时间;退件 Tab 是两行式行,表头由 CSS 隐藏
function renderThead() {
  document.getElementById('taskThead').innerHTML = currentTab === 'return'
    ? ''
    : `<span class="col-no">单号</span>
       <span class="col-sort">分拣码</span>
       <span class="col-loc">库位</span>
       <span class="col-time">时间</span>`;
}

function renderTasks() {
  let list;
  if (currentTab === 'count') {
    list = COUNT_TASKS.slice();
  } else if (currentTab === 'return') {
    list = RETURN_ORDERS.slice();
  } else if (currentTab === 'all') {
    // 「全部」混排:退件是整票维度(一行一票),故单号列放票号、分拣码取该主单的分拣码、库位留空
    // (库位是箱级的,到退件 Tab 展开看,不在混排里铺开)
    list = [
      ...TASKS,
      ...RETURN_ORDERS.map(r => ({ no: r.mainNo, sortCode: r.sortCode, loc: '-', time: r.datetime.slice(11), type: 'return' })),
    ];
  } else {
    list = TASKS.filter(t => t.type === currentTab);
  }

  // 实时筛选:单号(包含匹配,不区分大小写);盘点 Tab 不参与库位筛选
  // 退件为整票维度:单号匹配票号或任一箱子,库位匹配任一箱子所在库位
  if (filters.no) {
    const kw = filters.no.toLowerCase();
    list = list.filter(t => currentTab === 'return'
      ? (t.mainNo.toLowerCase().includes(kw) || t.children.some(c => c.no.toLowerCase().includes(kw)))
      : (t.subNo || t.no || '').toLowerCase().includes(kw));
  }
  if (filters.loc && currentTab !== 'count') {
    const kw = filters.loc.toLowerCase();
    list = list.filter(t => currentTab === 'return'
      ? t.children.some(c => c.loc.toLowerCase().includes(kw))
      : t.loc.toLowerCase().includes(kw));
  }

  // 增值列表过滤规则:过滤掉"全部增值服务已完成"的子单,只保留存在未完成项的
  // (退件/盘点/换单/查验等不涉及该规则)
  list = list.filter(t => !t.vasItems || t.vasItems.some(v => v.status !== 'done'));

  // Tab 专属模式切换
  document.getElementById('taskTable').classList.toggle('vas-mode', currentTab === 'vas');
  document.getElementById('taskTable').classList.toggle('count-mode', currentTab === 'count');
  // 退件:列改为 单号/库位/退件原因/时间(其余 Tab 为 单号/分拣码/库位/时间)
  document.getElementById('taskTable').classList.toggle('return-mode', currentTab === 'return');
  renderThead();
  document.getElementById('filterBar').classList.toggle('hidden', currentTab === 'count');
  document.getElementById('countBar').classList.toggle('hidden', currentTab !== 'count');

  // 全部/增值 Tab:显示底部跳转操作栏,文案随 Tab 切换;其他 Tab 隐藏
  const actionConf = ACTION_BY_TAB[currentTab];
  const actionBar = document.getElementById('actionBar');
  actionBar.classList.toggle('hidden', !actionConf);
  if (actionConf) document.getElementById('actionGo').textContent = actionConf.text;

  // 盘点 Tab:卡片式列表(复刻截图)
  if (currentTab === 'count') {
    taskTbody.innerHTML = list.length
      ? list.map(renderCountCard).join('')
      : `<div class="task-empty">无匹配任务</div>`;
    return;
  }

  // 增值 Tab:卡片式 → 隐藏表格表头,卡片直接铺排
  if (currentTab === 'vas') {
    taskTbody.innerHTML = list.length
      ? list.map(renderVasCard).join('')
      : `<div class="task-empty">无匹配任务</div>`;
    return;
  }

  // 其他 Tab:原表格式
  // 「全部」含 vas 任务(用 subNo),故单号列取 no || subNo,确保都显示子单号
  // 行左侧色条按 type 区分(全部 tab 混排时一眼分辨类型);单类型 tab 内为同色
  // 退件:整票一行(只读参考,货还在仓、待退回客户),点卡展开该票全部箱子与各自库位
  // 卡面两行:上行 分拣码+票号+时间;下行 退件原因 左、箱数+展开指示 右(箱数贴展开按钮,同一组)
  if (currentTab === 'return') {
    taskTbody.innerHTML = list.length
      ? list.map(r => {
          // 退件原因按该票箱子的异常类型去重展示
          const reasons = [...new Set(r.children.map(c => c.reason).filter(Boolean))].join('、');
          return `
          <div class="task-tr task-tr--return rt-card">
            <div class="rt-head">
              <span class="col-sort">${r.sortCode}</span>
              <span class="rt-no">${r.mainNo}</span>
              <span class="rt-time">${r.datetime.slice(5)}</span>
            </div>
            <div class="rt-meta">
              <span class="rt-reason">${reasons || '-'}</span>
              <span class="rt-count">共 ${r.children.length} 箱</span>
              <span class="rt-toggle">展开 ▾</span>
            </div>
            <div class="rt-children hidden">
              ${r.children.map(c => `
                <div class="rt-child">
                  <span class="rt-child-no">${c.no}</span>
                  <span class="rt-child-loc">
                    <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
                      <path fill="#00A99D" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
                    </svg>
                    <span>${c.loc}</span>
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        `}).join('')
      : `<div class="task-empty">无匹配任务</div>`;
    return;
  }

  taskTbody.innerHTML = list.length
    ? list.map(t => `
        <div class="task-tr task-tr--${t.type}">
          <span class="col-no">${t.no || t.subNo}</span>
          <span class="col-sort">${t.sortCode}</span>
          <span class="col-loc">${t.loc}</span>
          <span class="col-time">${t.time}</span>
        </div>
      `).join('')
    : `<div class="task-empty">无匹配任务</div>`;
}

// 渲染单张增值服务卡片
// 卡片上的增值服务项只展示"未完成"的(已完成项不显示 chip)
function renderVasCard(t) {
  const chips = t.vasItems
    .filter(v => v.status !== 'done')   // 只渲染未完成项
    .map(v => `<span class="vas-chip vas-chip--todo">${v.name}</span>`)
    .join('');
  return `
    <div class="vas-card" data-sub="${t.subNo}">
      <div class="vas-card-head">
        <span class="vas-card-sub">${t.subNo}</span>
        <span class="vas-sort-val">${t.sortCode}</span>
      </div>
      <div class="vas-card-meta">
        <span class="vas-wh">${t.warehouse}</span>
        <span class="vas-loc">
          <svg class="vas-loc-ico" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path fill="#00A99D" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
          </svg>
          <span class="vas-loc-val">${t.loc}</span>
        </span>
      </div>
      <div class="vas-chips">${chips}</div>
      <div class="vas-foot">
        <span class="vas-card-time">${t.datetime}</span>
        <span class="vas-go">去处理 →</span>
      </div>
    </div>
  `;
}

// 渲染盘点任务卡片(1:1 复刻截图)
function renderCountCard(t) {
  return `
    <div class="count-card" data-no="${t.no}">
      <div class="count-card-head">
        <div class="count-card-main">
          <div class="count-card-no">${t.no}</div>
          <div class="count-card-warehouse">${t.warehouse}</div>
        </div>
        <div class="count-card-side">
          <div class="count-card-status"><span class="count-dot"></span>${t.status}</div>
          <div class="count-card-time">${t.datetime}</div>
        </div>
      </div>
      <div class="count-card-foot">
        <button class="count-continue">继续盘点 →</button>
      </div>
    </div>
  `;
}

document.getElementById('wbTabs').addEventListener('click', e => {
  const tab = e.target.closest('.wb-tab');
  if (!tab) return;
  document.querySelectorAll('.wb-tab').forEach(el => el.classList.remove('wb-tab--on'));
  tab.classList.add('wb-tab--on');
  currentTab = tab.dataset.key;
  renderTasks();
});

/* ---- 筛选折叠/展开 ---- */
const filterPanel = document.getElementById('filterPanel');
const filterArrow = document.querySelector('.filter-arrow');
document.getElementById('filterToggle').addEventListener('click', () => {
  const collapsed = filterPanel.classList.contains('hidden');
  filterPanel.classList.toggle('hidden', !collapsed);
  filterArrow.classList.toggle('filter-arrow--up', collapsed);
});

/* ---- 实时筛选 + 清除按钮 ---- */
// 控制清除按钮显示/隐藏
function syncClearBtn(input) {
  const clear = input.parentElement.querySelector('.filter-clear');
  clear.classList.toggle('filter-clear--show', input.value.length > 0);
}
// 输入即筛选
document.querySelectorAll('.filter-input').forEach(input => {
  input.addEventListener('input', () => {
    filters[input.dataset.field] = input.value.trim();
    syncClearBtn(input);
    renderTasks();
  });
});
// 点击清除按钮:清空对应输入框并重新筛选
document.querySelectorAll('.filter-clear').forEach(clear => {
  clear.addEventListener('click', () => {
    const input = clear.parentElement.querySelector('.filter-input');
    input.value = '';
    filters[clear.dataset.clear] = '';
    syncClearBtn(input);
    renderTasks();
    input.focus();
  });
});

renderTasks();

/* ---- 增值卡片:整卡点击跳详情页(带子单号参数) ---- */
taskTbody.addEventListener('click', e => {
  const card = e.target.closest('.vas-card');
  if (!card) return;
  location.href = `./vas-detail.html?sub=${encodeURIComponent(card.dataset.sub)}`;
});

/* ---- 盘点卡片:继续盘点 ---- */
taskTbody.addEventListener('click', e => {
  const btn = e.target.closest('.count-continue');
  if (!btn) return;
  const card = btn.closest('.count-card');
  Helpers.toast(`继续盘点: ${card.dataset.no}`);
});

/* ---- 退件行:点行展开/收起该票的待退箱子 ---- */
taskTbody.addEventListener('click', e => {
  const card = e.target.closest('.rt-card');
  if (!card) return;
  const box = card.querySelector('.rt-children');
  const toggle = card.querySelector('.rt-toggle');
  const collapsed = box.classList.contains('hidden');
  box.classList.toggle('hidden', !collapsed);
  toggle.textContent = collapsed ? '收起 ▴' : '展开 ▾';
});

/* ---- 盘点:创建任务 ---- */
document.getElementById('countCreate').addEventListener('click', () => {
  Helpers.toast('创建新的盘点任务');
});

/* ---- 全部/增值:底部按钮(下级页内容不在本工作台需求范围,原型仅 toast 提示) ----
   全部 tab → 唤起操作选择面板;增值 → 直达对应页 toast 提示 */
document.getElementById('actionGo').addEventListener('click', () => {
  const conf = ACTION_BY_TAB[currentTab];
  if (!conf) return;
  if (conf.panel) openActionSheet();
  else Helpers.toast(`跳转：${conf.text}`);
});

/* ---- 「去操作」选择面板:渲染选项 + 显示 ---- */
const actionSheetMask = document.getElementById('actionSheetMask');
const actionSheetList = document.getElementById('actionSheetList');
function openActionSheet() {
  actionSheetList.innerHTML = ACTION_OPTIONS.map((o, i) =>
    `<div class="action-sheet-item" data-i="${i}">${o.text}</div>`
  ).join('');
  actionSheetMask.classList.remove('hidden');
}
// 点选项 → toast 提示跳转(不真跳转,下级页未建)
actionSheetList.addEventListener('click', e => {
  const item = e.target.closest('.action-sheet-item');
  if (!item) return;
  const opt = ACTION_OPTIONS[+item.dataset.i];
  closeActionSheet();
  Helpers.toast(`跳转：${opt.text}`);
});
// 取消 / 点遮罩关闭
function closeActionSheet() { actionSheetMask.classList.add('hidden'); }
document.getElementById('actionSheetCancel').addEventListener('click', closeActionSheet);
actionSheetMask.addEventListener('click', e => { if (e.target === actionSheetMask) closeActionSheet(); });

/* ---- Tab 栏:鼠标滚轮转横向滚动(触摸滑动由 CSS touch-action 处理) ---- */
const wbTabsEl = document.getElementById('wbTabs');
wbTabsEl.addEventListener('wheel', e => {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    // 垂直滚轮 → 转成横向滚动
    e.preventDefault();
    wbTabsEl.scrollLeft += e.deltaY;
  }
}, { passive: false });
