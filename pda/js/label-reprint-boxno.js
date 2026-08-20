/* ============================================
   label-reprint-boxno.js — PDA 箱标补打·扫箱号 方案原型
   依据:线上 code/pda/app/page/ccos/labelReprint/LabelReprint.tsx(2026-08 核对)
   需求:CCOS箱标补打功能需支持扫箱号打印(recvsyfSfN8xG2)
     场景:shein 货贴自有箱唛、不贴 YT 箱标;箱唛破损无法扫描时,
     用客户预报箱号(ord_child_order_info.box_number)当键值补打头程 YT 面单。
   代码事实(服务端 V1.2.7 p967_1505 已落地,PC/PDA 共用):
     子单/整单扫码查询 UNION ALL 四级优先:
     child_number(P1) / bcoi.child_track_number(P2) / oco.child_track_number(P3) / box_number(P4)
   本原型演示改动点(查询条件扩展,非新入口):
     ① 扫码框支持箱号,提示文案标注;② 记录卡片回显"扫描号(箱号)→匹配子单号";
     ③ 箱号命中多单时"重单"提示(建议补强,现状子单分支静默取第一条);
     ④ 面单类型默认"头程YT面单"(shein 场景打 YT 箱标)。
   ============================================ */

/* ---- 演示 mock(预报箱号格式以客户实际预报为准,以下为示意数据) ---- */
/* 演示主单:YT2621601300301272(取自 0811 需求文档造数示例,16 位真实格式) */
const BX_MOCK = {
  master: 'YT2621601300301272',
  /* box_number -> 子单映射(模拟预报带箱号的数据) */
  boxMap: {
    'SHEIN2608001': { child: 'YT2621601300301272U001', product: '美森快船-普货', channel: '美森正班' },
    'SHEIN2608002': { child: 'YT2621601300301272U002', product: '美森快船-普货', channel: '美森正班' },
  },
  /* 同一箱号被多个订单预报占用 → 演示"重单"提示 */
  dupBoxes: ['SHEIN2608003'],
  /* 支持的扫码键值(与线上 GetChildOrderInfo 四级口径一致) */
  childMap: {
    'YT2621601300301272U001': { child: 'YT2621601300301272U001', product: '美森快船-普货', channel: '美森正班' },
    'YT2621601300301272U002': { child: 'YT2621601300301272U002', product: '美森快船-普货', channel: '美森正班' },
  },
};

/* 运行态 */
let bxLabelType = '头程YT面单';   /* shein 场景默认头程(打 YT 箱标) */
let bxPrintType = '子单打印';
let bxRecords = [];               /* {scanCode, scanKind, matched, ok, message, product, channel, printType, copies, time} */
let bxPrintedKeys = new Set();    /* 会话级防重(对齐线上) */

/* ---- 匹配逻辑(模拟服务端 UNION ALL 优先级) ---- */
function bxMatch(code) {
  if (BX_MOCK.childMap[code]) return { ...BX_MOCK.childMap[code], kind: '子单号' };
  if (BX_MOCK.boxMap[code]) return { ...BX_MOCK.boxMap[code], kind: '箱号' };
  return null;
}

/* ---- 渲染 ---- */
function bxFormHTML() {
  return `
    <div class="lr-form">
      <div class="lr-row" onclick="BXPage.openPicker('labelType')">
        <span class="lr-label">面单类型</span>
        <span class="lr-value">${bxLabelType}</span>
        <span class="lr-arrow">▸</span>
      </div>
      <div class="lr-row" onclick="BXPage.openPicker('printType')">
        <span class="lr-label">打印类型</span>
        <span class="lr-value">${bxPrintType}</span>
        <span class="lr-arrow">▸</span>
      </div>
      <div class="lr-row">
        <span class="lr-label">扫描单号</span>
        <input type="text" id="bxScan" class="lr-scan-ipt" placeholder="扫描/输入 单号/箱号"
               onkeydown="BXPage.onScanKey(event)" />
        <button class="lr-print-btn" onclick="BXPage.doPrint()">打印</button>
      </div>
      <div class="bx-scan-tip">支持:主单号 / 子单号 / 子单跟踪号 / <b>客户箱号</b>(预报箱号)</div>
    </div>`;
}

function bxRecordHTML(r) {
  return `
    <div class="lr-record ${r.ok ? '' : 'lr-record--fail'}">
      <div class="lr-record-head">
        <span class="lr-record-icon">📦</span>
        <span class="lr-record-no">${r.scanCode}</span>
        ${r.scanKind ? `<span class="bx-match">${r.scanKind}</span>` : ''}
      </div>
      ${r.message ? `<div class="lr-record-msg">异常：${r.message}</div>` : ''}
      ${r.ok ? `
        <div class="bx-record-kv"><span>匹配子单号</span><b>${r.matched}</b></div>
        <div class="bx-record-arrow">↓ 按匹配子单号打印头程YT面单</div>
        <div class="lr-record-kv"><span>销售产品</span><b>${r.product}</b></div>
        <div class="lr-record-kv"><span>服务渠道</span><b>${r.channel}</b></div>
        <div class="lr-record-kv"><span>打印类型</span><b>${r.printType}</b></div>
        <div class="lr-record-kv"><span>打印张数</span><b>${r.copies}</b></div>` : ''}
    </div>`;
}

