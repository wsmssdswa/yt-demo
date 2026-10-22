/* ============================================================
   演示数据（全部为示例，非生产数据）
   固定“当前时间”，保证截图与相对时间稳定
   ============================================================ */
window.APP_NOW = "2026-10-22 20:00";

window.SEED = {
  meta: { version: 2, name: "B2B 报价系统演示数据" },

  feeItems: [
    { code: "BASE_FREIGHT", name: "基础运费", en: "Base Freight", group: "基础运费", unit: "KG", mode: "按计费重", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "按计费重×单价，所有产品必配" },
    { code: "FUEL", name: "燃油附加费", en: "Fuel Surcharge", group: "附加费", unit: "%", mode: "按基础运费比例", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "比例按月调整，最低收费可配" },
    { code: "REMOTE", name: "偏远附加费", en: "Remote Area", group: "附加费", unit: "票", mode: "固定金额", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "按邮编分区判定" },
    { code: "RESIDENTIAL", name: "住宅地址附加费", en: "Residential", group: "附加费", unit: "票", mode: "固定金额", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "收件地址类型=住宅时收取" },
    { code: "OVERSIZE", name: "超长超重附加费", en: "Oversize", group: "附加费", unit: "件", mode: "固定金额", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "单件超 1.5m 或超 30kg" },
    { code: "PEAK", name: "旺季附加费", en: "Peak Season", group: "附加费", unit: "KG", mode: "按计费重", status: "停用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "2026-11-01 起启用，待价格确认" },
    { code: "CUSTOMS", name: "报关费", en: "Customs Declaration", group: "基础运费", unit: "票", mode: "固定金额", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "人工加收项，不配底价" },
    { code: "INSURANCE", name: "保价费", en: "Insurance", group: "增值服务", unit: "申报价值%", mode: "比例费率", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "基数=申报价值，最低 20 元" },
    { code: "PALLET", name: "托盘费", en: "Pallet", group: "增值服务", unit: "托盘", mode: "固定金额", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "按实际打托数量" },
    { code: "TRANSFER", name: "调拨费", en: "Transfer", group: "附加费", unit: "票", mode: "按计费地点差异", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "提货仓与计费地点不一致时产生" },
    { code: "STORAGE", name: "仓储费", en: "Storage", group: "增值服务", unit: "CBM/天", mode: "按体积天数", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "免仓期 3 天" },
    { code: "LABELING", name: "贴标费", en: "Labeling", group: "增值服务", unit: "件", mode: "固定金额", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "额外服务，按件计" },
    { code: "REPACKING", name: "换箱费", en: "Repacking", group: "增值服务", unit: "件", mode: "固定金额", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "额外服务，材料费另计" },
    { code: "INSPECTION", name: "查验费", en: "Inspection", group: "增值服务", unit: "票", mode: "实报实销", status: "启用", source: "SYS", oa: "已生效", syncAt: "2026-10-20 03:00", remark: "人工录入实际发生额" }
  ],

  products: [
    { code: "P001", name: "美国海派卡派-普货", country: "US", countryName: "美国", transport: "海运", lastMile: "卡车派送", unit: "KG", version: "2026-10-21", status: "启用", mapped: "已映射", templates: ["T01", "S01"], zone: "Z01", updated: "2026-10-18", desc: "深圳/宁波起运，洛杉矶/纽约提柜后卡派" },
    { code: "P002", name: "美国海派快递-普货", country: "US", countryName: "美国", transport: "海运", lastMile: "UPS/FedEx", unit: "KG", version: "2026-10-21", status: "启用", mapped: "已映射", templates: ["T01", "S01"], zone: "Z01", updated: "2026-10-18", desc: "尾程快递派送，住宅地址加收" },
    { code: "P003", name: "欧洲海派-普货", country: "DE", countryName: "德国", transport: "海运", lastMile: "DPD", unit: "KG", version: "2026-09-30", status: "启用", mapped: "已映射", templates: ["T02", "S02"], zone: "Z02", updated: "2026-09-30", desc: "汉堡清关，欧盟境内派送" },
    { code: "P004", name: "欧洲空派-普货", country: "DE", countryName: "德国", transport: "空运", lastMile: "DHL", unit: "KG", version: "2026-09-30", status: "启用", mapped: "已映射", templates: ["T02"], zone: "Z02", updated: "2026-09-30", desc: "法兰克福清关，时效 5-7 天" },
    { code: "P005", name: "美国整柜-普货", country: "US", countryName: "美国", transport: "海运整柜", lastMile: "客户自提", unit: "柜", version: "2026-10-12", status: "启用", mapped: "已映射", templates: ["T05"], zone: "Z01", updated: "2026-10-12", desc: "40HQ 整柜，按柜一口价" },
    { code: "P006", name: "美森快船-卡派", country: "US", countryName: "美国", transport: "海运快船", lastMile: "卡车派送", unit: "KG", version: "2026-10-15", status: "启用", mapped: "已映射", templates: ["T03", "S03"], zone: "Z01", updated: "2026-10-15", desc: "美森加班船，11 天到港" },
    { code: "P007", name: "英国海派-普货", country: "GB", countryName: "英国", transport: "海运", lastMile: "Hermes", unit: "KG", version: "2026-08-28", status: "启用", mapped: "已映射", templates: ["T07"], zone: "Z02", updated: "2026-08-28", desc: "费利克斯托清关" },
    { code: "P008", name: "加拿大海派-普货", country: "CA", countryName: "加拿大", transport: "海运", lastMile: "Canada Post", unit: "KG", version: "2026-07-20", status: "启用", mapped: "待补齐", templates: ["T06"], zone: "Z03", updated: "2026-07-20", desc: "温哥华清关，价格待重新发布" }
  ],

  customers: [
    { code: "C001", name: "深圳凯琦供应链有限公司", short: "凯琦", sales: "张伟", group: "华东一组", level: "VIP", status: "启用", joined: "2024-03-12", priceCount: 12, credit: "月结 30 天", contact: "刘经理 138****2201" },
    { code: "C002", name: "宁波纽酷进出口有限公司", short: "纽酷", sales: "李娜", group: "华东二组", level: "重点", status: "启用", joined: "2024-08-06", priceCount: 9, credit: "月结 30 天", contact: "陈经理 139****8810" },
    { code: "C003", name: "广州锦联国际物流有限公司", short: "锦联", sales: "王强", group: "华南一组", level: "重点", status: "启用", joined: "2025-01-18", priceCount: 7, credit: "月结 45 天", contact: "周经理 136****3377" },
    { code: "C004", name: "上海盈和贸易有限公司", short: "盈和", sales: "赵敏", group: "华东一组", level: "普通", status: "启用", joined: "2025-05-22", priceCount: 5, credit: "预付", contact: "孙经理 137****6620" },
    { code: "C005", name: "厦门德立迅供应链有限公司", short: "德立迅", sales: "陈晨", group: "华南二组", level: "普通", status: "启用", joined: "2025-09-09", priceCount: 4, credit: "月结 30 天", contact: "林经理 135****9090" },
    { code: "C006", name: "Yuntu Logistics Inc.", short: "云途美国", sales: "张伟", group: "海外组", level: "VIP", status: "启用", joined: "2023-06-01", priceCount: 3, credit: "月结 15 天", contact: "David 001-***-8821" }
  ],

  templates: [
    {
      id: "T01", name: "美国海派-重量段", type: "重量段", product: "P001", country: "US", status: "启用", version: "v12", updated: "2026-10-20", refs: 12,
      params: [
        { from: "0", to: "21", price: "18.50", unit: "KG", note: "首段最低 1kg 起收" },
        { from: "21", to: "45", price: "17.20", unit: "KG", note: "" },
        { from: "45", to: "100", price: "15.80", unit: "KG", note: "" },
        { from: "100", to: "300", price: "14.60", unit: "KG", note: "" },
        { from: "300", to: "500", price: "13.90", unit: "KG", note: "" },
        { from: "500", to: "∞", price: "12.80", unit: "KG", note: "500kg 以上协议价" }
      ]
    },
    {
      id: "T02", name: "欧洲海派-重量段", type: "重量段", product: "P003", country: "DE", status: "启用", version: "v10", updated: "2026-09-30", refs: 6,
      params: [
        { from: "0", to: "21", price: "14.60", unit: "KG", note: "最低 1kg 起收" },
        { from: "21", to: "45", price: "13.80", unit: "KG", note: "" },
        { from: "45", to: "100", price: "13.20", unit: "KG", note: "" },
        { from: "100", to: "∞", price: "12.60", unit: "KG", note: "100kg 以上" }
      ]
    },
    {
      id: "T03", name: "美森-首续重", type: "首续重", product: "P006", country: "US", status: "启用", version: "v5", updated: "2026-10-15", refs: 3,
      params: [
        { from: "首重 0.5kg", to: "—", price: "38.00", unit: "票", note: "首重金额" },
        { from: "续重 0.5kg", to: "—", price: "9.50", unit: "0.5kg", note: "不足 0.5kg 按 0.5kg 计" }
      ]
    },
    {
      id: "T04", name: "保价费-比例费率", type: "比例费率", product: "通用", country: "全部", status: "启用", version: "v3", updated: "2026-08-12", refs: 8,
      params: [
        { from: "申报价值", to: "—", price: "0.30%", unit: "比例", note: "最低收费 20 元/票" },
        { from: "指定运费项合计", to: "—", price: "—", unit: "比例", note: "可选基数，按产品配置" }
      ]
    },
    {
      id: "T05", name: "整柜-一口价", type: "固定金额", product: "P005", country: "US", status: "启用", version: "v4", updated: "2026-10-12", refs: 2,
      params: [
        { from: "40HQ", to: "—", price: "46,800", unit: "柜", note: "含拖车，不含目的港杂费" },
        { from: "40GP", to: "—", price: "43,200", unit: "柜", note: "" }
      ]
    },
    {
      id: "T06", name: "加拿大-重量段", type: "重量段", product: "P008", country: "CA", status: "停用", version: "v1", updated: "2026-07-20", refs: 0,
      params: [
        { from: "0", to: "30", price: "—", unit: "KG", note: "价格待重新发布" },
        { from: "30", to: "100", price: "—", unit: "KG", note: "" }
      ]
    },
    {
      id: "T07", name: "英国海派-重量段", type: "重量段", product: "P007", country: "GB", status: "启用", version: "v2", updated: "2026-08-28", refs: 2,
      params: [
        { from: "0", to: "25", price: "16.40", unit: "KG", note: "" },
        { from: "25", to: "100", price: "15.10", unit: "KG", note: "" },
        { from: "100", to: "∞", price: "13.80", unit: "KG", note: "" }
      ]
    },
    {
      id: "T08", name: "美国海派-固定金额附加", type: "固定金额", product: "P002", country: "US", status: "启用", version: "v6", updated: "2026-10-08", refs: 4,
      params: [
        { from: "住宅地址", to: "—", price: "120.00", unit: "票", note: "收件地址类型=住宅" },
        { from: "偏远邮编", to: "—", price: "350.00", unit: "票", note: "按分区表判定" }
      ]
    },
    {
      id: "T09", name: "欧洲大货-按方", type: "按方", product: "通用", country: "全部", status: "启用", version: "v2", updated: "2026-09-10", refs: 1,
      params: [
        { from: "0", to: "2", price: "68.00", unit: "CBM", note: "最低 1CBM" },
        { from: "2", to: "5", price: "62.00", unit: "CBM", note: "" },
        { from: "5", to: "10", price: "56.00", unit: "CBM", note: "" },
        { from: "10", to: "∞", price: "49.00", unit: "CBM", note: "10CBM 以上" }
      ]
    }
  ],

  zones: [
    {
      id: "Z01", name: "美国分区-2026", country: "US", method: "邮编区间", status: "启用", updated: "2026-10-01", refs: 18,
      rules: [
        { zone: "Z1 美西", from: "90000", to: "96999", note: "含 CA/NV/AZ 部分" },
        { zone: "Z2 美中", from: "60000", to: "79999", note: "" },
        { zone: "Z3 美东", from: "10000", to: "39999", note: "" },
        { zone: "Z4 偏远", from: "99500", to: "99999", note: "阿拉斯加/夏威夷，加收偏远" }
      ]
    },
    {
      id: "Z02", name: "欧洲分区-2026", country: "DE", method: "国家+邮编前缀", status: "启用", updated: "2026-09-15", refs: 9,
      rules: [
        { zone: "EU-1 核心", from: "DE/FR/NL/BE", to: "—", note: "主要城市 2-4 天" },
        { zone: "EU-2 外围", from: "IT/ES/PL", to: "—", note: "5-7 天" },
        { zone: "EU-3 岛屿", from: "IE/IS", to: "—", note: "偏远，单独报价" }
      ]
    },
    {
      id: "Z03", name: "加拿大分区-2026", country: "CA", method: "邮编首字母", status: "停用", updated: "2026-07-20", refs: 0,
      rules: [
        { zone: "CA-西", from: "V", to: "V", note: "BC 省，含温哥华" },
        { zone: "CA-东", from: "M", to: "M", note: "安大略，含多伦多" }
      ]
    }
  ],

  surcharges: [
    {
      id: "S01", name: "美国海派附加费组", product: "P001", status: "启用", version: "v7", updated: "2026-10-10", refs: 3,
      items: [
        { fee: "FUEL", mode: "比例", value: "12%", base: "基础运费", min: "20 元/票", stack: "叠加" },
        { fee: "REMOTE", mode: "固定", value: "350 元", base: "—", min: "—", stack: "取高（与住宅）" },
        { fee: "RESIDENTIAL", mode: "固定", value: "120 元", base: "—", min: "—", stack: "取高（与偏远）" },
        { fee: "PEAK", mode: "按重", value: "1.20 元/kg", base: "计费重", min: "—", stack: "叠加（11-12 月）" }
      ]
    },
    {
      id: "S02", name: "欧洲海派附加费组", product: "P003", status: "启用", version: "v4", updated: "2026-09-30", refs: 2,
      items: [
        { fee: "FUEL", mode: "比例", value: "10%", base: "基础运费", min: "15 元/票", stack: "叠加" },
        { fee: "OVERSIZE", mode: "固定", value: "200 元/件", base: "—", min: "—", stack: "叠加" }
      ]
    },
    {
      id: "S03", name: "美森快船附加费组", product: "P006", status: "启用", version: "v3", updated: "2026-10-15", refs: 1,
      items: [
        { fee: "FUEL", mode: "比例", value: "14%", base: "基础运费", min: "25 元/票", stack: "叠加" },
        { fee: "REMOTE", mode: "固定", value: "380 元", base: "—", min: "—", stack: "互斥（住宅）" }
      ]
    }
  ],

  warehouses: [
    { code: "WH01", name: "深圳宝安仓", city: "深圳", billing: "深圳", region: "华南", address: "宝安区福永街道物流园 B3", transfer: "—", status: "启用", org: "SZ01" },
    { code: "WH02", name: "广州南沙仓", city: "广州", billing: "广州", region: "华南", address: "南沙区龙穴岛保税仓 2 号", transfer: "0.10 元/kg（提货仓=深圳）", status: "启用", org: "GZ01" },
    { code: "WH03", name: "宁波北仑仓", city: "宁波", billing: "宁波", region: "华东", address: "北仑区梅山保税港区 A 库", transfer: "0.15 元/kg（提货仓=华南）", status: "启用", org: "NB01" },
    { code: "WH04", name: "上海外高桥仓", city: "上海", billing: "上海", region: "华东", address: "浦东新区外高桥保税区 5 号", transfer: "0.15 元/kg（提货仓=华南）", status: "启用", org: "SH01" },
    { code: "WH05", name: "厦门海沧仓", city: "厦门", billing: "厦门", region: "华南", address: "海沧区保税港区 1 号库", transfer: "0.12 元/kg（提货仓=华东）", status: "启用", org: "XM01" },
    { code: "WH06", name: "义乌集货仓", city: "义乌", billing: "宁波", region: "华东", address: "义乌市国际陆港物流园", transfer: "0.08 元/kg（计费地点=宁波）", status: "停用", org: "YW01" }
  ],

  roles: [
    { code: "R01", name: "价格管理员", users: 3, scope: "全部价格组", desc: "维护底价、公布价、套餐价、客户价与模版；可查看底价", perms: { base: true, basePrice: true, publish: true, package: true, custPrice: true, inquiry: true, quote: true, billing: true, approve: true } },
    { code: "R02", name: "销售", users: 18, scope: "本人名下客户", desc: "查看客户价与报价单，发起询价、录入销售报价；不可见底价", perms: { base: false, basePrice: false, publish: true, package: false, custPrice: true, inquiry: true, quote: true, billing: false, approve: false } },
    { code: "R03", name: "纵队", users: 9, scope: "所属产品线", desc: "查看询价并录入成本、适用范围；成本仅内部可见", perms: { base: false, basePrice: false, publish: true, package: false, custPrice: false, inquiry: true, quote: false, billing: false, approve: false } },
    { code: "R04", name: "港前", users: 6, scope: "所属口岸", desc: "确认可承运性、录入附加费与限制条件", perms: { base: false, basePrice: false, publish: false, package: false, custPrice: false, inquiry: true, quote: false, billing: false, approve: false } },
    { code: "R05", name: "财务", users: 4, scope: "全部客户", desc: "查看计费结果、发起改价/勘误、查看对账状态", perms: { base: false, basePrice: false, publish: false, package: false, custPrice: false, inquiry: false, quote: false, billing: true, approve: true } },
    { code: "R06", name: "系统管理员", users: 2, scope: "全部数据", desc: "角色、数据范围、接口监控与日志；默认不可见底价明细", perms: { base: true, basePrice: false, publish: false, package: false, custPrice: false, inquiry: false, quote: false, billing: false, approve: false } }
  ],

  users: [
    { name: "杨鑫", role: "价格管理员", dept: "B 技术部", scope: "全部价格组", status: "启用", last: "2026-10-22 19:42" },
    { name: "张伟", role: "销售", dept: "华东销售一组", scope: "凯琦、云途美国", status: "启用", last: "2026-10-22 18:10" },
    { name: "李娜", role: "销售", dept: "华东销售二组", scope: "纽酷", status: "启用", last: "2026-10-22 17:36" },
    { name: "王强", role: "纵队", dept: "美线纵队", scope: "美国海派/美森", status: "启用", last: "2026-10-22 16:22" },
    { name: "刘洋", role: "纵队", dept: "欧线纵队", scope: "欧洲海派/空派", status: "启用", last: "2026-10-22 11:05" },
    { name: "赵敏", role: "港前", dept: "深圳口岸", scope: "深圳/广州", status: "启用", last: "2026-10-22 15:48" },
    { name: "陈晨", role: "财务", dept: "业财结算组", scope: "全部客户", status: "启用", last: "2026-10-22 19:20" },
    { name: "周静", role: "销售", dept: "华南销售一组", scope: "锦联", status: "停用", last: "2026-09-30 10:12" }
  ],

  basePrices: [
    { id: "BP001", product: "P001", country: "US", fee: "BASE_FREIGHT", price: 12.5, unit: "KG", currency: "CNY", from: "2026-07-01", to: "2026-12-31", status: "生效", approval: "OA-2026-0912", updated: "2026-09-12", by: "杨鑫" },
    { id: "BP002", product: "P002", country: "US", fee: "BASE_FREIGHT", price: 14.2, unit: "KG", currency: "CNY", from: "2026-07-01", to: "2026-12-31", status: "生效", approval: "OA-2026-0913", updated: "2026-09-13", by: "杨鑫" },
    { id: "BP003", product: "P003", country: "DE", fee: "BASE_FREIGHT", price: 9.8, unit: "KG", currency: "CNY", from: "2026-07-01", to: "2026-12-31", status: "生效", approval: "OA-2026-0831", updated: "2026-08-31", by: "杨鑫" },
    { id: "BP004", product: "P004", country: "DE", fee: "BASE_FREIGHT", price: 22.5, unit: "KG", currency: "CNY", from: "2026-07-01", to: "2026-12-31", status: "生效", approval: "OA-2026-0831", updated: "2026-08-31", by: "杨鑫" },
    { id: "BP005", product: "P005", country: "US", fee: "BASE_FREIGHT", price: 38000, unit: "柜", currency: "CNY", from: "2026-08-01", to: "2026-12-31", status: "生效", approval: "OA-2026-0809", updated: "2026-08-09", by: "杨鑫" },
    { id: "BP006", product: "P006", country: "US", fee: "BASE_FREIGHT", price: 15.8, unit: "KG", currency: "CNY", from: "2026-08-01", to: "2026-12-31", status: "生效", approval: "OA-2026-0805", updated: "2026-08-05", by: "杨鑫" },
    { id: "BP007", product: "P007", country: "GB", fee: "BASE_FREIGHT", price: 11.2, unit: "KG", currency: "CNY", from: "2026-07-01", to: "2026-12-31", status: "生效", approval: "OA-2026-0720", updated: "2026-07-20", by: "杨鑫" },
    { id: "BP008", product: "P008", country: "CA", fee: "BASE_FREIGHT", price: 13.6, unit: "KG", currency: "CNY", from: "2026-11-01", to: "2027-06-30", status: "审批中", approval: "OA-2026-1022-01", updated: "2026-10-22", by: "杨鑫" },
    { id: "BP009", product: "P001", country: "US", fee: "FUEL", price: 0, unit: "%", currency: "CNY", from: "2026-10-01", to: "2026-10-31", status: "已失效", approval: "—", updated: "2026-09-28", by: "杨鑫" },
    { id: "BP010", product: "P007", country: "GB", fee: "BASE_FREIGHT", price: 10.9, unit: "KG", currency: "CNY", from: "2026-11-01", to: "2027-06-30", status: "已驳回", approval: "OA-2026-1018-03", updated: "2026-10-18", by: "杨鑫" }
  ],

  publishPrices: [
    { id: "AP001", product: "P001", country: "US", zone: "Z1 美西", warehouse: "WH01", price: 18.5, base: 12.5, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v12", updated: "2026-10-01", by: "杨鑫" },
    { id: "AP002", product: "P001", country: "US", zone: "Z2 美中", warehouse: "WH01", price: 19.2, base: 12.5, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v12", updated: "2026-10-01", by: "杨鑫" },
    { id: "AP003", product: "P001", country: "US", zone: "Z3 美东", warehouse: "WH01", price: 20.1, base: 12.5, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v12", updated: "2026-10-01", by: "杨鑫" },
    { id: "AP004", product: "P002", country: "US", zone: "Z1 美西", warehouse: "WH01", price: 21.0, base: 14.2, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v9", updated: "2026-10-01", by: "杨鑫" },
    { id: "AP005", product: "P003", country: "DE", zone: "EU-1 核心", warehouse: "WH03", price: 14.6, base: 9.8, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v10", updated: "2026-09-30", by: "杨鑫" },
    { id: "AP006", product: "P004", country: "DE", zone: "EU-1 核心", warehouse: "WH03", price: 32.0, base: 22.5, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v6", updated: "2026-09-30", by: "杨鑫" },
    { id: "AP007", product: "P005", country: "US", zone: "整柜", warehouse: "WH02", price: 46800, base: 38000, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v4", updated: "2026-10-12", by: "杨鑫" },
    { id: "AP008", product: "P006", country: "US", zone: "Z1 美西", warehouse: "WH01", price: 22.8, base: 15.8, from: "2026-10-01", to: "2026-12-31", status: "生效", version: "v5", updated: "2026-10-15", by: "杨鑫" },
    { id: "AP009", product: "P007", country: "GB", zone: "UK-1", warehouse: "WH03", price: 16.4, base: 11.2, from: "2026-09-01", to: "2026-12-31", status: "生效", version: "v2", updated: "2026-08-28", by: "杨鑫" },
    { id: "AP010", product: "P008", country: "CA", zone: "CA-东", warehouse: "WH01", price: 19.8, base: 13.6, from: "2026-07-01", to: "2026-09-30", status: "已失效", version: "v1", updated: "2026-07-20", by: "杨鑫" },
    { id: "AP011", product: "P001", country: "US", zone: "Z1 美西", warehouse: "WH01", price: 19.0, base: 12.5, from: "2026-11-01", to: "2027-01-31", status: "审批中", version: "v13-draft", updated: "2026-10-22", by: "杨鑫" }
  ],

  packages: [
    { id: "PK001", product: "P001", country: "US", zone: "Z1 美西", A: 18.5, B: 17.8, C: 17.0, D: 16.2, E: 15.4, base: 12.5, rule: "固定价差（0.7/0.8/0.8/0.8）", status: "生效", version: "v12" },
    { id: "PK002", product: "P001", country: "US", zone: "Z2 美中", A: 19.2, B: 18.4, C: 17.6, D: 16.8, E: 16.0, base: 12.5, rule: "固定价差", status: "生效", version: "v12" },
    { id: "PK003", product: "P001", country: "US", zone: "Z3 美东", A: 20.1, B: 19.3, C: 18.5, D: 17.7, E: 16.9, base: 12.5, rule: "固定价差", status: "生效", version: "v12" },
    { id: "PK004", product: "P002", country: "US", zone: "Z1 美西", A: 21.0, B: 20.0, C: 19.0, D: 18.0, E: 17.0, base: 14.2, rule: "固定价差", status: "生效", version: "v9" },
    { id: "PK005", product: "P003", country: "DE", zone: "EU-1 核心", A: 14.6, B: 14.0, C: 13.4, D: 12.8, E: 12.2, base: 9.8, rule: "固定价差", status: "生效", version: "v10" },
    { id: "PK006", product: "P006", country: "US", zone: "Z1 美西", A: 22.8, B: 21.8, C: 20.8, D: 19.8, E: 18.8, base: 15.8, rule: "固定价差", status: "生效", version: "v5" },
    { id: "PK007", product: "P007", country: "GB", zone: "UK-1", A: 16.4, B: 15.7, C: 15.0, D: 14.3, E: 13.6, base: 11.2, rule: "固定价差", status: "生效", version: "v2" },
    { id: "PK008", product: "P001", country: "US", zone: "Z1 美西", A: 19.0, B: 18.3, C: 17.5, D: 16.5, E: 15.7, base: 12.5, rule: "固定价差（D 调整）", status: "审批中", version: "v13-draft" }
  ],

  custBindings: [
    { id: "CB001", customer: "C001", product: "P001", package: "E", from: "2026-10-01", to: "2026-12-31", status: "生效", updated: "2026-10-08", by: "杨鑫" },
    { id: "CB002", customer: "C001", product: "P003", package: "D", from: "2026-09-01", to: "2026-12-31", status: "生效", updated: "2026-09-01", by: "杨鑫" },
    { id: "CB003", customer: "C002", product: "P001", package: "D", from: "2026-10-01", to: "2026-12-31", status: "生效", updated: "2026-10-02", by: "杨鑫" },
    { id: "CB004", customer: "C003", product: "P001", package: "C", from: "2026-08-01", to: "2026-12-31", status: "生效", updated: "2026-08-01", by: "杨鑫" },
    { id: "CB005", customer: "C004", product: "P001", package: "B", from: "2026-10-01", to: "2026-12-31", status: "生效", updated: "2026-10-01", by: "杨鑫" },
    { id: "CB006", customer: "C005", product: "P002", package: "C", from: "2026-09-15", to: "2026-12-31", status: "生效", updated: "2026-09-15", by: "杨鑫" },
    { id: "CB007", customer: "C002", product: "P006", package: "E", from: "2026-10-01", to: "2026-12-31", status: "生效", updated: "2026-10-05", by: "杨鑫" },
    { id: "CB008", customer: "C003", product: "P003", package: "D", from: "2026-11-01", to: "2027-03-31", status: "待生效", updated: "2026-10-20", by: "杨鑫" }
  ],

  custPrices: [
    { id: "CP001", customer: "C001", product: "P001", fee: "FUEL", price: 1.8, unit: "KG", from: "2026-10-01", to: "2026-12-31", status: "生效", check: "高于底价", approval: "—", updated: "2026-10-08", by: "杨鑫", note: "客户协议固定燃油单价" },
    { id: "CP002", customer: "C002", product: "P001", fee: "BASE_FREIGHT", price: 15.8, unit: "KG", from: "2026-10-01", to: "2026-12-31", status: "生效", check: "高于底价", approval: "—", updated: "2026-10-02", by: "杨鑫", note: "与套餐 D 同价，锁定至年底" },
    { id: "CP003", customer: "C004", product: "P001", fee: "BASE_FREIGHT", price: 12.0, unit: "KG", from: "2026-11-01", to: "2026-12-31", status: "审批中", check: "低于底价 0.5", approval: "OA-2026-1021-03", updated: "2026-10-21", by: "杨鑫", note: "客户承诺月出货 3 柜" },
    { id: "CP004", customer: "C005", product: "P002", fee: "BASE_FREIGHT", price: 18.5, unit: "KG", from: "2026-09-15", to: "2026-12-31", status: "生效", check: "高于底价", approval: "OA-2026-0915-01", updated: "2026-09-15", by: "杨鑫", note: "低于套餐 C，走专项审批通过" },
    { id: "CP005", customer: "C003", product: "P003", fee: "BASE_FREIGHT", price: 13.0, unit: "KG", from: "2026-10-01", to: "2026-12-31", status: "生效", check: "高于底价", approval: "OA-2026-0928-02", updated: "2026-09-28", by: "杨鑫", note: "欧洲线年度协议" },
    { id: "CP006", customer: "C001", product: "P003", fee: "FUEL", price: 1.2, unit: "KG", from: "2026-09-01", to: "2026-12-31", status: "生效", check: "高于底价", approval: "—", updated: "2026-09-01", by: "杨鑫", note: "固定燃油单价" },
    { id: "CP007", customer: "C006", product: "P001", fee: "BASE_FREIGHT", price: 2.68, unit: "KG", from: "2026-10-01", to: "2026-12-31", status: "生效", check: "美元价目表", approval: "—", updated: "2026-10-01", by: "杨鑫", note: "USD 独立价目表 v3" }
  ],

  weightRules: [
    { id: "WR001", scope: "产品", product: "P001", customer: "—", box: "—", divisor: 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", bubble: "—", status: "生效", updated: "2026-08-01" },
    { id: "WR002", scope: "产品", product: "P002", customer: "—", box: "—", divisor: 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", bubble: "—", status: "生效", updated: "2026-08-01" },
    { id: "WR003", scope: "产品", product: "P003", customer: "—", box: "—", divisor: 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", bubble: "—", status: "生效", updated: "2026-08-01" },
    { id: "WR004", scope: "客户", product: "P001", customer: "C001", box: "60×50×40cm", divisor: 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", bubble: "计费重≥100kg 95 折", status: "生效", updated: "2026-10-08" },
    { id: "WR005", scope: "客户", product: "P001", customer: "C002", box: "70×50×50cm", divisor: 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", bubble: "—", status: "生效", updated: "2026-10-02" },
    { id: "WR006", scope: "客户", product: "P001", customer: "C004", box: "50×40×40cm", divisor: 6000, round: "0.5kg 进位", ticketRound: "1kg 进位", bubble: "—", status: "审批中", updated: "2026-10-21" },
    { id: "WR007", scope: "产品", product: "P006", customer: "—", box: "—", divisor: 6000, round: "1kg 进位", ticketRound: "1kg 进位", bubble: "—", status: "生效", updated: "2026-09-01" }
  ],

  discounts: [
    { id: "DS001", scope: "客户", customer: "C001", product: "P001", threshold: "计费重 ≥ 100kg", rate: "95 折", priority: "客户优先", status: "生效", updated: "2026-10-08" },
    { id: "DS002", scope: "产品", customer: "—", product: "P001", threshold: "计费重 ≥ 500kg", rate: "97 折", priority: "产品兜底", status: "生效", updated: "2026-08-01" },
    { id: "DS003", scope: "客户", customer: "C005", product: "P002", threshold: "计费重 ≥ 300kg", rate: "98 折", priority: "客户优先", status: "生效", updated: "2026-09-15" }
  ],

  quoteTemplates: [
    { id: "QT01", name: "美国海派产品价版式", type: "产品价", scope: "美国 / 海派", layout: "重量段", version: "V12", status: "启用", updated: "2026-10-01", refs: 4, sections: ["基础运费", "附加费明细", "计费说明", "参考时效"], fields: ["重量段", "单价", "生效时间", "参考时效"] },
    { id: "QT02", name: "欧洲海派产品价版式", type: "产品价", scope: "欧洲 / 海派", layout: "重量段", version: "V5", status: "启用", updated: "2026-09-28", refs: 2, sections: ["基础运费", "附加费明细", "计费说明", "理赔免责"], fields: ["体积段", "单价", "起收量", "生效时间"] },
    { id: "QT03", name: "客户专属报价单版式", type: "客户价", scope: "按客户生成", layout: "重量段", version: "V3", status: "启用", updated: "2026-10-08", refs: 3, sections: ["基础运费", "附加费明细", "参考时效", "保价说明", "理赔免责"], fields: ["目的国家", "分区", "套餐价", "有效期"] },
    { id: "QT04", name: "整柜一口价版式", type: "产品价", scope: "美国 / 整柜", layout: "一口价", version: "V4", status: "启用", updated: "2026-10-12", refs: 1, sections: ["基础运费", "附加费明细", "计费说明"], fields: ["柜型", "一口价", "包含项", "生效时间"] }
  ],

  quoteMaterials: [
    { id: "QM01", name: "美国海派附加费与计费说明", category: "附加费说明", product: "P001", version: "v7", updated: "2026-10-10", refs: 3, content: "燃油附加费按基础运费 12% 收取；偏远地址 350 元/票；住宅地址 120 元/票；偏远与住宅取高收取。旺季附加费 11-12 月 1.20 元/kg。" },
    { id: "QM02", name: "欧洲海派附加费说明", category: "附加费说明", product: "P003", version: "v4", updated: "2026-09-30", refs: 2, content: "燃油附加费按基础运费 10%；超长超重 200 元/件；目的港查验费实报实销。" },
    { id: "QM03", name: "体积重与计费重规则", category: "计费规则", product: "通用", version: "v3", updated: "2026-08-01", refs: 5, content: "材积系数 6000；单箱计费重取实重与材积重较大值，按 0.5kg 进位；整票按 1kg 进位。客户另有箱规的，按客户规则优先。" },
    { id: "QM04", name: "理赔与免责条款", category: "理赔与免责", product: "通用", version: "v2", updated: "2026-07-15", refs: 4, content: "未保价货物按运费的 3 倍赔偿；易碎品、液体、带电产品需提前申报；不可抗力导致的延误不承担赔偿责任。" },
    { id: "QM05", name: "保价服务说明", category: "保价", product: "通用", version: "v2", updated: "2026-07-15", refs: 3, content: "保价费按申报价值 0.3% 收取，最低 20 元/票；保价货物需提供真实货值证明，最高保额 50 万元/票。" },
    { id: "QM06", name: "美国海派参考时效", category: "船期与时效", product: "P001", version: "v5", updated: "2026-10-01", refs: 3, content: "深圳/宁波起运，开船后 14-18 天到港，提柜后 3-5 天派送；旺季可能顺延 3-5 天。" },
    { id: "QM07", name: "收货仓与截单时间", category: "收货仓", product: "通用", version: "v2", updated: "2026-09-01", refs: 6, content: "深圳宝安仓：周一至周六 09:00-18:00，截单 16:00；宁波北仑仓：周一至周五 09:00-17:00，截单 15:00。" },
    { id: "QM08", name: "品牌与资质图片", category: "图片附件", product: "通用", version: "v1", updated: "2026-06-01", refs: 2, content: "营业执照、NVOCC 资质、美国 FMC 备案、品牌 Logo（PNG/SVG）。" }
  ],

  orders: [
    { id: "ORD20261018001", customer: "C005", product: "P002", status: "已锁价", price: 17.9, weight: 950, volume: 7.8, createdAt: "2026-10-18", inquiry: "INQ20261021005" },
    { id: "ORD20261019002", customer: "C003", product: "P001", status: "已锁价", price: 16.8, weight: 5200, volume: 22.5, createdAt: "2026-10-19", inquiry: "INQ20261019008" },
    { id: "ORD20261020003", customer: "C001", product: "P001", status: "已锁价", price: 15.9, weight: 3600, volume: 18, createdAt: "2026-10-20", inquiry: "INQ20261021011" },
    { id: "ORD20261021004", customer: "C002", product: "P001", status: "待锁价", price: 16.4, weight: 860, volume: 6.2, createdAt: "2026-10-21", inquiry: "" },
    { id: "ORD20261022005", customer: "C004", product: "P001", status: "待锁价", price: 17.2, weight: 2400, volume: 14.2, createdAt: "2026-10-22", inquiry: "" },
    { id: "ORD20261022006", customer: "C001", product: "P003", status: "待锁价", price: 12.9, weight: 1600, volume: 9.1, createdAt: "2026-10-22", inquiry: "" },
    { id: "ORD20261021007", customer: "C004", product: "P001", status: "待锁价", price: 17.0, weight: 2300, volume: 13.8, createdAt: "2026-10-21", inquiry: "" }
  ],

  inquiries: [
    {
      id: "INQ20261022001", customer: "C001", product: "P001", country: "US", type: "标准产品", cargo: "家具配件", pieces: 60, weight: 1200, volume: 8.6,
      addressType: "商业地址", city: "洛杉矶", zip: "90013", address: "Los Angeles St 1200, CA 90013", transit: "7-10 天",
      status: "待成本", owner: "王强", sales: "张伟", createdAt: "2026-10-22 09:12", validUntil: "2026-11-05", slaDue: "2026-10-22 23:00",
      cost: null, risk: null, quote: null, bind: null,
      aiRisk: { level: "低", text: "品名“家具配件”无敏感词；含木制件，建议确认是否需要熏蒸证明。" },
      timeline: [
        { time: "2026-10-22 09:12", actor: "张伟", action: "创建询价", note: "由客户微信询价录入，AI 识别回填 8 个字段" },
        { time: "2026-10-22 09:13", actor: "系统", action: "自动分派", note: "按产品+国家路由至美线纵队 / 王强；港前 / 赵敏" }
      ]
    },
    {
      id: "INQ20261022002", customer: "C002", product: "P002", country: "US", type: "标准产品", cargo: "瑜伽垫", pieces: 120, weight: 860, volume: 6.2,
      addressType: "住宅地址", city: "纽约", zip: "10001", address: "W 28th St 350, New York, NY 10001", transit: "10-12 天",
      status: "待风控", owner: "刘洋", sales: "李娜", createdAt: "2026-10-22 08:40", validUntil: "2026-11-05", slaDue: "2026-10-22 21:30",
      cost: { unit: 16.8, scope: "美国海派快递，含尾程", note: "成本有效期 7 天", by: "刘洋", at: "2026-10-22 11:05" },
      risk: null, quote: null, bind: null,
      aiRisk: { level: "低", text: "瑜伽垫为普货；体积重可能高于实重，建议按 6000 材积系数复核。" },
      timeline: [
        { time: "2026-10-22 08:40", actor: "李娜", action: "创建询价", note: "客户指定住宅地址" },
        { time: "2026-10-22 09:02", actor: "系统", action: "自动分派", note: "美线纵队 / 刘洋；深圳口岸 / 赵敏" },
        { time: "2026-10-22 11:05", actor: "刘洋", action: "录入成本", note: "成本 16.8 元/kg，含尾程" }
      ]
    },
    {
      id: "INQ20261022003", customer: "C003", product: "P003", country: "DE", type: "标准产品", cargo: "五金件", pieces: 45, weight: 1800, volume: 5.4,
      addressType: "商业地址", city: "汉堡", zip: "20457", address: "Hamburg Hafen 12, 20457", transit: "25-30 天",
      status: "待报价", owner: "刘洋", sales: "王强", createdAt: "2026-10-22 08:05", validUntil: "2026-11-08", slaDue: "2026-10-23 12:00",
      cost: { unit: 11.2, scope: "欧洲海派，汉堡清关", note: "不含目的港杂费", by: "刘洋", at: "2026-10-22 10:20" },
      risk: { ok: true, note: "普货，可承运；五金件需确认是否含电池", surcharges: [{ fee: "FUEL", value: "10%", note: "按基础运费" }], by: "赵敏", at: "2026-10-22 12:10" },
      quote: null, bind: null,
      aiRisk: { level: "中", text: "五金件可能含锂电池组件，建议港前确认 MSDS；如含电需改走带电渠道。" },
      timeline: [
        { time: "2026-10-22 08:05", actor: "王强", action: "创建询价", note: "客户年度协议客户" },
        { time: "2026-10-22 10:20", actor: "刘洋", action: "录入成本", note: "成本 11.2 元/kg" },
        { time: "2026-10-22 12:10", actor: "赵敏", action: "确认可承运", note: "普货可承运；燃油 10%" }
      ]
    },
    {
      id: "INQ20261021004", customer: "C004", product: "P001", country: "US", type: "标准产品", cargo: "小家电", pieces: 200, weight: 2400, volume: 14.2,
      addressType: "商业地址", city: "芝加哥", zip: "60601", address: "N Michigan Ave 200, Chicago, IL 60601", transit: "12-15 天",
      status: "已报价", owner: "王强", sales: "赵敏", createdAt: "2026-10-21 14:20", validUntil: "2026-10-29", slaDue: "2026-10-22 18:00",
      cost: { unit: 14.9, scope: "美国海派卡派", note: "含燃油", by: "王强", at: "2026-10-21 16:00" },
      risk: { ok: true, note: "小家电不含电，可承运", surcharges: [{ fee: "FUEL", value: "12%", note: "" }, { fee: "REMOTE", value: "350 元/票", note: "60601 非偏远" }], by: "赵敏", at: "2026-10-21 17:20" },
      quote: { mode: "单价", price: 16.2, validDays: 7, note: "含燃油，不含住宅附加费", by: "赵敏", at: "2026-10-21 18:30", belowBase: false },
      bind: null,
      aiRisk: { level: "低", text: "小家电需确认是否含内置电池；当前按普货报价。" },
      timeline: [
        { time: "2026-10-21 14:20", actor: "赵敏", action: "创建询价", note: "" },
        { time: "2026-10-21 16:00", actor: "王强", action: "录入成本", note: "成本 14.9 元/kg" },
        { time: "2026-10-21 17:20", actor: "赵敏", action: "确认可承运", note: "燃油 12%" },
        { time: "2026-10-21 18:30", actor: "赵敏", action: "录入销售报价", note: "16.2 元/kg，有效期 7 天" }
      ]
    },
    {
      id: "INQ20261021005", customer: "C005", product: "P002", country: "US", type: "标准产品", cargo: "户外用品", pieces: 80, weight: 950, volume: 7.8,
      addressType: "商业地址", city: "西雅图", zip: "98101", address: "Pike St 1500, Seattle, WA 98101", transit: "10-12 天",
      status: "已绑定", owner: "刘洋", sales: "陈晨", createdAt: "2026-10-21 10:10", validUntil: "2026-10-28", slaDue: "2026-10-22 10:00",
      cost: { unit: 15.6, scope: "美国海派快递", note: "", by: "刘洋", at: "2026-10-21 11:00" },
      risk: { ok: true, note: "户外用品可承运", surcharges: [{ fee: "FUEL", value: "12%", note: "" }], by: "赵敏", at: "2026-10-21 13:10" },
      quote: { mode: "单价", price: 17.9, validDays: 10, note: "含燃油", by: "陈晨", at: "2026-10-21 14:00", belowBase: false },
      bind: { orderId: "ORD20261018001", orderPrice: 17.9, boundAt: "2026-10-21 15:20", by: "陈晨" },
      aiRisk: { level: "低", text: "户外用品含金属支架，建议确认是否超长（单件 >1.5m）。" },
      timeline: [
        { time: "2026-10-21 10:10", actor: "陈晨", action: "创建询价", note: "" },
        { time: "2026-10-21 11:00", actor: "刘洋", action: "录入成本", note: "成本 15.6 元/kg" },
        { time: "2026-10-21 13:10", actor: "赵敏", action: "确认可承运", note: "" },
        { time: "2026-10-21 14:00", actor: "陈晨", action: "录入销售报价", note: "17.9 元/kg" },
        { time: "2026-10-21 15:20", actor: "陈晨", action: "绑定订单", note: "ORD20261018001，订单价 17.9 元/kg 锁价" }
      ]
    },
    {
      id: "INQ20261020006", customer: "C001", product: "P003", country: "FR", type: "标准产品", cargo: "纺织品", pieces: 150, weight: 1600, volume: 9.1,
      addressType: "商业地址", city: "巴黎", zip: "75001", address: "Rue de Rivoli 50, 75001 Paris", transit: "25-30 天",
      status: "已失效", owner: "刘洋", sales: "张伟", createdAt: "2026-10-20 09:00", validUntil: "2026-10-21", slaDue: "2026-10-21 18:00",
      cost: { unit: 11.8, scope: "欧洲海派，法国派送", note: "", by: "刘洋", at: "2026-10-20 10:00" },
      risk: { ok: true, note: "纺织品可承运", surcharges: [{ fee: "FUEL", value: "10%", note: "" }], by: "赵敏", at: "2026-10-20 11:00" },
      quote: { mode: "单价", price: 13.6, validDays: 1, note: "", by: "张伟", at: "2026-10-20 12:00", belowBase: false },
      bind: null,
      aiRisk: { level: "低", text: "纺织品无风险；注意欧盟关税起征点。" },
      timeline: [
        { time: "2026-10-20 09:00", actor: "张伟", action: "创建询价", note: "" },
        { time: "2026-10-20 12:00", actor: "张伟", action: "录入销售报价", note: "13.6 元/kg，有效期 1 天" },
        { time: "2026-10-21 18:00", actor: "系统", action: "询价失效", note: "超过有效期未绑定订单" }
      ]
    },
    {
      id: "INQ20261022007", customer: "C002", product: "P006", country: "US", type: "标准产品", cargo: "健身器材", pieces: 30, weight: 680, volume: 3.2,
      addressType: "商业地址", city: "洛杉矶", zip: "90015", address: "S Figueroa St 800, Los Angeles, CA 90015", transit: "11-13 天",
      status: "待成本", owner: "王强", sales: "李娜", createdAt: "2026-10-22 07:30", validUntil: "2026-11-05", slaDue: "2026-10-22 15:00",
      cost: null, risk: null, quote: null, bind: null,
      aiRisk: { level: "中", text: "健身器材单件可能超 30kg，触发超重附加费；建议按件拆分箱规。" },
      timeline: [
        { time: "2026-10-22 07:30", actor: "李娜", action: "创建询价", note: "复制自 INQ20261020006" },
        { time: "2026-10-22 07:31", actor: "系统", action: "超时提醒", note: "待成本已超 5 小时，已推送飞书待办" }
      ]
    },
    {
      id: "INQ20261019008", customer: "C003", product: "P001", country: "US", type: "标准产品", cargo: "汽车配件", pieces: 500, weight: 5200, volume: 22.5,
      addressType: "商业地址", city: "休斯顿", zip: "77001", address: "Main St 1100, Houston, TX 77001", transit: "12-15 天",
      status: "已绑定", owner: "王强", sales: "王强", createdAt: "2026-10-19 09:20", validUntil: "2026-10-26", slaDue: "2026-10-19 18:00",
      cost: { unit: 13.6, scope: "美国海派卡派，大票", note: "含拖车", by: "王强", at: "2026-10-19 10:00" },
      risk: { ok: true, note: "汽车配件可承运", surcharges: [{ fee: "FUEL", value: "12%", note: "" }], by: "赵敏", at: "2026-10-19 11:00" },
      quote: { mode: "单价", price: 16.8, validDays: 7, note: "大票协议价", by: "王强", at: "2026-10-19 12:00", belowBase: false },
      bind: { orderId: "ORD20261019002", orderPrice: 16.8, boundAt: "2026-10-19 14:00", by: "王强" },
      aiRisk: { level: "低", text: "汽车配件无电池，普货；木架包装可能产生托盘费。" },
      timeline: [
        { time: "2026-10-19 09:20", actor: "王强", action: "创建询价", note: "" },
        { time: "2026-10-19 12:00", actor: "王强", action: "录入销售报价", note: "16.8 元/kg" },
        { time: "2026-10-19 14:00", actor: "王强", action: "绑定订单", note: "ORD20261019002" }
      ]
    },
    {
      id: "INQ20261022009", customer: "C004", product: "P004", country: "DE", type: "标准产品", cargo: "电子配件", pieces: 60, weight: 320, volume: 1.8,
      addressType: "商业地址", city: "法兰克福", zip: "60311", address: "Zeil 80, 60311 Frankfurt", transit: "5-7 天",
      status: "待风控", owner: "刘洋", sales: "赵敏", createdAt: "2026-10-22 10:30", validUntil: "2026-11-06", slaDue: "2026-10-23 10:30",
      cost: { unit: 28.5, scope: "欧洲空派，含清关", note: "不含目的港 VAT", by: "刘洋", at: "2026-10-22 11:30" },
      risk: null, quote: null, bind: null,
      aiRisk: { level: "高", text: "电子配件疑似含锂电池，空运需 UN38.3/MSDS；未确认前不可按普货报价。" },
      timeline: [
        { time: "2026-10-22 10:30", actor: "赵敏", action: "创建询价", note: "客户要求空运" },
        { time: "2026-10-22 11:30", actor: "刘洋", action: "录入成本", note: "成本 28.5 元/kg" }
      ]
    },
    {
      id: "INQ20261022010", customer: "C005", product: "P008", country: "CA", type: "标准产品", cargo: "家居用品", pieces: 90, weight: 1100, volume: 6.6,
      addressType: "商业地址", city: "多伦多", zip: "M5V 2T6", address: "King St W 300, Toronto, ON M5V 2T6", transit: "18-22 天",
      status: "待报价", owner: "王强", sales: "陈晨", createdAt: "2026-10-22 09:40", validUntil: "2026-11-08", slaDue: "2026-10-23 15:00",
      cost: { unit: 15.2, scope: "加拿大海派，温哥华清关", note: "", by: "王强", at: "2026-10-22 13:00" },
      risk: { ok: true, note: "家居用品可承运；加拿大需提供进口商信息", surcharges: [{ fee: "FUEL", value: "12%", note: "" }], by: "赵敏", at: "2026-10-22 14:00" },
      quote: null, bind: null,
      aiRisk: { level: "中", text: "加拿大产品当前无生效公布价，报价前需先补齐价格；系统已拦截自动取价。" },
      timeline: [
        { time: "2026-10-22 09:40", actor: "陈晨", action: "创建询价", note: "" },
        { time: "2026-10-22 13:00", actor: "王强", action: "录入成本", note: "成本 15.2 元/kg" },
        { time: "2026-10-22 14:00", actor: "赵敏", action: "确认可承运", note: "可承运，需进口商信息" }
      ]
    },
    {
      id: "INQ20261021011", customer: "C001", product: "P001", country: "US", type: "标准产品", cargo: "玩具", pieces: 300, weight: 3600, volume: 18,
      addressType: "商业地址", city: "达拉斯", zip: "75201", address: "Main St 500, Dallas, TX 75201", transit: "12-15 天",
      status: "已报价", owner: "王强", sales: "张伟", createdAt: "2026-10-21 09:00", validUntil: "2026-10-28", slaDue: "2026-10-21 18:00",
      cost: { unit: 13.2, scope: "美国海派卡派", note: "", by: "王强", at: "2026-10-21 10:00" },
      risk: { ok: true, note: "玩具可承运；需 CPC 认证", surcharges: [{ fee: "FUEL", value: "12%", note: "" }], by: "赵敏", at: "2026-10-21 11:00" },
      quote: { mode: "单价", price: 15.9, validDays: 7, note: "大票协议价", by: "张伟", at: "2026-10-21 12:00", belowBase: false },
      bind: null,
      aiRisk: { level: "低", text: "玩具需 CPC 认证；不含电池。" },
      timeline: [
        { time: "2026-10-21 09:00", actor: "张伟", action: "创建询价", note: "" },
        { time: "2026-10-21 12:00", actor: "张伟", action: "录入销售报价", note: "15.9 元/kg" }
      ]
    },
    {
      id: "INQ20261022012", customer: "C002", product: "P003", country: "DE", type: "标准产品", cargo: "机械配件", pieces: 20, weight: 420, volume: 1.2,
      addressType: "商业地址", city: "慕尼黑", zip: "80331", address: "Sendlinger Str 10, 80331 München", transit: "25-30 天",
      status: "草稿", owner: "—", sales: "李娜", createdAt: "2026-10-22 18:40", validUntil: "—", slaDue: "—",
      cost: null, risk: null, quote: null, bind: null,
      aiRisk: { level: "待识别", text: "草稿尚未提交，AI 风险识别在提交后执行。" },
      timeline: [
        { time: "2026-10-22 18:40", actor: "李娜", action: "保存草稿", note: "地址与货量已填，待补充图片" }
      ]
    }
  ],

  quotes: [
    { id: "Q20261001", name: "美国海派产品公布价", type: "产品价", customer: "", countries: "美国", version: "V12", status: "已发布", generatedAt: "2026-10-01 10:00", publishedAt: "2026-10-02 09:30", owner: "杨鑫", itemCount: 18, failure: "", deliveries: [{ channel: "用户中心", to: "全部客户", at: "2026-10-02 09:30", status: "已送达" }] },
    { id: "Q20261002", name: "凯琦专属报价单", type: "客户价", customer: "C001", countries: "美国、德国", version: "V3", status: "已发布", generatedAt: "2026-10-08 14:00", publishedAt: "2026-10-08 16:20", owner: "杨鑫", itemCount: 12, failure: "", deliveries: [{ channel: "企业微信", to: "刘经理", at: "2026-10-08 16:25", status: "已送达" }, { channel: "用户中心", to: "凯琦", at: "2026-10-08 16:20", status: "已送达" }] },
    { id: "Q20261003", name: "纽酷专属报价单", type: "客户价", customer: "C002", countries: "美国", version: "V1", status: "待发布", generatedAt: "2026-10-22 15:00", publishedAt: "—", owner: "杨鑫", itemCount: 9, failure: "", deliveries: [] },
    { id: "Q20261004", name: "欧洲海派产品公布价", type: "产品价", customer: "", countries: "德国、法国、意大利", version: "V5", status: "已发布", generatedAt: "2026-09-28 11:00", publishedAt: "2026-09-28 15:00", owner: "杨鑫", itemCount: 15, failure: "", deliveries: [{ channel: "用户中心", to: "全部客户", at: "2026-09-28 15:05", status: "已送达" }] },
    { id: "Q20261005", name: "锦联专属报价单", type: "客户价", customer: "C003", countries: "美国、德国", version: "V2", status: "生成中", generatedAt: "2026-10-22 19:40", publishedAt: "—", owner: "杨鑫", itemCount: 11, failure: "", deliveries: [] },
    { id: "Q20261006", name: "英国海派产品公布价", type: "产品价", customer: "", countries: "英国", version: "V2", status: "生成失败", generatedAt: "2026-10-22 18:10", publishedAt: "—", owner: "杨鑫", itemCount: 0, failure: "P007/英国 缺少生效中的分区价格（UK-2）", deliveries: [] },
    { id: "Q20261007", name: "云途美国专属报价单", type: "客户价", customer: "C006", countries: "美国", version: "V1", status: "草稿", generatedAt: "—", publishedAt: "—", owner: "杨鑫", itemCount: 0, failure: "", deliveries: [] }
  ],

  bills: [
    {
      id: "B202610220001", orderId: "MT20261018001", childIds: "MT20261018001-01 ~ 06", customer: "C001", product: "P001", warehouse: "WH01", billingPoint: "深圳",
      actualWeight: 1200, volume: 8.6, chargeWeight: 1433.5, amount: 25255.01, currency: "CNY", status: "已计费", source: "签入计费", updated: "2026-10-22 10:20",
      priceLayer: "客户套餐 E", priceVersion: "v12", ruleVersion: "WR004", receipt: { ccos: "成功", oms: "成功", ars: "成功" },
      lines: [
        { fee: "基础运费", unit: "15.40 元/kg", qty: "1,433.5 kg", amount: 22075.9 },
        { fee: "燃油附加费", unit: "12%", qty: "基础运费", amount: 2649.11 },
        { fee: "偏远附加费", unit: "350 元/票", qty: "1 票", amount: 350 },
        { fee: "报关费", unit: "180 元/票", qty: "1 票", amount: 180 }
      ],
      traces: ["客户箱规 60×50×40cm，材积系数 6000", "子箱材积重合计 1433.4kg > 实重 1200kg", "单箱 0.5kg 进位，整票 1kg 进位 → 1433.5kg", "命中客户套餐 E（C001×P001），价格版本 v12"],
      messages: ["MSG202610220001", "MSG202610220002", "MSG202610220004"]
    },
    {
      id: "B202610220002", orderId: "MT20261018002", childIds: "MT20261018002-01 ~ 04", customer: "C002", product: "P002", warehouse: "WH03", billingPoint: "宁波",
      actualWeight: 860, volume: 6.2, chargeWeight: 1034, amount: 20965.44, currency: "CNY", status: "待回传", source: "到齐触发", updated: "2026-10-22 12:10",
      priceLayer: "客户套餐 D", priceVersion: "v9", ruleVersion: "WR005", receipt: { ccos: "成功", oms: "待回传", ars: "未出账" },
      lines: [
        { fee: "基础运费", unit: "18.00 元/kg", qty: "1,034 kg", amount: 18612 },
        { fee: "燃油附加费", unit: "12%", qty: "基础运费", amount: 2233.44 },
        { fee: "住宅地址附加费", unit: "120 元/票", qty: "1 票", amount: 120 }
      ],
      traces: ["产品规则 6000 材积系数（客户规则缺箱规，降级产品规则）", "材积重 1033.3kg > 实重 860kg", "整票 1kg 进位 → 1034kg", "命中客户套餐 D（C002×P001），价格版本 v9"],
      messages: ["MSG202610220003"]
    },
    {
      id: "B202610220003", orderId: "MT20261018003", childIds: "MT20261018003-01 ~ 03", customer: "C005", product: "P008", warehouse: "WH01", billingPoint: "深圳",
      actualWeight: 1100, volume: 6.6, chargeWeight: 1100, amount: 0, currency: "CNY", status: "计费失败", source: "签入计费", updated: "2026-10-22 09:40",
      priceLayer: "—", priceVersion: "—", ruleVersion: "WR001", receipt: { ccos: "失败", oms: "—", ars: "—" },
      error: "P008/加拿大 在 2026-10-22 无生效中的公布价；底价审批中（OA-2026-1022-01），不可取价。",
      lines: [],
      traces: ["产品规则命中 P008，材积系数 6000", "计费重 1100kg", "取价失败：公布价 AP010 已于 2026-09-30 失效", "按失败返回，不以 0 元兜底"],
      messages: ["MSG202610220005"]
    },
    {
      id: "B202610220004", orderId: "MT20261018004", childIds: "MT20261018004-01 ~ 05", customer: "C003", product: "P003", warehouse: "WH02", billingPoint: "广州",
      actualWeight: 1800, volume: 5.4, chargeWeight: 1800, amount: 26732, currency: "CNY", status: "已计费", source: "增值服务变更", updated: "2026-10-22 11:15",
      priceLayer: "客户套餐 C", priceVersion: "v10", ruleVersion: "WR003", receipt: { ccos: "成功", oms: "成功", ars: "成功" },
      lines: [
        { fee: "基础运费", unit: "13.40 元/kg", qty: "1,800 kg", amount: 24120 },
        { fee: "燃油附加费", unit: "10%", qty: "基础运费", amount: 2412 },
        { fee: "超长超重附加费", unit: "200 元/件", qty: "1 件", amount: 200 }
      ],
      traces: ["产品规则 P003：实重 1800kg > 材积重 900kg", "整票 1kg 进位 → 1800kg", "命中客户套餐 C（C003×P003），价格版本 v10", "增值服务“超长加固”变更后重算"],
      messages: ["MSG202610220006"]
    },
    {
      id: "B202610220005", orderId: "MT20261018005", childIds: "MT20261018005-01 ~ 08", customer: "C004", product: "P001", warehouse: "WH04", billingPoint: "上海",
      actualWeight: 2400, volume: 14.2, chargeWeight: 2400, amount: 47966.4, currency: "CNY", status: "重算中", source: "重量勘误", updated: "2026-10-22 16:30",
      priceLayer: "客户套餐 B", priceVersion: "v12", ruleVersion: "WR006", receipt: { ccos: "成功", oms: "待回传", ars: "未出账" },
      lines: [
        { fee: "基础运费", unit: "17.80 元/kg", qty: "2,400 kg", amount: 42720 },
        { fee: "燃油附加费", unit: "12%", qty: "基础运费", amount: 5126.4 },
        { fee: "住宅地址附加费", unit: "120 元/票", qty: "1 票", amount: 120 }
      ],
      traces: ["PDA 复核尺寸重量：2400kg → 2520kg（待客户箱规审批生效后按新规则重算）", "当前命中客户套餐 B（C004×P001），价格版本 v12", "重算中，暂以原结果展示"],
      messages: ["MSG202610220007"]
    },
    {
      id: "B202610220006", orderId: "MT20261018006", childIds: "MT20261018006-01 ~ 02", customer: "C005", product: "P002", warehouse: "WH05", billingPoint: "厦门",
      actualWeight: 950, volume: 7.8, chargeWeight: 1300, amount: 26936, currency: "CNY", status: "已计费", source: "签入计费", updated: "2026-10-22 14:05",
      priceLayer: "客户自由价", priceVersion: "CP004", ruleVersion: "WR002", receipt: { ccos: "成功", oms: "成功", ars: "未出账" },
      lines: [
        { fee: "基础运费", unit: "18.50 元/kg", qty: "1,300 kg", amount: 24050 },
        { fee: "燃油附加费", unit: "12%", qty: "基础运费", amount: 2886 }
      ],
      traces: ["产品规则 P002：材积重 1300kg > 实重 950kg", "整票 1kg 进位 → 1300kg", "取价：客户自由价 18.50 元/kg > 套餐 C 19.00", "价格版本 CP004"],
      messages: ["MSG202610220008"]
    },
    {
      id: "B202610210007", orderId: "MT20261017001", childIds: "MT20261017001-01 ~ 09", customer: "C001", product: "P001", warehouse: "WH01", billingPoint: "深圳",
      actualWeight: 3600, volume: 18, chargeWeight: 3600, amount: 64108.8, currency: "CNY", status: "已出账", source: "签入计费", updated: "2026-10-21 09:00",
      priceLayer: "订单价", priceVersion: "ORD20261020003", ruleVersion: "WR004", receipt: { ccos: "成功", oms: "成功", ars: "已出账" },
      lines: [
        { fee: "基础运费", unit: "15.90 元/kg", qty: "3,600 kg", amount: 57240 },
        { fee: "燃油附加费", unit: "12%", qty: "基础运费", amount: 6868.8 }
      ],
      traces: ["订单价 15.90 元/kg（ORD20261020003）锁定，优先于客户套餐", "计费重 3600kg（实重 > 材积重 3000kg）", "已出账，后续调整走勘误"],
      messages: ["MSG202610210009"]
    },
    {
      id: "B202610210008", orderId: "MT20261016002", childIds: "MT20261016002-01", customer: "C006", product: "P001", warehouse: "WH01", billingPoint: "深圳",
      actualWeight: 680, volume: 3.2, chargeWeight: 680, amount: 2041.09, currency: "USD", status: "已计费", source: "签入计费", updated: "2026-10-21 17:40",
      priceLayer: "美元价目表 v3", priceVersion: "USD-v3", ruleVersion: "WR001", receipt: { ccos: "成功", oms: "成功", ars: "未出账" },
      lines: [
        { fee: "基础运费", unit: "2.68 USD/kg", qty: "680 kg", amount: 1822.4 },
        { fee: "燃油附加费", unit: "12%", qty: "基础运费", amount: 218.69 }
      ],
      traces: ["C006 使用美元价目表（独立版本 USD-v3）", "计费重 680kg", "多币种账单，BMS 侧币种适配待确认"],
      messages: ["MSG202610210010"]
    }
  ],

  adjustments: [
    { id: "ADJ20261022001", billId: "B202610220005", customer: "C004", type: "单票改价", fee: "基础运费", oldAmount: 42720, newAmount: 42600, diff: -120, currency: "CNY", status: "审批中", applicant: "陈晨", submittedAt: "2026-10-22 16:50", reason: "客户协议折扣，按 17.75 元/kg 重算", approval: "OA-2026-1022-05", billStatus: "未出账" },
    { id: "ADJ20261022002", billId: "B202610210007", customer: "C001", type: "费用勘误", fee: "燃油附加费", oldAmount: 6868.8, newAmount: 7000, diff: 131.2, currency: "CNY", status: "已通过", applicant: "陈晨", submittedAt: "2026-10-22 09:10", reason: "10 月燃油费率由 12% 调整为 12.23%，补差", approval: "OA-2026-1022-02", billStatus: "已出账" },
    { id: "ADJ20261022003", billId: "B202610220002", customer: "C002", type: "单票改价", fee: "住宅地址附加费", oldAmount: 120, newAmount: 0, diff: -120, currency: "CNY", status: "已通过", applicant: "陈晨", submittedAt: "2026-10-22 12:30", reason: "地址类型录错，客户提供商业地址证明，费用置零", approval: "OA-2026-1022-03", billStatus: "未出账" },
    { id: "ADJ20261021004", billId: "B202610210008", customer: "C006", type: "费用勘误", fee: "燃油附加费", oldAmount: 218.69, newAmount: 230, diff: 11.31, currency: "USD", status: "已通过", applicant: "陈晨", submittedAt: "2026-10-21 18:10", reason: "美元燃油费率调整，补差 11.31 USD", approval: "OA-2026-1021-06", billStatus: "已出账" },
    { id: "ADJ20261021005", billId: "B202610220004", customer: "C003", type: "单票改价", fee: "超长超重附加费", oldAmount: 200, newAmount: 150, diff: -50, currency: "CNY", status: "已驳回", applicant: "陈晨", submittedAt: "2026-10-21 15:20", reason: "客户主张未超长", approval: "OA-2026-1021-04", billStatus: "未出账" }
  ],

  approvals: [
    { id: "OA-2026-1022-01", type: "产品底价", title: "加拿大海派 P008 底价新增", object: "P008 / CA / 基础运费", applicant: "杨鑫", submittedAt: "2026-10-22 09:00", status: "审批中", approver: "价格委员会", oldVal: "—", newVal: "13.60 元/kg", reason: "补齐加拿大产品底价，配合 11 月价格发布", impact: "影响 1 个产品、1 个国家" },
    { id: "OA-2026-1022-02", type: "费用勘误", title: "B202610210007 燃油补差", object: "B202610210007 / 燃油附加费", applicant: "陈晨", submittedAt: "2026-10-22 09:10", status: "已通过", approver: "财务经理", oldVal: "6,868.80 元", newVal: "7,000.00 元", reason: "10 月燃油费率调整", impact: "已出账，走勘误不覆盖原账单" },
    { id: "OA-2026-1022-03", type: "单票改价", title: "B202610220002 住宅附加费置零", object: "B202610220002 / 住宅地址附加费", applicant: "陈晨", submittedAt: "2026-10-22 12:30", status: "已通过", approver: "财务经理", oldVal: "120.00 元", newVal: "0.00 元", reason: "地址类型录错", impact: "零元费用，允许多币种" },
    { id: "OA-2026-1022-04", type: "客户自由价", title: "盈和 C004 美国海派自由价", object: "C004 / P001 / 基础运费", applicant: "杨鑫", submittedAt: "2026-10-21 17:20", status: "审批中", approver: "销售总监", oldVal: "16.20 元/kg（套餐 B）", newVal: "12.00 元/kg", reason: "客户承诺月出货 3 柜", impact: "低于底价 0.50 元/kg，需专项审批" },
    { id: "OA-2026-1022-05", type: "单票改价", title: "B202610220005 基础运费改价", object: "B202610220005 / 基础运费", applicant: "陈晨", submittedAt: "2026-10-22 16:50", status: "审批中", approver: "财务经理", oldVal: "42,720.00 元", newVal: "42,600.00 元", reason: "客户协议折扣", impact: "未出账，改后重新计费" },
    { id: "OA-2026-1022-06", type: "套餐价", title: "美国海派 Z1 套餐 D 调整", object: "P001 / US / Z1 美西 / D", applicant: "杨鑫", submittedAt: "2026-10-22 15:10", status: "审批中", approver: "价格委员会", oldVal: "16.20 元/kg", newVal: "16.50 元/kg", reason: "成本上涨，调整套餐折扣", impact: "影响 4 个已绑定客户" },
    { id: "OA-2026-1018-03", type: "产品底价", title: "英国海派 P007 底价下调", object: "P007 / GB / 基础运费", applicant: "杨鑫", submittedAt: "2026-10-18 10:00", status: "已驳回", approver: "价格委员会", oldVal: "11.20 元/kg", newVal: "10.90 元/kg", reason: "竞品降价", impact: "驳回：成本未同步下降" },
    { id: "OA-2026-0915-01", type: "客户自由价", title: "德立迅 C005 美国快递自由价", object: "C005 / P002 / 基础运费", applicant: "杨鑫", submittedAt: "2026-09-15 09:00", status: "已通过", approver: "销售总监", oldVal: "19.00 元/kg（套餐 C）", newVal: "18.50 元/kg", reason: "年度协议", impact: "高于底价，审批通过" }
  ],

  priceHistory: [
    { id: "PH001", at: "2026-10-22 15:10", object: "套餐价", product: "P001", country: "US", field: "Z1 美西 / 套餐 D", oldVal: "16.20 元/kg", newVal: "16.50 元/kg", version: "v13-draft", effective: "2026-11-01", operator: "杨鑫", reason: "成本上涨，调整套餐折扣", approval: "OA-2026-1022-06", status: "待生效" },
    { id: "PH002", at: "2026-10-22 15:10", object: "套餐价", product: "P001", country: "US", field: "Z1 美西 / 套餐 E", oldVal: "15.40 元/kg", newVal: "15.70 元/kg", version: "v13-draft", effective: "2026-11-01", operator: "杨鑫", reason: "随 A 价联动", approval: "OA-2026-1022-06", status: "待生效" },
    { id: "PH003", at: "2026-10-01 10:00", object: "公布价", product: "P001", country: "US", field: "Z1 美西 / A 价", oldVal: "18.00 元/kg", newVal: "18.50 元/kg", version: "v12", effective: "2026-10-01", operator: "杨鑫", reason: "10 月成本上涨", approval: "OA-2026-0928-01", status: "已生效" },
    { id: "PH004", at: "2026-10-01 10:00", object: "套餐价", product: "P001", country: "US", field: "Z1 美西 / 套餐 B–E", oldVal: "17.30 / 16.50 / 15.80 / 15.00", newVal: "17.80 / 17.00 / 16.20 / 15.40", version: "v12", effective: "2026-10-01", operator: "杨鑫", reason: "A 价联动生成", approval: "OA-2026-0928-01", status: "已生效" },
    { id: "PH005", at: "2026-09-30 15:00", object: "公布价", product: "P003", country: "DE", field: "EU-1 核心 / A 价", oldVal: "14.20 元/kg", newVal: "14.60 元/kg", version: "v10", effective: "2026-10-01", operator: "杨鑫", reason: "欧洲线成本上调", approval: "OA-2026-0928-02", status: "已生效" },
    { id: "PH006", at: "2026-09-15 09:00", object: "客户自由价", product: "P002", country: "US", field: "C005 / 基础运费", oldVal: "19.00 元/kg（套餐 C）", newVal: "18.50 元/kg", version: "CP004", effective: "2026-09-15", operator: "杨鑫", reason: "年度协议", approval: "OA-2026-0915-01", status: "已生效" },
    { id: "PH007", at: "2026-09-12 11:00", object: "产品底价", product: "P001", country: "US", field: "基础运费", oldVal: "12.30 元/kg", newVal: "12.50 元/kg", version: "BP001", effective: "2026-09-12", operator: "杨鑫", reason: "成本上涨", approval: "OA-2026-0912", status: "已生效" },
    { id: "PH008", at: "2026-08-28 10:00", object: "公布价", product: "P007", country: "GB", field: "UK-1 / A 价", oldVal: "16.80 元/kg", newVal: "16.40 元/kg", version: "v2", effective: "2026-09-01", operator: "杨鑫", reason: "英国线竞争调价", approval: "OA-2026-0827-01", status: "已生效" },
    { id: "PH009", at: "2026-08-01 09:00", object: "产品底价", product: "P001", country: "US", field: "基础运费", oldVal: "12.00 元/kg", newVal: "12.30 元/kg", version: "BP001", effective: "2026-08-01", operator: "杨鑫", reason: "旺季前调整", approval: "OA-2026-0730-02", status: "已失效" },
    { id: "PH010", at: "2026-07-20 16:00", object: "公布价", product: "P008", country: "CA", field: "CA-东 / A 价", oldVal: "—", newVal: "19.80 元/kg", version: "v1", effective: "2026-07-01", operator: "杨鑫", reason: "加拿大产品首次发布", approval: "OA-2026-0719-01", status: "已失效" }
  ],

  logs: [
    { id: "LOG202610221930", at: "2026-10-22 19:30", user: "杨鑫", module: "客户价格", action: "更新", object: "C004 / P001 / 基础运费 12.00 元/kg", detail: "提交低于底价审批 OA-2026-1022-04", ip: "10.12.8.31" },
    { id: "LOG202610221910", at: "2026-10-22 19:10", user: "陈晨", module: "费用调整", action: "提交", object: "ADJ20261022001 / B202610220005", detail: "基础运费 42,720 → 42,600，-120 元", ip: "10.12.9.18" },
    { id: "LOG202610221540", at: "2026-10-22 15:40", user: "杨鑫", module: "产品价格", action: "提交审批", object: "P001 / US / Z1 / 套餐 D", detail: "16.20 → 16.50 元/kg，OA-2026-1022-06", ip: "10.12.8.31" },
    { id: "LOG202610221500", at: "2026-10-22 15:00", user: "杨鑫", module: "报价单", action: "生成", object: "纽酷专属报价单 V1", detail: "客户价，9 个价格项，待发布", ip: "10.12.8.31" },
    { id: "LOG202610221320", at: "2026-10-22 13:20", user: "赵敏", module: "询价管理", action: "确认可承运", object: "INQ20261022010", detail: "可承运；需进口商信息", ip: "10.12.7.66" },
    { id: "LOG202610221230", at: "2026-10-22 12:30", user: "陈晨", module: "费用调整", action: "提交", object: "ADJ20261022003 / B202610220002", detail: "住宅附加费 120 → 0，零元费用", ip: "10.12.9.18" },
    { id: "LOG202610221210", at: "2026-10-22 12:10", user: "赵敏", module: "询价管理", action: "录入附加费", object: "INQ20261022003", detail: "燃油 10%，按基础运费", ip: "10.12.7.66" },
    { id: "LOG202610221020", at: "2026-10-22 10:20", user: "系统", module: "计费", action: "回传成功", object: "B202610220001", detail: "CCOS/OMS/ARS 三方回传成功", ip: "—" },
    { id: "LOG202610220940", at: "2026-10-22 09:40", user: "系统", module: "计费", action: "计费失败", object: "B202610220003", detail: "P008/CA 无生效公布价，按失败返回", ip: "—" },
    { id: "LOG202610220900", at: "2026-10-22 09:00", user: "杨鑫", module: "产品价格", action: "提交审批", object: "P008 / CA / 底价", detail: "新增 13.60 元/kg，OA-2026-1022-01", ip: "10.12.8.31" },
    { id: "LOG202610211840", at: "2026-10-21 18:40", user: "张伟", module: "询价管理", action: "创建", object: "INQ20261022001", detail: "AI 识别回填 8 个字段", ip: "10.12.9.44" },
    { id: "LOG202610211720", at: "2026-10-21 17:20", user: "杨鑫", module: "客户价格", action: "提交审批", object: "C004 / P001 自由价", detail: "12.00 元/kg 低于底价 0.50，OA-2026-1022-04", ip: "10.12.8.31" },
    { id: "LOG202610210900", at: "2026-10-21 09:00", user: "系统", module: "价格", action: "自动失效", object: "P008 / CA 公布价 AP010", detail: "有效期到期，自动失效并停止取价", ip: "—" },
    { id: "LOG202610201600", at: "2026-10-20 16:00", user: "杨鑫", module: "基础配置", action: "更新", object: "美国海派附加费组 S01", detail: "旺季附加费 1.20 元/kg（11-12 月）", ip: "10.12.8.31" },
    { id: "LOG202610200300", at: "2026-10-20 03:00", user: "系统", module: "基础配置", action: "同步", object: "SYS 费用项", detail: "同步 14 个费用项，新增 0、停用 1", ip: "—" },
    { id: "LOG202610181100", at: "2026-10-18 11:00", user: "杨鑫", module: "角色权限", action: "授权", object: "角色 R02 销售", detail: "新增数据范围：本人名下客户", ip: "10.12.8.31" }
  ],

  messages: [
    { id: "MSG202610220001", type: "1003", name: "签入计费请求", direction: "CCOS → B2B PQM", ref: "B202610220001", idem: "MT20261018001-CHK-20261022091500", status: "成功", ms: 236, at: "2026-10-22 09:15:00", retry: 0 },
    { id: "MSG202610220002", type: "1802", name: "到齐触发计费", direction: "CCOS → B2B PQM", ref: "B202610220001", idem: "MT20261018001-ARR-20261022091600", status: "成功", ms: 188, at: "2026-10-22 09:16:00", retry: 0 },
    { id: "MSG202610220003", type: "1802", name: "到齐触发计费", direction: "CCOS → B2B PQM", ref: "B202610220002", idem: "MT20261018002-ARR-20261022093000", status: "成功", ms: 210, at: "2026-10-22 09:30:00", retry: 0 },
    { id: "MSG202610220004", type: "AddChargeWeight", name: "计费重回传", direction: "B2B PQM → CCOS", ref: "B202610220001", idem: "B202610220001-RET-01", status: "成功", ms: 154, at: "2026-10-22 09:15:02", retry: 0 },
    { id: "MSG202610220005", type: "1003", name: "签入计费请求", direction: "CCOS → B2B PQM", ref: "B202610220003", idem: "MT20261018003-CHK-20261022093500", status: "失败", ms: 320, at: "2026-10-22 09:35:00", retry: 3, error: "NO_VALID_PRICE：P008/CA 无生效公布价" },
    { id: "MSG202610220006", type: "1003", name: "增值变更计费", direction: "CCOS → B2B PQM", ref: "B202610220004", idem: "MT20261018004-VAS-20261022110000", status: "成功", ms: 264, at: "2026-10-22 11:00:00", retry: 0 },
    { id: "MSG202610220007", type: "1003", name: "重量勘误重计费（IsWeightFix）", direction: "CCOS → B2B PQM", ref: "B202610220005", idem: "MT20261018005-ADJ-20261022163000", status: "成功", ms: 412, at: "2026-10-22 16:30:00", retry: 0 },
    { id: "MSG202610220008", type: "1003", name: "签入计费请求", direction: "CCOS → B2B PQM", ref: "B202610220006", idem: "MT20261018006-CHK-20261022140000", status: "成功", ms: 198, at: "2026-10-22 14:00:00", retry: 0 },
    { id: "MSG202610220009", type: "1003", name: "签入计费请求（重试）", direction: "CCOS → B2B PQM", ref: "B202610220003", idem: "MT20261018003-CHK-20261022093500", status: "幂等返回", ms: 21, at: "2026-10-22 09:41:00", retry: 1, error: "原请求失败，幂等键复用，返回首次结果" },
    { id: "MSG202610220010", type: "1802", name: "增值服务完成计费", direction: "CCOS → B2B PQM", ref: "MT20261018004-VAS-02", idem: "MT20261018004-LARS-20261022111500", status: "成功", ms: 172, at: "2026-10-22 11:15:00", retry: 0 }
  ],

  slaConfig: [
    { stage: "待成本", limit: "8 小时", escalate: "超时 2 小时升级纵队负责人", remind: "飞书待办 + 群提醒" },
    { stage: "待风控", limit: "6 小时", escalate: "超时升级口岸负责人", remind: "飞书待办" },
    { stage: "待报价", limit: "4 小时", escalate: "超时升级销售主管", remind: "飞书待办 + 企微" },
    { stage: "报价有效期", limit: "7 天（默认）", escalate: "到期前 1 天提醒销售", remind: "飞书待办" }
  ],

  routes: [
    { id: "RT01", product: "P001", country: "US", column: "美线纵队", owner: "王强", port: "深圳口岸", portOwner: "赵敏", status: "启用" },
    { id: "RT02", product: "P002", country: "US", column: "美线纵队", owner: "刘洋", port: "深圳口岸", portOwner: "赵敏", status: "启用" },
    { id: "RT03", product: "P003", country: "DE", column: "欧线纵队", owner: "刘洋", port: "宁波口岸", portOwner: "赵敏", status: "启用" },
    { id: "RT04", product: "P004", country: "DE", column: "欧线纵队", owner: "刘洋", port: "上海口岸", portOwner: "赵敏", status: "启用" },
    { id: "RT05", product: "P005", country: "US", column: "整柜纵队", owner: "王强", port: "广州口岸", portOwner: "赵敏", status: "启用" },
    { id: "RT06", product: "P006", country: "US", column: "美线纵队", owner: "王强", port: "深圳口岸", portOwner: "赵敏", status: "启用" },
    { id: "RT07", product: "P008", country: "CA", column: "美线纵队", owner: "王强", port: "深圳口岸", portOwner: "赵敏", status: "停用" }
  ]
};
