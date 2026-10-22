/* 客户价格 · 取价优先级 */
(function () {
  let customer = "C002", product = "P001";

  const content = `
    ${UI.pageHead({
      title: "取价优先级",
      sub: "按订单价 > 客户自由价 > 客户套餐（E>D>C>B）> 公布价的顺序逐费用项取价，命中层无该费用项才下沉。",
      actions: `<button class="btn btn-ghost" onclick="location.href='rule-calc.html'">${UI.icon("calc", 14)} 计重解析</button>
        <button class="btn btn-primary" id="trialBtn">${UI.icon("spark", 14)} 带条件去试算</button>`
    })}

    <section class="card">
      <div class="filterbar" style="border-bottom:0">
        <div class="field"><label>客户</label><select class="select" id="qCustomer">${UI.options(Store.list("customers"), "code", "name", customer)}</select></div>
        <div class="field"><label>产品</label><select class="select" id="qProduct">${UI.options(Store.list("products"), "code", "name", product)}</select></div>
        <div class="field"><label>分区</label><select class="select" id="qZone"><option>Z1 美西</option><option>Z2 美中</option><option>Z3 美东</option></select></div>
        <div class="actions"><button class="btn btn-primary" id="queryBtn">查询取价</button></div>
      </div>
    </section>

    <div id="result" class="mt-16"></div>`;

  function layerData() {
    const cust = Q.customer(customer), prod = Q.product(product);
    const zone = document.getElementById("qZone")?.value || "Z1 美西";
    const order = Q.orderPrice(customer, product);
    const free = Q.custPrice(customer, product, "BASE_FREIGHT");
    const bind = Q.binding(customer, product);
    const pkg = Q.pkg(product, prod.country, zone);
    const pub = Q.publish(product, prod.country, zone);
    let hitKey = "";
    if (order) hitKey = "order";
    else if (free) hitKey = "free";
    else if (bind && pkg) hitKey = "pkg" + bind.package;
    else if (pub) hitKey = "pub";
    return { cust, prod, zone, order, free, bind, pkg, pub, hitKey };
  }

  function render() {
    const d = layerData();
    const wh = Store.list("warehouses").find(w => w.status === "启用");
    const trial = Calc.trial({ customer, product, warehouse: "WH01", zip: "90013", actual: 1200, volume: 8.6, addressType: "商业地址" });
    const rows = [
      { key: "order", rank: 1, label: "订单价", detail: d.order ? `订单 ${d.order.id} · 已锁价` : "无已锁价订单", price: d.order ? d.order.price : null, tag: d.order ? "最高优先级" : "不可用" },
      { key: "free", rank: 2, label: "客户自由价", detail: d.free ? `费用项：基础运费 · ${d.free.id}` : "未配置基础运费自由价", price: d.free ? d.free.price : null, tag: d.free ? "按费用项覆盖" : "未配置" },
      { key: "pkgE", rank: 3, label: "客户套餐 E", detail: d.bind ? (d.bind.package === "E" ? "当前绑定 E 套餐" : "客户绑定的是 " + d.bind.package + " 套餐") : "未绑定套餐", price: d.pkg ? d.pkg.E : null, tag: d.bind && d.bind.package === "E" ? "已绑定" : "未绑定" },
      { key: "pkgD", rank: 4, label: "客户套餐 D", detail: d.bind && d.bind.package === "D" ? "当前绑定 D 套餐" : "未绑定 D 套餐", price: d.pkg ? d.pkg.D : null, tag: d.bind && d.bind.package === "D" ? "已绑定" : "未绑定" },
      { key: "pkgC", rank: 5, label: "客户套餐 C", detail: d.bind && d.bind.package === "C" ? "当前绑定 C 套餐" : "未绑定 C 套餐", price: d.pkg ? d.pkg.C : null, tag: d.bind && d.bind.package === "C" ? "已绑定" : "未绑定" },
      { key: "pkgB", rank: 6, label: "客户套餐 B", detail: d.bind && d.bind.package === "B" ? "当前绑定 B 套餐" : "未绑定 B 套餐", price: d.pkg ? d.pkg.B : null, tag: d.bind && d.bind.package === "B" ? "已绑定" : "未绑定" },
      { key: "pub", rank: 7, label: "公布价 A", detail: d.pub ? `${d.zone} · 版本 ${d.pub.version}` : "无生效公布价", price: d.pub ? d.pub.price : null, tag: d.pub ? "兜底" : "不可用" }
    ];

    const finalPrice = d.order ? d.order.price : d.free ? d.free.price : (d.bind && d.pkg) ? d.pkg[d.bind.package] : d.pub ? d.pub.price : null;
    const layerName = d.order ? "订单价" : d.free ? "客户自由价" : (d.bind && d.pkg) ? "客户套餐 " + d.bind.package : d.pub ? "公布价 A" : "无有效价格";
    const trialLines = trial.ok ? trial.lines : [];

    document.getElementById("result").innerHTML = `
      <div class="info-strip mb-16">
        <div class="is"><span>客户</span><b>${UI.esc(d.cust.short || d.cust.name)}</b><em>${customer}</em></div>
        <div class="is"><span>产品 / 分区</span><b>${UI.esc(d.prod.name)}</b><em>${d.zone}</em></div>
        <div class="is"><span>最终取价层级</span><b style="color:var(--brand-deep)">${layerName}</b><em>逐费用项</em></div>
        <div class="is"><span>基础运费单价</span><b>${finalPrice ? Fmt.num(finalPrice, 2) : "—"} <span class="tiny muted">元/kg</span></b><em>下一步算附加费</em></div>
      </div>

      <div class="split">
        <section class="card">
          <div class="card-hd"><h3>价格层级瀑布</h3><span class="sub">从高到低，绿色为最终命中</span>
            <div class="right"><span class="badge b-teal">命中 ${layerName}</span></div>
          </div>
          <div class="card-bd">
            <div class="waterfall">
              ${rows.map(r => {
                const hit = r.key === d.hitKey;
                const disabled = r.price == null || (r.key.startsWith("pkg") && !(d.bind && r.key === "pkg" + d.bind.package));
                return `<div class="wf-row ${hit ? "hit" : ""} ${disabled ? "disabled" : ""}">
                  <span class="wf-rank">${r.rank}</span>
                  <span class="wf-main"><strong>${r.label}</strong><span>${UI.esc(r.detail)}</span></span>
                  <span class="wf-price">${r.price != null ? Fmt.num(r.price, 2) + " 元/kg" : "—"}</span>
                  <span class="badge ${hit ? "b-teal" : disabled ? "b-gray" : "b-outline"}">${hit ? "命中" : UI.esc(r.tag)}</span>
                </div>`;
              }).join("")}
            </div>
            <div class="banner mt-12">${UI.icon("info", 15)}<div>套餐优先级 E&gt;D&gt;C&gt;B 只在客户同时绑定多档时生效；实际按客户绑定的单档套餐取价。</div></div>
          </div>
        </section>

        <div class="stack">
          <section class="card">
            <div class="card-hd"><h3>命中结论</h3></div>
            <div class="card-bd">
              <div class="price-big">${finalPrice ? Fmt.num(finalPrice, 2) : "—"}<small>元/kg</small></div>
              <dl class="kv tight mt-12">
                <dt>命中层级</dt><dd>${layerName}</dd>
                <dt>价格版本</dt><dd>${d.order ? d.order.id : d.free ? d.free.id : (d.bind && d.pkg) ? d.pkg.version : d.pub ? d.pub.version : "—"}</dd>
                <dt>有效期</dt><dd>${d.order ? "订单锁价" : d.free ? d.free.from + " ~ " + d.free.to : (d.bind && d.pkg) ? d.bind.from + " ~ " + d.bind.to : d.pub ? d.pub.from + " ~ " + d.pub.to : "—"}</dd>
                <dt>计费地点</dt><dd>深圳（WH01）</dd>
              </dl>
            </div>
          </section>
          <section class="card">
            <div class="card-hd"><h3>按 1200kg / 8.6m³ 试算</h3></div>
            <div class="card-bd">
              <div class="table-wrap"><table class="table compact"><thead><tr><th>费用项</th><th class="num">金额</th></tr></thead>
                <tbody>${trialLines.map(l => `<tr><td>${l.fee}<div class="t-sub">${l.unit} × ${l.qty}</div></td><td class="num price-cell">${Fmt.money(l.amount)}</td></tr>`).join("")}
                <tr class="total"><td>合计</td><td class="num">${Fmt.money(trial.total)}</td></tr></tbody></table></div>
              <div class="hint mt-8">试算仅内部参考，不生成账单。附加费按杂费模版计算。</div>
            </div>
          </section>
        </div>
      </div>`;

    document.getElementById("queryBtn").onclick = () => { customer = UI.val("qCustomer"); product = UI.val("qProduct"); render(); };
    document.getElementById("trialBtn").onclick = () => location.href = "trial.html";
  }

  UI.shell({ active: "cust-query", title: "取价优先级", content });
  render();
  document.getElementById("qCustomer").addEventListener("change", () => { customer = UI.val("qCustomer"); render(); });
  document.getElementById("qProduct").addEventListener("change", () => { product = UI.val("qProduct"); render(); });
  document.getElementById("queryBtn").onclick = () => { customer = UI.val("qCustomer"); product = UI.val("qProduct"); render(); };
})();
