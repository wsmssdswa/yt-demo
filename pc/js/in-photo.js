/* ============================================
   in-photo.js — 拍照记录上传页(按线上逻辑还原)
   依据:code/pc 生产源码
     · FrmPhotoUploadRecord.cs:查询条件 = 单号类型+单号(≤500)+创建时间(跨度≤30天);
       校验:单号超500 / 开始>结束 / 跨度>30天;无结果 toast"未查询到记录!"
     · PictureUploadRecordResponse([DataColumn] 10 列):主单号(0)/匹配子单号(1)/
       单号1~4(2-5)/图片名称(6)/图片地址(7,链接列)/状态(8)/提示信息(9)/上传时间(10)
     · 图片地址为链接列,点击弹 frmPictureViewer 查看大图(匹配失败的记录同样可查看)
     · 线上无勾选列(UsrTypedDataGridView 普通网格,无 checkbox)
   数据写入侧(FileUploadBusiness.cs,两条来源):
     · 墨家DWS设备上传:codes 前4个 → 单号1~4;ListChilds 反查子单:
       命中→成功(child_number=order_id 最大的子单);多子单→提示"匹配到多个子单信息";
       未命中→失败(child_number 为空,主单号联表也为空),提示"未匹配到子单信息"
     · PDA签入上传:固定成功,提示"PDA签入子单上传",单号1=子单号,其余为空
   ============================================ */

/* ---- 演示数据(10 行,覆盖线上全部记录形态) ---- */
const PHOTO_ROWS = [
  /* 一票多件:主单A 三箱,U001 有两张照片(同子单多图) */
  { waybill:'YT2621000070480962',      child:'YT2621000070480962U001', no1:'YT2621000070480962',      no2:'YT2621000070480962U001', no3:'', no4:'',
    imgName:'IMG_20260819_091512.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_091512.jpg',
    status:1, tip:'', upTime:'2026-08-19 09:15:14' },
  { waybill:'YT2621000070480962',      child:'YT2621000070480962U001', no1:'YT2621000070480962',      no2:'YT2621000070480962U001', no3:'', no4:'',
    imgName:'IMG_20260819_091515.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_091515.jpg',
    status:1, tip:'', upTime:'2026-08-19 09:15:17' },
  { waybill:'YT2621000070480962',      child:'YT2621000070480962U002', no1:'YT2621000070480962',      no2:'YT2621000070480962U002', no3:'', no4:'',
    imgName:'IMG_20260819_091602.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_091602.jpg',
    status:1, tip:'', upTime:'2026-08-19 09:16:05' },
  /* 成功但匹配到多个子单:child 取其中一个,提示红字 */
  { waybill:'YT2621000070480962',      child:'YT2621000070480962U003', no1:'YT2621000070480962U003',  no2:'YT2621601300301272U002', no3:'', no4:'',
    imgName:'IMG_20260819_092340.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_092340.jpg',
    status:1, tip:'匹配到多个子单信息', upTime:'2026-08-19 09:23:42' },
  /* 多码行:单号1~4 全有(主单/子单/平台单号/跟踪号) */
  { waybill:'YT2621601300301272',      child:'YT2621601300301272U001', no1:'YT2621601300301272',      no2:'YT2621601300301272U001', no3:'PH2608190000037', no4:'20260819100512336',
    imgName:'IMG_20260819_100512.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_100512.jpg',
    status:1, tip:'', upTime:'2026-08-19 10:05:14' },
  /* PDA 签入上传:单号1=子单号,其余空,固定成功 */
  { waybill:'YT2621601300301272',      child:'YT2621601300301272U002', no1:'YT2621601300301272U002',  no2:'', no3:'', no4:'',
    imgName:'PDA_20260819_104201.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/pda/2026/08/19/PDA_20260819_104201.jpg',
    status:1, tip:'PDA签入子单上传', upTime:'2026-08-19 10:42:03' },
  { waybill:'YT2621625400300033',      child:'YT2621625400300033U002', no1:'YT2621625400300033',      no2:'YT2621625400300033U002', no3:'', no4:'',
    imgName:'IMG_20260819_104033.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_104033.jpg',
    status:1, tip:'', upTime:'2026-08-19 10:40:35' },
  /* 匹配失败:child/主单号为空(联表联不上),单号1~4=设备扫描的原始码,照片仍可查看 */
  { waybill:'',                        child:'',                       no1:'FBA2608190012',           no2:'20260819114025681', no3:'', no4:'',
    imgName:'IMG_20260819_114021.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_114021.jpg',
    status:0, tip:'未匹配到子单信息', upTime:'2026-08-19 11:40:23' },
  { waybill:'',                        child:'',                       no1:'20260819115204473',       no2:'', no3:'', no4:'',
    imgName:'IMG_20260819_115207.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_115207.jpg',
    status:0, tip:'未匹配到子单信息', upTime:'2026-08-19 11:52:09' },
  { waybill:'YT2621601300101052',      child:'YT2621601300101052U001', no1:'YT2621601300101052',      no2:'YT2621601300101052U001', no3:'', no4:'',
    imgName:'IMG_20260820_083056.jpg', url:'https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/20/IMG_20260820_083056.jpg',
    status:1, tip:'', upTime:'2026-08-20 08:30:58' },
];

