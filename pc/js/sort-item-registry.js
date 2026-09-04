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

/* 默认种子(与三个规则页演示数据对齐;refCount>0 表示被规则引用,禁止删/停用) */
const SIR_DEFAULT_ITEMS = [
  { key: 'product', name: '产品', fieldName: 'product_code', type: 'enum',
    ops: ['包含', '不包含'], bindSource: '订单属性字段 product_code',
    valSource: { kind: 'api', apiKey: 'product', note: '产品主数据(SPMS 同步)' },
    refCount: 8, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'channel', name: '渠道', fieldName: 'server_channel_code', type: 'enum',
    ops: ['包含', '不包含'], bindSource: '订单属性字段 server_channel_code',
    valSource: { kind: 'api', apiKey: 'channel', note: '渠道主数据' },
    refCount: 6, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'exception', name: '异常类型', fieldName: 'b2b_exception_type', type: 'enum',
    ops: ['包含', '不包含'], bindSource: '签入结果字段 b2b_exception_type',
    valSource: { kind: 'manual', values: [
      { code: 'CIF', name: '签入失败' }, { code: 'CF', name: '格口已满' }] },
    refCount: 2, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'destOrg', name: '调拨目的仓', fieldName: 'dest_org_code', type: 'enum',
    ops: ['包含', '不包含'], bindSource: '待开发字段(OTS 侧确认中)',
    valSource: { kind: 'manual', values: [
      { code: 'US-LAX', name: '洛杉矶仓' }, { code: 'US-EWR', name: '新泽西仓' },
      { code: 'US-ORD', name: '芝加哥仓' }, { code: 'US-ATL', name: '亚特兰大仓' },
      { code: 'DE-FRA', name: '德国仓' }, { code: 'UK-LON', name: '英国仓' }] },
    refCount: 2, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
  { key: 'pieces', name: '主单件数', fieldName: 'order_pieces', type: 'num',
    ops: ['大于', '大于等于', '小于', '小于等于', '等于'], bindSource: '订单属性字段 order_pieces',
    valSource: { kind: 'none', note: '数值输入,无可选值' },
    refCount: 2, status: 1, updateUser: '系统内置', updateTime: '2026-09-04 10:00:00' },
];

const SortItemRegistry = {
  /* 读取注册表:localStorage 存档优先,否则默认种子 */
  items() {
    try {
      const raw = localStorage.getItem(SIR_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) return list;
      }
    } catch (e) { /* file:// 个别环境禁 localStorage,回退种子 */ }
    return SIR_DEFAULT_ITEMS.map(i => JSON.parse(JSON.stringify(i)));
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

/* 供配置页展示:运算符集按类型的默认全集(第一期不可改,预留) */
const SIR_OPS_BY_TYPE = {
  enum: ['包含', '不包含'],
  num: ['大于', '大于等于', '小于', '小于等于', '等于'],
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
