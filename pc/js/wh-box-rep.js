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

/* 按渠道从打印设置带出份数:命中启用的渠道规则→规则份数;未命中→默认份数 */
function copiesFromConfig(channel) {
  const rule = repSettings.rules.find(r => r.channels.includes(channel));
  return rule ? rule.copies : repSettings.defaultCopies;
}

/* ============================================
   打印设置(Tab3):打印份数规则列表(V1.2 式,纯列表)
   · 默认规则:系统内置固定一条,未命中任何渠道规则时适用;仅可改份数,不可删/停用
   · 渠道规则:一条 = 勾选若干渠道 + 打印份数;可新增/编辑/删除/启停;渠道不可重叠
   · 命中逻辑:打印时按订单渠道命中渠道规则带出份数,未命中按默认份数
   · 仅运营/系统管理员可见可配置
   对齐需求 0811_箱标补打打印设置(2026-08-13 确认:形态=纯列表 V1.2 式)
   ============================================ */

/* 渠道池(来自渠道主数据 svr_server_channel 示例;弹窗多选来源)
   server=服务商简称(来自 sp_server.server_shortname),列表辅助展示+搜索匹配;status 来自主数据 */
const REP_CHANNELS = [
  { code:'MEIXUN_ZHENGBAN', name:'美森正班',    server:'美森', status:1 },
  { code:'MEIXUN_JIABAN',   name:'美森加班',    server:'美森', status:1 },
  { code:'MEIXUN_HAIPI',    name:'美森海派',    server:'美森', status:1 },
  { code:'B2B_AIR',         name:'B2B空运直飞', server:'云途', status:1 },
  { code:'B2B_AIR_TRANSFER',name:'B2B空运转飞', server:'云途', status:1 },
  { code:'EXX',             name:'以星EXX',     server:'以星', status:1 },
  { code:'EVERGREEN',       name:'长荣海运',    server:'长荣', status:1 },
  { code:'YUNTU_EXPRESS',   name:'云途快线',    server:'云途', status:0 },
  { code:'MATSON_EXX',      name:'美森EXX',     server:'美森', status:0 },
];

/* 运行态:默认份数 + 渠道规则列表 */
let repSettings = {
  defaultCopies: 1,
  rules: [
    { key:'r1', channels:['美森正班', '美森加班'], copies:3 },
    { key:'r2', channels:['B2B空运直飞'],         copies:1 },
    { key:'r3', channels:['以星EXX'],             copies:2 },
  ],
};
let repSettingKey = 4; /* 渠道规则 key 自增 */

/* 弹窗态:已选渠道 + 搜索词(新增/编辑规则弹窗内使用) */
let ruleModalSelected = new Set();
let ruleModalKeyword = '';

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

/* 操作区(替代标准查询区;尾程/头程都有「下载PDF」按钮,仅整单模式显示)
   注:尾程下载PDF 对齐需求(与头程一致):整单模式逐子单获取标签、按子单号排序合并为一个PDF */
