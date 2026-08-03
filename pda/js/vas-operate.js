/* ============================================
   vas-operate.js — 增值服务操作页(复核尺寸 / 复核重量)
   由 vas-detail.html 的增值服务行点击进入
   URL:?type=size|weight&sub=XXX
   单页动态:type 决定输入区(长宽高 / 重量),其余共用
   ============================================ */

/* ---- 演示数据(与 vas-detail.js 一致的单号信息 + 复核任务配置) ----
   复核任务的「抽取方式 / 需复核箱数 / 已复核箱数」是主单维度;
   「原尺寸 / 原重量」是当前子单维度(签入时数据)。 */
const VAS_OP_DATA = [
  { subNo: 'YTZ526723600100117', mainNo: 'YTZ5267236001001', sortCode: 'A-03-02-05',
    size:  { sample: 'ratio',   need: 5, done: 2, origin: { l: 40, w: 30, h: 25 } },
    weight:{ sample: 'assign',  need: 3, done: 1, origin: { w: 8.50 } } },
  { subNo: 'YTZ526723600100208', mainNo: 'YTZ5267236001002', sortCode: 'A-11-03-04',
    size:  { sample: 'assign',  need: 4, done: 4, origin: { l: 35, w: 35, h: 20 } },
    weight:{ sample: 'ratio',   need: 6, done: 3, origin: { w: 12.30 } } },
  { subNo: 'YTZ526723600100315', mainNo: 'YTZ5267236001003', sortCode: 'C-07-02-09',
    size:  { sample: 'ratio',   need: 8, done: 8, origin: { l: 50, w: 40, h: 30 } },
    weight:{ sample: 'assign',  need: 2, done: 2, origin: { w: 15.80 } } },
];
const SAMPLE_TEXT = { ratio: '比例抽取', assign: '指定子单' };

const params = new URLSearchParams(location.search);
const type = params.get('type') || 'size';                          // size | weight
const subNo = params.get('sub') || '';
const opName = type === 'weight' ? '复核重量' : '复核尺寸';
const detail = VAS_OP_DATA.find(d => d.subNo === subNo) || VAS_OP_DATA[0];
const task = detail[type];                                          // 当前类型的复核任务配置

/* ---- 原数据 + 差值计算(尺寸=体积,重量=重量) ---- */
function originVolume(o) { return Math.round(o.l * o.w * o.h); }     // cm³,整数
function fmtDiff(diff, unit) {
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff} ${unit}`;
}

/* ---- 主单维度信息:抽取方式 / 复核进度(与主单号同为 label:value 单行) ---- */
function renderTaskBar() {
  return `
    <div class="vasd-info-row"><span class="vasd-label">抽取方式:</span><span class="vasd-value">${SAMPLE_TEXT[task.sample]}</span></div>
    <div class="vasd-info-row"><span class="vasd-label">复核进度:</span><span class="vasd-value ${task.done >= task.need ? 'vasop-taskbar-value--done' : 'vasop-taskbar-value--todo'}">${task.done}<span class="vasop-taskbar-sep">/</span>${task.need}</span></div>
  `;
}

/* ---- 原数据行(整行,置于标题行上方) ---- */
function renderOrigin() {
  if (type === 'weight') {
    return `
      <div class="vasop-origin-line">
        <span class="vasop-origin-label">原重量:</span>
        <span class="vasop-origin-value">${task.origin.w.toFixed(2)} <em>kg</em></span>
      </div>
    `;
  }
  const o = task.origin;
  return `
    <div class="vasop-origin-line">
      <span class="vasop-origin-label">原尺寸:</span>
      <span class="vasop-origin-value">${o.l}×${o.w}×${o.h} <em>cm</em><span class="vasop-origin-vol"><span class="vasop-origin-op">=</span><span class="vasop-origin-volval">${originVolume(o).toLocaleString()} <em>cm³</em></span></span></span>
    </div>
  `;
}

/* ---- 差异行(置于输入框下方,随输入实时更新) ---- */
function renderDiff() {
  const label = type === 'weight' ? '重量差异' : '体积差异';
  return `
    <div class="vasop-diff-line">
      <span class="vasop-diff-label">${label}</span>
      <span class="vasop-diff-value" id="diffValue">—</span>
    </div>
  `;
}

/* ---- 动态输入区:size=长/宽/高,weight=重量(+连接电子秤) ---- */
function renderInputArea() {
  if (type === 'weight') {
    return `
      <div class="vasop-field">
        <div class="vasop-field-head">
          <label class="vasop-field-label"><span class="vasop-req">*</span>复核重量</label>
          <button class="vasop-scale-btn" id="scaleBtn">连接电子秤</button>
        </div>
        <div class="vasop-input-wrap">
          <input type="text" class="vasop-input" id="weightVal" inputmode="decimal"
                 placeholder="连接电子秤或手动输入" autocomplete="off" />
          <span class="vasop-unit">kg</span>
        </div>
      </div>
    `;
  }
  const o = task.origin;
  return `
    <div class="vasop-fields-row">
      <div class="vasop-field vasop-field--third">
        <div class="vasop-input-wrap">
          <input type="text" class="vasop-input" id="lenVal" inputmode="decimal" placeholder="长" autocomplete="off" />
          <span class="vasop-unit">cm</span>
        </div>
      </div>
      <div class="vasop-field vasop-field--third">
        <div class="vasop-input-wrap">
          <input type="text" class="vasop-input" id="widVal" inputmode="decimal" placeholder="宽" autocomplete="off" />
          <span class="vasop-unit">cm</span>
        </div>
      </div>
      <div class="vasop-field vasop-field--third">
        <div class="vasop-input-wrap">
          <input type="text" class="vasop-input" id="hgtVal" inputmode="decimal" placeholder="高" autocomplete="off" />
          <span class="vasop-unit">cm</span>
        </div>
      </div>
    </div>
  `;
}

document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar(opName)}

  <!-- 可滚动主内容区 -->
  <div class="vasop-body">

    <!-- 子单号独立卡片:单行展示(标签 + 大字号单号 + 扫描按钮) -->
    <div class="vasd-subcard">
      <span class="vasd-subcard-label">子单号</span>
      <span class="vasd-subcard-no">${detail.subNo}</span>
      <button class="vasd-scan-btn" id="scanBtn" aria-label="扫描子单号">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      </button>
    </div>

    <!-- 主单号信息区:主单号 + 抽取方式 / 复核进度(均为主单维度) -->
    <div class="vasd-info">
      <div class="vasd-info-row"><span class="vasd-label">主单号:</span><span class="vasd-value">${detail.mainNo}</span></div>
      ${renderTaskBar()}
    </div>

    <!-- 复核录入:原数据行 → (尺寸:标题行含新体积) → 输入框 → 差异行 -->
    <div class="vasop-section">
      ${renderOrigin()}
      ${type === 'size' ? `
      <div class="vasop-title-line">
        <span class="vasop-title-text"><span class="vasop-req">*</span>${opName}:</span>
        <span class="vasop-new-value" id="newValue">—</span>
      </div>` : ''}
      ${renderInputArea()}
      ${renderDiff()}
    </div>

    <!-- 照片上传区 -->
    <div class="vasop-section">
      <div class="vasop-section-title"><span class="vasop-req">*</span>复核照片</div>
      <div class="vasop-upload" id="uploadArea">
        <div class="vasop-upload-box" id="uploadBox">
          <span class="vasop-upload-plus">+</span>
          <span class="vasop-upload-text">上传照片</span>
        </div>
      </div>
    </div>

  </div>

  <!-- 底部操作栏(留在 flex 流末尾,不脱离设备外壳) -->
  <div class="vasop-bar">
    <button class="vasop-confirm" id="confirmBtn">复核确认</button>
  </div>
`);