/* ---- 状态枚举 MatchStatusByFileOrder(0失败/1成功) ---- */
const PHOTO_STATUS = {
  0: { label: '失败', cls: 'check-status--fail' },
  1: { label: '成功', cls: 'check-status--ok' },
};

/* ---- 查询区(线上平铺:单号类型 + 单号 + 创建时间 + 查询,无折叠) ---- */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel" id="photoType">
            <option value="1" selected>匹配子单号</option>
            <option value="2">其他单号</option>
            <option value="3">运单号</option>
          </select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" id="photoCodes" rows="1" placeholder="批量查询,换行分隔,最多 500 个"></textarea>`, 'qf--waybill')}
        ${f('创建时间', `<span class="qf-range">
            <input class="ipt ipt--date" id="photoStart" value="2026-08-19 00:00:00" />
            <span class="qf-sep">~</span>
            <input class="ipt ipt--date" id="photoEnd" value="2026-08-20 23:59:59" />
          </span>`)}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="PhotoPage.doQuery()">🔍 查询</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 工具栏:导出图片按钮(需求新增,线上暂无) ---- */
function gridToolbar() {
  return `<div class="grid-toolbar"><button class="btn btn--primary" onclick="PhotoPage.openExport()">📷 导出图片</button></div>`;
}

/* ---- 数据表格(10 列,严格对应 PictureUploadRecordResponse 的 [DataColumn] 顺序;线上无勾选列) ---- */
const RENDER_CAP = 50;   /* 注入大量演示数据时,列表仅渲染前 50 行防卡顿 */
function buildRows(list) {
  if (list.length === 0) {
    return `<tr><td colspan="10" style="text-align:center;color:#999;padding:28px 0;">暂无数据</td></tr>`;
  }
  const cap = list.slice(0, RENDER_CAP);
  const html = cap.map((r, i) => {
    const st = PHOTO_STATUS[r.status] || { label: '', cls: '' };
    const shortUrl = r.url.replace('https://yt-ccos.oss-cn-shenzhen.aliyuncs.com', '…');
    const dash = '<span style="color:#bbb;">—</span>';
    return `
      <tr data-idx="${i}">
        <td class="col--num">${i + 1}</td>
        <td class="col--code cell-link" title="${r.waybill}">${r.waybill || dash}</td>
        <td class="col--code">${r.child || dash}</td>
        <td class="col--code">${r.no1 || dash}</td>
        <td class="col--code">${r.no2 || dash}</td>
        <td class="col--code">${r.no3 || dash}</td>
        <td class="col--code">${r.no4 || dash}</td>
        <td title="${r.imgName}">${r.imgName}</td>
        <td><a href="javascript:void(0)" class="cell-link" style="font-family:Consolas,monospace;" title="${r.url}" onclick="PhotoPage.preview(${i})">${shortUrl}</a></td>
        <td><span class="check-tag ${st.cls}">${st.label}</span></td>
        <td class="${r.tip && r.status === 0 ? 'check-err' : ''}">${r.tip || dash}</td>
        <td>${r.upTime}</td>
      </tr>`;
  }).join('');
  return list.length > RENDER_CAP
    ? html + `<tr><td colspan="10" style="text-align:center;color:#999;padding:10px 0;">(演示已注入 ${list.length} 条数据,列表仅展示前 ${RENDER_CAP} 条)</td></tr>`
    : html;
}

