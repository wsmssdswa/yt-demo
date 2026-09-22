/* ============================================
   sort-item-registry.js — 分拣项内置清单(共享演示模块)
   方案(2026-09-22):分拣项由 CCOS 代码内置,不提供配置页——
   新增分拣维度须开发在过机接口补取值后登记,"自助新增"并不能免发版。
   本模块为规则页(B2B分拣管理-格口看板)提供只读的条件项字典:
     · 每项声明: key(规则内引用)/ name(中文名)/ fieldName(过机接口字段标识)
       / valSource(候选值来源: 接口主数据 / 系统枚举 / 无-规则内直接填)
     · 值形态由候选值来源推导: enum 编码清单 / num 数值 / str 文本
     · 运算符不单独配置:按值形态自动取适用集(真实系统 12 个运算符的子集)
   ============================================ */

/* 系统内置分拣项(与过机接口取值字段一一对应;新增项由开发实现取值后在此登记) */
const SIR_BUILTIN_ITEMS = [
  { key: 'product', name: '产品', fieldName: 'product_code',
    valSource: { kind: 'api', apiKey: 'product', note: '产品主数据(SPMS 同步)' } },
  { key: 'channel', name: '渠道', fieldName: 'server_channel_code',
    valSource: { kind: 'api', apiKey: 'channel', note: '渠道主数据' } },
  { key: 'exception', name: '异常类型', fieldName: 'b2b_exception_type',
    valSource: { kind: 'enum', values: [
      { code: 'CIF', name: '签入失败' }, { code: 'CF', name: '格口已满' }] } },
  { key: 'pieces', name: '主单件数', fieldName: 'order_pieces',
    valSource: { kind: 'none', dataType: 'num' } },
];

const SortItemRegistry = {
  /* 只读清单:值形态与运算符集随项派生,不落存储、不可编辑 */
  items() {
    return SIR_BUILTIN_ITEMS.map(it => {
      const type = SIR_typeOf(it);
      const copy = JSON.parse(JSON.stringify(it));
      copy.type = type;
      copy.ops = (SIR_OPS_BY_TYPE[type] || SIR_OPS_BY_TYPE.enum).slice();
      return copy;
    });
  },

  /* 全量注册项(规则编辑器下拉用) */
  list() {
    return this.items();
  },

  find(key) {
    return this.list().find(i => i.key === key);
  },

  /* 构建某页的 COND_ITEMS 字典(给规则页用)
     apiMaps: { apiKey: [{code,name}...] } 页面内置主数据常量映射 */
  buildCondItems(apiMaps) {
    return this.list().map(it => {
      const base = { key: it.key, label: it.name, ops: it.ops.slice(), type: it.type };
      if (it.type !== 'enum') return base;           /* 数值/文本:规则里直接填值,无候选清单 */
      const vs = it.valSource;
      const values = vs.kind === 'enum'
        ? (vs.values || []).map(v => ({ code: v.code, name: v.name }))
        : (apiMaps && apiMaps[vs.apiKey]) || [];
      base.values = values;
      return base;
    });
  },
};

/* ---- 运算符辅助(供规则页与清单页共用) ---- */
const SIR_opOf = code => SIR_OP_MAP[code] || null;
/* 内容控件形态:op 的 ctrl 决定;「等于/不等于」按值形态落到具体控件
   (数值→数字框 / 文本→文本框 / 编码清单→单选下拉) */
