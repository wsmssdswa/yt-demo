/* ============================================
   wh-box-rep.js — 箱标补打页(库内操作组,扫描操作页)
   页内三 Tab,对齐线上 frmLabelPrint 窗口(尾程面单打印 | 头程YT面单打印 | 打印设置):
     · Tab1 尾程面单打印 —— BoxLabelRePrintUserControl(PrintObject.EndWaybillPrint)
     · Tab2 头程YT面单打印 —— FirstLegPrintUserControl(PrintObject.HeadYtWaybillPrint)
     · Tab3 打印设置 —— 打印份数规则列表(默认规则 + 渠道规则),仅作用于尾程面单
        (对齐需求 0811_箱标补打打印设置:规则=勾选渠道+打印份数;
         命中渠道规则按规则份数,未命中按默认规则份数;张数带出后保留手动修改)
  依据:docs/page-fields-reference.md + 生产源码 BoxLabelRePrintUserControl /
       FirstLegPrintUserControl / frmLabelPrint(2026-08 核对)
     · 列表 dgvResult(扫描结果,10 列)
         扫描单号|匹配单号|销售产品|服务渠道|打印类型|打印时间|打印状态|
         打印张数|错误信息|耗时(ms)
     · 操作区:打印类型(子单打印/整单打印单选)+ 主单号/子单号(扫描回车)+ 打印份数(默认1)
     · 按钮:打印(校验单号非空);头程 Tab 多一个「下载PDF」按钮,仅整单打印模式显示
          (对齐代码 p1072_2222,2026-08 合入:逐个子单获取标签、按子单号排序合并为一个PDF)
     · 枚举 PrintType:1子单 / 2整单 / 3拣货单(本页只暴露子单/整单单选)
     · 枚举 PrintStatus:1打印中 / 2成功 / 3失败(复用 wh-print 的 print-status--xxx 色阶)
   注:本页不是查询页,是扫描操作页 —— 操作区替代标准查询区;
       列表是扫描结果记录,扫描回车后追加一行;无分页;无"更多条件"。
   整单打印批量(对齐代码 p967_1728,2026-07 合入):
       整单打印输入主单号 → 按主单取全部子单标签逐个打印,
       结果仍记一行,打印张数 = 箱数 × 份数。
       头程 Tab 实现为先查子单列表再逐个子单打印(af1d4a93d,避免OMS超时)。
   ============================================ */

/* ---- 共用枚举映射(复用 wh-print 的 print-status--xxx 色阶) ---- */
const REP_ENUM = {
  status: {
    1: { label:'打印中', cls:'print-status--doing' },
    2: { label:'成功',   cls:'print-status--ok' },
    3: { label:'失败',   cls:'print-status--fail' },
  },
};

/* 演示用:整单打印主单 → 箱数(模拟服务端按主单取全部子单标签,仅演示固定;其余单号按哈希生成 2~4 箱) */
const REP_DEMO_BOXES = {
  'YT2621601300301272': 3,
  'YT2621601300301249': 2,
  'YT2621601300101037': 2,
  'YT2621625400300033': 2,
};
function demoBoxCount(no) {
  if (REP_DEMO_BOXES[no] !== undefined) return REP_DEMO_BOXES[no];
  let h = 0;
  for (let i = 0; i < no.length; i++) h = (h + no.charCodeAt(i)) % 100;
  return 2 + (h % 3); /* 2~4 箱 */
}

/* 模拟一次打印结果(90% 成功,5% 失败,5% 打印中) */
function mockPrintResult() {
  const rnd = Math.random();
  if (rnd < 0.05) return { status:1, statusLabel:'打印中', err:'', cost:0 };
  if (rnd < 0.10) return { status:3, statusLabel:'失败', err:'打印服务异常', cost:3000 };
  return { status:2, statusLabel:'成功', err:'', cost:80 + Math.floor(Math.random() * 200) };
}

/* ============================================
   打印设置(Tab3):全渠道直改表(打印份数配置)
   · 顶部全局默认份数:未单独设置的渠道按此份数带出
   · 渠道列表:每个渠道一行,份数可直接改(≠默认 = 该渠道覆盖值)
   · 命中逻辑:打印时按订单渠道取行份数,未覆盖取默认份数
   · 仅运营/系统管理员可见可配置;渠道状态来自渠道主数据(只读展示)
   对齐需求 0811_箱标补打打印设置(2026-08-11 评审确认;形态=全渠道直改)
   ============================================ */

