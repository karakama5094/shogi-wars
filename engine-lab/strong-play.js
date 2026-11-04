/* GPL-3.0-only. The strong trial uses the shared board/game, not the one-ply CPU. */
window.configureShogiGame=(game,ui)=>{
  const status=document.getElementById('strong-status'),resume=document.getElementById('strong-resume');
  const show=(state,text)=>{
    status.textContent=text;status.dataset.state=state;resume.disabled=!game.isPaused||game.isGameOver;
    ui.showAiThinking(state==='thinking');
  };
  const refresh=()=>{
    document.getElementById('ai-level-label').textContent='最強設定・最大5秒';
    document.getElementById('sente-name').textContent=game.playerSide==='sente'?'あなた（先手）':'やねうら王（先手）';
    document.getElementById('gote-name').textContent=game.playerSide==='gote'?'あなた（後手）':'やねうら王（後手）';
    ui.render();ui.updateTimers();
  };
  const controller=new StrongCpuController(game,{
    createClient:()=>new EngineClient({workerFactory:()=>new Worker('./engine.worker.js')}),
    toSfen:ShogiUsi.toSfen,parseLegalMove:ShogiUsi.parseLegalMove,onStatus:show,onReady:refresh});
  game.cpu=controller;
  const finish=game.finishGame.bind(game);
  game.finishGame=(...args)=>{finish(...args);show('finished','対局終了。新対局からもう一度対局できます。');};
  const pause=document.getElementById('strong-pause');pause.addEventListener('click',()=>controller.pause());
  resume.addEventListener('click',()=>controller.resume());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.pause('画面が非表示になったため一時停止しました。戻ったら「再開・再接続」を押してください。');});
  window.addEventListener('pagehide',()=>{controller.pause();controller.dispose();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&!game.isGameOver){game.isPaused=true;show('paused','画面に戻りました。「再開・再接続」を押してください。');}});
};
(async()=>{
  const start=()=>{
    const script=document.createElement('script');script.src='../src/game.js';document.body.appendChild(script);
  };
  if(crossOriginIsolated&&typeof SharedArrayBuffer==='function'){start();return;}
  const status=document.getElementById('strong-status');
  try{
    if(!isSecureContext||!('serviceWorker'in navigator)||new URL(location.href).searchParams.has('isolation'))throw new Error('実行環境を準備できません。SafariでHTTPSのURLを直接開いてください。');
    status.textContent='実行環境を準備しています。1回だけ再読み込みします…';
    await navigator.serviceWorker.register('./isolation-sw.js',{scope:'./'});
    await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('準備がタイムアウトしました。')),10000))]);
    if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',changed);reject(new Error('実行環境の切り替えがタイムアウトしました。'));},5000);
      function changed(){clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();}
      navigator.serviceWorker.addEventListener('controllerchange',changed,{once:true});
    });
    const url=new URL(location.href);url.searchParams.set('isolation','1');location.replace(url.href);
  }catch(error){status.textContent=error.message;}
})();
