/* ============================================
   label-reprint.js — PDA 箱标补打页
   依据:线上 code/pda/app/page/ccos/labelReprint/LabelReprint.tsx(2026-08 核对)
     · 表单四行:面单类型(尾程运单号/头程YT面单) / 打印类型(整单/子单)
       / 打印份数 / 扫描单号+打印按钮
     · 打印份数支持模式选择(需求 0811):根据配置(默认,不展示输入,后台按渠道带出)
       / 手动输入(选中才显示输入框,1~10 正整数)—— 与 PC 端交互一致
     · 记录卡片:单号 + 异常红字(失败)+ 销售产品/服务渠道/打印类型/打印张数
     · 反馈对齐线上:成功静默插卡(提示音)、失败行内红字,不弹结果框
     · 防重锁:同单重复打印弹提示拦截(线上 isLabelReprintDuplicateLocked)
   ============================================ */

/* ---- 演示 mock ---- */
/* 打印设置(与 PC 端同一份配置的演示子集:命中渠道规则份数,未命中默认 2) */
const LR_CONFIG = { rules: [{ channels: ['美森正班', '美森加班'], copies: 3 }, { channels: ['以星EXX'], copies: 1 }], defaultCopies: 2 };
function lrCopiesFromConfig(channel) {
  const r = LR_CONFIG.rules.find(x => x.channels.includes(channel));
  return r ? r.copies : LR_CONFIG.defaultCopies;
}
/* 整单打印箱数(演示:按单号 hash 2~4 箱) */
function lrBoxCount(no) {
  let h = 0; for (let i = 0; i < no.length; i++) h = (h + no.charCodeAt(i)) % 100;
  return 2 + (h % 3);
}

/* 运行态 */
let lrLabelType = '';      /* ''=未选 / '尾程运单号' / '头程YT面单' */
let lrPrintType = '';      /* ''=未选 / '子单打印' / '整单打印' */
let lrCopiesMode = 'config'; /* config=根据配置(默认) / manual=手动输入 */
let lrRecords = [];        /* 扫描记录 {scanCode, ok, message, productCnName, channelCnName, printType, printNumber, time} */
let lrPrintedKeys = new Set(); /* 防重锁:已打印单号(演示会话级) */

/* ---- 渲染 ---- */
function lrFormHTML() {
  const typeRow = (id, label, val, placeholder) => `
    <div class="lr-row" onclick="LRPage.openPicker('${id}')">
      <span class="lr-label">${label}</span>
      <span class="lr-value ${val ? '' : 'lr-value--ph'}">${val || placeholder}</span>
      <span class="lr-arrow">▸</span>
    </div>`;
  return `
    <div class="lr-form">
      ${typeRow('labelType', '面单类型', lrLabelType, '请选择面单类型')}
      ${typeRow('printType', '打印类型', lrPrintType, '请选择打印类型')}
      <div class="lr-row">
        <span class="lr-label">打印份数</span>
        <div class="lr-copies-mode">
          <label class="lr-mode-opt ${lrCopiesMode === 'config' ? 'is-on' : ''}" onclick="LRPage.setMode('config')">
            <i></i>根据配置
          </label>
          <label class="lr-mode-opt ${lrCopiesMode === 'manual' ? 'is-on' : ''}" onclick="LRPage.setMode('manual')">
            <i></i>手动输入
          </label>
          <input type="number" min="1" max="10" value="1" id="lrCopies" class="lr-copies-ipt"
                 ${lrCopiesMode === 'manual' ? '' : 'style="display:none;"'} />
          <span class="lr-copies-unit" ${lrCopiesMode === 'manual' ? '' : 'style="display:none;"'}>份</span>
        </div>
      </div>
      <div class="lr-row">
        <span class="lr-label">扫描单号</span>
        <input type="text" id="lrScan" class="lr-scan-ipt" placeholder="扫描/输入单号"
               onkeydown="LRPage.onScanKey(event)" />
        <button class="lr-print-btn" onclick="LRPage.doPrint()">打印</button>
      </div>
    </div>
  `;
}

function lrRecordHTML(r) {
  return `
    <div class="lr-record ${r.ok ? '' : 'lr-record--fail'}">
      <div class="lr-record-head">
        <span class="lr-record-icon">📦</span>
        <span class="lr-record-no">${r.scanCode}</span>
      </div>
      ${r.message ? `<div class="lr-record-msg">异常：${r.message}</div>` : ''}
      <div class="lr-record-kv"><span>销售产品</span><b>${r.productCnName}</b></div>
      <div class="lr-record-kv"><span>服务渠道</span><b>${r.channelCnName}</b></div>
      <div class="lr-record-kv"><span>打印类型</span><b>${r.printType}</b></div>
      <div class="lr-record-kv"><span>打印张数</span><b>${r.printNumber}</b></div>
    </div>
  `;
}