/* 渠道池(来自渠道主数据 svr_server_channel 示例;停用渠道默认不展示,可切换) */
const REP_CHANNELS = [
  { code:'MEIXUN_ZHENGBAN', name:'美森正班',    status:1 },
  { code:'MEIXUN_JIABAN',   name:'美森加班',    status:1 },
  { code:'B2B_AIR',         name:'B2B空运直飞', status:1 },
  { code:'EXX',             name:'以星EXX',     status:1 },
  { code:'EVERGREEN',       name:'长荣海运',    status:1 },
  { code:'YUNTU_EXPRESS',   name:'云途快线',    status:0 },
];

/* 运行态:全局默认份数 + 每渠道份数(copies=null 表示跟随默认) */
let repSettings = {
  defaultCopies: 2,
  channels: REP_CHANNELS.map(c => ({
    ...c,
    copies: c.code === 'MEIXUN_ZHENGBAN' ? 3 : null, /* 示例:美森正班已覆盖为 3 份 */
  })),
};
/* 筛选态:仅显示可用渠道 / 搜索关键字 */
let repSettingFilter = { onlyActive: true, keyword: '' };

/* ============================================
   数据:每个 Tab 独立累积列表
   ============================================ */

/* ---- Tab1 尾程面单打印(初始 9 行,含多种状态) ---- */
/* 注:第 5/9 行为同一主单的一票两件(子单号 YT...+U001/U002),体现主单/子单号均可扫描 */
let tailRows = [
  { no:1, scanNo:'YT2621601300301272', matchNo:'YT2621601300301272', product:'美森快船-普货', channel:'美森正班', type:'整单打印', time:'2026-08-04 18:53:17', status:2, statusLabel:'成功', cnt:3, err:'', cost:386 },
  { no:2, scanNo:'YT2621601300301249', matchNo:'YT2621601300301249', product:'美森快船-带电', channel:'美森加班', type:'整单打印', time:'2026-08-04 18:47:11', status:3, statusLabel:'失败', cnt:2, err:'打印机离线', cost:5003 },
  { no:3, scanNo:'YT2621601300301227', matchNo:'YT2621601300301227', product:'B2B空运-普货',  channel:'B2B空运直飞', type:'子单打印', time:'2026-08-04 17:47:52', status:2, statusLabel:'成功', cnt:1, err:'', cost:96 },
  { no:4, scanNo:'YT2621601300301201', matchNo:'YT2621601300301201', product:'以星快船-普货', channel:'以星EXX', type:'子单打印', time:'2026-08-04 17:45:35', status:2, statusLabel:'成功', cnt:1, err:'', cost:187 },
  { no:5, scanNo:'YT2621625400300033U001', matchNo:'YT2621625400300033U001', product:'B2B空运-带电',  channel:'B2B空运直飞', type:'子单打印', time:'2026-08-04 20:23:34', status:1, statusLabel:'打印中', cnt:1, err:'', cost:0 },
  { no:6, scanNo:'YT2621601300101052', matchNo:'YT2621601300101052', product:'美森快船-普货', channel:'美森正班', type:'子单打印', time:'2026-08-03 17:22:33', status:2, statusLabel:'成功', cnt:1, err:'', cost:142 },
  { no:7, scanNo:'YT2621601300101037', matchNo:'YT2621601300101037', product:'长荣海运-普货', channel:'长荣海运', type:'整单打印', time:'2026-08-03 16:50:30', status:3, statusLabel:'失败', cnt:2, err:'模板不存在', cost:3120 },
  { no:8, scanNo:'YT2621601300101029', matchNo:'YT2621601300101029', product:'B2B空运-普货',  channel:'B2B空运直飞', type:'子单打印', time:'2026-08-03 16:49:07', status:2, statusLabel:'成功', cnt:1, err:'', cost:203 },
  { no:9, scanNo:'YT2621625400300033U002', matchNo:'YT2621625400300033U002', product:'B2B空运-带电',  channel:'B2B空运直飞', type:'子单打印', time:'2026-08-04 20:24:01', status:2, statusLabel:'成功', cnt:1, err:'', cost:135 },
];
let tailNextNo = tailRows.length + 1;

