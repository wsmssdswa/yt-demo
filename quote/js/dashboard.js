/* 工作台 · 总览 */
(function () {
  const inqs = Store.list("inquiries");
  const aps = Store.list("approvals").filter((a) => a.status === "审批中");
  const bills = Store.list("bills");
  const fails = bills.filter((b) => b.status === "计费失败");
  const pendingInq = inqs.filter((i) => ["待成本", "待风控", "待报价"].includes(i.status));
  const thisMonth = bills.filter((b) => b.updated.startsWith("2026-10"));
  const monthAmount = thisMonth.reduce((s, b) => s + (b.currency === "CNY" ? b.amount : 0), 0);
  const expiring = Store.list("publishPrices").filter((p) => p.status === "生效" && p.to >= "2026-10-22" && p.to <= "2026-12-31").length;
  const statusCount = (s) => inqs.filter((i) => i.status === s).length;

  const todoRows = [
    ...aps.map((a) => ({ type: "审批", title: a.title, meta: a.applicant + " · " + a.submittedAt, badge: a.type, href: "approval.html", cls: "a", icon: "checkCircle" })),
    ...pendingInq.map((i) => {
      const s = Fmt.sla(i.slaDue);
      return { type: "询价", title: i.id + " · " + Q.customerName(i.customer), meta: i.status + " · " + Q.productName(i.product), badge: s.text, badgeCls: s.cls, href: "inquiry-detail.html?id=" + i.id, cls: s.over ? "r" : "t", icon: "clipboard" };
    }),
    ...fails.map((b) => ({ type: "计费", title: b.id + " · " + Q.customerName(b.customer), meta: b.error, badge: "计费失败", badgeCls: "b-red", href: "billing-detail.html?id=" + b.id, cls: "r", icon: "alert" }))
  ].slice(0, 7);

  const flow = [
    { k: "01", t: "主数据", s: "费用项 / 产品 / 客户", href: "base-fee.html" },
    { k: "02", t: "产品价格", s: "底价 → 公布价 → 套餐", href: "price-base.html" },
    { k: "03", t: "客户价格", s: "套餐绑定 / 自由价", href: "cust-bind.html" },
    { k: "04", t: "询价", s: "成本 → 风控 → 报价", href: "inquiry-list.html" },
    { k: "05", t: "试算 / 报价单", s: "内部试算 / 客户交付", href: "trial.html" },
    { k: "06", t: "计费", s: "签入 → 明细 → 回传", href: "billing-list.html" }
  ];

  const funnel = [
    { l: "已提交", v: 11 },
    { l: "成本完成", v: 9 },
    { l: "风控通过", v: 7 },
    { l: "已报价", v: 4 },
    { l: "已绑定", v: 2 }
  ];
  const maxF = funnel[0].v;

  const content = `
    ${UI.pageHead({
      title: "工作台",
      sub: "2026 年 10 月 22 日 · 价格、询价与计费的全链路视图",
      actions: `<button class="btn btn-ghost" onclick="location.href='trial.html'">${UI.icon("calc", 14)} 内部试算</button>
        <button class="btn btn-primary" onclick="location.href='inquiry-new.html'">${UI.icon("plus", 14)} 新建询价</button>`
    })}

    <div class="dash-hero">
      <div class="dh-l">
        <h2>下午好，杨鑫</h2>
        <p>今天有 ${aps.length} 条价格审批、${pendingInq.length} 条询价待推进、${fails.length} 条计费异常需要处理。<br>本月已完成 ${thisMonth.length} 张计费单，报价到计费的链路整体正常。</p>
      </div>
      <div class="dh-date"><b>22</b><span>OCT<br>2026</span></div>
      <div class="dh-r">
        <div class="dh-stat"><b>${aps.length}</b><span>待我审批</span></div>
        <div class="dh-stat"><b>${pendingInq.length}</b><span>待处理询价</span></div>
        <div class="dh-stat"><b>${Fmt.num(monthAmount / 10000, 1)}<small style="font-size:11px"> 万</small></b><span>本月计费金额</span></div>
      </div>
    </div>

    <div class="stat-grid mt-16">
      <div class="stat">
        <div class="st-hd"><span class="st-ico">${UI.icon("checkCircle", 14)}</span>待审批</div>
        <div class="st-val">${aps.length}<small>条</small></div>
        <div class="st-ft"><span class="down">2 条</span> 低于底价 / 改价，需价格委员会或财务审批</div>
      </div>
      <div class="stat warn">
        <div class="st-hd"><span class="st-ico">${UI.icon("clipboard", 14)}</span>待处理询价</div>
        <div class="st-val">${pendingInq.length}<small>条</small></div>
        <div class="st-ft"><span class="down">1 条</span> 已超 SLA，今日需完成成本或报价</div>
      </div>
      <div class="stat alert">
        <div class="st-hd"><span class="st-ico">${UI.icon("alert", 14)}</span>计费异常</div>
        <div class="st-val">${fails.length}<small>张</small></div>
        <div class="st-ft">P008/加拿大无生效价格，计费失败待补价</div>
      </div>
      <div class="stat">
        <div class="st-hd"><span class="st-ico">${UI.icon("clock", 14)}</span>年底前到期价格</div>
        <div class="st-val">${expiring}<small>条</small></div>
        <div class="st-ft">公布价 2026-12-31 到期，需在 12 月前续价</div>
      </div>
    </div>

    <section class="card mt-16 flow-card">
      <div class="flow-title">业务链路 <span>从主数据到计费，点击进入对应环节</span></div>
      <div class="flow">
        ${flow.map((f) => `<div class="flow-node" onclick="location.href='${f.href}'" style="cursor:pointer">
          <div class="fn-k">${f.k}</div><div class="fn-t">${f.t}</div><div class="fn-s">${f.s}</div>
          <span class="arrow">${UI.icon("right", 12)}</span>
        </div>`).join("")}
      </div>
    </section>

    <div class="dash-grid mt-16">
      <div>
        <section class="card">
          <div class="card-hd"><h3>我的待办</h3><span class="sub">按优先级排序</span>
            <div class="right"><span class="badge b-amber">${todoRows.length} 条</span><a class="btn-text" href="approval.html">全部审批</a></div>
          </div>
          <div class="todo-list">
            ${todoRows.map((t) => `<div class="todo" onclick="location.href='${t.href}'">
              <span class="tico ${t.cls}">${UI.icon(t.icon, 15)}</span>
              <span class="tt"><strong>${UI.esc(t.title)}</strong><span>${UI.esc(t.meta)}</span></span>
              <span class="badge ${t.badgeCls || "b-gray"}">${UI.esc(t.badge)}</span>
            </div>`).join("")}
          </div>
        </section>

        <section class="card mt-16">
          <div class="card-hd"><h3>价格健康度</h3><span class="sub">按产品维度检查价格是否可支撑取价</span>
            <div class="right"><a class="btn-text" href="price-publish.html">去补价</a></div>
          </div>
          <div class="card-bd">
            <div class="stack" style="gap:12px">
              ${[
                { l: "产品底价覆盖", v: "8 / 8", p: 100, c: "" },
                { l: "公布价生效", v: "10 / 11", p: 91, c: "" },
                { l: "套餐价生效", v: "7 / 8", p: 88, c: "" },
                { l: "客户绑定覆盖", v: "7 / 8", p: 88, c: "" },
                { l: "无生效价格产品", v: "1 个（P008 加拿大）", p: 12, c: "red" }
              ].map((r) => `<div>
                <div class="row" style="margin-bottom:5px"><span class="small">${r.l}</span><span class="spacer"></span><span class="small strong">${r.v}</span></div>
                <div class="progress ${r.c}"><i style="width:${r.p}%"></i></div>
              </div>`).join("")}
            </div>
          </div>
        </section>
      </div>

      <div class="dash-side">
        <section class="card">
          <div class="card-hd"><h3>询价漏斗</h3><span class="sub">本月</span></div>
          <div class="card-bd">
            <div class="funnel">
              ${funnel.map((f) => `<div class="funnel-row"><span class="fl">${f.l}</span><span class="fb"><i style="width:${(f.v / maxF) * 100}%"></i></span><span class="fv">${f.v}</span></div>`).join("")}
            </div>
            <div class="divider"></div>
            <div class="row" style="justify-content:space-between">
              <span class="tiny muted">转化率（提交→绑定）</span><span class="small strong">18.2%</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-hd"><h3>询价状态分布</h3></div>
          <div class="card-bd">
            <div class="mini-bars">
              ${[
                { l: "待成本", v: statusCount("待成本") },
                { l: "待风控", v: statusCount("待风控") },
                { l: "待报价", v: statusCount("待报价") },
                { l: "已报价", v: statusCount("已报价") },
                { l: "已绑定", v: statusCount("已绑定") },
                { l: "失效", v: statusCount("已失效") }
              ].map((b) => `<div class="bar"><em>${b.v}</em><i style="height:${Math.max(8, b.v * 28)}px"></i><span>${b.l}</span></div>`).join("")}
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-hd"><h3>最近操作</h3><div class="right"><a class="btn-text" href="base-audit.html">日志</a></div></div>
          <div class="card-bd" style="padding-top:8px;padding-bottom:10px">
            ${Store.list("logs").slice(0, 5).map((l) => `<div class="activity-item">
              <span class="ai-dot"></span>
              <span class="ai-t"><b>${UI.esc(l.user)}</b> ${UI.esc(l.action)} ${UI.esc(l.object)}<br><span class="muted">${UI.esc(l.module)} · ${UI.esc(l.detail)}</span></span>
              <span class="ai-time">${l.at.slice(5, 16)}</span>
            </div>`).join("")}
          </div>
        </section>

        <section class="card">
          <div class="card-hd"><h3>快捷入口</h3></div>
          <div class="card-bd">
            <div class="kpi-mini">
              <div class="km" style="cursor:pointer" onclick="location.href='price-base.html'"><span>产品底价</span><b>8<em>个产品</em></b></div>
              <div class="km" style="cursor:pointer" onclick="location.href='cust-free.html'"><span>客户自由价</span><b>7<em>条生效</em></b></div>
              <div class="km" style="cursor:pointer" onclick="location.href='quote-list.html'"><span>报价单</span><b>7<em>个版本</em></b></div>
              <div class="km" style="cursor:pointer" onclick="location.href='billing-monitor.html'"><span>报文成功率</span><b>96.8<em>%</em></b></div>
            </div>
          </div>
        </section>
      </div>
    </div>`;

  UI.shell({ active: "dashboard", title: "工作台", content });
})();