function lrListHTML() {
  if (lrRecords.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无记录</div>
      </div>`;
  }
  return `
    <div class="lr-records">
      ${lrRecords.map(lrRecordHTML).join('')}
    </div>`;
}

function lrRender() {
  document.getElementById('lrFormBox').innerHTML = lrFormHTML();
  document.getElementById('lrListBox').innerHTML = lrListHTML();
  document.getElementById('lrCount').textContent = `(${lrRecords.length})`;
}

/* ---- 页面逻辑 ---- */
const LRPage = {
  /* 类型选择弹层(面单类型/打印类型共用) */
  openPicker(kind) {
    const opts = kind === 'labelType'
      ? ['尾程运单号', '头程YT面单']
      : ['整单打印', '子单打印'];
    const title = kind === 'labelType' ? '面单类型' : '打印类型';
    document.getElementById('lrPicker').innerHTML = `
      <div class="lr-picker-mask" onclick="LRPage.closePicker()"></div>
      <div class="lr-picker">
        <div class="lr-picker-title">${title}</div>
        ${opts.map(o => `
          <div class="lr-picker-opt ${((kind === 'labelType' ? lrLabelType : lrPrintType) === o) ? 'is-on' : ''}"
               onclick="LRPage.pick('${kind}', '${o}')">
            <span>${o}</span><i></i>
          </div>`).join('')}
      </div>`;
    document.getElementById('lrPicker').classList.add('is-open');
  },
  closePicker() { document.getElementById('lrPicker').classList.remove('is-open'); },
  pick(kind, val) {
    if (kind === 'labelType') lrLabelType = val; else lrPrintType = val;
    this.closePicker();
    lrRender();
  },
  /* 份数模式:config=根据配置(后台带出,不展示输入);manual=显示输入框 */
  setMode(m) {
    lrCopiesMode = m;
    lrRender();
    const ipt = document.getElementById('lrScan');
    if (m === 'manual') document.getElementById('lrCopies').focus();
    else if (ipt) ipt.focus();
  },
  onScanKey(e) {
    if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); this.doPrint(); }
  },
  doPrint() {
    const ipt = document.getElementById('lrScan');
    const code = (ipt.value || '').trim();
    if (!lrLabelType) { Helpers.toast('请选择面单类型'); return; }
    if (!lrPrintType) { Helpers.toast('请选择打印类型'); return; }
    if (!code) { Helpers.toast('请输入有效单号'); ipt.focus(); return; }
    /* 防重锁:同单重复打印拦截(对齐线上 isLabelReprintDuplicateLocked) */
    if (lrPrintedKeys.has(code)) {
      Helpers.toast(`${code} 已打印，请勿重复打印`);
      return;
    }
    /* 份数:根据配置→渠道命中带出(演示渠道=美森正班);手动→输入值(1~10 校验) */
    let copies;
    if (lrCopiesMode === 'config') {
      copies = lrCopiesFromConfig('美森正班');
    } else {
      copies = parseInt(document.getElementById('lrCopies').value, 10);
      if (!copies || copies < 1 || copies > 10) { Helpers.toast('打印份数须为 1~10 的正整数'); return; }
    }
    const boxes = lrPrintType === '整单打印' ? lrBoxCount(code) : 1;
    const total = copies * boxes;

    /* 演示结果:90% 成功,10% 失败(订单不存在) */
    const ok = Math.random() > 0.1;
    lrRecords.unshift({
      scanCode: code,
      ok,
      message: ok ? '' : '订单不存在',
      productCnName: ok ? '美森快船-普货' : '-',
      channelCnName: ok ? '美森正班' : '-',
      printType: lrPrintType,
      printNumber: ok ? String(total) : String(copies),
    });
    if (ok) lrPrintedKeys.add(code);
    lrRender();
    ipt.value = '';
    ipt.focus();
    /* 反馈对齐线上:成功/失败不弹结果框,信息在记录卡片(失败红字) */
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('箱标补打')}

  <div class="scroll-area">
    <div id="lrFormBox">${lrFormHTML()}</div>

    <div class="records-title">扫描记录 <span class="records-count" id="lrCount">(0)</span></div>
    <div id="lrListBox">${lrListHTML()}</div>
  </div>

  <!-- 类型选择弹层(面单类型/打印类型共用) -->
  <div class="lr-picker-wrap" id="lrPicker"></div>
`);

/* 启动时钟 */
Helpers.startClock();
