/* ============================================
   vas-detail.js — 增值服务详情页(子单粒度)
   列表卡片点击进入:展示该子单的单号信息 + 增值服务清单
   1:1 复刻系统截图:朴素白底、黑字灰值、增值行右挂状态箭头
   ============================================ */

/* ---- 演示数据(与 b2b-workbench.js 的 vas 任务保持一致) ----
   真实环境改为接口查询;此处按 URL 的 subNo 匹配演示数据,无匹配则用默认。 */
const VAS_DETAIL_DATA = [
  { subNo: 'YTZ526723600100117', mainNo: 'YTZ5267236001001', sortCode: 'A-03-02-05',
    vasItems: [
      { name: '贴外箱标', status: 'done' },
      { name: '换箱',     status: 'todo' },
      { name: '复核尺寸', status: 'todo' },
      { name: '复核重量', status: 'todo' },
    ] },
  { subNo: 'YTZ526723600100208', mainNo: 'YTZ5267236001002', sortCode: 'A-11-03-04',
    vasItems: [
      { name: '贴内件标', status: 'done' },
      { name: '清点拍照', status: 'done' },
      { name: '复核尺寸', status: 'todo' },
    ] },
  { subNo: 'YTZ526723600100315', mainNo: 'YTZ5267236001003', sortCode: 'C-07-02-09',
    vasItems: [
      { name: '换箱',     status: 'done' },
      { name: '贴外箱标', status: 'done' },
      { name: '复核重量', status: 'done' },
    ] },
];

// 从 URL ?sub=XXX 读取子单号(列表点击跳转时传入)
function getSubFromUrl() {
  const m = new URLSearchParams(location.search).get('sub');
  return m || '';
}

// 状态文案(忠实原图:未完成 / 已完成)
function statusText(s) { return s === 'done' ? '已完成' : '未完成'; }

// 渲染
const subNo = getSubFromUrl();
const detail = VAS_DETAIL_DATA.find(d => d.subNo === subNo) || VAS_DETAIL_DATA[0];

document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('增值服务')}

  <!-- 单号信息区(白卡片,黑字灰值,标签:值 单行) -->
  <div class="vasd-info">
    <div class="vasd-info-row"><span class="vasd-label">单号:</span><span class="vasd-value">${detail.subNo}</span></div>
    <div class="vasd-info-row"><span class="vasd-label">主单号:</span><span class="vasd-value">${detail.mainNo}</span></div>
    <div class="vasd-info-row"><span class="vasd-label">分拣码:</span><span class="vasd-value">${detail.sortCode}</span></div>
  </div>

  <!-- 增值服务清单(每行:服务名 + 状态+箭头) -->
  <div class="vasd-list">
    ${detail.vasItems.map(v => `
      <div class="vasd-row" data-name="${v.name}">
        <span class="vasd-name">${v.name}</span>
        <span class="vasd-status ${v.status === 'done' ? 'vasd-status--done' : 'vasd-status--todo'}">
          ${statusText(v.status)} <span class="vasd-arrow">›</span>
        </span>
      </div>
    `).join('')}
  </div>
`);

Helpers.startClock();

/* ---- 增值服务行点击 → 跳操作页 ----
   已支持的操作页:复核尺寸(size)/ 复核重量(weight);
   其他服务(贴标/换箱等)暂未建操作页,toast 提示。 */
const OP_TYPE_MAP = { '复核尺寸': 'size', '复核重量': 'weight' };

document.querySelector('.vasd-list').addEventListener('click', e => {
  const row = e.target.closest('.vasd-row');
  if (!row) return;
  const opType = OP_TYPE_MAP[row.dataset.name];
  if (!opType) {
    Helpers.toast(`${row.dataset.name} · 操作页待建`);
    return;
  }
  location.href = `./vas-operate.html?type=${opType}&sub=${encodeURIComponent(detail.subNo)}`;
});