function gridTable(list) {
  return `
    <div class="grid-wrap photo-grid-wrap">
      <table class="grid photo-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:160px" />  <!-- 主单号 -->
          <col style="width:190px" />  <!-- 匹配子单号 -->
          <col style="width:150px" />  <!-- 单号1 -->
          <col style="width:150px" />  <!-- 单号2 -->
          <col style="width:130px" />  <!-- 单号3 -->
          <col style="width:130px" />  <!-- 单号4 -->
          <col style="width:180px" />  <!-- 图片名称 -->
          <col style="width:200px" />  <!-- 图片地址 -->
          <col style="width:60px" />   <!-- 状态 -->
          <col style="width:150px" />  <!-- 提示信息 -->
          <col style="width:140px" />  <!-- 上传时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>主单号</th>
            <th>匹配子单号</th>
            <th>单号1</th>
            <th>单号2</th>
            <th>单号3</th>
            <th>单号4</th>
            <th>图片名称</th>
            <th>图片地址</th>
            <th>状态</th>
            <th>提示信息</th>
            <th>上传时间</th>
          </tr>
        </thead>
        <tbody id="photoBody">${buildRows(list)}</tbody>
      </table>
    </div>
  `;
}

/* ---- 分页栏 ---- */
function pager(total) {
  return `
    <div class="pager">
      <button class="pg-btn" title="首页">«</button>
      <button class="pg-btn" title="上一页">‹</button>
      <button class="pg-btn" title="下一页">›</button>
      <button class="pg-btn" title="末页">»</button>
      <span class="pg-info">总记录数: <b id="pgTotal">${total}</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go">
        <input class="ipt" value="" />
        <button class="pg-btn">GO</button>
        <select class="sel"><option>50</option><option>100</option><option>200</option></select>
      </span>
    </div>
  `;
}

/* ---- 图片预览弹窗(对应线上 frmPictureViewer;匹配失败的记录同样可查看图片) ---- */
function previewModal(r) {
  return `
    <div class="rw-modal" id="photoModal">
      <div class="rw-modal-mask" onclick="PhotoPage.closePreview()"></div>
      <div class="rw-modal-panel" style="width:520px;">
        <div class="rw-modal-header">
          <span class="rw-modal-title">图片预览 — ${Helpers.esc(r.imgName || '')}</span>
          <span class="rw-modal-close" onclick="PhotoPage.closePreview()">✕</span>
        </div>
        <div class="rw-modal-body" style="text-align:center;">
          ${r.status === 0 ? `<div style="margin-bottom:8px;padding:4px 8px;background:#FFF1F0;border:1px solid #FFA39E;border-radius:3px;color:#CF1322;font-size:12px;">
            匹配失败:${Helpers.esc(r.tip)}(照片已上传,可正常查看)
          </div>` : ''}
          <div style="height:300px;display:flex;align-items:center;justify-content:center;background:#F0F2F5;border:1px dashed #C0C0C0;border-radius:4px;color:#888;">
            <div>
              <div style="font-size:48px;">🖼</div>
              <div style="margin-top:8px;font-family:Consolas,monospace;color:#555;word-break:break-all;max-width:440px;">${Helpers.esc(r.imgName || '')}</div>
              <div style="margin-top:4px;font-size:11px;color:#999;">(演示,实际展示照片大图)</div>
            </div>
          </div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="PhotoPage.closePreview()">关闭</button>
          <button class="btn btn--primary" onclick="Helpers.toast('下载图片(占位)')">下载</button>
        </div>
      </div>
    </div>
  `;
}

