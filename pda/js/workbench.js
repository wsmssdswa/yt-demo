/* ============================================
   workbench.js — 工作台页逻辑
   ============================================ */

// 功能菜单:图标 + 文字 + 跳转目标(有页面的已接,其余占位)
const MENUS = [
  { icon: '📥', text: 'PDA签入',       go: './check-in.html' },
  { icon: '🗂️', text: '操作上架',      go: '' },
  { icon: '🔄', text: '移库操作',      go: '' },
  { icon: '🧺', text: 'B2B拣货',       go: '' },
  { icon: '➕', text: '增值服务',      go: '' },
  { icon: '⚠️', text: '异常件登记',    go: '' },
  { icon: '🔍', text: '关务查验',      go: './customs-check.html' },
  { icon: '↩️', text: '还货上架',      go: '' },
  { icon: '🚫', text: '安检拦截',      go: './security-check.html' },
  { icon: '📦', text: '退仓扫描',      go: './outbound-scan.html' },
  { icon: '🏷️', text: '箱标补打',      go: '' },
  { icon: '🔎', text: '大货快查',      go: '' },
  { icon: '✔️', text: '单号校验',      go: '' },
  { icon: '🖥️', text: 'B2B工作台',     go: './b2b-workbench.html' },
  { icon: '📥', text: 'B2B入仓单',     go: '' },
  { icon: '🔀', text: '中转出仓',      go: '' },
  { icon: '📋', text: 'B2B发货计划',   go: '' },
  { icon: '🚛', text: '装车发货V2',    go: '' },
  { icon: '↩️', text: '退件到仓',      go: '' },
  { icon: '📥', text: '到货操作',      go: '' },
  { icon: '🛄', text: '托盘操作',      go: '' },
  { icon: '🔓', text: 'B2B解除拦截',   go: '' },
];

// 渲染工作台
document.getElementById('app').innerHTML = Layout.shell(`
  <!-- 可滚动主区:搜索框/统计/菜单 -->
  <div class="scroll-area">
    <!-- 搜索框 -->
    <div class="search-bar">
      <input type="text" class="search-input" placeholder="搜索" readonly />
    </div>

    <!-- 统计条 -->
    <div class="stats">
      <div class="stat-item"><div class="stat-num">00</div><div class="stat-label">待揽收</div></div>
      <div class="stat-item"><div class="stat-num">00</div><div class="stat-label">已揽收</div></div>
      <div class="stat-item"><div class="stat-num">00</div><div class="stat-label">待退件</div></div>
      <div class="stat-item"><div class="stat-num">00</div><div class="stat-label">揽收袋数</div></div>
      <div class="stat-item"><div class="stat-num">00</div><div class="stat-label">即将超时</div></div>
    </div>

    <!-- 区块标题 -->
    <div class="section-title">
      <span class="t">常用工具</span>
      <span class="more">查看更多 ›</span>
    </div>

    <!-- 功能宫格 -->
    <div class="menu-wrap">
      <div class="menu-grid">
        ${MENUS.map(m => `
          <div class="menu-item" data-go="${m.go}">
            <div class="menu-icon">${m.icon}</div>
            <div class="menu-text">${m.text}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  ${Layout.tabBar('workbench')}
`);

// 启动时钟
Helpers.startClock();

// 菜单跳转:有 go 的跳转,无 go 的静默(占位)
document.querySelectorAll('.menu-item').forEach(it => {
  it.addEventListener('click', () => {
    const go = it.getAttribute('data-go');
    if (go) location.href = go;
  });
});
