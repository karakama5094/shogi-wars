/* Generate the trial markup from the normal board so board and controls stay aligned. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/  <!-- Strong trial entry -->[\s\S]*?  <!-- \/Strong trial entry -->\n/,'').replace(/  <script src="https:\/\/cdn.tailwindcss.com\/3.4.17"><\/script>\n/,'')
  .replace(/  <link rel="stylesheet" href="https:\/\/cdnjs[^\n]+\n/,'')
  .replace('<link rel="stylesheet" href="./src/styles.css">','<link rel="stylesheet" href="./strong-play.css">')
  .replace(/<title>.*?<\/title>/,'<title>最強CPU・1手5秒（試験） | shogi-wars</title>')
  .replace('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover','width=device-width, initial-scale=1.0, viewport-fit=cover')
  .replace('9×9 本格AI対局 ＆ ド派手演出システム','やねうら王・最強設定 / 1手最大5秒（試験）')
  .replace('<!-- Main Container -->',`<section class="strong-panel" aria-label="最強CPUの状態">
    <a href="../">通常対局へ戻る</a>
    <h2>最強CPU・1手最大5秒（試験）</h2>
    <p>やねうら王＋水匠Petite。弱化なし・探索1スレッド。画面を離れると対局と時計を一時停止します。長時間の安定性・発熱は検証中です。</p>
    <p id="strong-status" role="status" aria-live="polite">CPUを準備しています…</p>
    <div><button id="strong-pause" type="button">一時停止</button><button id="strong-resume" type="button" disabled>再開・再接続</button></div>
    <p><a href="./vendor/COPYING.txt">GPLv3ライセンス</a> · <a href="./vendor/NOTICE.txt">エンジン出典・対応ソース</a></p>
  </section>\n  <!-- Main Container -->`)
  .replace('<div class="mb-3">\n          <div class="flex justify-between','<div hidden class="mb-3">\n          <div class="flex justify-between')
  .replace('id="ai-level-label" class="text-amber-400">簡易CPU','id="ai-level-label" class="text-amber-400">最強設定・最大5秒')
  .replace('id="btn-hint"','hidden id="btn-hint"')
  .replace('<script src="./src/domain/rules.js"></script>','<script src="../src/domain/rules.js"></script>\n  <script src="../src/engine/usi-position.js"></script>\n  <script src="./engine-client.js"></script>\n  <script src="../src/engine/strong-cpu.js"></script>')
  .replace('<script src="./src/game.js"></script>','<script src="./strong-play.js"></script>');
html=html.trimEnd()+'\n';
const target=path.join(root,'engine-lab/play.html');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==html)throw Error('Regenerate trial page');}else fs.writeFileSync(target,html);
