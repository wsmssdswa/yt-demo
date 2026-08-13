/* ============================================
   helpers.js — PC 端跨页面共用的工具函数
   ============================================ */

const Helpers = {
  /* toast 提示(居中,自动消失)
     msg: 文案;duration: 显示毫秒 */
  toast(msg, duration = 1600) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
  },

  /* 启动实时时钟(每 1s 刷新,精确到秒)
     selector: 时钟元素的 CSS 选择器,默认 '.clock'
     调用一次即可,会自动找页面上所有匹配元素 */
  startClock(selector = '.clock') {
    const tick = () => {
      const d = new Date();
      const txt = d.getFullYear() + '-' +
                  String(d.getMonth() + 1).padStart(2, '0') + '-' +
                  String(d.getDate()).padStart(2, '0') + ' ' +
                  String(d.getHours()).padStart(2, '0') + ':' +
                  String(d.getMinutes()).padStart(2, '0') + ':' +
                  String(d.getSeconds()).padStart(2, '0');
      document.querySelectorAll(selector).forEach(el => el.textContent = txt);
    };
    tick();
    setInterval(tick, 1000);
  },

  /* 当前时间,格式 YYYY-MM-DD HH:mm:ss */
  nowTime() { return this.fmtDate(new Date()); },

  /* 日期对象 → 字符串 YYYY-MM-DD HH:mm:ss */
  fmtDate(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
         + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  },

  /* 转义 HTML 字符串(防止 XSS) */
  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /* 复制文本到剪贴板(演示 file:// 环境用 execCommand,兼容双击打开) */
  copyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
    ta.remove();
  },
};
