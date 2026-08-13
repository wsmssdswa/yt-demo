/* ============================================
   layout.js — PC 端页面框架复用
   用法:document.getElementById('app').innerHTML = Layout.window({...});
   ============================================ */

const Layout = {
  /* 5 个一级菜单(全部归属"集货作业系统")
     字段:key / label / children:[{key,label}]
     一级菜单默认折叠;若 activeLeft 属于某个 group,则该 group 默认展开 */
  MENU_GROUPS: [
    { key: 'sync',    label: 'CCOS数据同步管理', children: [
      { key: 'sync-task',    label: 'CCOS同步数据任务配置' },
      { key: 'sync-data',    label: 'CCOS同步数据查询' },
      { key: 'sync-history', label: 'CCOS同步历史数据查询' },
      { key: 'sync-queue',   label: 'CCOS同步队列配置' },
      { key: 'sync-api-acc', label: 'CCOS同步API服务账号配置' },
      { key: 'sync-code',    label: 'CCOS同步系统代码配置' },
      { key: 'sync-type',    label: 'CCOS同步处理类型配置' },
      { key: 'sync-api',     label: 'CCOS同步API服务配置' },
      { key: 'sync-stat',    label: 'CCOS同步数据推送统计' },
      { key: 'sync-rule',    label: 'CCOS同步规则配置管理' },
      { key: 'sync-perm',    label: 'CCOS同步数据权限管理' },
      { key: 'sync-apis',    label: 'CCOS同步Api列表配置' },
      { key: 'sync-monitor', label: 'CCOS同步异常监控' },
    ]},
    { key: 'wh-ops',  label: '库内操作',         children: [
      { key: 'wh-link-bag',  label: '关联袋牌维护' },
      { key: 'wh-box-rep',   label: '箱标补打' },
      { key: 'wh-shelf-q',   label: '上架数据查询' },
      { key: 'wh-mv',        label: '移库记录' },
      { key: 'wh-stock',     label: '库存管理' },
      { key: 'wh-pick',      label: '拣货任务列表' },
      { key: 'wh-vas-op',    label: '增值服务操作' },
      { key: 'wh-vas-mgmt',  label: '增值服务管理' },
      { key: 'wh-print',     label: '打印记录' },
      { key: 'wh-stk-task',  label: '盘点任务' },
    ]},
    { key: 'order',   label: '订单管理',         children: [
      { key: 'b2b-order',    label: 'B2B订单管理' },
      { key: 'abnormal',     label: '异常订单管理' },
      { key: 'return-wh',    label: '退仓管理' },
      { key: 'b2b-security', label: 'B2B安检记录查询' },
      { key: 'b2b-weight',   label: 'B2B重量勘误' },
      { key: 'b2b-inspect',  label: 'B2B查验记录' },
    ]},
    { key: 'inbound', label: '入库操作',         children: [
      { key: 'in-cb-empty',  label: '计泡空入' },
      { key: 'in-check-q',   label: '签入查询' },
      { key: 'in-check-bat', label: '签入批次' },
      { key: 'in-review',    label: '复核记录' },
      { key: 'in-batch',     label: '批量签入' },
      { key: 'in-photo',     label: '拍照记录上传' },
      { key: 'in-wb-chn',    label: '工作台换单记录' },
      { key: 'in-wb-insp',   label: '工作台查验记录' },
      { key: 'in-receipt',   label: '入仓单记录' },
      { key: 'in-b2b-sort',  label: 'B2B分拣管理' },
    ]},
    { key: 'base',    label: '基础信息',         children: [
      { key: 'b-charge-net', label: '计费网点维护' },
      { key: 'b-wt-adj',     label: '重量调整' },
      { key: 'b-prod-ccos',  label: '销售产品-CCOS' },
      { key: 'b-channel',    label: '渠道配置' },
      { key: 'b-push',       label: '推送配置' },
      { key: 'b-b2b-bin',    label: 'B2B推荐库位配置' },
    ]},
  ],

  /* 整窗:标题栏 + 顶部按钮 + 左侧菜单 + 内容(Tab+主区) + 状态栏
     opts:
       title    窗口标题(默认 "Nebula YT-UAT")
       activeLeft  左侧菜单选中项 key
       activeTab   顶部 Tab 选中项 key
       tabs        Tab 列表(用 Layout.tabs.xxx 选)
       content     主区 HTML
       onLoad      加载完成回调(可选)
     URL 参数(可选,覆盖 opts):
       ?left=key       直跳某子菜单(同时展开其所属组)
       ?expand=g1,g2   强制展开某些一级组(逗号分隔) */
  window(opts) {
    const o = Object.assign({
      title: 'Nebula YT-UAT',
      activeLeft: 'b2b-order',
      activeTab: 'b2b-order',
      tabs: this.tabs.standard(),
      content: '',
    }, opts || {});
    /* 读 URL 参数覆盖 */
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('left'))   o.activeLeft = q.get('left');
    } catch (_) {}
    return `
      <div class="window">
        <div class="window-frame">
          ${this.titleBar(o.title)}
          ${this.toolbarTop()}
          <div class="main">
            ${this.leftMenu(o.activeLeft)}
            <div class="content">
              ${this.tabBar(o.activeTab, o.tabs)}
              <div class="content-body" style="flex:1;display:flex;flex-direction:column;min-height:0;">
                ${o.content}
              </div>
            </div>
          </div>
          ${this.statusBar()}
        </div>
      </div>
    `;
  },

  /* 标题栏(蓝色渐变 + Windows 三键) */
  titleBar(text) {
    return `
      <div class="title-bar">
        <span class="title-bar-text">${text}</span>
        <div class="window-controls">
          <button title="最小化">—</button>
          <button title="最大化">▢</button>
          <button class="btn-close" title="关闭">✕</button>
        </div>
      </div>
    `;
  },

  /* 顶部按钮区(搜索菜单 / 添加 / 签约主体 / 登录主体) */
  toolbarTop() {
    return `
      <div class="toolbar-top">
        <div class="toolbar-top-item" onclick="Helpers.toast('搜索菜单(占位)')">
          <span class="icon">🔍</span>
          <span class="text">搜索菜单</span>
        </div>
        <div class="toolbar-top-item" onclick="Helpers.toast('添加(占位)')">
          <span class="icon">+</span>
          <span class="text">添加</span>
        </div>
        <div class="toolbar-top-spacer"></div>
        <div class="toolbar-top-select">
          <label>签的主体:</label>
          <select class="sel"><option>东腾曼沙项目仓</option></select>
        </div>
        <div class="toolbar-top-select">
          <label>登录主体:</label>
          <select class="sel"><option>庄亚运</option></select>
        </div>
      </div>
    `;
  },

  /* 左侧菜单(集货作业系统 + 5 个一级菜单,均可折叠/展开)
     active: 当前选中子项的 key(决定哪个 group 默认展开 + 哪个子项高亮)
     URL 参数 ?expand=g1,g2 强制展开额外组(逗号分隔) */
  leftMenu(active) {
    /* 读 URL ?expand= 参数(逗号分隔多个 group key) */
    const extraOpen = (() => {
      try {
        const q = new URLSearchParams(location.search);
        const v = q.get('expand');
        return v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
      } catch (_) { return []; }
    })();

    /* 找到 active 属于哪个 group,用来默认展开 */
    const openKey = (() => {
      for (const g of this.MENU_GROUPS) {
        if (g.children.some(c => c.key === active)) return g.key;
      }
      return this.MENU_GROUPS[0].key;
    })();

    const groups = this.MENU_GROUPS.map(g => {
      const isOpen = (g.key === openKey) || extraOpen.includes(g.key);
      const subItems = g.children.map(c => `
        <div class="left-menu-item ${c.key === active ? 'left-menu-item--active' : ''}"
             onclick="Layout.goMenu('${c.key}')">
          <span>${c.label}</span>
        </div>
      `).join('');
      return `
        <div class="left-menu-group ${isOpen ? 'is-open' : ''}" data-group="${g.key}">
          <div class="left-menu-group-header" onclick="Layout.toggleGroup('${g.key}')">
            <span class="lmg-label">${g.label}</span>
            <span class="lmg-arrow">${isOpen ? '⌃' : '⌄'}</span>
          </div>
          <div class="left-menu-sub">${subItems}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="left-menu">
        <div class="left-menu-title">
          <span>集货作业系统</span>
          <span class="lmt-close" onclick="Helpers.toast('关闭侧边栏(占位)')" title="关闭">✕</span>
        </div>
        ${groups}
      </div>
    `;
  },

  /* 切换一级菜单的展开/折叠 */
  toggleGroup(key) {
    const el = document.querySelector(`.left-menu-group[data-group="${key}"]`);
    if (!el) return;
    el.classList.toggle('is-open');
    const arrow = el.querySelector('.lmg-arrow');
    if (arrow) arrow.textContent = el.classList.contains('is-open') ? '⌃' : '⌄';
  },

  /* 点击子菜单跳转(已实现的页面直接跳,其它 toast 占位) */
  goMenu(key) {
    const PAGES = {
      'b2b-order': './b2b-order.html',
      'abnormal': './abnormal-order.html',
      'return-wh': './return-warehouse.html',
      'b2b-security': './b2b-security.html',
      'b2b-weight': './b2b-weight.html',
      'b2b-inspect': './b2b-inspect.html',
      'in-check-q': './in-check-q.html',
      'in-check-bat': './in-check-bat.html',
      'in-review': './in-review.html',
      'in-batch': './in-batch.html',
      'in-photo': './in-photo.html',
      'in-receipt': './in-receipt.html',
      'wh-shelf-q':  './wh-shelf-q.html',
      'wh-mv':       './wh-mv.html',
      'wh-stock':    './wh-stock.html',
      'wh-pick':     './wh-pick.html',
      'wh-stk-task': './wh-stk-task.html',
      'wh-print':    './wh-print.html',
      'wh-box-rep':  './wh-box-rep.html',
    };
    if (PAGES[key]) { location.href = PAGES[key]; return; }
    Helpers.toast(`子菜单 ${key}(占位,待后续实现)`);
  },

  /* 顶部 Tab 栏
     active: 当前选中的 key
     tabs: [{ key, label }] 列表 */
  tabBar(active, tabs) {
    const list = tabs || this.tabs.standard();
    return `
      <div class="tab-bar">
        ${list.map(t => `
          <div class="tab ${active === t.key ? 'tab--active' : ''}"
               onclick="${t.onclick || 'void(0)'}">
            <span>${t.label}</span>
            <span class="tab-close" onclick="event.stopPropagation();Helpers.toast('关闭 ${t.label}')">×</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  /* 标准 Tab 列表(B2B订单管理 / 增值服务 / 异常订单 等) */
  tabs: {
    standard() {
      return [
        { key: 'ccos-sync',     label: 'CCOS同步历史数据查询', onclick: "Helpers.toast('CCOS同步历史数据查询(占位)')" },
        { key: 'export-check',  label: '出口查验管理',         onclick: "Helpers.toast('出口查验管理(占位)')" },
        { key: 'b2b-order',     label: 'B2B订单管理',          onclick: "location.href='./b2b-order.html'" },
        { key: 'vas-mgmt',      label: '增值服务管理',         onclick: "Helpers.toast('增值服务管理(占位)')" },
        { key: 'vas-operate',   label: '增值服务操作',         onclick: "Helpers.toast('增值服务操作(占位)')" },
        { key: 'abnormal',      label: '异常订单管理',         onclick: "location.href='./abnormal-order.html'" },
        { key: 'return-wh',     label: '退仓管理',             onclick: "location.href='./return-warehouse.html'" },
        { key: 'ccos-task',     label: 'CCOS同步数据任务配置', onclick: "Helpers.toast('CCOS同步数据任务配置(占位)')" },
      ];
    },
  },

  /* 底部状态栏(系统时间 / 电子秤 / 网络 / 关闭系统) */
  statusBar() {
    return `
      <div class="status-bar">
        <span class="sb-item">当前机构:<b style="color:#1F4E79;margin-left:4px;">东腾曼沙项目仓</b></span>
        <span class="sb-item">当前用户:<b style="color:#1F4E79;margin-left:4px;">庄亚运</b></span>
        <span class="sb-item sb-item--link" onclick="Helpers.toast('刷新系统')">刷新系统</span>
        <span class="sb-item sb-item--link" onclick="Helpers.toast('刷新缓存')">刷新缓存</span>
        <span class="sb-spacer"></span>
        <span class="sb-item">电子秤重量: <b style="color:#E81123;">0.000</b></span>
        <span class="sb-item sb-item--ok">●客户端为最新</span>
        <span class="sb-item sb-item--ok">●主服务器</span>
        <span class="sb-item">网络状态: <b style="color:#2E7D32;">优(3ms)</b></span>
        <span class="sb-item">系统时间: <span class="clock">--:--:--</span></span>
        <span class="sb-item sb-item--link" onclick="Helpers.toast('关闭系统(占位)')">✕关闭系统</span>
      </div>
    `;
  },
};