/* ---- 导出图片(需求新增交互,线上暂无) ----
   规则:导出当前查询结果;以匹配子单号命名(子单号.扩展名);
        全量导出,同一子单多张照片按上传先后命名:第一张原名,后续拼 -1、-2;
        匹配失败(无子单号)的记录跳过
   防呆两档(阈值可配置):
        ≤2000 张 → 正常导出
        >2000 张 → 拦截,提示缩小范围分批导出 ---- */
const EXPORT_LIMIT = 2000;  /* 单次导出硬上限(张),超过拦截 */

function buildExportPlan() {
  const rows = photoFiltered;
  const skipped = rows.filter(r => !r.child);
  /* 全量导出:按上传时间先后命名,同一子单第一张用原名,后续拼 -1、-2 */
  const withChild = rows.filter(r => r.child).slice()
    .sort((a, b) => Date.parse(a.upTime) - Date.parse(b.upTime));
  const seen = {};
  const files = withChild.map(r => {
    seen[r.child] = (seen[r.child] || 0) + 1;
    const ext = (r.imgName.match(/\.(\w+)$/) || [, 'jpg'])[1];
    const name = seen[r.child] === 1 ? `${r.child}.${ext}` : `${r.child}-${seen[r.child] - 1}.${ext}`;
    return { name, row: r };
  });
  const dupCount = files.length - Object.keys(seen).length;
  return { files, skipped, dupCount, total: rows.length };
}

function exportModal(plan) {
  const n = plan.files.length;
  const overLimit = n > EXPORT_LIMIT;
  const preview = plan.files.slice(0, 8).map(f =>
    `<div class="exp-file">📄 ${Helpers.esc(f.name)}</div>`).join('') +
    (n > 8 ? `<div class="exp-file" style="color:#999;">… 其余 ${n - 8} 个文件</div>` : '');
  return `
    <div class="rw-modal" id="expModal">
      <div class="rw-modal-mask" onclick="PhotoPage.closeExport()"></div>
      <div class="rw-modal-panel photo-export" style="width:520px;">
        <div class="rw-modal-header">
          <span class="rw-modal-title">导出图片</span>
          <span class="rw-modal-close" onclick="PhotoPage.closeExport()">✕</span>
        </div>
        <div class="rw-modal-body">
          <div class="exp-sum">
            <div>导出范围:当前查询结果 <b>${plan.total}</b> 条记录</div>
          </div>
          ${overLimit ? `
          <div class="exp-alert exp-alert--block">
            <b>本次导出共 ${n} 张,超过单次上限 ${EXPORT_LIMIT} 张,已拦截。</b><br/>
            请缩小查询范围(如按单号批量查询、缩短时间范围)后分批导出。
          </div>` : ''}
          <div class="exp-preview" style="${overLimit ? 'display:none;' : ''}">${preview || '<div style="color:#999;padding:8px 0;">当前结果无可导出图片</div>'}</div>
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="PhotoPage.closeExport()">取消</button>
          <button class="btn btn--primary" onclick="PhotoPage.startExport()" ${(n === 0 || overLimit) ? 'disabled' : ''}>开始导出</button>
        </div>
      </div>
    </div>
  `;
}

