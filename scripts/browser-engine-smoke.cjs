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
    const url=`http://127.0.0.1:${server.address().port}/shogi-wars/engine-lab/`;
    await page.goto(url);await page.locator('#start').click();
    await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('"finished"'),null,{timeout:90000});
    await page.waitForFunction(()=>!document.querySelector('#start').disabled);
    const report=JSON.parse(await page.locator('#report').textContent());await fs.writeFile('/tmp/shogi-engine-lab-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({finished:report.finished,checks:report.checks,startup:report.startup,stop:report.stop,restartMs:report.restartMs,workerCount:report.searches.map(s=>s.workerCount)},null,2));
    await page.screenshot({path:'/tmp/shogi-engine-lab.png',fullPage:true});
    assert(report.finished);assert(report.checks.every(c=>c.pass));
    assert(report.searches.every(s=>s.workerCount<=3));
    const cleanupStart=Date.now();
    while(page.workers().length && Date.now()-cleanupStart<10000)await page.waitForTimeout(100);
    assert.equal(page.workers().length,0,'engine workers released after completion');
    console.log('All nested workers closed within',Date.now()-cleanupStart,'ms');
    await page.goto(url.replace('/engine-lab/','/'),{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#shogi-board .board-cell').count(),81);
    assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller),null,'normal game remains outside lab SW scope');
    // Retry, cancellation and failed download must not leave hanging searches.
    await page.goto(url);await page.locator('#start').click();
    await page.waitForFunction(()=>document.querySelector('#progress').textContent.includes('2 / 6'));
    await page.locator('#cancel').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent==='検証を中止しました。');
    assert.equal(await page.locator('#start').isEnabled(),true);
    await context.route('**/yaneuraou.k-p.wasm',route=>route.fulfill({status:503,body:'offline'}));
    await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('"finished": false'));
    assert((await page.locator('#report').textContent()).includes('WASM download failed: 503'));
    await context.route('**/yaneuraou.k-p.wasm',route=>route.fulfill({status:200,body:'invalid wasm'}));
    await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('"finished": false'));
    assert((await page.locator('#report').textContent()).includes('WASM integrity check failed'));
    console.log('Normal game scope, nested worker cleanup, cancellation, download failure and integrity failure checks passed');
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
