const fs=require('node:fs');
const utility=fs.readFileSync(process.argv[2],'utf8');
const shared=fs.readFileSync('src/styles.css','utf8').replace(/^\s*@import[^\n]+\n/m,'');
const extra=`
.strong-panel{max-width:860px;width:calc(100% - 24px);padding:16px;margin:12px auto;background:#101d30;border:1px solid #36516e;border-radius:12px;font-size:13px;line-height:1.8}
.strong-panel h2{font-size:19px;font-weight:800;color:#fcd66d}.strong-panel a{color:#8dd3ff;text-decoration:underline}
.strong-panel button{min-height:44px;border:1px solid #52718f;border-radius:8px;padding:8px 12px;margin:6px 6px 0 0;background:#263f59;color:white}
.strong-panel button:disabled{opacity:.45}#strong-status{font-weight:700;color:#fcd66d}#strong-status[data-state=error]{color:#ffa6a6}
@media(max-width:639px){.shogi-board-grid{width:min(350px,calc(100vw - 56px));height:auto;aspect-ratio:35/38}}
`;
const features=`
.strong-panel select,#newgame-modal select{min-height:44px;background:#20344d;color:#fff;border:1px solid #6582a1;border-radius:8px;padding:8px;max-width:100%}
.level-scale{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.level-scale span{flex:1;min-width:85px;padding:10px;border:1px solid #45617d;border-radius:8px}.level-scale b{display:block;color:#f7d174}
.evaluation-panel h2{display:flex;justify-content:space-between}.advantage-axis{display:flex;justify-content:space-between;color:#c2d1e2;font-size:12px}.advantage-bar{display:flex;position:relative;height:22px;border-radius:8px;overflow:hidden;margin:6px 0;background:#243447}.advantage-bar i{position:absolute;left:50%;height:100%;border-left:2px solid white}#advantage-gote{background:#ed8298;width:50%;transition:width .2s}#advantage-sente{background:#55bddd;width:50%;transition:width .2s}.strong-panel .explain{font-size:11px;color:#b9c8db;line-height:1.7}.strong-panel h3{font-weight:bold;margin-top:12px}#evaluation-graph{width:100%;height:auto;display:block}#evaluation-graph circle[role=button]{cursor:pointer}.analysis-results{max-height:260px;overflow:auto}.strong-panel .analysis-row{display:block;text-align:left;width:100%;font-size:12px;background:#192e46}.analysis-row:focus-visible{outline:2px solid #ffe083}#btn-kishin:disabled{opacity:.45;animation:none}
`;
fs.writeFileSync('engine-lab/strong-play.css',utility+'\n'+shared+extra+features);