/* 导出进度弹窗:模态,进度走完后原地切换为结果内容 */
function exportProgressModal(plan) {
  return `
    <div class="rw-modal" id="expModal">
      <div class="rw-modal-mask"></div>
      <div class="rw-modal-panel photo-export" style="width:520px;">
        <div class="rw-modal-header">
          <span class="rw-modal-title">导出图片</span>
        </div>
        <div class="rw-modal-body" id="expBody">
          <div style="font-size:13px;margin-bottom:10px;">正在下载并打包图片… <b id="expPct">0%</b> <span style="color:#888;">(<span id="expNum">0 / ${plan.files.length}</span>)</span></div>
          <div class="exp-bar"><div class="exp-bar--in" id="expBarIn" style="width:0%"></div></div>
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑:查询过滤(带线上三条校验)/ 图片预览 ---- */
let photoFiltered = PHOTO_ROWS;   /* 当前展示的数据集 */
const PHOTO_ORIG = PHOTO_ROWS.slice();  /* 原始演示数据(演示面板重置用) */

/* ---- 演示面板:一键切换三种量级场景,演示导出弹窗的防呆提示 ---- */
function demoPanel() {
  return `
    <div class="photo-demo" id="photoDemo">
      <button class="photo-demo--fab" onclick="PhotoPage.toggleDemo()">🧪 演示</button>
      <div class="photo-demo--panel" id="photoDemoPanel" style="display:none;">
        <div class="photo-demo--title">演示场景(切换导出弹窗量级提示)</div>
        <button class="btn" onclick="PhotoPage.applyDemo('normal')">① 正常导出(原始 10 条/8 张)</button>
        <button class="btn" onclick="PhotoPage.applyDemo('many')">② 大数量正常导出(注入 800 条/800 张,2000 以内不拦截)</button>
        <button class="btn" onclick="PhotoPage.applyDemo('over')">③ 超量拦截(注入 30000 条/30000 张,超 2000 拦截)</button>
        <button class="btn" onclick="PhotoPage.applyDemo('fail')">④ 部分导出失败(8 张中 2 张下载失败)</button>
        <button class="btn" onclick="PhotoPage.applyDemo('reset')">↺ 重置恢复原始数据</button>
        <div class="photo-demo--tip">切换后自动弹出导出弹窗;重置仅还原数据不弹窗</div>
      </div>
    </div>
  `;
}

/* 生成注入数据:同子单多张(时间错开),子单号真实格式 */
function genDemoRows(count, perChild) {
  const base = 'YT2621000070480962';
  const rows = [];
  for (let i = 0; i < count; i++) {
    const seq = (i % perChild) + 1;
    const childIdx = Math.floor(i / perChild) + 1;
    const child = `${base}U${String(childIdx).padStart(3, '0')}`;
    const hh = String(8 + (i % 10)).padStart(2, '0');
    const mm = String(i % 60).padStart(2, '0');
    const ss = String((i * 7) % 60).padStart(2, '0');
    rows.push({
      waybill: base, child,
      no1: base, no2: child, no3: '', no4: '',
      imgName: `IMG_20260819_${hh}${mm}${ss}.jpg`,
      url: `https://yt-ccos.oss-cn-shenzhen.aliyuncs.com/dws/2026/08/19/IMG_20260819_${hh}${mm}${ss}.jpg`,
      status: 1, tip: '', upTime: `2026-08-19 ${hh}:${mm}:${ss}`,
    });
  }
  return rows;
}