const SIR_ctrlOf = (itemType, opCode) => {
  const o = SIR_OP_MAP[opCode];
  if (!o) return 'in';
  if (o.ctrl !== 'eq') return o.ctrl;
  if (itemType === 'num') return 'num';
  if (itemType === 'str') return 'text';
  return 'eq';
};
/* 内容空态校验:各控件形态要求 */
const SIR_valOk = (c, ctrl) => {
  if (!c.values || !c.values.length) return false;
  if (ctrl === 'range') return c.values.length === 2 && c.values[0] !== '' && c.values[1] !== '';
  return c.values.length >= 1 && c.values[0] !== '' && c.values[0] != null;
};
/* 内容空态占位文案 */
const SIR_valPh = ctrl => ctrl === 'range' ? '(起止未填全)' : '(未选值)';
/* 值摘要:徽标/日志用(压缩形态),完整文案由各页预览生成 */
function SIR_valSummary(itemDef, c, ctrl) {
  const nameOf = v => {
    const vals = itemDef.values;
    const m = vals && vals.find(x => x.code === v);
    return m ? m.name : String(v);
  };
  const op = SIR_opOf(c.op);
  /* 摘要列出具体值(不显示数量);过长由使用处 CSS 省略号截断,悬浮看全文 */
  if (ctrl === 'in') return `${itemDef.label}含${(c.values || []).map(nameOf).join('、')}`;
  if (ctrl === 'range') return `${itemDef.label}∈${c.values[0]}~${c.values[1]}`;
  if (ctrl === 'num') return `${itemDef.label}${op ? op.expr : c.op}${c.values[0] || ''}`;
  if (ctrl === 'text') return `${itemDef.label}${op ? op.expr : c.op}${c.values[0] || ''}`;
  return `${itemDef.label}${op ? op.expr : c.op}${c.values[0] ? nameOf(c.values[0]) : ''}`;
}
/* 完整预览:条件行转可读文本(连接词由调用方拼) */
function SIR_valText(itemDef, c, ctrl) {
  const op = SIR_opOf(c.op);
  const opLabel = op ? op.label : c.op;
  const vals = c.values || [];
  let body;
  if (!vals.length || (ctrl === 'range' && vals.length < 2)) {
    body = SIR_valPh(ctrl);
  } else if (ctrl === 'range') {
    body = `${vals[0]}~${vals[1]}`;
  } else if (ctrl === 'in') {
    const nameOf = v => {
      const m = itemDef.values && itemDef.values.find(x => x.code === v);
      return m ? m.name : v;
    };
    body = vals.map(v => nameOf(v)).join('、');
  } else {
    body = String(vals[0]);
  }
  return `${itemDef.label} ${opLabel} ${body}`;
}

/* ---- 全局运算符字典(2026-09-04 用户提供,真实系统全集 12 个) ----
   code=存储标识, label=中文名, expr=符号/关键字, kinds=适用字段性质, ctrl=值控件形态
   ctrl: num=数值单值 / range=数值区间(起止双值) / eq=单选 / in=多选 / text=文本(关键字/前后缀) */
const SIR_OPS = [
  { code: 'GT',        label: '大于',         expr: '>',        kinds: ['num'],  ctrl: 'num' },
  { code: 'EQ',        label: '等于',         expr: '=',        kinds: ['num', 'str'], ctrl: 'eq' },
  { code: 'IN',        label: '包含',         expr: 'IN',       kinds: ['str'], ctrl: 'in' },
  { code: 'BETWEEN',   label: '区间-左开右闭', expr: 'BETWEEN',  kinds: ['num'],  ctrl: 'range' },
  { code: 'LT',        label: '小于',         expr: '<',        kinds: ['num'],  ctrl: 'num' },
  { code: 'LE',        label: '小于等于',      expr: '<=',       kinds: ['num'],  ctrl: 'num' },
  { code: 'GE',        label: '大于等于',      expr: '>=',       kinds: ['num'],  ctrl: 'num' },
  { code: 'INTERVAL',  label: '区间-左闭右闭', expr: 'INTERVAL', kinds: ['num'],  ctrl: 'range' },
  { code: 'KWMATCH',   label: '关键字匹配',    expr: 'KWMATCH',  kinds: ['str'], ctrl: 'text' },
  { code: 'MATCHSTART',label: '匹配开始字符',  expr: 'MATCHSTART', kinds: ['str'], ctrl: 'text' },
  { code: 'MATCHEND',  label: '匹配结束字符',  expr: 'MATCHEND', kinds: ['str'], ctrl: 'text' },
  { code: 'NE',        label: '不等于',        expr: '<>',      kinds: ['num', 'str'], ctrl: 'eq' },
];
const SIR_OP_MAP = {};
SIR_OPS.forEach(o => { SIR_OP_MAP[o.code] = o; });

/* 值形态由候选值来源决定:
   配了值清单(接口主数据 / 系统枚举)=enum(编码清单,下拉选值);选「无」=按数据类型 num(数值)/str(文本)
   ——2026-09-07 去掉独立数据类型,2026-09-21 以「仅选无时需要」的形态加回,
   2026-09-22 分拣项改内置后类型随之写死在清单里,不再由用户选 */
const SIR_typeOf = it => {
  const vs = it.valSource;
  if (vs && vs.kind && vs.kind !== 'none') return 'enum';        /* 有值清单 = 编码清单 */
  if (vs && vs.dataType === 'str') return 'str';
  return 'num';
};
/* 运算符集:按值形态自动给出(数值 8 个 / 文本·编码清单 6 个),不单独配置 */
const SIR_OPS_BY_TYPE = {
  enum: SIR_OPS.filter(o => o.kinds.includes("str")).map(o => o.code),
  str: SIR_OPS.filter(o => o.kinds.includes("str")).map(o => o.code),
  num: SIR_OPS.filter(o => o.kinds.includes("num")).map(o => o.code),
};
