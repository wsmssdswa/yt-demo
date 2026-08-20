// 用途:把 demo 原型页引用的本地 css/js 内联合并成单文件 html,
//       供飞书云空间/wiki 预览托管(预览只认单文件,不解析相对引用)。
//       同时做飞书预览适配:页间相对跳转(404)统一替换为引导 toast。
// 用法:node build-singlefile.js <source.html> [output.html]
//       外链(http/https)资源保持原样不内联;本地源码不受任何影响。
const fs = require('fs');
const path = require('path');

const src = path.resolve(process.argv[2]);
const out = process.argv[3]
  ? path.resolve(process.argv[3])
  : src.replace(/\.html$/, '.single.html');
let html = fs.readFileSync(src, 'utf8');

const isLocal = (u) => !/^(https?:)?\/\//.test(u);

html = html.replace(/<link[^>]*href="([^"]+\.css)"[^>]*\/?>/g, (m, href) => {
  if (!isLocal(href)) return m;
  const css = fs
    .readFileSync(path.resolve(path.dirname(src), href), 'utf8')
    .replace(/<\/style>/g, '<\\/style>');
  return '<style>\n' + css + '\n</style>';
});

html = html.replace(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g, (m, s) => {
  if (!isLocal(s)) return m;
  const js = fs
    .readFileSync(path.resolve(path.dirname(src), s), 'utf8')
    .replace(/<\/script>/g, '<\\/script>');
  return '<script>\n' + js + '\n</script>';
});

// ---- 飞书预览适配:页间跳转 → 引导 toast ----
// 相对路径跳转在预览域下 404;飞书绝对 URL 会被目标页拒绝嵌入(白屏),均已实测。
const PAGE_NAMES = {
  'b2b-workbench': 'B2B工作台', 'check-in': 'PDA签入', 'customs-check': 'B2B关务查验',
  'label-reprint': '箱标补打', 'label-reprint-boxno': '箱标补打-扫箱号',
  'outbound-scan': '退仓扫描', 'pick-by-location': '拣货操作(按库位)',
  'pick-operation': '拣货操作', 'pick-select': 'B2B拣货', 'pick-task': '拣货任务列表',
  'security-check': '安检拦截', 'vas-detail': '增值服务', 'vas-operate': '增值服务操作',
  index: '工作台首页',
};
const toastInject =
  '<script>function __fsNavToast(t){' +
  'var m=String(t).match(/([a-z-]+)\\.html/);' +
  'var n=m?(' + JSON.stringify(PAGE_NAMES) + ')[m[1]]||m[1]:"目标原型";' +
  'var d=document.createElement("div");' +
  'd.style.cssText="position:fixed;left:50%;bottom:15%;transform:translateX(-50%);background:rgba(0,0,0,.78);color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;max-width:80%;text-align:center;z-index:99999;line-height:1.6;box-shadow:0 4px 12px rgba(0,0,0,.3);";' +
  'd.textContent="原型间跳转在飞书预览中不可用,请从左侧知识库《PDA原型页面》打开:『"+n+"』";' +
  'document.body.appendChild(d);setTimeout(function(){d.remove()},3500);}</script>';
html = html.replace(/location\.href\s*=\s*(['`])(\.[^'`]*?)\1/g, "__fsNavToast('$2')");
// layout.js 返回按钮的兜底跳转(模板变量写法,上面的正则不覆盖):整体改为 toast,
// 预览里 history.back() 也可能退出原型,一并避免
html = html.replace(/history\.length>1\?history\.back\(\):\s*\(location\.href='\$\{backHref\}'\)/g, "__fsNavToast('${backHref}')");
html = html.replace('</body>', toastInject + '\n</body>');

fs.writeFileSync(out, html, 'utf8');
const navCount = (html.match(/__fsNavToast\('/g) || []).length;
console.log(`OK ${out} (${Math.round(Buffer.byteLength(html, 'utf8') / 1024)} KB, 页间跳转已替换 ${navCount} 处)`);
