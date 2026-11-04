/* GPL-3.0-only. Three CPU levels, unlimited assistance and local post-game analysis. */
window.configureShogiGame=(game,ui)=>{
  const $=id=>document.getElementById(id),E=ShogiEvaluation;
  const live=new Map();let analysisEpoch=0,analysisResults=[],selected=null,lastAnalysisMs=1000,analysisComplete=false;
  ui.draftSettings.cpuLevel='pro';
  $('cpu-level').addEventListener('change',event=>{ui.draftSettings.cpuLevel=event.target.value;});
  const redraw=()=>{
    for(const [ply,entry]of live)if(game.positionHistory[ply]?.key!==entry.positionKey)live.delete(ply);
    drawShogiEvaluation(game.isGameOver&&analysisResults.length?analysisResults:[...live.values()],game.usiMoves.length,review,selected);
  };
  const sync=()=>{
    $('ai-level-label').textContent=controller.label;
    $('sente-name').textContent=game.playerSide==='sente'?'あなた（先手）':'やねうら王（先手）';
    $('gote-name').textContent=game.playerSide==='gote'?'あなた（後手）':'やねうら王（後手）';
    $('strong-resume').disabled=!game.isPaused||game.isGameOver;
    $('btn-kishin').disabled=game.isGameOver||game.isPaused||game.isPreparing||game.isAssisting||game.currentTurn!==game.playerSide||!!game.pendingPromoMove;
    $('analysis-panel').hidden=!game.isGameOver;
    $('analysis-start').disabled=!game.isGameOver||analysis.running;
    $('analysis-stop').disabled=!analysis.running;
    $('analysis-time').disabled=analysis.running;
    $('analysis-copy').disabled=!analysisResults.length;
  };
  const show=(state,text)=>{$('strong-status').textContent=text;$('strong-status').dataset.state=state;ui.showAiThinking(state==='thinking'||state==='assisting');sync();};
  const baseRender=ui.render.bind(ui);
  const renderBoard=()=>{
    if(!selected||!game.isGameOver){baseRender();return;}
    const liveGame=ui.game;
    const replay=Object.assign(Object.create(liveGame),selected.position,{lastMove:null,selectedCell:null,selectedHandPiece:null,validDestinations:[]});
    try{ui.game=replay;baseRender();}finally{ui.game=liveGame;}
  };
  ui.render=()=>{renderBoard();sync();redraw();};
  const refresh=()=>{ui.render();ui.updateTimers();};
  const controller=new StrongCpuController(game,{
    createClient:()=>new EngineClient({workerFactory:()=>new Worker('./engine.worker.js'),onLine:line=>controller.receive(line)}),
    toSfen:ShogiUsi.toSfen,parseLegalMove:ShogiUsi.parseLegalMove,parseInfo:ShogiUsi.parseInfo,onStatus:show,onReady:refresh,
    onEvaluation:entry=>{const value=E.advantage(entry.score,entry.sideToMove);if(value!==null){live.set(entry.ply,{...entry,value,positionKey:game.positionKey()});redraw();}}
  });
  game.cpu=controller;
  const analysis=new KishinAnalysis({createPosition:()=>new ShogiRules(),apply:ShogiUsi.apply,toSfen:ShogiUsi.toSfen,
    parseLegalMove:ShogiUsi.parseLegalMove,parseInfo:ShogiUsi.parseInfo,advantage:E.advantage,
    createClient:()=>new EngineClient({workerFactory:()=>new Worker('./engine.worker.js')}),beforeStart:()=>controller.dispose(),
    onProgress:(done,total)=>{if(game.isGameOver)$('analysis-status').textContent=`解析中 ${done} / ${total}局面。画面を開いたままお待ちください。`;},
    onResult:entry=>{
      if(!game.isGameOver)return;analysisResults.push(entry);
      const row=document.createElement('button');row.type='button';row.className='analysis-row';
      const label=entry.bestmove?E.moveLabel(entry.position,entry.bestmove):'詰み・合法手なし';
      row.textContent=`${entry.ply}手目後　${entry.value===null?'未評価':(entry.value>0?'+':'')+entry.value}　推奨：${label}`;
      row.addEventListener('click',()=>review(entry));$('analysis-results').appendChild(row);sync();redraw();
    }});
  function review(entry){
    if(!game.isGameOver||!entry.position)return;
    selected=entry;ui.render();
    $('analysis-review').textContent=`解析表示：${entry.ply}手目後（盤面は閲覧専用）`;redraw();
  }
  const initialize=game.initNewMatch.bind(game);
  game.initNewMatch=()=>{analysisEpoch++;analysis.cancel();analysisComplete=false;analysisResults=[];selected=null;live.clear();$('analysis-results').replaceChildren();$('analysis-status').textContent='対局終了後に利用できます。';$('analysis-review').textContent='結果の手数を押すと、その局面を表示します。';initialize();};
  const finish=game.finishGame.bind(game);game.finishGame=(...args)=>{if(game.isGameOver)return;finish(...args);show('finished','対局終了。棋神解析を何度でも実行できます。');$('analysis-status').textContent='棋神解析を開始できます。';};
  $('strong-pause').addEventListener('click',()=>controller.pause());$('strong-resume').addEventListener('click',()=>controller.resume());
  $('analysis-start').addEventListener('click',async()=>{
    if(!game.isGameOver||analysis.running)return;
    const epoch=++analysisEpoch;analysisComplete=false;analysisResults=[];selected=null;$('analysis-results').replaceChildren();$('analysis-status').textContent='解析を準備しています…';$('analysis-review').textContent='結果の手数を押すと、その局面を表示します。';baseRender();redraw();
    lastAnalysisMs=Number($('analysis-time').value);
    const promise=analysis.run([...game.usiMoves],{movetime:lastAnalysisMs});sync();
    try{const result=await promise;if(epoch===analysisEpoch&&result){analysisComplete=true;$('analysis-status').textContent=`解析完了：${result.length}局面。何度でも再解析できます。`;} }
    catch(error){if(epoch===analysisEpoch)$('analysis-status').textContent=`解析を停止しました：${error.message}。もう一度実行できます。`;}
    finally{if(epoch===analysisEpoch)sync();}
  });
  $('analysis-stop').addEventListener('click',()=>{analysisEpoch++;analysisComplete=false;analysis.cancel();$('analysis-status').textContent='解析を停止しました。途中結果は表示したままです。';sync();});
  $('analysis-copy').addEventListener('click',()=>{
    const text=JSON.stringify({schemaVersion:1,complete:analysisComplete,moves:[...game.usiMoves],cpuLevel:controller.level,analysisMs:lastAnalysisMs,results:analysisResults.map(({position,...entry})=>entry)},null,2);
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>{$('analysis-status').textContent='解析結果をコピーしました。';},()=>ui.copyFallback(text));else ui.copyFallback(text);
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)return;
    if(analysis.running){analysisEpoch++;analysis.cancel();$('analysis-status').textContent='画面が非表示になったため解析を停止しました。再実行できます。';sync();}
    controller.pause('画面が非表示になったため一時停止しました。戻ったら「再開・再接続」を押してください。');
  });
  window.addEventListener('pagehide',()=>{analysis.cancel();controller.pause();controller.dispose();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&!game.isGameOver){game.isPaused=true;show('paused','画面に戻りました。「再開・再接続」を押してください。');}});
};
(async()=>{
  const gameSource=document.currentScript?.dataset.gameSrc||'../src/game.js';
  const start=()=>{
    const script=document.createElement('script');script.src=gameSource;document.body.appendChild(script);
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
