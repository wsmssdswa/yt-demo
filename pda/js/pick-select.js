/* ============================================
   pick-select.js — B2B拣货 · 拣货模式选择
   复刻线上 PDA PickSelectModel.tsx (code/pda/app/page/ccos/toBPickGoods)
   业务:整单拣货(OperationPickingType=1) / 逐箱拣货(OperationPickingType=2)
   ============================================ */

document.getElementById('app').innerHTML = Layout.shell(`
  ${Layout.navBar('拣货任务列表')}
  <div class="pk-sel-body">
    <div class="pk-sel-banner">
      <div class="pk-sel-banner-icon">🧺</div>
      <div class="pk-sel-banner-text">B2B 拣货作业</div>
    </div>
    <div class="pk-sel-btn" id="pkBatch">整单拣货</div>
    <div class="pk-sel-btn" id="pkCase">逐箱拣货</div>
    <div class="pk-sel-note">
      · 整单拣货：按拣货任务扫描子单号，一次性拣完主单全部子单<br/>
      · 逐箱拣货：逐箱扫描拣货（线上需开通「单件拣货」权限才显示）
    </div>
  </div>
`);

Helpers.startClock();

document.getElementById('pkBatch').addEventListener('click', () => {
  location.href = './pick-task.html?type=1';
});
document.getElementById('pkCase').addEventListener('click', () => {
  // 线上:hasSinglePermisson 为 true 才渲染该按钮(权限码 singlePick)
  location.href = './pick-task.html?type=2';
});