function opPanel(tail) {
  const p = tail ? 'rep' : 'head';
  const radio = (name, val, label, checked) => `
    <label><input type="radio" name="${name}" value="${val}" ${checked ? 'checked' : ''}
       onchange="RepPage.onTypeChange('${p}', this.value)" /> ${label}</label>`;
  const downloadBtn = `
    <button id="${p}DownloadPdf" class="btn" onclick="RepPage.downloadPdf()" style="display:none;">⬇ 下载PDF</button>`;
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
        ${tail ? `
        <div class="rep-copies-mode">
          <label class="rep-copies-opt"><input type="radio" name="repCopiesMode" value="config" checked onchange="RepPage.onCopiesModeChange('config')" /> 根据配置</label>
          <label class="rep-copies-opt"><input type="radio" name="repCopiesMode" value="manual" onchange="RepPage.onCopiesModeChange('manual')" /> 手动输入</label>
          <input id="repCopies" class="ipt" type="number" min="1" max="9" value="${repSettings.defaultCopies}" style="width:70px;display:none;" />
        </div>` : `
        <input id="${p}Copies" class="ipt" type="number" min="1" value="1" style="width:90px;" />`}
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
    <tr class="${r.no === 1 ? 'row--selected' : ''} ${r.status === 3 ? 'print-row--fail' : ''}" data-no="${r.no}">
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

/* ---- Tab3 打印设置:规则列表(默认规则 + 渠道规则,V1.2 式) ---- */
/* 规则表格:勾选 | 规则(渠道) | 打印份数(无启停,规则保存即生效、删除即失效) */
function settingsTable() {
  /* 渠道规则行 */
  const rows = repSettings.rules.map(r => `
    <tr data-key="${r.key}">
      <td class="col--center"><input type="checkbox" class="rep-rule-chk" data-key="${r.key}" /></td>
      <td>${r.channels.map(c => {
        const ch = REP_CHANNELS.find(x => x.name === c);
        return `<span class="rep-rule-channel ${ch && ch.status === 0 ? 'rep-rule-channel--off' : ''}">${c}</span>`;
      }).join('')}</td>
      <td class="col--num">${r.copies}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid" id="settingGrid">
        <colgroup>
          <col style="width:46px" />   <!-- 勾选 -->
          <col style="width:400px" />  <!-- 规则(渠道) -->
          <col style="width:110px" />  <!-- 打印份数 -->
        </colgroup>
        <thead>
          <tr>
            <th class="col--center"><input type="checkbox" id="settingChkAll" onclick="RepPage.onChkAll(this)" /></th>
            <th>规则(渠道)</th>
            <th class="col--center">打印份数</th>
          </tr>
        </thead>
        <tbody>
          <!-- 默认规则:首行固定,仅可改份数,不可删 -->
          <tr class="rep-rule-default" data-key="default">
            <td class="col--center"><input type="checkbox" class="rep-rule-chk" data-key="default" /></td>
            <td><span class="rep-rule-default-tag">默认</span>
                <span style="color:#888;font-size:11px;">未命中任何渠道规则时适用</span></td>
            <td class="col--num">${repSettings.defaultCopies}</td>
          </tr>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/* 打印设置内容块:说明 + 工具栏(新增/编辑/删除) + 规则列表 */
function settingsSection() {
  return `
    <div class="rep-page-section ${activeRepTab === 'setting' ? 'is-active' : ''}" data-section="setting">
      <div class="rep-setting-tip">
        仅作用于<b>尾程面单</b>:打印时按订单渠道命中渠道规则带出份数,未命中按默认份数;带出后支持手动修改。
      </div>
      <div class="grid-toolbar">
        <button class="btn btn--primary" onclick="RepPage.openRuleModal('new')">＋ 新增渠道配置</button>
        <button class="btn" onclick="RepPage.editChecked()">✎ 编辑</button>
        <button class="btn" onclick="RepPage.deleteChecked()">🗑 删除</button>
        <span class="sep"></span>
        <span style="color:#888;line-height:24px;font-size:11px;">默认规则不可删除;渠道规则可删除</span>
      </div>
      ${settingsTable()}
    </div>
  `;
}

/* 渠道列表渲染(表格:序号/渠道代码/渠道名称;点击行切换选中,选中行高亮;按 ruleModalKeyword 过滤) */
function ruleChannelListHTML() {
  const kw = ruleModalKeyword.toLowerCase();
  const list = REP_CHANNELS.filter(c =>
    !kw || c.name.toLowerCase().includes(kw) || (c.code || '').toLowerCase().includes(kw));
  if (list.length === 0) return '<div style="color:#999;padding:10px;font-size:12px;">无匹配渠道</div>';
  const rows = list.map((c, i) => `
    <tr class="${ruleModalSelected.has(c.name) ? 'is-selected' : ''}"
        onclick="RepPage.toggleChannel('${c.name}')">
      <td class="col--num">${i + 1}</td>
      <td class="col--code">${c.code || ''}</td>
      <td>${c.name}</td>
    </tr>`).join('');
  return `
    <table class="rep-ch-table">
      <thead>
        <tr><th style="width:52px;">序号</th><th style="width:200px;">渠道代码</th><th>渠道名称</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/* 已选渠道回显(tag,可删) */
function ruleSelectedHTML() {
  if (ruleModalSelected.size === 0) return '<span style="color:#bbb;font-size:12px;">未选择</span>';
  return [...ruleModalSelected].map(name => `
    <span class="rep-channel-selected-tag">${name}<i onclick="RepPage.removeSelectedChannel('${name}')">✕</i></span>
  `).join('');
}

/* 新增/编辑规则弹窗(默认规则只编辑份数;渠道规则 = 搜索列表多选 + 已选回显 + 份数) */
function ruleModal(mode, key) {
  const isDefault = key === 'default';
  const editRule = isDefault ? null : repSettings.rules.find(r => r.key === key) || null;
  const title = isDefault ? '编辑默认规则' : (editRule ? '编辑渠道配置' : '新增渠道配置');
  const copies = isDefault ? repSettings.defaultCopies : (editRule ? editRule.copies : 1);

  return `
    <div class="cn-modal hidden" id="ruleModal">
      <div class="rw-modal-mask" onclick="RepPage.closeRuleModal()"></div>
      <div class="rw-modal-panel" style="width:560px;">
        <div class="rw-modal-header">
          <span class="rw-modal-title">${title}</span>
          <span class="rw-modal-close" onclick="RepPage.closeRuleModal()">✕</span>
        </div>
        <div class="rw-modal-body">
          ${isDefault ? `
            <div class="rep-rule-form-row">
              <label class="rep-rule-form-label">默认打印份数</label>
              <input id="ruleCopies" class="ipt" type="number" min="1" max="9" value="${copies}" style="width:120px;" />
              <span class="rep-rule-form-tip">正整数 1~9,未命中渠道规则的订单按此份数带出</span>
            </div>` : `
            <div class="rep-rule-form-row">
              <label class="rep-rule-form-label">选择渠道</label>
              <input id="ruleChannelSearch" class="ipt rep-channel-search" placeholder="搜索渠道代码 / 渠道名称"
                     value="${ruleModalKeyword}" oninput="RepPage.filterRuleChannel(this.value)" />
              <div id="ruleChannelList" class="rep-ch-list">${ruleChannelListHTML()}</div>
              <div class="rep-rule-form-tip">输入实时过滤;点击行加入/移出已选;同一渠道不允许出现在多条规则中</div>
            </div>
            <div class="rep-rule-form-row">
              <label class="rep-rule-form-label">已选渠道(<span id="ruleSelectedCount">${ruleModalSelected.size}</span>)</label>
              <div id="ruleChannelSelected" class="rep-channel-selected">${ruleSelectedHTML()}</div>
            </div>
            <div class="rep-rule-form-row">
              <label class="rep-rule-form-label">打印份数</label>
              <input id="ruleCopies" class="ipt" type="number" min="1" max="9" value="${copies}" style="width:120px;" />
              <span class="rep-rule-form-tip">正整数 1~9,超过上限(&gt;9)校验提示</span>
            </div>`}
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="RepPage.closeRuleModal()">取消</button>
          <button class="btn btn--primary" onclick="RepPage.saveRule('${key}')">保存</button>
        </div>
      </div>
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
  /* 打印类型切换:下载PDF 仅整单模式显示(尾程/头程都适用) */
  onTypeChange(p, v) {
    const btn = document.getElementById(`${p}DownloadPdf`);
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
    const typeV = this.getType();
    /* 份数来源:尾程选「根据配置」→ 按渠道命中打印设置带出(只读);选「手动输入」/头程 → 取输入框值 */
    let copies;
    if (c.tail) {
      const modeEl = document.querySelector('input[name="repCopiesMode"]:checked');
      const autoOn = modeEl ? modeEl.value === 'config' : true;
      if (autoOn) {
        copies = copiesFromConfig('美森正班'); /* 演示:扫描单号渠道=美森正班,命中 r1 规则;后台带出不展示 */
        document.getElementById('repCopies').value = copies;
      } else {
        copies = parseInt(document.getElementById(c.copiesId).value, 10) || 1;
      }
    } else {
      copies = parseInt(document.getElementById(c.copiesId).value, 10) || 1;
    }
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
    /* 打印结果不弹提示(对齐线上):状态/张数通过列表行展示,失败行红底 */
  },
  /* 尾程份数模式切换:config=按打印配置后台带出(不展示份数);manual=显示输入框手填 */
  onCopiesModeChange(mode) {
    const input = document.getElementById('repCopies');
    if (!input) return;
    if (mode === 'config') {
      input.style.display = 'none';
      Helpers.toast('已切换:根据打印配置带出份数(演示)');
    } else {
      input.style.display = '';
      input.focus();
      Helpers.toast('已切换:手动输入份数(演示)');
    }
  },
  /* 下载PDF(尾程/头程,整单模式):逐个子单获取标签、按子单号排序合并为一个PDF(对齐 p1072_2222)
     注:仅下载文件,不改变换单状态——走纯查询链路,不触发换单标识/轨迹副作用(参照头程 ListFirstLegLabel) */
  downloadPdf() {
    const c = this.ctx();
    const ipt = document.getElementById(c.scanId);
    const no = (ipt.value || '').trim();
    if (!no) { Helpers.toast('请先扫描或输入主单号！'); ipt.focus(); return; }
    const boxes = demoBoxCount(no);
    const file = `${no}_共${boxes}箱.pdf`;
    Helpers.toast(`已按子单号排序合并下载:${file}(仅下载文件,不改变换单状态)(演示)`);
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
      <tr class="${r.status === 3 ? 'print-row--fail' : ''}" data-no="${r.no}">
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

  /* 打开新增/编辑规则弹窗(mode='new' 或 编辑 key;key='default' 编辑默认份数) */
  openRuleModal(mode, key) {
    const existing = document.getElementById('ruleModal');
    if (existing) { existing.remove(); }
    const k = (mode === 'new') ? 'new' : (key || 'new');
    /* 初始化弹窗态:已选(编辑时预填)+ 搜索词清空 */
    const editRule = (k !== 'new' && k !== 'default') ? (repSettings.rules.find(r => r.key === k) || null) : null;
    ruleModalSelected = new Set(editRule ? editRule.channels : []);
    ruleModalKeyword = '';
    const wrap = document.createElement('div');
    wrap.innerHTML = ruleModal(mode, k);
    document.body.appendChild(wrap.firstElementChild);
    document.getElementById('ruleModal').classList.remove('hidden');
    const search = document.getElementById('ruleChannelSearch');
    if (search) setTimeout(() => search.focus(), 0);
  },
  closeRuleModal() {
    const modal = document.getElementById('ruleModal');
    if (modal) modal.remove();
  },
  /* 渠道搜索:实时过滤列表(只刷表格,保留已选与输入焦点) */
  filterRuleChannel(v) {
    ruleModalKeyword = (v || '').trim();
    const el = document.getElementById('ruleChannelList');
    if (el) el.innerHTML = ruleChannelListHTML();
  },
  /* 点击渠道行:切换选中(选中集合 + 行高亮 + 已选回显) */
  toggleChannel(name) {
    if (ruleModalSelected.has(name)) ruleModalSelected.delete(name);
    else ruleModalSelected.add(name);
    const el = document.getElementById('ruleChannelList');
    if (el) el.innerHTML = ruleChannelListHTML();
    this.refreshRuleSelected();
  },
  /* 已选 tag 删除:移除集合并同步取消行选中 */
  removeSelectedChannel(name) {
    ruleModalSelected.delete(name);
    const el = document.getElementById('ruleChannelList');
    if (el) el.innerHTML = ruleChannelListHTML();
    this.refreshRuleSelected();
  },
  refreshRuleSelected() {
    const sel = document.getElementById('ruleChannelSelected');
    if (sel) sel.innerHTML = ruleSelectedHTML();
    const cnt = document.getElementById('ruleSelectedCount');
    if (cnt) cnt.textContent = ruleModalSelected.size;
  },
  /* 保存规则(新增/编辑/默认) */
  saveRule(key) {
    const copiesEl = document.getElementById('ruleCopies');
    const copies = parseInt(copiesEl.value, 10);
    if (!copies || copies < 1 || copies > 9) {
      Helpers.toast('打印份数须为 1~9 的正整数！'); copiesEl.focus(); return;
    }
    if (key === 'default') {
      repSettings.defaultCopies = copies;
      this.closeRuleModal();
      this.refreshSettings();
      Helpers.toast(`默认规则份数已更新为 ${copies}(演示)`);
      return;
    }
    /* 渠道规则:从已选集合取 + 渠道不重叠校验 */
    const channels = [...ruleModalSelected];
    if (channels.length === 0) { Helpers.toast('请至少选择一个渠道'); return; }
    /* 编辑时排除自身 key;新增时校验全部 */
    const conflict = channels.find(c =>
      repSettings.rules.some(r => r.key !== key && r.channels.includes(c)));
    if (conflict) { Helpers.toast(`渠道「${conflict}」已存在其他规则中,请调整`); return; }

    if (key === 'new') {
      repSettings.rules.push({ key: `r${repSettingKey++}`, channels, copies });
    } else {
      const exist = repSettings.rules.find(r => r.key === key);
      if (exist) { exist.channels = channels; exist.copies = copies; }
    }
    this.closeRuleModal();
    this.refreshSettings();
    Helpers.toast(`已保存:${channels.join('、')} → ${copies} 份(演示)`);
  },
  /* 全选/取消全选 */
  onChkAll(el) {
    document.querySelectorAll('.rep-rule-chk').forEach(c => { c.checked = el.checked; });
  },
  /* 编辑:勾选一条规则(默认规则仅编辑份数) */
  editChecked() {
    const checked = document.querySelectorAll('.rep-rule-chk:checked');
    if (checked.length !== 1) { Helpers.toast('请勾选一条规则后编辑'); return; }
    this.openRuleModal('edit', checked[0].dataset.key);
  },
  /* 删除:勾选渠道规则,二次确认;默认规则不可删除 */
  deleteChecked() {
    const checked = Array.from(document.querySelectorAll('.rep-rule-chk:checked'));
    if (checked.length === 0) { Helpers.toast('请勾选要删除的规则'); return; }
    const keys = checked.map(c => c.dataset.key);
    if (keys.includes('default')) { Helpers.toast('默认规则不可删除'); return; }
    if (!confirm(`确定删除选中的 ${keys.length} 条渠道配置?删除后对应渠道按默认规则份数带出`)) return;
    repSettings.rules = repSettings.rules.filter(r => !keys.includes(r.key));
    this.refreshSettings();
    Helpers.toast(`已删除 ${keys.length} 条渠道配置(演示)`);
  },
  /* 重渲染设置区 */
  refreshSettings() {
    const wrap = document.querySelector('[data-section="setting"]');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="rep-setting-tip">
        仅作用于<b>尾程面单</b>:打印时按订单渠道命中渠道规则带出份数,未命中按默认份数;带出后支持手动修改。
      </div>
      <div class="grid-toolbar">
        <button class="btn btn--primary" onclick="RepPage.openRuleModal('new')">＋ 新增渠道配置</button>
        <button class="btn" onclick="RepPage.editChecked()">✎ 编辑</button>
        <button class="btn" onclick="RepPage.deleteChecked()">🗑 删除</button>
        <span class="sep"></span>
        <span style="color:#888;line-height:24px;font-size:11px;">默认规则不可删除;渠道规则可删除</span>
      </div>
      ${settingsTable()}
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
