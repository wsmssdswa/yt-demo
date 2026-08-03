/* ============================================
   layout.js — 页面框架复用
   用法:页面里 document.getElementById('app').innerHTML = Layout.shell(`...`);
   ============================================ */

const Layout = {
  /* 设备外壳 + 状态栏 + 页面专属内容(inner)
     inner: 各页面不一样的内容(导航/正文/Tab 等) */
  shell(inner) {
    return `
      <div class="device"><div class="screen">
        ${this.statusBar()}
        ${inner}
      </div></div>
    `;
  },

  /* 系统状态栏(时间/信号/电池) */
  statusBar() {
    return `
      <div class="status-bar">
        <span class="clock">--:--</span>
        <span class="status-icons">
          <span class="ic">A</span>
          <span class="ic">📶</span>
          <span class="ic">🔋</span>
        </span>
      </div>
    `;
  },

  /* 带返回的标题栏(详情页用)
     title: 标题文字;backHref: 返回地址(默认回到首页) */
  navBar(title, backHref = './index.html') {
    return `
      <div class="nav-bar">
        <div class="nav-back" onclick="history.length>1?history.back():(location.href='${backHref}')">‹</div>
        <div class="nav-title">${title}</div>
        <div class="nav-placeholder"></div>
      </div>
    `;
  },

  /* 底部 Tab 栏(主页用)
     active: 'task' | 'workbench' | 'me',指定哪个高亮 */
  tabBar(active = 'workbench') {
    const item = (key, icon, text) =>
      `<div class="tab ${active === key ? 'tab--active' : ''}">
         <span class="tab-icon">${icon}</span>
         <span class="tab-text">${text}</span>
       </div>`;
    return `
      <div class="tab-bar">
        ${item('task', '📋', '任务')}
        ${item('workbench', '🏠', '工作台')}
        ${item('me', '👤', '我的')}
      </div>
    `;
  },
};
