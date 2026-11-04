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
    assert.equal(await page.locator('#shogi-board .board-cell').count(),81);
    assert(await page.evaluate(()=>crossOriginIsolated));
    assert.equal(await page.evaluate(()=>game.cpu.movetime),5000);
    assert.equal(await page.locator('#btn-hint').isVisible(),false);
    assert.equal(await page.locator('#btn-kishin').isVisible(),false);
    const board=await page.locator('#shogi-board').boundingBox();assert(board.width<=390);
    let began=Date.now();
    await page.locator('.board-cell').nth(6*9+2).click();await page.locator('.board-cell').nth(5*9+2).click();
    await page.waitForFunction(()=>game.moveHistory.length===2,null,{timeout:15000});
    const firstMs=Date.now()-began;assert(firstMs>=4500);console.log('Five-second strong CPU response',firstMs,'ms',await page.evaluate(()=>game.usiMoves));
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:'/tmp/shogi-strong-trial.png',fullPage:true});
    const humanMove=()=>page.evaluate(()=>{const m=game.getAllLegalMovesForPlayer(game.currentTurn)[0];return m.isDrop?game.makeDrop(m.toR,m.toC,m.dropType):game.makeMove(m.fromR,m.fromC,m.toR,m.toC,m.promote);});
    assert(await humanMove());await page.waitForFunction(()=>game.cpu.client?.state==='searching');
    await page.evaluate(()=>ui.undoMove());assert.equal(await page.evaluate(()=>game.moveHistory.length),2);
    assert.equal(await page.evaluate(()=>game.usiMoves.length),2);await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>game.moveHistory.length),2);
    assert(await humanMove());await page.waitForFunction(()=>game.moveHistory.length===4,null,{timeout:15000});
    console.log('Undo during actual WASM search and subsequent CPU response passed');
    assert(await humanMove());await page.waitForFunction(()=>game.cpu.client?.state==='searching');
    await page.evaluate(()=>ui.startConfiguredMatch());await page.waitForFunction(()=>!game.isPreparing);assert.equal(await page.evaluate(()=>game.moveHistory.length),0);
    await page.evaluate(()=>{ui.draftSettings.playerSide='gote';ui.startConfiguredMatch();});
    await page.waitForFunction(()=>game.cpu.client?.state==='searching');
    await page.evaluate(()=>game.cpu.pause());const time=await page.evaluate(()=>game.senteTime);
    await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>game.senteTime),time);
    await page.evaluate(()=>game.cpu.resume());await page.waitForFunction(()=>game.moveHistory.length===1,null,{timeout:15000});
    assert.equal(await page.evaluate(()=>game.currentTurn),'gote');assert(await page.evaluate(()=>game.flipped));
    assert(await humanMove());await page.waitForFunction(()=>game.cpu.client?.state==='searching');await page.evaluate(()=>ui.handleResign());
    assert(await page.evaluate(()=>game.isGameOver));const key=await page.evaluate(()=>game.positionKey());
    await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>game.positionKey()),key);
    const closeStart=Date.now();while(page.workers().length&&Date.now()-closeStart<10000)await page.waitForTimeout(100);
    assert.equal(page.workers().length,0);
    await page.goto(url.replace('engine-lab/play.html',''),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.game);
    assert.equal(await page.evaluate(()=>game.cpu),null);assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller),null);
    assert(await humanMove());await page.waitForFunction(()=>game.moveHistory.length===2);
    console.log('New match, gote, pause/resume, resign, worker cleanup, and original CPU regression passed');
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
