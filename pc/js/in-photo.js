/* ============================================
   in-photo.js — 拍照记录上传页
   依据:code/pc 生产源码
     · 列表模型 PictureUploadRecordResponse(10 列,见 [DataColumn] 标注)
       图片地址为链接,点击弹窗预览
     · 查询条件:单号类型(1匹配子单/2其他/3运单)+单号(≤500)+时间范围(≤30天)
     · 窗体按钮:查询 | (图片地址链接选中 1 行弹窗预览)
     · 枚举 PictureUploadStatus(0失败/1成功)
   ============================================ */

/* ---- 演示数据(8 行,覆盖成功/失败及不同单号类型) ---- */
const PHOTO_ROWS = [
  { no:1,  waybill:'YT2621601300301272', child:'YT2621601300301272U001', no1:'YT2621601300301272', no2:'YT2621601300301272U001', no3:'',  no4:'',
    imgName:'YT2621601300301272U001_01.jpg', img:'/photo/2026/08/04/YT2621601300301272U001_01.jpg',
    status:1, statusLabel:'成功', tip:'', upTime:'2026-08-04 18:53:17', sel:false },
  { no:2,  waybill:'YT2621601300301249', child:'YT2621601300301249U002', no1:'YT2621601300301249', no2:'YT2621601300301249U002', no3:'',  no4:'',
    imgName:'YT2621601300301249U002_01.jpg', img:'/photo/2026/08/04/YT2621601300301249U002_01.jpg',
    status:1, statusLabel:'成功', tip:'', upTime:'2026-08-04 18:46:37', sel:true },
  { no:3,  waybill:'YT2621601300301227', child:'YT2621601300301227U001', no1:'YT2621601300301227', no2:'YT2621601300301227U001', no3:'',  no4:'',
    imgName:'YT2621601300301227U001_01.jpg', img:'/photo/2026/08/04/YT2621601300301227U001_01.jpg',
    status:0, statusLabel:'失败', tip:'图片格式不支持(HEIC)', upTime:'2026-08-04 17:47:52', sel:false },
  { no:4,  waybill:'YT2621601300301201', child:'YT2621601300301201U001', no1:'YT2621601300301201', no2:'YT2621601300301201U001', no3:'',  no4:'',
    imgName:'YT2621601300301201U001_02.jpg', img:'/photo/2026/08/04/YT2621601300301201U001_02.jpg',
    status:1, statusLabel:'成功', tip:'', upTime:'2026-08-04 17:45:35', sel:false },
  { no:5,  waybill:'YT2621625400300033', child:'YT2621625400300033U001', no1:'YT2621625400300033', no2:'YT2621625400300033U001', no3:'PH2608030000051', no4:'',
    imgName:'YT2621625400300033U001_01.jpg', img:'/photo/2026/08/04/YT2621625400300033U001_01.jpg',
    status:1, statusLabel:'成功', tip:'', upTime:'2026-08-04 20:23:34', sel:true },
  { no:6,  waybill:'YT2621601300101052', child:'YT2621601300101052U001', no1:'YT2621601300101052', no2:'YT2621601300101052U001', no3:'',  no4:'',
    imgName:'YT2621601300101052U001_01.jpg', img:'/photo/2026/08/04/YT2621601300101052U001_01.jpg',
    status:0, statusLabel:'失败', tip:'文件超过 10MB 限制', upTime:'2026-08-04 17:09:33', sel:false },
  { no:7,  waybill:'YT2621601300101037', child:'YT2621601300101037U001', no1:'YT2621601300101037', no2:'YT2621601300101037U001', no3:'',  no4:'',
    imgName:'YT2621601300101037U001_03.jpg', img:'/photo/2026/08/04/YT2621601300101037U001_03.jpg',
    status:1, statusLabel:'成功', tip:'', upTime:'2026-08-04 16:50:30', sel:false },
  { no:8,  waybill:'YT2621601300101029', child:'YT2621601300101029U001', no1:'YT2621601300101029', no2:'YT2621601300101029U001', no3:'',  no4:'',
    imgName:'YT2621601300101029U001_01.jpg', img:'/photo/2026/08/04/YT2621601300101029U001_01.jpg',
    status:1, statusLabel:'成功', tip:'', upTime:'2026-08-04 16:49:12', sel:false },
];

