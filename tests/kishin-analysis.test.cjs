const {test}=require('node:test'),assert=require('node:assert/strict');
const {ShogiRules}=require('../src/domain/rules.js'),U=require('../src/engine/usi-position.js'),E=require('../src/engine/evaluation.js');
const {KishinAnalysis}=require('../src/engine/kishin-analysis.js');
function setup({delay=false}={}){
  const clients=[],results=[];const analysis=new KishinAnalysis({createPosition:()=>new ShogiRules(),apply:U.apply,toSfen:U.toSfen,parseLegalMove:U.parseLegalMove,parseInfo:U.parseInfo,advantage:E.advantage,onResult:e=>results.push(e),createClient:()=>{
    const c={queries:[],async start(){},search(sfen,options){this.queries.push(options);const response={bestmove:options.moves.length%2?'3c3d':'7g7f',infoLine:'info depth 5 score cp 120 pv 7g7f'};return delay?new Promise((resolve,reject)=>{this.resolve=()=>resolve(response);this.reject=reject;}):Promise.resolve(response);},async destroy(){this.closed=true;}};clients.push(c);return c;
  }});return {analysis,clients,results};
}
test('post-game analysis visits all positions, flips score perspective, and preserves immutable snapshots',async()=>{
  const {analysis:a,clients,results}=setup();const moves=['7g7f','3c3d'];
  // Last fixture's bestmove needs a legal next white pawn move rather than the already moved 7g pawn.
  const original=a.createClient;a.createClient=()=>{const c=original();c.search=async function(sfen,options){this.queries.push(options);return {bestmove:options.moves.length===2?'2g2f':options.moves.length?'3c3d':'7g7f',infoLine:'info depth 5 score cp 120 pv 7g7f'};};return c;};
  const result=await a.run(moves);assert.equal(result.length,3);assert.equal(result[0].value,20);assert.equal(result[1].value,-20);assert.equal(result[2].value,20);
  assert.equal(results[0].position.board[6][2].type,'FU');assert.equal(results[1].position.board[6][2],null);assert.deepEqual(moves,['7g7f','3c3d']);assert(clients[0].closed);assert.equal(a.running,false);
});
test('analysis can be repeated without a usage limit',async()=>{
  const {analysis:a,clients}=setup();for(let i=0;i<5;i++)assert.equal((await a.run([])).length,1);assert.equal(clients.length,5);assert(clients.every(c=>c.closed));
});
test('cancellation suppresses a late result and allows a fresh run',async()=>{
  const {analysis:a,clients,results}=setup({delay:true});const first=a.run([]);await new Promise(resolve=>setImmediate(resolve));a.cancel();clients[0].resolve();assert.equal(await first,null);assert.equal(results.length,0);
  const second=a.run([]);await new Promise(resolve=>setImmediate(resolve));clients[1].resolve();assert.equal((await second).length,1);
});
test('invalid bestmove fails safely and releases the engine',async()=>{
  const {analysis:a,clients}=setup();const original=a.createClient;a.createClient=()=>{const c=original();c.search=async()=>({bestmove:'7g7e',infoLine:null});return c;};await assert.rejects(a.run([]),/Illegal/);assert(clients[0].closed);assert.equal(a.running,false);
});
test('missing engine score is unassessed, not an invented zero',async()=>{
  const {analysis:a}=setup();const original=a.createClient;a.createClient=()=>{const c=original();c.search=async()=>({bestmove:'7g7f',infoLine:null});return c;};assert.equal((await a.run([]))[0].value,null);
});
