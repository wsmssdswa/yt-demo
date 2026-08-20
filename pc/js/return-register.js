/* ============================================
   return-register.js — 退仓登记公共模块
   订单管理页 / 退仓管理页共用(两页都引本文件)
   入口:ReturnRegister.open(opts)
     · 退仓管理页:open({ masterNums, lockMaster })  显示单号输入(子单/主单可切)
     · 订单管理页:open({ simple:true, items })     不显示单号,直接填原因+网点,
                                                    确认时按选中订单实际状态判结果
   交互:确认登记时统一校验(登记前不校验,因存在时差)
     全部成功 → toast;有失败 → 弹结果窗列失败单号+原因
   兜底口径(2026-08-12):CIS 原因退仓必先登记(OFP下发),仓库不兜底;
     仓库兜底只兜"其他原因",弹窗不选原因、只填原因文本;不通知 CIS,纯本地登记
   ============================================ */

/* 来源枚举(退仓管理页列表的「来源」列标签用;TMS 未支持退仓登记,不含 TMS) */
const RW_SOURCE = {
  CIS: { label:'关务', cls:'rw-src--cis' },
  WH:  { label:'仓库登记', cls:'rw-src--wh' },
};

/* 校验用模拟数据(演示;真实环境调后端校验接口)
   已存在退仓指令的 / 不可登记的(状态不满足) */
const RW_EXISTING = new Set([
  'YT2621601300301272U001', 'YT2621601300301249U002',   // 已登记过退仓的(演示)
]);
const RW_INVALID = {
  'YT2621601300101029U001': '订单已取消,不可退仓',
  'YT2621601300101029U002': '未发货,不满足退仓条件',
};

/* 主单→子单映射(演示主单号整单退时展开用;真实环境调后端取该主单子单列表) */
const RW_MASTER_EXPAND = {
  'YT2621601300301272': ['YT2621601300301272U001', 'YT2621601300301272U002', 'YT2621601300301272U003'],
  'YT2621601300301249': ['YT2621601300301249U001', 'YT2621601300301249U002'],
};

/* 订单页简化模式:按订单实际状态判断可否登记(演示;真实环境后端判定)
   可登记:仅"已发货"的订单(货已发出被退回,才需要登记退仓)
   不可登记:已取消 / 已退件(不可重复) / 未发货(货都没出,何来退)
   返回 '' = 可登记;非空 = 失败原因 */
function canRegisterByStatus({ oStatus, opStatus }) {
  if (oStatus === 3) return '订单已取消,不可退仓';
  if (oStatus === 4 || opStatus === 5) return '订单已退件,不可重复登记';
  if (opStatus !== 4) return '未发货,不满足退仓条件';
  return '';
}