/* ---- Tab2 头程YT面单打印(初始 8 行,整单打印行张数=箱数×份数) ---- */
let headRows = [
  { no:1, scanNo:'YT2621601300301272', matchNo:'YT2621601300301272', product:'美森快船-普货', channel:'美森正班', type:'整单打印', time:'2026-08-05 09:32:41', status:2, statusLabel:'成功', cnt:3, err:'', cost:421 },
  { no:2, scanNo:'YT2621601300301227', matchNo:'YT2621601300301227', product:'B2B空运-普货',  channel:'B2B空运直飞', type:'子单打印', time:'2026-08-05 09:18:26', status:2, statusLabel:'成功', cnt:1, err:'', cost:88 },
  { no:3, scanNo:'YT2621601300101029', matchNo:'YT2621601300101029', product:'B2B空运-普货',  channel:'B2B空运直飞', type:'整单打印', time:'2026-08-04 21:05:03', status:3, statusLabel:'失败', cnt:2, err:'服务商模板缺失', cost:2876 },
  { no:4, scanNo:'YT2621601300101052U001', matchNo:'YT2621601300101052U001', product:'美森快船-普货', channel:'美森正班', type:'子单打印', time:'2026-08-04 20:47:55', status:2, statusLabel:'成功', cnt:1, err:'', cost:121 },
  { no:5, scanNo:'YT2621601300301201', matchNo:'YT2621601300301201', product:'以星快船-普货', channel:'以星EXX', type:'整单打印', time:'2026-08-04 20:12:18', status:1, statusLabel:'打印中', cnt:2, err:'', cost:0 },
  { no:6, scanNo:'YT2621601300301249U002', matchNo:'YT2621601300301249U002', product:'美森快船-带电', channel:'美森加班', type:'子单打印', time:'2026-08-04 19:41:09', status:2, statusLabel:'成功', cnt:1, err:'', cost:134 },
  { no:7, scanNo:'YT2621601300101037', matchNo:'YT2621601300101037', product:'长荣海运-普货', channel:'长荣海运', type:'子单打印', time:'2026-08-04 18:22:47', status:2, statusLabel:'成功', cnt:1, err:'', cost:97 },
  { no:8, scanNo:'YT2621625400300033', matchNo:'YT2621625400300033', product:'B2B空运-带电',  channel:'B2B空运直飞', type:'整单打印', time:'2026-08-04 17:56:31', status:2, statusLabel:'成功', cnt:2, err:'', cost:312 },
];
let headNextNo = headRows.length + 1;

/* 当前激活 Tab:'tail' 尾程 / 'head' 头程 */
let activeRepTab = 'tail';

/* ============================================
   渲染:页内双 Tab + 各自操作区/工具栏/列表
   ============================================ */

/* 页内 Tab 栏(对齐线上 frmLabelPrint 的 tabControl1) */
function repTabs() {
  const t = (key, label) => `
    <span class="rep-page-tab ${activeRepTab === key ? 'is-active' : ''}"
          data-tab="${key}" onclick="RepPage.switchTab('${key}')">${label}</span>`;
  return `
    <div class="rep-page-tabs">
      ${t('tail', '尾程面单打印')}
      ${t('head', '头程YT面单打印')}
      ${t('setting', '打印设置')}
    </div>
  `;
}

/* 操作区(替代标准查询区;tail=false 时多一个下载PDF按钮,仅整单模式显示) */
function opPanel(tail) {
  const p = tail ? 'rep' : 'head';
  const radio = (name, val, label, checked) => `
    <label><input type="radio" name="${name}" value="${val}" ${checked ? 'checked' : ''}
       ${tail ? '' : `onchange="RepPage.onTypeChange(this.value)"`} /> ${label}</label>`;
  const downloadBtn = tail ? '' : `
    <button id="headDownloadPdf" class="btn" onclick="RepPage.downloadPdf()" style="display:none;">⬇ 下载PDF</button>`;
  return `
    <div class="rep-op-panel">
      <div class="rep-op-field">
        <label>打印类型</label>
        <div class="rep-print-type">
          ${radio(p + 'PrintType', '1', '子单打印', true)}
          ${radio(p + 'PrintType', '2', '整单打印', false)}
        </div>
      </div>
      <div class="rep-op-field">
        <label>主单号 / 子单号</label>
        <input id="${p}Scan" class="ipt rep-scan" placeholder="扫描单号,回车补打"
               onkeydown="RepPage.onScanKey(event)" />
      </div>
      <div class="rep-op-field">
        <label>打印份数</label>
        <input id="${p}Copies" class="ipt" type="number" min="1" value="1" style="width:90px;" />
      </div>
      <div class="rep-actions">
        <button class="btn btn--primary" onclick="RepPage.doPrint()">🖨 打印</button>
        ${downloadBtn}
        <button class="btn" onclick="RepPage.clearScan()">✕ 清空</button>
      </div>
    </div>
  `;
}