/* ---- 枚举映射 ---- */
const PHOTO_ENUM = {
  /* 上传状态 PictureUploadStatus */
  status: {
    0: { label:'失败', cls:'check-status--fail' },
    1: { label:'成功', cls:'check-status--ok' },
  },
};

/* ---- 查询区 ----
   布局:字段纵向(label 上、控件下),与异常订单页统一。
   主行默认只显示「单号类型 + 单号 + 查询/更多条件按钮」,其余进更多条件 */
function queryPanel() {
  const f = (label, control, extraCls = '') =>
    `<div class="qf ${extraCls}"><label>${label}</label>${control}</div>`;

  return `
    <div class="query-panel qp">
      <!-- 主行:只留单号类型 + 单号 + 按钮 -->
      <div class="qp-row qp-row--main">
        ${f('单号类型', `<select class="sel"><option value="1">匹配子单号</option><option value="2">其他单号</option><option value="3">运单号</option></select>`)}
        ${f('单号', `<textarea class="ipt ipt--waybill" rows="1" placeholder="批量查询,换行分隔,最多 500 个"></textarea>`, 'qf--waybill')}
        <div class="qp-actions">
          <button class="btn btn--primary" onclick="Helpers.toast('查询(占位)')">🔍 查询</button>
          <button class="btn" id="btnMore" onclick="PhotoPage.toggleMore()">⚙ 更多条件</button>
        </div>
      </div>

      <!-- 更多查询条件(默认隐藏,时间范围≤30天) -->
      <div class="qp-row qp-more" id="photoMore" style="display:none;">
        ${f('时间范围', `<span class="qf-range"><input class="ipt ipt--date" value="2026-07-06" /><span class="qf-sep">~</span><input class="ipt ipt--date" value="2026-08-04 23:59:59" /></span>`)}
      </div>
    </div>
  `;
}

/* ---- 工具栏(对应窗体按钮) ----
   本页无独立工具栏按钮(图片预览通过行内链接触发),保留空工具栏以保持框架一致 */
function gridToolbar() {
  return `<div class="grid-toolbar"></div>`;
}

