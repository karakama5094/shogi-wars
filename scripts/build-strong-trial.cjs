/* Generate the AI board from the normal board; share game and style source. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/  <!-- Strong trial entry -->[\s\S]*?  <!-- \/Strong trial entry -->\n/,'').replace(/  <script src="https:\/\/cdn.tailwindcss.com\/3.4.17"><\/script>\n/,'')
  .replace(/  <link rel="stylesheet" href="https:\/\/cdnjs[^\n]+\n/,'')
  .replace('<link rel="stylesheet" href="./src/styles.css">','<link rel="stylesheet" href="./strong-play.css">')
  .replace(/<title>.*?<\/title>/,'<title>AI対局・棋神降臨・棋神解析 | shogi-wars</title>')
  .replace('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover','width=device-width, initial-scale=1.0, viewport-fit=cover')
  .replace('9×9 本格AI対局 ＆ ド派手演出システム','名人・プロ・アマ / 棋神降臨・解析（無限）')
  .replace('<!-- Main Container -->',fs.readFileSync(path.join(root,'scripts/ai-panels.html'),'utf8')+'\n<!-- Main Container -->')
  .replace('<!-- Time Control -->',`<div><label for="cpu-level">CPUのレベル</label><select id="cpu-level"><option value="meijin">名人 — 10秒</option><option value="pro" selected>プロ — 5秒</option><option value="amateur">アマ — 1秒</option></select><p>選択は「対局開始」で反映されます。</p></div>\n<!-- Time Control -->`)
  .replace('<div class="mb-3">\n          <div class="flex justify-between','<div hidden class="mb-3">\n          <div class="flex justify-between')
  .replace('id="ai-level-label" class="text-amber-400">簡易CPU','id="ai-level-label" class="text-amber-400">プロ・最大5秒')
  .replace(/<button id="btn-kishin"[\s\S]*?<\/button>/,'<button id="btn-kishin" class="kishin-btn flex-1 py-3 px-4 rounded-xl text-slate-950 font-black text-base" type="button">⚡ 棋神降臨（無限）</button>')
  .replace('id="btn-hint"','hidden id="btn-hint"')
  .replace('<script src="./src/domain/rules.js"></script>','<script src="../src/domain/rules.js"></script>\n  <script src="../src/engine/usi-position.js"></script>\n  <script src="../src/engine/evaluation.js"></script>\n  <script src="./engine-client.js"></script>\n  <script src="../src/engine/strong-cpu.js"></script>\n  <script src="../src/engine/kishin-analysis.js"></script>')
  .replace('<script src="./src/game.js"></script>','<script src="./evaluation-ui.js"></script>\n  <script src="./strong-play.js"></script>');
const fingerprint=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);
html=html.replace('<script src="./strong-play.js"></script>',`<script src="./strong-play.js" data-game-src="../src/game.js?v=${fingerprint(path.join(root,'src/game.js'))}"></script>`);
html=html.replace(/(src|href)="(\.\.?\/[^"?]+\.(?:js|css))"/g,(match,attr,url)=>`${attr}="${url}?v=${fingerprint(path.resolve(root,'engine-lab',url))}"`);
html=html.trimEnd()+'\n';const target=path.join(root,'engine-lab/play.html');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==html)throw Error('Regenerate trial page');}else fs.writeFileSync(target,html);
