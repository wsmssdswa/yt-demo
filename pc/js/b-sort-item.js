/* ============================================
   b-sort-item.js — 分拣项(基础信息·系统内置清单,只读)
   分拣项 = 规则可引用的验证维度(field_name 载体),由 CCOS 代码内置:
   新增维度须开发在过机接口补取值后登记,故本页只读,无增删改与操作日志。
   运算符不单独配置:按分拣项的值形态自动取适用集(数值 8 个 / 文本·编码清单 6 个)。
   ============================================ */

/* 值形态(由候选值来源推导:编码清单 / 数值 / 文本) */
const siTypeName = t => t === 'num' ? '数值' : t === 'str' ? '文本' : '编码清单';
/* 候选值来源:规则行「内容」控件的候选项从哪来 */
const siValSourceText = it => {
  const vs = it.valSource || {};
  if (vs.kind === 'enum') return '系统枚举';
  if (vs.kind === 'api') return `接口数据源·${vs.note || vs.apiKey || ''}`;
  return '无(规则内直接填值)';
};

/* ---- 列表行(只读,无勾选/选中) ---- */
function siListHtml() {
  return SortItemRegistry.items().map(it => {
    const full = it.ops.map(c => {
      const o = SIR_OP_MAP[c];
      return o ? `${o.label} ${o.expr}` : c;
    }).join('；');
    const names = it.ops.map(c => (SIR_OP_MAP[c] || {}).label || c).join('、');
    return `
    <tr>
      <td>${it.name}</td>
      <td class="col--code">${it.fieldName}</td>
      <td>${siTypeName(it.type)}</td>
      <td title="${full}"><span>${names}</span></td>
      <td>${siValSourceText(it)}</td>
    </tr>`;
  }).join('');
}

function siGrid() {
  return `
    <div class="grid-wrap wh-grid-wrap">
      <table class="grid wh-grid">
        <colgroup><col style="width:120px" /><col style="width:190px" /><col style="width:90px" />
          <col style="width:460px" /><col /></colgroup>
        <thead><tr><th>中文名</th><th>字段标识(field_name)</th><th>值形态</th>
          <th title="按分拣项的值形态自动给出,不单独配置">可用运算符</th>
          <th title="配规则时内容控件的候选项来源">候选值来源</th></tr></thead>
        <tbody id="siGridBody">${siListHtml()}</tbody>
      </table>
    </div>
  `;
}

/* ---- 渲染整页 ---- */
document.getElementById('app').innerHTML = Layout.window({
  title: 'Nebula YT-UAT',
  activeLeft: 'b-sort-item',
  activeTab: 'b2b-order',
  tabs: Layout.tabs.standard(),
  content: `
    <div class="grid-toolbar">
      <span class="sb-toolbar-note">分拣项为系统内置:新增分拣维度须在过机接口补取值后由开发登记,故此处只读;规则配置的「验证字段」取自本清单,运算符按分拣项的值形态自动给出</span>
    </div>
    ${siGrid()}
    <div class="pager">
      <button class="pg-btn">«</button><button class="pg-btn">‹</button>
      <button class="pg-btn">›</button><button class="pg-btn">»</button>
      <span class="pg-info">总记录数: <b id="siTotal"></b> 条</span>
    </div>
  `,
});
document.getElementById('siTotal').textContent = SortItemRegistry.items().length;
Helpers.startClock();