/* ---- 数据表格(10 列,严格对应 PictureUploadRecordResponse 的 [DataColumn]) ---- */
function gridTable() {
  /* 上传状态标签 */
  const statusTag = s => {
    const e = PHOTO_ENUM.status[s] || { label:'', cls:'' };
    return `<span class="check-tag ${e.cls}">${e.label}</span>`;
  };

  const rows = PHOTO_ROWS.map(r => `
    <tr class="${r.no === 1 ? 'row--selected' : ''}" data-no="${r.no}">
      <td class="col--num">${r.no}</td>
      <td class="col-chk"><input type="checkbox" ${r.sel ? 'checked' : ''} /></td>
      <td class="col--code cell-link" title="${r.waybill}">${r.waybill}</td>
      <td class="col--code">${r.child}</td>
      <td class="col--code">${r.no1 || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--code">${r.no2 || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--code">${r.no3 || '<span style="color:#bbb;">—</span>'}</td>
      <td class="col--code">${r.no4 || '<span style="color:#bbb;">—</span>'}</td>
      <td title="${r.imgName}">${r.imgName}</td>
      <td><a href="javascript:void(0)" class="cell-link" onclick="PhotoPage.preview(${r.no})">查看图片</a></td>
      <td>${statusTag(r.status)}</td>
      <td class="${r.tip ? 'check-err' : ''}">${r.tip || '<span style="color:#bbb;">—</span>'}</td>
      <td>${r.upTime}</td>
    </tr>
  `).join('');

  return `
    <div class="grid-wrap photo-grid-wrap">
      <table class="grid photo-grid">
        <colgroup>
          <col style="width:36px" />   <!-- NO -->
          <col style="width:32px" />   <!-- 复选 -->
          <col style="width:160px" />  <!-- 主单号 -->
          <col style="width:190px" />  <!-- 匹配子单号 -->
          <col style="width:140px" />  <!-- 单号1 -->
          <col style="width:140px" />  <!-- 单号2 -->
          <col style="width:140px" />  <!-- 单号3 -->
          <col style="width:140px" />  <!-- 单号4 -->
          <col style="width:200px" />  <!-- 图片名称 -->
          <col style="width:90px" />   <!-- 图片地址 -->
          <col style="width:60px" />   <!-- 状态 -->
          <col style="width:180px" />  <!-- 提示信息 -->
          <col style="width:140px" />  <!-- 上传时间 -->
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th class="col-chk"><input type="checkbox" id="chkAll" onclick="PhotoPage.toggleAll(this)" /></th>
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
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ---- 分页栏 ---- */
function pager() {
  return `
    <div class="pager">
      <button class="pg-btn" title="首页">«</button>
      <button class="pg-btn" title="上一页">‹</button>
      <button class="pg-btn" title="下一页">›</button>
      <button class="pg-btn" title="末页">»</button>
      <span class="pg-info">总记录数: <b>8</b> 条,总页数: <b>1</b> 页,每页显示 <b>50</b> 条,当前第 <b>1</b> 页</span>
      <span class="pg-go">
        <input class="ipt" value="" />
        <button class="pg-btn">GO</button>
        <select class="sel"><option>50</option><option>100</option><option>200</option></select>
      </span>
    </div>
  `;
}

/* ---- 图片预览弹窗 ---- */
function previewModal(no) {
  const r = PHOTO_ROWS.find(x => x.no === no) || {};
  const hasImg = r.status === 1;
  return `
    <div class="rw-modal" id="photoModal">
      <div class="rw-modal-mask" onclick="PhotoPage.closePreview()"></div>
      <div class="rw-modal-panel" style="width:520px;">
        <div class="rw-modal-header">
          <span class="rw-modal-title">图片预览 — ${Helpers.esc(r.imgName || '')}</span>
          <span class="rw-modal-close" onclick="PhotoPage.closePreview()">✕</span>
        </div>
        <div class="rw-modal-body" style="text-align:center;">
          ${hasImg
            ? `<div style="height:300px;display:flex;align-items:center;justify-content:center;background:#F0F2F5;border:1px dashed #C0C0C0;border-radius:4px;color:#888;">
                 <div>
                   <div style="font-size:48px;">🖼</div>
                   <div style="margin-top:8px;font-family:Consolas,monospace;color:#555;">${Helpers.esc(r.img || '')}</div>
                   <div style="margin-top:4px;font-size:11px;color:#999;">(演示,实际展示图片缩略图)</div>
                 </div>
               </div>`
            : `<div style="height:300px;display:flex;align-items:center;justify-content:center;background:#FFF1F0;border:1px solid #FFA39E;border-radius:4px;color:#CF1322;">
                 <div>
                   <div style="font-size:48px;">⚠</div>
                   <div style="margin-top:8px;">图片上传失败:${Helpers.esc(r.tip || '未知错误')}</div>
                 </div>
               </div>`}
        </div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="PhotoPage.closePreview()">关闭</button>
          ${hasImg ? `<button class="btn btn--primary" onclick="Helpers.toast('下载图片(占位)')">下载</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

/* ---- 页面逻辑(展开更多/全选/图片预览) ---- */
const PhotoPage = {
  toggleMore() {
    const el = document.getElementById('photoMore');
    const btn = document.getElementById('btnMore');
    const show = el.style.display === 'none';
    el.style.display = show ? 'flex' : 'none';
    btn.textContent = show ? '⚙ 收起查询条件' : '⚙ 更多条件';
  },
  toggleAll(master) {
    document.querySelectorAll('.photo-grid tbody input[type="checkbox"]').forEach(c => c.checked = master.checked);
  },
  /* 图片地址链接:选中 1 行预览(这里由行内链接直接触发,带选中校验) */
  preview(no) {
    const checked = document.querySelectorAll('.photo-grid tbody input[type="checkbox"]:checked');
    /* 行内链接已带 no,直接预览该行;若未选中任何行也允许(链接即意图) */
    if (checked.length === 0) {
      /* 自动选中该行 */
      const tr = document.querySelector(`.photo-grid tbody tr[data-no="${no}"]`);
      if (tr) {
        const cb = tr.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = true;
      }
    }
    document.body.insertAdjacentHTML('beforeend', previewModal(no));
  },
  closePreview() {
    const el = document.getElementById('photoModal');
    if (el) el.remove();
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
    ${gridTable()}
    ${pager()}
  `,
});

/* 启动底部时钟 */
Helpers.startClock();

/* 表格行点击 → 选中态 */
document.addEventListener('click', e => {
  const tr = e.target.closest('.photo-grid tbody tr');
  if (!tr) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
  document.querySelectorAll('.photo-grid tbody tr.row--selected').forEach(r => r.classList.remove('row--selected'));
  tr.classList.add('row--selected');
});
