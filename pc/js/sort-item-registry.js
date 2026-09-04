/* ============================================
   sort-item-registry.js — 分拣项注册表(共享演示模块)
   方案(2026-09-04 定稿):分拣项(规则验证字段)由注册表统一维护,
   规则编辑器下拉从注册表读取——配置页新增/启停一项,规则页即时感知(免发版)。
   纯静态演示实现:
     · 默认种子内置于 SIR_DEFAULT_ITEMS;localStorage 有存档则用之(跨页共享)
     · 每项声明: key(规则内引用)/ name(中文名)/ field_name(SIMS 风格键名,仅展示)
       / type(enum|num)/ ops(运算符集)/ 运行时取值来源/ 编辑器可选值来源/ refCount/ status
     · 枚举可选值来源分两种: manual(注册表自带 code+name 清单) / api(页面常量表,调用方传映射)
   ============================================ */

const SIR_STORAGE_KEY = 'b2bSortItemRegistry_v1';

/* 默认种子(与三个规则页演示数据对齐;refCount>0 表示被规则引用,禁止删/停用)
   ops 省略 = 按数据类型给默认全集(由 items() 归一化填充;旧存档中文 ops 同样被修复) */
const SIR_DEFAULT_ITEMS = [
  { key: 'product', name: '产品', fieldName: 'product_code', type: 'enum',
    bindSource: '订单属性字段 product_code',
    valSource: { kind: 'api', apiKey: 'product', note: '产品主数据(SPMS 同步)' },
    refCount: 8, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'channel', name: '渠道', fieldName: 'server_channel_code', type: 'enum',
    bindSource: '订单属性字段 server_channel_code',
    valSource: { kind: 'api', apiKey: 'channel', note: '渠道主数据' },
    refCount: 6, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'exception', name: '异常类型', fieldName: 'b2b_exception_type', type: 'enum',
    bindSource: '签入结果字段 b2b_exception_type',
    valSource: { kind: 'manual', values: [
      { code: 'CIF', name: '签入失败' }, { code: 'CF', name: '格口已满' }] },
    refCount: 2, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'destOrg', name: '调拨目的仓', fieldName: 'dest_org_code', type: 'enum',
    bindSource: '待开发字段(OTS 侧确认中)',
    valSource: { kind: 'manual', values: [
      { code: 'US-LAX', name: '洛杉矶仓' }, { code: 'US-EWR', name: '新泽西仓' },
      { code: 'US-ORD', name: '芝加哥仓' }, { code: 'US-ATL', name: '亚特兰大仓' },
      { code: 'DE-FRA', name: '德国仓' }, { code: 'UK-LON', name: '英国仓' }] },
    refCount: 2, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'pieces', name: '主单件数', fieldName: 'order_pieces', type: 'num',
    bindSource: '订单属性字段 order_pieces',
    valSource: { kind: 'none', note: '数值输入,无可选值' },
    refCount: 2, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
];

const SortItemRegistry = {
  /* 读取注册表:localStorage 存档优先,否则默认种子 */
  items() {
    let list = null;
    try {
      const raw = localStorage.getItem(SIR_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) list = arr;
      }
    } catch (e) { /* file:// 个别环境禁 localStorage,回退种子 */ }
    if (!list) list = SIR_DEFAULT_ITEMS.map(i => JSON.parse(JSON.stringify(i)));
    /* 归一化:项结构校验 + ops 缺失/含非法值 → 按数据类型重建默认全集(兼容旧版中文 ops 存档) */
    list = list.filter(it => it && typeof it === 'object' && it.key && it.type);
    list.forEach(it => {
      const opsArr = Array.isArray(it.ops) ? it.ops : [];
      /* 空数组 every 恒 true:需显式判空,否则默认种子(无 ops)会跳过重建 */
      if (!opsArr.length || !opsArr.every(c => SIR_OP_MAP[c])) {
        it.ops = SIR_OPS_BY_TYPE[it.type === 'num' ? 'num' : 'enum'].slice();
      }
      if (!Array.isArray(it.valSource) && (!it.valSource || typeof it.valSource !== 'object')) {
        it.valSource = it.type === 'num'
          ? { kind: 'none', note: '数值输入,无可选值' }
          : { kind: 'manual', values: [] };
      }
    });
    return list;
  },

  /* 启用中的注册项(规则编辑器下拉用) */
  enabled() {
    return this.items().filter(i => i.status === 1);
  },

  save(list) {
    try { localStorage.setItem(SIR_STORAGE_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  },

  reset() {
    try { localStorage.removeItem(SIR_STORAGE_KEY); return true; } catch (e) { return false; }
  },

  find(key) {
    return this.enabled().find(i => i.key === key);
  },

  /* 构建某页的 COND_ITEMS 字典(给三个规则页用)
     apiMaps: { apiKey: [{code,name}...] } 页面内置主数据常量映射 */
  buildCondItems(apiMaps) {
    return this.enabled().map(it => {
      const base = { key: it.key, label: it.name, ops: it.ops.slice() };
      if (it.type === 'num') { base.type = 'num'; return base; }
      const vs = it.valSource;
      const values = vs.kind === 'manual'
        ? (vs.values || []).map(v => ({ code: v.code, name: v.name }))
        : (apiMaps && apiMaps[vs.apiKey]) || [];
      base.values = values;
      return base;
    });
  },

  /* 注册项是否被引用(删除保护演示) */
  isReferenced(it) { return it.refCount > 0; },
};

/* ---- 运算符辅助(供三个规则页与配置页共用) ---- */
const SIR_opOf = code => SIR_OP_MAP[code] || null;
/* 内容控件形态:op 的 ctrl 对数值字段的 EQ/NE 退化为数值输入 */
const SIR_ctrlOf = (itemType, opCode) => {
  const o = SIR_OP_MAP[opCode];
  if (!o) return 'in';
  if (itemType === 'num' && o.ctrl === 'eq') return 'num';
  return o.ctrl;
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
  if (ctrl === 'in') return `${itemDef.label}含${c.values.length}`;
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

/* 供配置页展示:运算符集按类型的默认全集(第一期不可改,预留) */
/* 全局运算符字典(2026-09-04 用户提供,真实系统全集 12 个):
   code=存储标识, label=中文名, expr=符号/关键字, kinds=适用数据类型, ctrl=值控件形态
   ctrl: num=数值单值 / range=数值区间(起止双值) / eq=枚举单选 / in=枚举多选 / text=文本(关键字/前后缀) */
const SIR_OPS = [
  { code: 'GT',        label: '大于',         expr: '>',        kinds: ['num'],  ctrl: 'num' },
  { code: 'EQ',        label: '等于',         expr: '=',        kinds: ['num', 'enum'], ctrl: 'eq' },
  { code: 'IN',        label: '包含',         expr: 'IN',       kinds: ['enum'], ctrl: 'in' },
  { code: 'BETWEEN',   label: '区间-左开右闭', expr: 'BETWEEN',  kinds: ['num'],  ctrl: 'range' },
  { code: 'LT',        label: '小于',         expr: '<',        kinds: ['num'],  ctrl: 'num' },
  { code: 'LE',        label: '小于等于',      expr: '<=',       kinds: ['num'],  ctrl: 'num' },
  { code: 'GE',        label: '大于等于',      expr: '>=',       kinds: ['num'],  ctrl: 'num' },
  { code: 'INTERVAL',  label: '区间-左闭右闭', expr: 'INTERVAL', kinds: ['num'],  ctrl: 'range' },
  { code: 'KWMATCH',   label: '关键字匹配',    expr: 'KWMATCH',  kinds: ['enum'], ctrl: 'text' },
  { code: 'MATCHSTART',label: '匹配开始字符',  expr: 'MATCHSTART', kinds: ['enum'], ctrl: 'text' },
  { code: 'MATCHEND',  label: '匹配结束字符',  expr: 'MATCHEND', kinds: ['enum'], ctrl: 'text' },
  { code: 'NE',        label: '不等于',        expr: '<>',      kinds: ['num', 'enum'], ctrl: 'eq' },
];
const SIR_OP_MAP = {};
SIR_OPS.forEach(o => { SIR_OP_MAP[o.code] = o; });
const SIR_OP_CTRL_TEXT = {
  num: '数值(单值)', range: '数值(起止区间)', eq: '枚举(单选)',
  in: '枚举(多选)', text: '文本(关键字)',
};
/* 类型 → 默认运算符集(按 SIR_OPS 定义顺序裁剪 kinds 匹配) */
const SIR_OPS_BY_TYPE = {
  enum: SIR_OPS.filter(o => o.kinds.includes('enum')).map(o => o.code),
  num: SIR_OPS.filter(o => o.kinds.includes('num')).map(o => o.code),
};
const SIR_BIND_SOURCES = [
  { code: 'order:product_code', name: '订单属性字段 product_code' },
  { code: 'order:server_channel_code', name: '订单属性字段 server_channel_code' },
  { code: 'order:order_pieces', name: '订单属性字段 order_pieces' },
  { code: 'order:weight', name: '订单属性字段 重量(kg)' },
  { code: 'order:volume', name: '订单属性字段 材积(CBM)' },
  { code: 'result:b2b_exception_type', name: '签入结果字段 b2b_exception_type' },
  { code: 'pending', name: '待开发字段(需数据侧确认)' },
];