function bxListHTML() {
  if (bxRecords.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无记录<br/>试扫演示箱号:SHEIN2608001</div>
      </div>`;
  }
  return `<div class="lr-records">${bxRecords.map(bxRecordHTML).join('')}</div>`;
}

function bxRender() {
  document.getElementById('bxFormBox').innerHTML = bxFormHTML();
  document.getElementById('bxListBox').innerHTML = bxListHTML();
  document.getElementById('bxCount').textContent = `(${bxRecords.length})`;
}

/* ---- 页面逻辑 ---- */
const BXPage = {
  openPicker(kind) {
    const opts = kind === 'labelType' ? ['尾程运单号', '头程YT面单'] : ['整单打印', '子单打印'];
    const title = kind === 'labelType' ? '面单类型' : '打印类型';
    const cur = kind === 'labelType' ? bxLabelType : bxPrintType;
    document.getElementById('bxPicker').innerHTML = `
      <div class="lr-picker-mask" onclick="BXPage.closePicker()"></div>
      <div class="lr-picker">
        <div class="lr-picker-title">${title}</div>
        ${opts.map(o => `
          <div class="lr-picker-opt ${cur === o ? 'is-on' : ''}" onclick="BXPage.pick('${kind}', '${o}')">
            <span>${o}</span><i></i>
          </div>`).join('')}
      </div>`;
    document.getElementById('bxPicker').classList.add('is-open');
  },
  closePicker() { document.getElementById('bxPicker').classList.remove('is-open'); },
  pick(kind, val) {
    if (kind === 'labelType') bxLabelType = val; else bxPrintType = val;
    this.closePicker();
    bxRender();
  },
  onScanKey(e) {
    if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); this.doPrint(); }
  },
  doPrint() {
    const ipt = document.getElementById('bxScan');
    const code = (ipt.value || '').trim();
    if (!code) { Helpers.toast('请输入有效单号/箱号'); ipt.focus(); return; }

    /* 防重锁(对齐线上会话级防重) */
    if (bxPrintedKeys.has(code)) { Helpers.toast(`${code} 已打印,请勿重复打印`); return; }

    /* 重单防呆(建议补强):客户箱号无唯一约束,跨单重复时提示换号,不静默打第一条 */
    if (BX_MOCK.dupBoxes.includes(code)) {
      bxRecords.unshift({ scanCode: code, scanKind: '箱号', ok: false, message: '该箱号命中多个订单,请改用子单号或主单号' });
      bxRender(); ipt.value = ''; ipt.focus();
      return;
    }

    /* 四级口径匹配(P1子单号…P4箱号,演示子单号/箱号两级) */
    const m = bxMatch(code);
    if (!m) {
      bxRecords.unshift({ scanCode: code, ok: false, message: '订单不存在(该箱号无预报数据,请核对预报是否带箱号)' });
      bxRender(); ipt.value = ''; ipt.focus();
      return;
    }

    bxRecords.unshift({
      scanCode: code,
      scanKind: m.kind,
      matched: m.child,
      ok: true,
      message: '',
      product: m.product,
      channel: m.channel,
      printType: bxPrintType,
      copies: '1',
      time: Helpers.nowTime(),
    });
    bxPrintedKeys.add(code);
    bxRender();
    ipt.value = '';
    ipt.focus();
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('箱标补打')}

  <div class="bx-demo-tip">
    <b>方案原型</b> · 箱标补打支持扫箱号(shein 箱唛破损场景):服务端四级匹配口径(P1子单号/P2·P3子单跟踪号/P4客户箱号)已存在,本原型演示扫码框支持箱号 + 记录回显匹配子单号 + 重单防呆。演示数据:SHEIN2608001 / 02(命中)、SHEIN2608003(重单)、SHEIN2608009(无预报箱号)。
  </div>

  <div class="scroll-area">
    <div id="bxFormBox">${bxFormHTML()}</div>

    <div class="records-title">扫描记录 <span class="records-count" id="bxCount">(0)</span></div>
    <div id="bxListBox">${bxListHTML()}</div>
  </div>

  <!-- 类型选择弹层 -->
  <div class="lr-picker-wrap" id="bxPicker"></div>
`);

/* 启动时钟 */
Helpers.startClock();
