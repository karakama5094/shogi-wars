/* GPL-3.0-only. Manual performance probe; it does not claim an iPhone benchmark from desktop results. */
(() => {
  const $=id=>document.getElementById(id);
  const REQUEST='shogi-engine-lab-requested';
  let client=null,running=false,cancelled=false,report=null,lastInfo=null;
  const status=text=>{$('status').textContent=text;};
  const item=(label,pass,detail='')=>{
    const li=document.createElement('li');li.className=pass?'pass':'fail';li.textContent=`${pass?'✓':'✗'} ${label}${detail?' — '+detail:''}`;$('results').appendChild(li);
    report.checks.push({label,pass,detail});renderReport();
  };
  function renderReport(){if(report){$('report').textContent=JSON.stringify(report,null,2);$('copy').disabled=false;}}
  function supported(){
    const simd=typeof WebAssembly==='object'&&WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,7,8,1,4,116,101,115,116,0,0,10,15,1,13,0,65,0,253,17,65,0,253,17,253,186,1,11]));
    return {secureContext:isSecureContext,wasm:typeof WebAssembly==='object',simd,
      isolated:crossOriginIsolated,sharedMemory:typeof SharedArrayBuffer==='function',worker:typeof Worker==='function'};
  }
  async function prepareIsolation(){
    if(crossOriginIsolated)return true;
    if(cancelled)throw new Error('検証を中止しました');
    if(!isSecureContext||!('serviceWorker'in navigator))throw new Error('SafariでHTTPSの検証URLを直接開いてください。');
    if(new URL(location.href).searchParams.has('isolation'))throw new Error('実行環境を準備できませんでした。Safariで直接開き直してください。');
    status('実行環境を準備しています…');
    await navigator.serviceWorker.register('./isolation-sw.js',{scope:'./'});
    await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('実行環境の準備がタイムアウトしました。')),10000))]);
    if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',changed);reject(new Error('実行環境の切り替えがタイムアウトしました。'));},5000);
      function changed(){clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();}
      navigator.serviceWorker.addEventListener('controllerchange',changed,{once:true});
    });
    if(cancelled)throw new Error('検証を中止しました');
    sessionStorage.setItem(REQUEST,'1');const url=new URL(location.href);url.searchParams.set('isolation','1');location.replace(url.href);return false;
  }
  function newClient(){
    return new EngineClient({workerFactory:()=>new Worker('./engine.worker.js'),onLine:line=>{
      const info=ShogiUsi.parseInfo(line);if(info)lastInfo=info;
      if(line.startsWith('id name '))report.engineName=line.slice(8);
      if(line.startsWith('info string ERROR')||line.startsWith('Error'))report.engineErrors.push(line);
    }});
  }
  function fixture(moves=[]){const p=new ShogiRules();for(const move of moves)ShogiUsi.apply(p,move);return p;}
  async function probe(position,label,movetime=1000){
    lastInfo=null;const result=await client.search(ShogiUsi.toSfen(position),{movetime});
    ShogiUsi.parseLegalMove(position,result.bestmove);
    const metrics=await client.metrics();
    report.searches.push({label,...result,info:lastInfo,wasmMemoryBytes:metrics.wasmMemoryBytes,workerCount:metrics.workerCount});
    item(label,true,`${result.bestmove} / ${Math.round(result.elapsedMs)}ms`);return result;
  }
  async function run(){
    if(running)return;running=true;cancelled=false;$('start').disabled=true;$('cancel').disabled=false;
    report={timestamp:new Date().toISOString(),userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency||null,
      features:supported(),configuration:{threads:1,hashMiB:16,initialPool:2,wasmMemoryLimitMiB:256},checks:[],searches:[],engineErrors:[]};
    $('results').replaceChildren();$('report').textContent='';
    const completed=()=>{running=false;$('start').disabled=false;$('cancel').disabled=true;renderReport();};
    let heartbeat=null,maxGap=0,previous=performance.now();
    try{
      if(!await prepareIsolation())return;
      if(cancelled)throw new Error('検証を中止しました');
      report.features=supported();
      if(!Object.values(report.features).every(Boolean))throw new Error('このブラウザは候補エンジンの実行条件を満たしていません。結果をコピーして共有してください。');
      status('エンジンを起動しています…');$('progress').textContent='1 / 6 起動';
      heartbeat=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-previous);previous=now;},50);
      client=newClient();const started=performance.now();report.startup=await client.start();report.startup.totalReadyMs=performance.now()-started;
      if(cancelled)throw new Error('検証を中止しました');
      item('エンジン起動とUSI接続',true,`${Math.round(report.startup.totalReadyMs)}ms / WASM ${Math.round(report.startup.wasmMemoryBytes/1048576)}MiB`);
      item('起動時間の暫定目標（5秒以内）',report.startup.totalReadyMs<=5000,'初回取得を含む参考値。キャッシュ条件は別途確認');
      status('合法手を確認しています…');$('progress').textContent='2 / 6 初期局面';await probe(fixture(),'初期局面の合法手');
      $('progress').textContent='3 / 6 後手局面';await probe(fixture(['7g7f']),'後手局面の合法手');
      $('progress').textContent='4 / 6 持駒のある局面';await probe(fixture(['7g7f','3c3d','2g2f','8c8d','2f2e','8d8e','8h7g','2b7g+','8i7g']),'持駒のある局面の合法手');
      status('停止処理を確認しています…');$('progress').textContent='5 / 6 思考停止';lastInfo=null;
      const search=client.search(ShogiUsi.toSfen(fixture()),{infinite:true});
      let stopAt=null;const timer=setTimeout(()=>{stopAt=performance.now();client.stop();},250);
      let result;try{result=await search;}finally{clearTimeout(timer);}
      if(stopAt===null)throw new Error('停止前に思考が終了したため、停止性能を測定できませんでした。');
      const stopMs=performance.now()-stopAt;ShogiUsi.parseLegalMove(fixture(),result.bestmove);report.stop={latencyMs:stopMs,bestmove:result.bestmove};
      item('思考停止（500ms以内）',stopMs<=500,`${Math.round(stopMs)}ms`);
      await client.destroy();client=null;
      status('再起動を確認しています…');$('progress').textContent='6 / 6 再起動';
      client=newClient();const restart=performance.now();await client.start();report.restartMs=performance.now()-restart;
      await probe(fixture(),'再起動後の合法手',200);item('再起動',true,`${Math.round(report.restartMs)}ms`);
      if(report.engineErrors.length)throw new Error('エンジンからエラーが報告されました。');
      report.maxUiHeartbeatGapMs=maxGap;item('画面応答の参考値（間隔250ms未満）',maxGap<250,`${Math.round(maxGap)}ms。バックグラウンド中の測定は無効`);
      report.finished=true;status(report.checks.every(c=>c.pass)?'検証が完了しました。結果をコピーして共有してください。':'検証は終了しました。一部の目標を満たしていません。結果を共有してください。');
    }catch(error){item(cancelled?'中止':'検証エラー',false,error.message);report.finished=false;status(cancelled?'検証を中止しました。':'検証を完了できませんでした。結果をコピーして共有してください。');}
    finally{if(heartbeat)clearInterval(heartbeat);if(client){await client.destroy();client=null;}completed();}
  }
  $('start').addEventListener('click',run);
  $('cancel').addEventListener('click',()=>{cancelled=true;if(client)client.destroy(new Error('検証を中止しました'));});
  $('copy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText($('report').textContent);status('結果をコピーしました。チャットに貼り付けてください。');}
    catch{const selection=getSelection(),range=document.createRange();range.selectNodeContents($('report'));selection.removeAllRanges();selection.addRange(range);status('結果を選択しました。長押ししてコピーしてください。');}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){cancelled=true;if(client)client.destroy(new Error('画面が非表示になったため測定を中止しました。画面を開いたまま再実行してください。'));}});
  window.addEventListener('pagehide',()=>{if(client)client.destroy();});
  if(sessionStorage.getItem(REQUEST)==='1'){sessionStorage.removeItem(REQUEST);run();}
})();
