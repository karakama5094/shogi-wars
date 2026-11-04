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
fs.writeFileSync('engine-lab/strong-play.css',utility+'\n'+shared+extra);