/* 工具栏(本页只有清空列表/统计,无标准查询/导出) */
function gridToolbar(gridId, rows) {
  return `
    <div class="grid-toolbar">
      <button class="btn" onclick="RepPage.clearList('${gridId}')">
        <span class="ic">🗑</span><span>清空列表</span>
      </button>
      <span class="sep"></span>
      <span id="${gridId}Count" style="color:#555;line-height:24px;">扫描结果记录(${rows.length})</span>
    </div>
  `;
}

/* 数据表格(扫描结果 dgvResult,10 列) */
function gridTable(gridId, rows) {
  const statusTag = s => {
    const e = REP_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
  };
  const errCell = err =>
    err ? `<span class="print-err">${err}</span>` : '<span style="color:#bbb;">—</span>';
  const costCell = c =>
    c === 0 ? '<span style="color:#bbb;">—</span>' : `${c}`;

  const trs = rows.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col--code">${r.scanNo}</td>
      <td class="col--code">${r.matchNo}</td>
      <td>${r.product}</td>
      <td>${r.channel}</td>
      <td>${r.type}</td>
      <td>${r.time}</td>
      <td>${statusTag(r.status)}</td>
      <td class="col--num">${r.cnt}</td>
      <td>${errCell(r.err)}</td>
      <td class="col--num">${costCell(r.cost)}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid" id="${gridId}">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:170px" />  <!-- 扫描单号 -->
          <col style="width:170px" />  <!-- 匹配单号 -->
          <col style="width:130px" />  <!-- 销售产品 -->
          <col style="width:110px" />  <!-- 服务渠道 -->
          <col style="width:90px" />   <!-- 打印类型 -->
          <col style="width:150px" />  <!-- 打印时间 -->
          <col style="width:80px" />   <!-- 打印状态 -->
          <col style="width:70px" />   <!-- 打印张数 -->
          <col style="width:120px" />  <!-- 错误信息 -->
          <col style="width:80px" />   <!-- 耗时 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>扫描单号</th>
            <th>匹配单号</th>
            <th>销售产品</th>
            <th>服务渠道</th>
            <th>打印类型</th>
            <th>打印时间</th>
            <th>打印状态</th>
            <th class="col--center">打印张数</th>
            <th>错误信息</th>
            <th title="耗时(ms)">耗时(ms)</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
  `;
}

/* 一个 Tab 的内容块(操作区 + 工具栏 + 列表) */
function repSection(tail) {
  const rows = tail ? tailRows : headRows;
  const gridId = tail ? 'repGrid' : 'headGrid';
  return `
    <div class="rep-page-section ${activeRepTab === (tail ? 'tail' : 'head') ? 'is-active' : ''}"
         data-section="${tail ? 'tail' : 'head'}">
      ${opPanel(tail)}
      ${gridToolbar(gridId, rows)}
      ${gridTable(gridId, rows)}
    </div>
  `;
}

/* ---- Tab3 打印设置:全渠道直改表(顶部默认份数 + 每渠道一行) ---- */
/* 规则表格:渠道 | 打印份数(行内直改) | 状态 */
function settingsTable() {
  const statusTag = s =>
    `<span class="abn-tag ${s === 1 ? 'rule-status--on' : 'rule-status--off'}">${s === 1 ? '启用' : '停用'}</span>`;

  const list = repSettings.channels.filter(c => {
    if (repSettingFilter.onlyActive && c.status !== 1) return false;
    if (repSettingFilter.keyword && !c.name.includes(repSettingFilter.keyword)) return false;
    return true;
  });

  const rows = list.map(c => {
    const covered = c.copies !== null && c.copies !== undefined;
    const val = covered ? c.copies : repSettings.defaultCopies;
    return `
    <tr data-code="${c.code}">
      <td>
        <span class="rep-rule-channel">${c.name}</span>
        <span style="color:#bbb;font-size:11px;margin-left:6px;">${c.code}</span>
      </td>
      <td class="col--num">
        <input type="number" min="1" max="9" class="rep-copies-input ${covered ? 'is-covered' : ''}"
               value="${val}" onchange="RepPage.setChannelCopies('${c.code}', this.value)" />
        ${covered
          ? `<span class="rep-covered-tag">已自定义</span><span class="rep-reset" title="恢复为默认份数" onclick="RepPage.resetChannelCopies('${c.code}')">✕</span>`
          : `<span class="rep-default-tag">跟随默认</span>`}
      </td>
      <td>${statusTag(c.status)}</td>
    </tr>`;
  }).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid" id="settingGrid">
        <colgroup>
          <col style="width:280px" />  <!-- 渠道 -->
          <col style="width:220px" />  <!-- 打印份数 -->
          <col style="width:100px" />  <!-- 状态 -->
        </colgroup>
        <thead>
          <tr>
            <th>渠道</th>
            <th class="col--center">打印份数</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* 打印设置内容块:说明 + 配置工具栏(默认份数/筛选/搜索) + 渠道表 */
function settingsSection() {
  return `
    <div class="rep-page-section ${activeRepTab === 'setting' ? 'is-active' : ''}" data-section="setting">
      <div class="rep-setting-tip">
        仅作用于<b>尾程面单</b>:打印时按订单渠道取份数带出,未单独设置的渠道按默认份数;带出后支持手动修改。
      </div>
      <div class="rep-setting-bar">
        <label class="rep-setting-default">默认份数
          <input id="repDefaultCopies" class="ipt" type="number" min="1" max="9" value="${repSettings.defaultCopies}"
                 style="width:70px;" onchange="RepPage.setDefaultCopies(this.value)" />
        </label>
        <label class="rep-setting-filter">
          <input type="checkbox" id="repOnlyActive" ${repSettingFilter.onlyActive ? 'checked' : ''}
                 onchange="RepPage.setOnlyActive(this.checked)" /> 仅显示可用渠道
        </label>
        <input id="repChannelSearch" class="ipt" placeholder="搜索渠道名称" style="width:160px;"
               value="${repSettingFilter.keyword}" oninput="RepPage.setKeyword(this.value)" />
        <span class="sep"></span>
        <span style="color:#888;line-height:26px;font-size:11px;">已覆盖 ${repSettings.channels.filter(c => c.copies !== null).length} 个渠道,其余跟随默认</span>
      </div>
      <div id="settingTableWrap">${settingsTable()}</div>
    </div>
  `;
}

/* ---- 页面逻辑(切Tab / 扫描 / 打印 / 下载PDF / 清空) ---- */
const RepPage = {
  /* 当前激活 Tab 的数据与输入框前缀 */
  ctx() {
    const tail = activeRepTab === 'tail';
    return {
      tail,
      rows: tail ? tailRows : headRows,
      nextNo: tail ? tailNextNo : headNextNo,
      scanId: tail ? 'repScan' : 'headScan',
      copiesId: tail ? 'repCopies' : 'headCopies',
      typeName: tail ? 'repPrintType' : 'headPrintType',
    };
  },
  /* 切页内 Tab */
  switchTab(key) {
    activeRepTab = key;
    document.querySelectorAll('.rep-page-tab').forEach(t =>
      t.classList.toggle('is-active', t.dataset.tab === key));
    document.querySelectorAll('.rep-page-section').forEach(s =>
      s.classList.toggle('is-active', s.dataset.section === key));
    if (key === 'setting') return; /* 设置页无扫描框,不聚焦 */
    const ipt = document.getElementById(key === 'tail' ? 'repScan' : 'headScan');
    if (ipt) ipt.focus();
  },
  /* 当前选中的打印类型 */
  getType() {
    const el = document.querySelector(`input[name="${this.ctx().typeName}"]:checked`);
    return el ? el.value : '1';
  },
  typeLabel(v) { return v === '2' ? '整单打印' : '子单打印'; },
  /* 头程打印类型切换:下载PDF 仅整单模式显示(对齐代码 btnDownloadPdf.Visible = rdoOrderPrint.Checked) */
  onTypeChange(v) {
    const btn = document.getElementById('headDownloadPdf');
    if (btn) btn.style.display = v === '2' ? '' : 'none';
  },
  /* 扫描框回车 → 触发打印 */
  onScanKey(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      this.doPrint();
    }
  },
  /* 校验单号非空 → 追加一行结果(按当前 Tab 分发) */
  doPrint() {
    const c = this.ctx();
    const ipt = document.getElementById(c.scanId);
    const no = (ipt.value || '').trim();
    if (!no) { Helpers.toast('请扫描或输入单号！'); ipt.focus(); return; }
    const copies = parseInt(document.getElementById(c.copiesId).value, 10) || 1;
    const typeV = this.getType();
    /* 整单打印:按主单取全部子单标签批量打印,张数 = 箱数 × 份数(p967_1728) */
    const boxes = typeV === '2' ? demoBoxCount(no) : 1;
    const totalCopies = copies * boxes;
    const r = mockPrintResult();

    c.rows.unshift({
      no: c.nextNo++,
      scanNo: no,
      matchNo: no,
      product: '美森快船-普货',
      channel: '美森正班',
      type: this.typeLabel(typeV),
      time: Helpers.nowTime(),
      status: r.status, statusLabel: r.statusLabel,
      cnt: totalCopies,
      err: r.err, cost: r.cost,
    });
    if (c.tail) tailNextNo = c.nextNo; else headNextNo = c.nextNo;
    this.refresh(c.tail ? 'repGrid' : 'headGrid', c.rows);
    ipt.value = '';
    ipt.focus();

    let tip;
    if (typeV === '2') {
      tip = c.tail
        ? `整单打印:${no} 共${boxes}箱,批量打印${totalCopies}张 → ${r.statusLabel}(演示)`
        : `头程整单:${no} 先查子单列表(共${boxes}箱),逐箱打印${totalCopies}张 → ${r.statusLabel}(演示)`;
    } else {
      tip = `${c.tail ? '' : '头程'}补打 ${this.typeLabel(typeV)}:${no} → ${r.statusLabel}(演示)`;
    }
    Helpers.toast(tip);
  },
  /* 下载PDF(头程 Tab,整单模式):逐个子单获取标签、按子单号排序合并为一个PDF(对齐 p1072_2222) */
  downloadPdf() {
    const c = this.ctx();
    const ipt = document.getElementById(c.scanId);
    const no = (ipt.value || '').trim();
    if (!no) { Helpers.toast('请先扫描或输入主单号！'); ipt.focus(); return; }
    const boxes = demoBoxCount(no);
    const file = `${no}_共${boxes}箱.pdf`;
    Helpers.toast(`已按子单号排序合并下载:${file}(演示)`);
  },
  /* 清空扫描框 */
  clearScan() {
    const c = this.ctx();
    const ipt = document.getElementById(c.scanId);
    ipt.value = '';
    ipt.focus();
  },
  /* 清空结果列表(按 gridId 定位) */
  clearList(gridId) {
    const tail = gridId === 'repGrid';
    const rows = tail ? tailRows : headRows;
    if (rows.length === 0) { Helpers.toast('列表已为空'); return; }
    const ok = confirm(`确定清空 ${rows.length} 条扫描结果,是否继续？`);
    if (!ok) return;
    if (tail) { tailRows = []; tailNextNo = 1; }
    else { headRows = []; headNextNo = 1; }
    this.refresh(gridId, tail ? tailRows : headRows);
    Helpers.toast('已清空扫描结果(演示)');
  },
  /* 重渲染指定列表区 */
  refresh(gridId, rows) {
    const tbody = document.querySelector(`#${gridId} tbody`);
    if (!tbody) return;
    const countEl = document.getElementById(`${gridId}Count`);
    if (countEl) countEl.textContent = `扫描结果记录(${rows.length})`;
    const statusTag = s => {
      const e = REP_ENUM.status[s] || { label:'', cls:'' };
      return `<span class="abn-tag ${e.cls}">${e.label}</span>`;
    };
    const errCell = err =>
      err ? `<span class="print-err">${err}</span>` : '<span style="color:#bbb;">—</span>';
    const costCell = c =>
      c === 0 ? '<span style="color:#bbb;">—</span>' : `${c}`;
    tbody.innerHTML = rows.map(r => `
      <tr data-no="${r.no}">
        <td class="col--num">${r.no}</td>
        <td class="col--code">${r.scanNo}</td>
        <td class="col--code">${r.matchNo}</td>
        <td>${r.product}</td>
        <td>${r.channel}</td>
        <td>${r.type}</td>
        <td>${r.time}</td>
        <td>${statusTag(r.status)}</td>
        <td class="col--num">${r.cnt}</td>
        <td>${errCell(r.err)}</td>
        <td class="col--num">${costCell(r.cost)}</td>
      </tr>
    `).join('');
  },

  /* ================= 打印设置(Tab3)交互 ================= */

  /* 行内修改某渠道份数(1~9 校验,空值回退默认) */
  setChannelCopies(code, val) {
    const ch = repSettings.channels.find(c => c.code === code);
    if (!ch) return;
    const copies = parseInt(val, 10);
    if (val === '' || !copies) {
      ch.copies = null;
      Helpers.toast(`「${ch.name}」已恢复跟随默认份数(演示)`);
    } else if (copies < 1 || copies > 9) {
      Helpers.toast('打印份数须为 1~9 的正整数！');
    } else {
      ch.copies = copies;
      Helpers.toast(`「${ch.name}」份数已设为 ${copies}(演示)`);
    }
    this.refreshSettings();
  },
  /* 恢复某渠道为默认份数 */
  resetChannelCopies(code) {
    const ch = repSettings.channels.find(c => c.code === code);
    if (!ch) return;
    ch.copies = null;
    this.refreshSettings();
    Helpers.toast(`「${ch.name}」已恢复跟随默认份数(演示)`);
  },
  /* 修改全局默认份数 */
  setDefaultCopies(val) {
    const copies = parseInt(val, 10);
    if (!copies || copies < 1 || copies > 9) {
      Helpers.toast('默认份数须为 1~9 的正整数！');
      this.refreshSettings();
      return;
    }
    repSettings.defaultCopies = copies;
    this.refreshSettings();
    Helpers.toast(`默认份数已更新为 ${copies},未覆盖渠道自动跟随(演示)`);
  },
  /* 筛选:仅显示可用渠道 */
  setOnlyActive(on) {
    repSettingFilter.onlyActive = on;
    this.refreshSettings();
  },
  /* 筛选:按渠道名称搜索(只刷新表格,不重建输入框,避免失焦无法连续输入) */
  setKeyword(v) {
    repSettingFilter.keyword = (v || '').trim();
    const wrap = document.getElementById('settingTableWrap');
    if (wrap) wrap.innerHTML = settingsTable();
  },
  /* 重渲染设置区(仅非输入类操作调用;搜索用 setKeyword 只刷表格) */
  refreshSettings() {
    const wrap = document.querySelector('[data-section="setting"]');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="rep-setting-tip">
        仅作用于<b>尾程面单</b>:打印时按订单渠道取份数带出,未单独设置的渠道按默认份数;带出后支持手动修改。
      </div>
      <div class="rep-setting-bar">
        <label class="rep-setting-default">默认份数
          <input id="repDefaultCopies" class="ipt" type="number" min="1" max="9" value="${repSettings.defaultCopies}"
                 style="width:70px;" onchange="RepPage.setDefaultCopies(this.value)" />
        </label>
        <label class="rep-setting-filter">
          <input type="checkbox" id="repOnlyActive" ${repSettingFilter.onlyActive ? 'checked' : ''}
                 onchange="RepPage.setOnlyActive(this.checked)" /> 仅显示可用渠道
        </label>
        <input id="repChannelSearch" class="ipt" placeholder="搜索渠道名称" style="width:160px;"
               value="${repSettingFilter.keyword}" oninput="RepPage.setKeyword(this.value)" />
        <span class="sep"></span>
        <span style="color:#888;line-height:26px;font-size:11px;">已覆盖 ${repSettings.channels.filter(c => c.copies !== null).length} 个渠道,其余跟随默认</span>
      </div>
      <div id="settingTableWrap">${settingsTable()}</div>
    `;
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'wh-box-rep',
  activeTab: 'wh-box-rep',
  tabs: Layout.tabs.standard(),
  content: `
    ${repTabs()}
    ${repSection(true)}
    ${repSection(false)}
    ${settingsSection()}
  `,
});

/* 启动底部时钟 */
Helpers.startClock();

/* 扫描框自动聚焦(默认 Tab1 尾程) */
setTimeout(() => { const ipt = document.getElementById('repScan'); if (ipt) ipt.focus(); }, 0);

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.wh-grid tbody tr');
  if (!tr) return;
  document.querySelectorAll('.wh-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