Helpers.startClock();

/* ---- 扫描图标按钮(原型:触发扫一扫提示) ---- */
const scanBtn = document.getElementById('scanBtn');
if (scanBtn) {
  scanBtn.addEventListener('click', () => {
    Helpers.toast('请扫描子单号条码');
  });
}

/* ---- 对照行实时计算:更新"新"格 + "差异"格 ---- */
const newValueEl = document.getElementById('newValue');
const diffValueEl = document.getElementById('diffValue');
function num(id) { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; }

function recalcDiff() {
  let newVal, diff, unit;
  if (type === 'weight') {
    const nw = num('weightVal');
    if (nw === null) { if (newValueEl) newValueEl.textContent = '—'; diffValueEl.textContent = '—'; diffValueEl.className = 'vasop-diff-value'; return; }
    newVal = nw.toFixed(2);
    diff = +(nw - task.origin.w).toFixed(2);     // 重量差异 = 复核重量 - 原重量
    unit = 'kg';
  } else {
    const l = num('lenVal'), w = num('widVal'), h = num('hgtVal');
    if (l === null || w === null || h === null) { if (newValueEl) newValueEl.textContent = '—'; diffValueEl.textContent = '—'; diffValueEl.className = 'vasop-diff-value'; return; }
    const newVol = Math.round(l * w * h);
    newVal = newVol.toLocaleString();
    diff = newVol - originVolume(task.origin);   // 体积差异 = 复核体积 - 原体积
    unit = 'cm³';
  }
  // 标题行新体积/重量(仅尺寸面板有该回显元素)
  if (newValueEl) newValueEl.textContent = `${newVal} ${unit}`;
  // 差异行:只显示 ±差值 + 单位
  diffValueEl.textContent = fmtDiff(diff, unit);
  // 着色:正=红(多了),负=绿(少了),0=灰
  diffValueEl.className = 'vasop-diff-value' +
    (diff > 0 ? ' vasop-diff-value--up' : diff < 0 ? ' vasop-diff-value--down' : '');
}
/* 输入框:实时算差异 + 回车跳到下一格(长→宽→高,最后一格回车收起键盘) */
const NEXT_MAP = { lenVal: 'widVal', widVal: 'hgtVal' };
['lenVal', 'widVal', 'hgtVal', 'weightVal'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', recalcDiff);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = NEXT_MAP[id];
      const nextEl = next && document.getElementById(next);
      if (nextEl) nextEl.focus();
      else el.blur();          // 最后一格回车收起键盘
    }
  });
});

/* ---- 照片上传(原型:点击切占位图) ---- */
document.getElementById('uploadBox').addEventListener('click', e => {
  const box = e.currentTarget;
  if (box.classList.contains('vasop-upload-box--filled')) return;
  box.classList.add('vasop-upload-box--filled');
  box.innerHTML = '<span class="vasop-upload-done">📷 已上传</span><span class="vasop-upload-replace">点击替换</span>';
});

/* ---- 电子秤按钮(原型:填入随机重量并触发差值计算) ---- */
const scaleBtn = document.getElementById('scaleBtn');
if (scaleBtn) {
  scaleBtn.addEventListener('click', () => {
    const w = (Math.random() * 4 - 2 + task.origin.w).toFixed(2);   // 在原重量附近浮动
    document.getElementById('weightVal').value = w;
    recalcDiff();
    Helpers.toast('已读取电子秤数据');
  });
}

/* ---- 复核确认:toast + 返回 ---- */
document.getElementById('confirmBtn').addEventListener('click', () => {
  Helpers.toast(`${opName}已完成`);
  setTimeout(() => history.back(), 800);
});
