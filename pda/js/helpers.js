/* ============================================
   helpers.js — 跨页面共用的工具函数
   ============================================ */

const Helpers = {
  /* toast 提示(居中,自动消失)
     msg: 文案;duration: 显示毫秒
     挂到设备屏内(.screen)居中,不弹到整个浏览器页面;无设备外壳时回退 body */
  toast(msg, duration = 1600) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    const host = document.querySelector('.screen') || document.body;
    host.appendChild(t);
    setTimeout(() => t.remove(), duration);
  },

  /* 启动实时时钟(每 30s 刷新)
     selector: 时钟元素的 CSS 选择器,默认 '.clock'
     调用一次即可,会自动找页面上所有匹配元素 */
  startClock(selector = '.clock') {
    const tick = () => {
      const d = new Date();
      const txt = String(d.getHours()).padStart(2, '0') + ':' +
                  String(d.getMinutes()).padStart(2, '0');
      document.querySelectorAll(selector).forEach(el => el.textContent = txt);
    };
    tick();
    setInterval(tick, 30000);
  },

  /* 当前时间,格式 YYYY-MM-DD HH:mm:ss(扫描记录用) */
  nowTime() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
         + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  },
};
