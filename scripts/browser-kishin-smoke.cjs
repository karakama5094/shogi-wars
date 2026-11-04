/* Local smoke test: Playwright is optional, install separately to run this probe. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..');
  const wasmPath=process.env.WASM_LOCAL_PATH;
  if(!wasmPath)throw Error('Set WASM_LOCAL_PATH to the verified engine WASM file');
  const server=http.createServer(async(req,res)=>{
    try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!pathname.startsWith('/shogi-wars/'))throw Error('unknown mount');let filename=path.resolve(root,'.'+pathname.slice('/shogi-wars'.length));
      if(filename!==root&&!filename.startsWith(root+path.sep))throw Error('outside root');
      if((await fs.stat(filename)).isDirectory())filename=path.join(filename,'index.html');
      const body=await fs.readFile(filename),ext=path.extname(filename);
      res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm'})[ext]||'text/plain'});res.end(body);
    }catch{res.writeHead(404);res.end('not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.route('https://**',route=>route.abort());
    // Replay the exact SHA-verified npm binary, without relying on external CDN availability.
    await context.route('https://cdn.jsdelivr.net/npm/@mizarjp/yaneuraou.k-p@7.6.3-alpha.0/lib/yaneuraou.k-p.wasm',async route=>{
      await route.fulfill({status:200,contentType:'application/wasm',headers:{'access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'},body:await fs.readFile(wasmPath)});
    });
    const page=await context.newPage();page.on('console',msg=>console.log('browser',msg.type(),msg.text()));page.on('pageerror',e=>console.log('PAGEERROR',e.message));
    const url=`http://127.0.0.1:${server.address().port}/shogi-wars/engine-lab/play.html`;
    await page.goto(url);await page.waitForFunction(()=>window.game&&!game.isPreparing,null,{timeout:45000});
    await page.evaluate(()=>{window.__budgets=[];const search=EngineClient.prototype.search;EngineClient.prototype.search=function(sfen,options){window.__budgets.push(options.movetime);return search.call(this,sfen,options);};});
    const humanMove=()=>page.evaluate(()=>{const m=game.getAllLegalMovesForPlayer(game.currentTurn)[0];return m.isDrop?game.makeDrop(m.toR,m.toC,m.dropType):game.makeMove(m.fromR,m.fromC,m.toR,m.toC,m.promote);});
    for(const [level,budget] of (process.env.QUICK_UI_TEST?[]:[['amateur',1000],['pro',5000],['meijin',10000]])){
      await page.evaluate(level=>{ui.draftSettings.cpuLevel=level;ui.startConfiguredMatch();},level);
      await page.waitForFunction(()=>!game.isPreparing);assert(await humanMove());
      await page.waitForFunction(()=>game.moveHistory.length===2,null,{timeout:18000});
      assert.equal(await page.evaluate(()=>window.__budgets.at(-1)),budget);
      assert.notEqual(await page.locator('#advantage-number').textContent(),'未評価');
      console.log(level,'actual WASM budget',budget,'passed');
    }
    // Human-side unlimited assistance uses the 10-second engine, then queues the selected CPU.
    await page.evaluate(()=>{ui.draftSettings.cpuLevel='amateur';ui.startConfiguredMatch();});await page.waitForFunction(()=>!game.isPreparing);
    if(!process.env.QUICK_UI_TEST){
    await page.locator('#btn-kishin').click();await page.waitForFunction(()=>game.isAssisting);
    await page.evaluate(()=>{ui.handleCellClick(6,2);ui.handleCellClick(5,2);});assert.equal(await page.evaluate(()=>game.moveHistory.length),0);
    await page.waitForFunction(()=>game.moveHistory.length===2,null,{timeout:18000});
    assert.deepEqual(await page.evaluate(()=>window.__budgets.slice(-2)),[10000,1000]);assert.equal(await page.locator('#btn-kishin').isEnabled(),true);
    assert.equal(await page.evaluate(()=>game.kishinRemaining),3);
    }else{assert(await humanMove());await page.waitForFunction(()=>game.moveHistory.length===2);}
    await page.evaluate(()=>ui.handleResign());assert.equal(await page.locator('#analysis-start').isEnabled(),true);
    await page.locator('#analysis-start').click();
    await page.waitForFunction(()=>document.querySelector('#analysis-status').textContent.startsWith('解析完了'),null,{timeout:20000});
    assert.equal(await page.locator('.analysis-row').count(),3);assert.equal(await page.locator('#evaluation-graph circle').count(),3);
    const finalKey=await page.evaluate(()=>game.positionKey());await page.locator('.analysis-row').first().click();assert.equal(await page.evaluate(()=>game.positionKey()),finalKey);
    assert((await page.locator('#analysis-review').textContent()).includes('0手目'));
    await page.evaluate(()=>ui.toggleFlip());
    assert.equal(await page.evaluate(()=>game.positionKey()),finalKey);
    assert.equal(await page.locator('.board-cell[data-real-r="6"]').filter({hasText:'歩'}).count(),9);
    await page.locator('#analysis-start').click();await page.waitForFunction(()=>document.querySelector('#analysis-status').textContent.startsWith('解析完了'),null,{timeout:20000});assert.equal(await page.locator('.analysis-row').count(),3);
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/shogi-levels-kishin.png',fullPage:true});
    await page.locator('#analysis-start').click();await page.waitForFunction(()=>!document.querySelector('#analysis-stop').disabled);await page.locator('#analysis-stop').click();
    assert((await page.locator('#analysis-status').textContent()).startsWith('解析を停止'));
    await page.evaluate(()=>ui.startConfiguredMatch());await page.waitForFunction(()=>!game.isPreparing);assert.equal(await page.locator('.analysis-row').count(),0);assert.equal(await page.locator('#analysis-start').isEnabled(),false);
    await page.evaluate(()=>ui.handleResign());
    const closeStart=Date.now();while(page.workers().length&&Date.now()-closeStart<10000)await page.waitForTimeout(100);assert.equal(page.workers().length,0);
    console.log('Three actual budgets, unlimited assistance, live evaluation, repeated post-game analysis, read-only replay, cancellation and cleanup passed');
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
