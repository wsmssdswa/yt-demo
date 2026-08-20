// 用途:批量发布 demo/pda 原型到飞书云空间(合并单文件 + 上传),维护 file_token 映射(manifest)。
//       同名再次执行 = 原地覆盖上传,链接不变;不传参数 = 发布全部页面。
// 用法:node tools/publish-feishu.js [页面文件名 ...]   (如 node tools/publish-feishu.js customs-check.html)
// 依赖:tools/build-singlefile.js(合并)、lark-cli(上传);合并产物在 ZCodeProject/tmp/feishu-build/,不入仓库。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..'); // ZCodeProject
const PDA = path.join(ROOT, 'demo', 'pda');
const BUILD = path.join(ROOT, 'tmp', 'feishu-build');
const MANIFEST = path.join(__dirname, 'feishu-manifest.json');

// 页面 → 飞书文件名(全局唯一,保持稳定,改名会导致重复文件)
const NAMES = {
  'b2b-workbench.html': '原型_pda_B2B工作台.html',
  'check-in.html': '原型_pda_PDA签入.html',
  'customs-check.html': '原型_pda_关务查验.html',
  'label-reprint.html': '原型_pda_箱标补打.html',
  'label-reprint-boxno.html': '原型_pda_箱标补打-扫箱号.html',
  'outbound-scan.html': '原型_pda_退仓扫描.html',
  'pick-by-location.html': '原型_pda_拣货操作-按库位.html',
  'pick-operation.html': '原型_pda_拣货操作.html',
  'pick-select.html': '原型_pda_B2B拣货.html',
  'pick-task.html': '原型_pda_拣货任务列表.html',
  'security-check.html': '原型_pda_安检拦截.html',
  'vas-detail.html': '原型_pda_增值服务.html',
  'vas-operate.html': '原型_pda_增值服务操作.html',
};

let manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : {};

fs.mkdirSync(BUILD, { recursive: true });
const targets = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(NAMES);
const env = {
  ...process.env,
  LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1',
  LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1',
};

const results = [];
for (const page of targets) {
  const name = NAMES[page];
  if (!name) {
    results.push({ page, status: 'SKIP(不在发布清单)' });
    continue;
  }
  // 1. 合并单文件
  const single = path.join(BUILD, page);
  const b = spawnSync('node', [
    path.join(__dirname, 'build-singlefile.js'),
    path.join(PDA, page),
    single,
  ], { encoding: 'utf8' });
  if (b.status !== 0) {
    results.push({ page, status: 'BUILD FAIL', detail: (b.stderr || '').slice(0, 200) });
    continue;
  }
  // 2. 上传(有 token=覆盖,无=新建)
  const rec = manifest[page] || {};
  const cmd = [
    'lark-cli drive +upload',
    `--file "${path.relative(ROOT, single).replace(/\\/g, '/')}"`,
    `--name "${name}"`,
    '--format json',
    rec.file_token ? `--file-token ${rec.file_token}` : '',
  ].filter(Boolean).join(' ');
  const u = spawnSync(cmd, { encoding: 'utf8', shell: true, cwd: ROOT, env });
  const raw = (u.stdout || '') + (u.stderr || '');
  const brace = raw.indexOf('{');
  if (brace < 0) {
    results.push({ page, status: 'UPLOAD FAIL', detail: raw.slice(0, 200) });
    continue;
  }
  let resp;
  try {
    resp = JSON.parse(raw.slice(brace, raw.lastIndexOf('}') + 1));
  } catch (e) {
    results.push({ page, status: 'UPLOAD FAIL(parse)', detail: `${e.message} | head:${raw.slice(0, 80)} tail:${raw.slice(-120)}` });
    continue;
  }
  if (resp.ok !== true || !resp.data || !resp.data.file_token) {
    results.push({ page, status: 'UPLOAD FAIL', detail: (resp.error && resp.error.message || raw).slice(0, 200) });
    continue;
  }
  const d = resp.data;
  manifest[page] = { file_token: d.file_token, name: d.file_name, url: d.url, version: d.version };
  results.push({ page, status: rec.file_token ? 'OVERWRITE' : 'NEW', url: d.url });
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
for (const r of results) console.log(`${r.status.padEnd(18)} ${r.page}${r.url ? '  ' + r.url : ''}${r.detail ? '  !! ' + r.detail : ''}`);
const fails = results.filter((r) => r.status.includes('FAIL')).length;
console.log(`\nDONE ${results.length} 页,失败 ${fails},manifest 已更新: demo/tools/feishu-manifest.json`);
