/* ============================================================
   数据仓库 + 计价/计重演示逻辑
   localStorage 持久化；所有页面共享同一份演示数据
   ============================================================ */
(function () {
  const KEY = "b2b_quote_demo_v1";
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.meta && data.meta.version === window.SEED.meta.version) return data;
      }
    } catch (e) { /* ignore */ }
    const fresh = clone(window.SEED);
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  }

  let db = load();

  const Store = {
    get db() { return db; },
    save() { localStorage.setItem(KEY, JSON.stringify(db)); },
    reset() { db = clone(window.SEED); this.save(); },
    list(key) { return db[key] || []; },
    find(key, id) { return (db[key] || []).find((x) => x.id === id || x.code === id || x.name === id); },
    update(key, id, patch) {
      const item = this.find(key, id);
      if (item) Object.assign(item, patch);
      this.save();
      return item;
    },
    add(key, item) {
      db[key].unshift(item);
      this.save();
      return item;
    },
    remove(key, id) {
      db[key] = db[key].filter((x) => !(x.id === id || x.code === id));
      this.save();
    },
    log(module, action, object, detail) {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const at = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      db.logs.unshift({
        id: "LOG" + Date.now(),
        at, user: "杨鑫", module, action, object, detail, ip: "10.12.8.31"
      });
      this.save();
    },
    resetHint() {
      if (!localStorage.getItem(KEY + "_hint")) {
        localStorage.setItem(KEY + "_hint", "1");
      }
    }
  };

  /* ---------- 基础查询 ---------- */
  const Q = {
    product: (code) => Store.find("products", code) || {},
    customer: (code) => Store.find("customers", code) || {},
    fee: (code) => Store.find("feeItems", code) || {},
    productName: (code) => (Q.product(code).name || code || "—"),
    customerName: (code) => (Q.customer(code).short || Q.customer(code).name || code || "—"),
    customerFull: (code) => (Q.customer(code).name || code || "—"),
    feeName: (code) => (Q.fee(code).name || code || "—"),
    template: (id) => Store.find("templates", id) || {},
    warehouse: (code) => Store.find("warehouses", code) || {},
    binding(customer, product) {
      return (db.custBindings || []).find((b) => b.customer === customer && b.product === product && b.status === "生效");
    },
    custPrice(customer, product, fee) {
      return (db.custPrices || []).find((p) => p.customer === customer && p.product === product && p.fee === fee && p.status === "生效");
    },
    orderPrice(customer, product) {
      return (db.orders || []).find((o) => o.customer === customer && o.product === product && o.status === "已锁价");
    },
    basePrice(product, country) {
      return (db.basePrices || []).find((p) => p.product === product && p.country === country && p.status === "生效");
    },
    publish(product, country, zone) {
      const rows = (db.publishPrices || []).filter((p) => p.product === product && p.country === country && p.status === "生效");
      if (!rows.length) return null;
      return rows.find((p) => p.zone === zone) || rows[0];
    },
    pkg(product, country, zone) {
      const rows = (db.packages || []).filter((p) => p.product === product && p.country === country && p.status === "生效");
      if (!rows.length) return null;
      return rows.find((p) => p.zone === zone) || rows[0];
    },
    weightRule(customer, product) {
      return (db.weightRules || []).find((r) => r.scope === "客户" && r.customer === customer && r.product === product && r.status === "生效")
        || (db.weightRules || []).find((r) => r.scope === "产品" && r.product === product && r.status === "生效")
        || null;
    },
    discount(customer, product) {
      return (db.discounts || []).find((d) => d.status === "生效" && d.scope === "客户" && d.customer === customer && d.product === product)
        || (db.discounts || []).find((d) => d.status === "生效" && d.scope === "产品" && d.product === product)
        || null;
    },
    zoneOf(country, zip) {
      const z = String(zip || "").trim();
      if (country === "US") {
        const n = parseInt(z.slice(0, 5), 10);
        if (n >= 99500) return "Z4 偏远";
        if (n >= 90000) return "Z1 美西";
        if (n >= 60000) return "Z2 美中";
        if (n >= 10000) return "Z3 美东";
        return "Z1 美西";
      }
      if (country === "CA") return "CA-东";
      if (country === "GB") return "UK-1";
      return "EU-1 核心";
    },
    isRemote(country, zip) {
      if (country !== "US") return false;
      const n = parseInt(String(zip || "").slice(0, 5), 10);
      return n >= 99500;
    }
  };

  /* ---------- 计重 ---------- */
  function roundUp(v, step) {
    if (!step) return v;
    return Math.ceil((v - 1e-9) / step) * step;
  }

  const Calc = {
    chargeWeight(opts) {
      const { customer, product, actual, volume } = opts;
      const rule = Q.weightRule(customer, product);
      const divisor = (rule && rule.divisor) || 6000;
      const step = rule && /0\.5/.test(rule.round) ? 0.5 : 1;
      const ticketStep = rule && /0\.5/.test(rule.ticketRound) ? 0.5 : 1;
      const volumetric = volume ? (volume * 1000000) / divisor : 0;
      const byBox = Math.max(actual || 0, volumetric);
      const perBox = roundUp(byBox, step);
      const charge = roundUp(perBox, ticketStep);
      return {
        rule,
        divisor,
        step,
        ticketStep,
        volumetric: +volumetric.toFixed(1),
        perBox: +perBox.toFixed(1),
        charge: +charge.toFixed(1)
      };
    },

    trial(opts) {
      const customer = opts.customer || "";
      const product = opts.product || "";
      const wh = Q.warehouse(opts.warehouse || "WH01");
      const country = Q.product(product).country || opts.country || "US";
      const zone = Q.zoneOf(country, opts.zip);
      const cw = this.chargeWeight({ customer, product, actual: opts.actual, volume: opts.volume });
      const pub = Q.publish(product, country, zone);
      const pkg = Q.pkg(product, country, zone);
      const bind = customer ? Q.binding(customer, product) : null;
      const free = customer ? Q.custPrice(customer, product, "BASE_FREIGHT") : null;
      const order = customer ? Q.orderPrice(customer, product) : null;

      let layer = "", unit = 0, version = "";
      if (order) { layer = "订单价"; unit = order.price; version = order.id; }
      else if (free) { layer = "客户自由价"; unit = free.price; version = free.id; }
      else if (bind && pkg && pkg[bind.package] != null) { layer = "客户套餐 " + bind.package; unit = pkg[bind.package]; version = pkg.version; }
      else if (pub) { layer = "公布价 A"; unit = pub.price; version = pub.version; }

      if (!unit) {
        return {
          ok: false,
          error: "无有效价格：" + (Q.product(product).name || product) + " 在 " + (opts.zip || "该目的地") + " 无生效中的公布价，且客户未配置自由价/套餐",
          code: "NO_VALID_PRICE",
          customer, product, country, zone,
          actual: opts.actual, volume: opts.volume, chargeWeight: cw.charge,
          charge: cw, warehouse: wh, layer: "—", version: "—", lines: [], total: 0, traces: [
            "计重规则：" + (cw.rule ? (cw.rule.scope === "客户" ? "客户规则" : "产品规则") + " " + cw.divisor : "默认 6000"),
            "实重 " + opts.actual + "kg / 材积重 " + cw.volumetric + "kg → 计费重 " + cw.charge + "kg",
            "取价失败：该产品/国家/分区无生效公布价，客户未配置套餐或自由价",
            "按失败返回，不以 0 元兜底"
          ]
        };
      }

      const base = +(unit * cw.charge).toFixed(2);
      const sur = (db.surcharges || []).find((s) => s.product === product && s.status === "启用");
      const fuelCfg = sur && sur.items.find((i) => i.fee === "FUEL");
      const fuelRate = fuelCfg ? parseFloat(fuelCfg.value) / 100 : 0.12;
      const freeFuel = customer ? Q.custPrice(customer, product, "FUEL") : null;
      const fuel = freeFuel ? +(freeFuel.price * cw.charge).toFixed(2) : +(base * fuelRate).toFixed(2);
      const remote = Q.isRemote(country, opts.zip) ? 350 : 0;
      const residential = opts.addressType === "住宅地址" ? 120 : 0;
      const customs = product === "P005" ? 0 : 180;

      const lines = [{ fee: "基础运费", code: "BASE_FREIGHT", unit: unit.toFixed(2) + " 元/kg", qty: cw.charge + " kg", amount: base, layer }];
      if (fuel) lines.push({ fee: "燃油附加费", code: "FUEL", unit: freeFuel ? freeFuel.price.toFixed(2) + " 元/kg（自由价）" : (fuelRate * 100).toFixed(0) + "%", qty: freeFuel ? cw.charge + " kg" : "基础运费", amount: fuel, layer: freeFuel ? "客户自由价" : "附加费模版" });
      if (remote) lines.push({ fee: "偏远附加费", code: "REMOTE", unit: "350 元/票", qty: "1 票", amount: remote, layer: "附加费模版" });
      if (residential) lines.push({ fee: "住宅地址附加费", code: "RESIDENTIAL", unit: "120 元/票", qty: "1 票", amount: residential, layer: "附加费模版" });
      if (customs) lines.push({ fee: "报关费", code: "CUSTOMS", unit: "180 元/票", qty: "1 票", amount: customs, layer: "人工加收" });

      let discount = null;
      if (cw.actual > cw.volumetric) {
        const d = customer ? Q.discount(customer, product) : null;
        if (d && cw.charge >= 100) {
          const rate = parseFloat(d.rate) / 10;
          const cut = +((base * (1 - rate)) * -1).toFixed(2);
          discount = { rule: d, amount: cut };
          lines.push({ fee: "重货优惠", code: "DISCOUNT", unit: d.rate, qty: "基础运费", amount: cut, layer: d.scope === "客户" ? "客户优惠" : "产品优惠" });
        }
      }

      const total = +lines.reduce((s, l) => s + l.amount, 0).toFixed(2);
      const traces = [
        "计重规则：" + (cw.rule ? (cw.rule.scope === "客户" ? "客户规则（" + cw.rule.box + "）" : "产品规则") + "，材积系数 " + cw.divisor : "默认 6000"),
        "实重 " + (opts.actual || 0) + "kg / 材积重 " + cw.volumetric + "kg → 计费重 " + cw.charge + "kg（单箱 " + (cw.rule ? cw.rule.round : "0.5kg 进位") + "，整票 " + (cw.rule ? cw.rule.ticketRound : "1kg 进位") + "）",
        "取价层级：" + layer + (version ? "（版本 " + version + "）" : ""),
        "分区：" + zone + "；计费地点：" + (wh.billing || "深圳") + "（" + (wh.name || "—") + "）"
      ];
      if (discount) traces.push("重货优惠命中：" + discount.rule.threshold + " → " + discount.rule.rate + "，基础运费减少 " + Math.abs(discount.amount).toFixed(2) + " 元");

      return {
        ok: true, customer, product, country, zone, warehouse: wh,
        actual: opts.actual, volume: opts.volume, chargeWeight: cw.charge, charge: cw,
        layer, unit, version, base, lines, total, discount, traces,
        addressType: opts.addressType || "商业地址", zip: opts.zip || "",
        currency: "CNY"
      };
    }
  };

  /* ---------- 展示工具 ---------- */
  const Fmt = {
    money: (n, cur) => {
      const s = Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return (cur === "USD" ? "$" : cur === "EUR" ? "€" : "¥") + s;
    },
    num: (n, d) => Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: d == null ? 0 : d, maximumFractionDigits: d == null ? 2 : d }),
    pct: (n, d) => (Number(n || 0) * 100).toFixed(d == null ? 1 : d) + "%",
    now: () => window.APP_NOW,
    hoursUntil(ts) {
      if (!ts || ts === "—") return null;
      const a = new Date(window.APP_NOW.replace(/-/g, "/")).getTime();
      const b = new Date(String(ts).replace(/-/g, "/")).getTime();
      return (b - a) / 3600000;
    },
    sla(ts) {
      const h = this.hoursUntil(ts);
      if (h == null) return { text: "—", cls: "b-gray", over: false };
      if (h < 0) return { text: "已超时 " + Math.abs(h).toFixed(0) + "h", cls: "b-red", over: true };
      if (h < 2) return { text: "剩余 " + h.toFixed(1) + "h", cls: "b-amber", over: false };
      return { text: "剩余 " + h.toFixed(0) + "h", cls: "b-teal", over: false };
    },
    dateOnly: (s) => (s ? String(s).slice(0, 10) : "—")
  };

  window.Store = Store;
  window.Q = Q;
  window.Calc = Calc;
  window.Fmt = Fmt;
})();