const ReturnRegister = {
  /* 打开登记退仓弹窗(动态注入 body,可反复打开) */
  open({ masterNums = [], lockMaster = false, simple = false, items = [] } = {}) {
    /* 旧的弹窗先移除(防止重复注入) */
    const old = document.getElementById('rwRegisterRoot');
    if (old) old.remove();

    this.simple = simple;
    this.items = items;   // simple 模式:勾选的订单 [{waybill, oStatus, opStatus}]

    const root = document.createElement('div');
    root.id = 'rwRegisterRoot';
    root.innerHTML = this.dialogHtml(masterNums, lockMaster, simple) + this.resultHtml();
    document.body.appendChild(root);

    /* 普通模式:预填主单号(订单页带入场景) */
    if (!simple && masterNums.length) {
      const ta = document.getElementById('rwChildInput');
      ta.value = masterNums.join('\n');
    }
  },
  /* 登记弹窗
     simple:订单页模式,不显示单号输入(勾选已定),只填原因+退回网点
     普通:退仓页模式,显示单号输入(子单/主单),lockMaster 时锁定主单模式 */
  dialogHtml(masterNums, lockMaster, simple) {
    /* 单号输入行(仅普通模式显示);主单号置前且默认选中(整单退为主) */
    const noRow = simple ? '' : `
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>单号</label>
            <div class="rw-input-wrap">
              <div class="rw-no-type">
                <label><input type="radio" name="rwNoType" value="master" checked ${lockMaster ? 'disabled' : ''} onchange="ReturnRegister.onTypeChange()" /> 主单号(整单退)</label>
                ${lockMaster ? '' : '<label><input type="radio" name="rwNoType" value="child" onchange="ReturnRegister.onTypeChange()" /> 子单号</label>'}
              </div>
              <textarea class="ipt rw-form-ipt--multi" id="rwChildInput" rows="2"
                placeholder="${lockMaster ? '勾选的订单已带入,可增删主单号(整单退)' : '输入主单号,自动展开为该票全部子单(换行分隔多个主单)'}"></textarea>
            </div>
          </div>`;

    return `
    <div class="rw-modal" id="rwRegisterModal">
      <div class="rw-modal-mask" onclick="ReturnRegister.close()"></div>
      <div class="rw-modal-panel">
        <div class="rw-modal-header">
          <span class="rw-modal-title">登记退仓</span>
          <span class="rw-modal-close" onclick="ReturnRegister.close()">✕</span>
        </div>
        <div class="rw-modal-body">
          ${noRow}
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>退仓原因</label>
            <input class="ipt rw-form-ipt" id="rwReason" placeholder="填写退仓原因" />
          </div>
          <div class="rw-form-row">
            <label class="rw-form-label"><span class="rw-req">*</span>退回网点</label>
            <input class="ipt rw-form-ipt rw-form-ipt--readonly" value="东腾曼沙项目仓" readonly title="按操作人所属网点带出" />
          </div>
        </div>
        <div class="rw-modal-tip">登记后该单进入「待到货」状态,等货物到仓由 PDA 扫描收货。</div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="ReturnRegister.close()">取消</button>
          <button class="btn btn--primary" onclick="ReturnRegister.confirmRegister()">确认登记</button>
        </div>
      </div>
    </div>`;
  },
  /* 结果弹窗(确认登记后,有失败时展示;body 内容由 showResult 填充) */
  resultHtml() {
    return `
    <div class="rw-modal hidden" id="rwResultModal">
      <div class="rw-modal-mask" onclick="ReturnRegister.close()"></div>
      <div class="rw-modal-panel rw-modal-panel--result">
        <div class="rw-modal-header">
          <span class="rw-modal-title">登记结果</span>
          <span class="rw-modal-close" onclick="ReturnRegister.close()">✕</span>
        </div>
        <div class="rw-modal-body"></div>
        <div class="rw-modal-footer">
          <button class="btn" onclick="ReturnRegister.copyFailed()">📋 复制失败单号</button>
          <button class="btn btn--primary" onclick="ReturnRegister.close()">知道了</button>
        </div>
      </div>
    </div>`;
  },
  /* 关闭整个登记流程(含结果弹窗) */
  close() {
    const root = document.getElementById('rwRegisterRoot');
    if (root) root.remove();
  },
  /* 单号类型切换:子单号 / 主单号(整单退) */
  onTypeChange() {
    const isMaster = document.querySelector('input[name="rwNoType"]:checked').value === 'master';
    const ta = document.getElementById('rwChildInput');
    ta.value = '';
    ta.placeholder = isMaster
      ? '输入主单号,自动展开为该票全部子单(换行分隔多个主单)'
      : '批量登记,换行分隔(最多 200 个)';
  },
  /* 确认登记:点确认时统一校验(登记前不校验,因存在时差)
     · 订单页(simple):按勾选订单实际状态判结果
     · 退仓页(普通):按输入单号逐条校验
     全部成功 → toast;有失败 → 弹结果窗列失败单号+原因 */
  confirmRegister() {
    const reason = document.getElementById('rwReason').value.trim();
    if (!reason) { Helpers.toast('请填写退仓原因'); return; }

    /* —— 订单页简化模式:按选中订单状态判断 —— */
    if (this.simple) {
      const ok = [], failed = [];
      this.items.forEach(it => {
        const reason = canRegisterByStatus(it);
        if (reason) failed.push({ no: it.waybill, reason });
        else ok.push({ no: it.waybill });
      });
      this.closeRegisterModal();
      if (failed.length === 0) { Helpers.toast(`登记成功 ${ok.length} 票`); this.close(); return; }
      this.showResult({ ok, failed, expanded: null });
      return;
    }

    /* —— 退仓页普通模式:单号展开 + 逐条校验 —— */
    const isMaster = document.querySelector('input[name="rwNoType"]:checked').value === 'master';
    const raw = document.getElementById('rwChildInput').value;
    const nums = raw.split(/[\s,，;；\n]+/).map(s => s.trim()).filter(Boolean);
    if (nums.length === 0) { Helpers.toast('请输入单号'); return; }

    /* 主单模式:展开为该票全部子单 */
    let childNums = nums;
    if (isMaster) {
      childNums = [];
      nums.forEach(m => {
        if (!/^YT\d{16}$/.test(m)) { childNums.push(m); return; }
        const sub = RW_MASTER_EXPAND[m];
        if (sub) childNums.push(...sub);
        else { childNums.push(m + 'U001', m + 'U002', m + 'U003'); }
      });
    }

    /* 逐条校验(模拟后端批量校验返回);不满足的统一算"失败" */
    const ok = [], failed = [];
    const seen = new Set();
    childNums.forEach(no => {
      if (seen.has(no)) return;
      seen.add(no);
      if (RW_INVALID[no]) { failed.push({ no, reason: RW_INVALID[no] }); }
      else if (RW_EXISTING.has(no)) { failed.push({ no, reason: '已存在退仓指令' }); }
      else if (!/^YT\d{16}U\d{3}$/.test(no)) { failed.push({ no, reason: '单号格式不正确或不存在' }); }
      else { ok.push({ no }); }
    });

    this.closeRegisterModal();

    /* 全部成功 → 轻量 toast */
    if (failed.length === 0) {
      Helpers.toast(`登记成功 ${ok.length} 条`);
      this.close();
      return;
    }
    /* 有失败的 → 弹结果窗 */
    this.showResult({
      ok, failed,
      expanded: isMaster && childNums.length !== nums.length
        ? { master: nums.length, child: childNums.length } : null,
    });
  },
  /* 关登记弹窗,保留 root(结果弹窗在 root 里) */
  closeRegisterModal() {
    document.getElementById('rwRegisterModal').classList.add('hidden');
  },
  /* 复制失败单号(换行分隔,供反馈/处理) */
  copyFailed() {
    const nums = (this.lastFailed || []).map(it => it.no).join('\n');
    if (!nums) { Helpers.toast('没有可复制的失败单号'); return; }
    Helpers.copyText(nums);
    Helpers.toast(`已复制 ${this.lastFailed.length} 个失败单号`);
  },
  /* 结果弹窗:成功汇总 + 失败单号+原因 */
  showResult({ ok, failed, expanded }) {
    this.lastFailed = failed;   // 供「复制失败单号」用
    const el = document.getElementById('rwResultModal');
    const parts = [`<span class="rw-res-ok">✅ 成功 ${ok.length}</span>`];
    if (failed.length) parts.push(`<span class="rw-res-bad">❌ 失败 ${failed.length}</span>`);
    const expandNote = expanded
      ? `<div class="rw-res-expand">已展开 ${expanded.master} 个主单 → ${expanded.child} 个子单</div>` : '';
    const summary = `<div class="rw-res-summary">${parts.join('')}</div>`;

    const failGroup = failed.length === 0 ? '' :
      `<div class="rw-cr-group rw-cr--bad">
         <div class="rw-cr-head">❌ 失败(${failed.length})</div>
         <div class="rw-cr-list">${failed.map(it =>
           `<div class="rw-cr-item">${it.no}<span class="rw-cr-reason">${it.reason}</span></div>`
         ).join('')}</div>
       </div>`;

    el.querySelector('.rw-modal-body').innerHTML = expandNote + summary + failGroup;
    el.classList.remove('hidden');
  },
};