const PhotoPage = {
  /* 查询:线上规则——传了单号则忽略时间;校验单号≤500、开始≤结束、跨度≤30天 */
  doQuery() {
    const codes = (document.getElementById('photoCodes').value || '')
      .split(/[\n,，\s]+/).map(s => s.trim()).filter(Boolean);
    const start = document.getElementById('photoStart').value.trim();
    const end = document.getElementById('photoEnd').value.trim();

    if (codes.length > 500) { Helpers.toast('单号不能超过500个！'); return; }
    const sd = Date.parse(start), ed = Date.parse(end);
    if (start && end && sd > ed) { Helpers.toast('开始时间不能大于结束时间！'); return; }
    if (start && end && (ed - sd) / 86400000 > 30) { Helpers.toast('查询范围不能超过30天！'); return; }

    let list;
    if (codes.length > 0) {
      /* 有单号:按单号类型精确匹配,忽略时间 */
      const type = document.getElementById('photoType').value;
      const hit = c => codes.includes(c);
      list = PHOTO_ROWS.filter(r => {
        if (type === '1') return hit(r.child);                                     /* 匹配子单号 */
        if (type === '3') return hit(r.waybill);                                   /* 运单号(主单) */
        return [r.no1, r.no2, r.no3, r.no4].some(hit);                             /* 其他单号:单号1~4 */
      });
    } else {
      /* 无单号:按创建时间过滤 */
      list = PHOTO_ROWS.filter(r => {
        const t = Date.parse(r.upTime);
        return (!start || t >= sd) && (!end || t <= ed);
      });
    }

    if (list.length === 0) Helpers.toast('未查询到记录！');
    photoFiltered = list;
    document.getElementById('photoBody').innerHTML = buildRows(list);
    document.getElementById('pgTotal').textContent = list.length;
  },

  /* 图片地址链接 → 弹窗预览(成功/失败均可查看) */
  preview(idx) {
    document.body.insertAdjacentHTML('beforeend', previewModal(photoFiltered[idx]));
  },
  closePreview() {
    const el = document.getElementById('photoModal');
    if (el) el.remove();
  },

  /* ---- 导出图片(需求新增;模态弹窗式:进度与结果都在弹窗内完成) ---- */
  exportTimer: null,
  lastPlan: null,       /* { plan, failed } 完成结果,复制失败单号用 */
  demoFail: false,      /* 演示面板场景④:模拟部分下载失败 */
  openExport() {
    document.body.insertAdjacentHTML('beforeend', exportModal(buildExportPlan()));
  },
  startExport() {
    const plan = buildExportPlan();
    const modal = document.getElementById('expModal');
    if (modal) modal.remove();
    document.body.insertAdjacentHTML('beforeend', exportProgressModal(plan));
    /* 演示:进度模拟 */
    let pct = 0;
    const timer = setInterval(() => {
      pct = Math.min(100, pct + Math.round(60 + Math.random() * 120) / 10);
      const bar = document.getElementById('expBarIn');
      const num = document.getElementById('expNum');
      if (!bar) { clearInterval(timer); return; }   /* 弹窗被关闭则停止 */
      bar.style.width = pct + '%';
      document.getElementById('expPct').textContent = Math.round(pct) + '%';
      num.textContent = `${Math.round(pct * plan.files.length / 100)} / ${plan.files.length}`;
      if (pct >= 100) {
        clearInterval(timer);
        PhotoPage.exportTimer = null;
        setTimeout(() => PhotoPage.exportFinish(plan), 300);
      }
    }, 180);
    this.exportTimer = timer;
  },
  /* 进度走完后,原地切换弹窗内容为结果摘要 */
  exportFinish(plan) {
    const body = document.getElementById('expBody');
    if (!body) return;
    /* 演示场景④:固定第 2、7 张下载失败 */
    const failed = this.demoFail ? plan.files.filter((_, i) => i === 1 || i === 6) : [];
    this.lastPlan = { plan, failed };
    const ok = plan.files.length - failed.length;
    const failBox = failed.length > 0 ? `
      <div class="exp-fail-box">
        <div class="exp-fail-box--title">⚠ ${failed.length} 张下载失败(zip 内为成功的 ${ok} 张)</div>
        <div class="exp-fail-box--list">
          ${failed.map(f => `<div class="exp-fail-box--item">${Helpers.esc(f.name)} <span class="exp-fail-box--reason">下载超时</span></div>`).join('')}
        </div>
        <button class="btn" style="margin-top:6px;" onclick="PhotoPage.copyFailNumbers()">📋 复制失败子单号</button>
      </div>` : '';
    body.innerHTML = `
      <div style="text-align:center;padding:8px 0 4px;">
        <div style="font-size:44px;color:${failed.length > 0 ? '#D46B08' : '#389E0D'};">${failed.length > 0 ? '⚠' : '✔'}</div>
        <div style="font-size:14px;font-weight:bold;margin:6px 0;">${failed.length > 0 ? `成功 ${ok} 张 / 失败 ${failed.length} 张` : '导出完成'}</div>
        <div style="font-size:12px;color:#555;line-height:1.9;">
          已导出 <b class="check-ok-text">${ok}</b> 张图片,以子单号命名<br/>
          已打包为:<span style="font-family:Consolas,monospace;">CCOS照片导出_${Helpers.nowTime().replace(/[-: ]/g, '').slice(0, 14)}.zip</span>(演示文件名)
        </div>
      </div>
      ${failBox}`;
    body.closest('.rw-modal-panel').insertAdjacentHTML('beforeend', `
      <div class="rw-modal-footer">
        <button class="btn" onclick="Helpers.toast('打开文件夹(占位)')">📂 打开所在文件夹</button>
        <button class="btn btn--primary" onclick="PhotoPage.closeExport()">关闭</button>
      </div>`);
  },
  /* 复制失败清单的子单号(去掉扩展名,每行一个),失败项不做自动重试,由操作员自行处理 */
  copyFailNumbers() {
    const failed = this.lastPlan?.failed || [];
    if (failed.length === 0) return;
    const text = failed.map(f => f.name.replace(/\.\w+$/, '')).join('\n');
    const ok = () => Helpers.toast(`已复制 ${failed.length} 个子单号,可粘贴到单号查询框重新导出`);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok).catch(() => this.copyFallback(text, ok));
    } else {
      this.copyFallback(text, ok);
    }
  },
  copyFallback(text, ok) {
    const ta = Object.assign(document.createElement('textarea'), { value: text, style: 'position:fixed;opacity:0;' });
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { Helpers.toast('复制失败,请手动记录子单号'); }
    ta.remove();
  },
  /* 演示面板切场景时,终止进行中的任务并清理弹窗 */
  stopExportTask() {
    if (this.exportTimer) { clearInterval(this.exportTimer); this.exportTimer = null; }
    this.lastPlan = null;
    this.demoFail = false;
    document.getElementById('expModal')?.remove();
  },
  closeExport() {
    const el = document.getElementById('expModal');
    if (el) el.remove();
  },

  /* ---- 演示面板:切换量级场景 ---- */
  toggleDemo() {
    const el = document.getElementById('photoDemoPanel');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  },
  applyDemo(type) {
    this.stopExportTask();   /* 切场景时终止进行中的导出任务 */
    let list;
    if (type === 'many') list = genDemoRows(800, 2);        /* 800 条,400 子单各 2 张 → 800 张(含重复),不拦截 */
    else if (type === 'over') list = genDemoRows(30000, 3); /* 30000 条/30000 张 → 超 2000 拦截 */
    else list = PHOTO_ORIG.slice();                          /* normal / fail / reset 均用原始数据 */
    photoFiltered = list;
    document.getElementById('photoBody').innerHTML = buildRows(list);
    document.getElementById('pgTotal').textContent = list.length;
    if (type === 'reset') { Helpers.toast('已恢复原始演示数据'); return; }
    if (type === 'fail') { this.demoFail = true; Helpers.toast('已开启失败模拟:导出完成后第 2、7 张将下载失败'); }
    else if (type !== 'normal') Helpers.toast(`已注入 ${list.length} 条演示数据`);
    PhotoPage.closeExport();
    PhotoPage.openExport();
  },
};

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'in-photo',
  activeTab: 'in-photo',
  tabs: Layout.tabs.standard(),
  content: `
    ${queryPanel()}
    ${gridToolbar()}
    ${gridTable(photoFiltered)}
    ${pager(photoFiltered.length)}
    ${demoPanel()}
  `,
});

/* 启动底部时钟 */
Helpers.startClock();

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.photo-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'A') return;
  document.querySelectorAll('.photo-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
