const {test}=require('node:test'),assert=require('node:assert/strict');
const {loadGame}=require('./helpers.cjs');
const {StrongCpuController}=require('../src/engine/strong-cpu.js');
const usi=require('../src/engine/usi-position.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
  const h=loadGame(),clients=[],states=[];
  const controller=new StrongCpuController(h.game,{toSfen:usi.toSfen,parseLegalMove:usi.parseLegalMove,onStatus:(...args)=>states.push(args),createClient:()=>{
    const c={state:'idle',commands:[],searches:[],async start(){this.state='ready';},send(command){this.commands.push(command);},search(sfen,options){this.state='searching';return new Promise((resolve,reject)=>{this.searches.push({sfen,options,resolve:move=>{this.state='ready';resolve({bestmove:move});},reject});});},async destroy(){this.state='idle';this.destroyed=true;}};clients.push(c);return c;
  }});h.game.cpu=controller;return {...h,controller,clients,states};
}
test('engine initialization blocks moves and delays the clock until ready',async()=>{
  const h=setup(),g=h.game;g.initNewMatch();assert(g.isPreparing);assert.equal(g.makeMove(6,0,5,0),false);
  h.advance(5000);await tick();assert.equal(g.isPreparing,false);assert.equal(g.senteTime,600);assert(h.clients[0].commands.includes('usinewgame'));await h.controller.dispose();
});
test('strong CPU requests five seconds with full move history and applies a legal response',async()=>{
  const h=setup(),g=h.game;g.initNewMatch();await tick();assert(g.makeMove(6,2,5,2));await tick();
  const search=h.clients[0].searches[0];assert.equal(search.options.movetime,5000);assert.deepEqual(search.options.moves,['7g7f']);
  search.resolve('3c3d');await tick();assert.equal(g.moveHistory.length,2);assert.deepEqual([...g.usiMoves],['7g7f','3c3d']);assert.equal(g.currentTurn,'sente');await h.controller.dispose();
});
test('undo during real search cancels the engine and rejects its late response',async()=>{
  const h=setup(),g=h.game;g.initNewMatch();await tick();const initial=g.positionKey();g.makeMove(6,2,5,2);await tick();const search=h.clients[0].searches[0];
  h.ui().undoMove();assert.equal(g.positionKey(),initial);assert.equal(g.usiMoves.length,0);search.resolve('3c3d');await tick();assert.equal(g.positionKey(),initial);assert.equal(g.moveHistory.length,0);await h.controller.dispose();
});
test('new match during a search discards old bestmove',async()=>{
  const h=setup(),g=h.game;g.initNewMatch();await tick();g.makeMove(6,2,5,2);await tick();const old=h.clients[0].searches[0];
  g.initNewMatch();await tick();old.resolve('3c3d');await tick();assert.equal(g.moveHistory.length,0);assert.equal(g.isPreparing,false);await h.controller.dispose();
});
test('pause freezes the clock and resume re-searches the exact same position',async()=>{
  const h=setup(),g=h.game;g.initNewMatch();await tick();g.makeMove(6,2,5,2);await tick();const key=g.positionKey();h.advance(1000);h.controller.pause();const time=g.goteTime;
  h.advance(60000);g.updateClock();assert.equal(g.goteTime,time);assert.equal(g.makeMove(2,6,3,6),false);await h.controller.resume();await tick();assert.equal(g.positionKey(),key);
  assert.equal(h.clients[1].searches.length,1);h.clients[1].searches[0].resolve('3c3d');await tick();assert.equal(g.moveHistory.length,2);await h.controller.dispose();
});
for(const reason of ['resign','timeout'])test(`${reason} prevents a completed engine result from moving`,async()=>{
  const h=setup(),g=h.game;g.initNewMatch();await tick();g.makeMove(6,2,5,2);await tick();const search=h.clients[0].searches[0];
  g.finishGame(reason,'sente');const key=g.positionKey();search.resolve('3c3d');await tick();assert.equal(g.positionKey(),key);assert(g.isGameOver);await h.controller.dispose();
});
test('illegal bestmove pauses without switching to the weak CPU or changing the board',async()=>{
  const h=setup(),g=h.game;g.initNewMatch();await tick();g.makeMove(6,2,5,2);await tick();const key=g.positionKey();h.clients[0].searches[0].resolve('3c3e');await tick();
  assert.equal(g.positionKey(),key);assert(g.isPaused);assert(h.states.some(([state])=>state==='error'));await h.controller.dispose();
});
test('engine resignation ends the game',async()=>{
  const h=setup(),g=h.game;g.initNewMatch();await tick();g.makeMove(6,2,5,2);await tick();h.clients[0].searches[0].resolve('resign');await tick();assert.equal(g.result.reason,'resign');assert.equal(g.result.loser,'gote');await h.controller.dispose();
});
test('playing gote queues a strong opening and undo restores matching USI history',async()=>{
  const h=setup(),g=h.game;g.playerSide='gote';g.initNewMatch();await tick();const first=h.clients[0].searches[0];assert.equal(first.options.moves.length,0);first.resolve('7g7f');await tick();
  assert.equal(g.currentTurn,'gote');h.ui().undoMove();await tick();assert.equal(g.usiMoves.length,0);assert.equal(h.clients[0].searches[1].options.moves.length,0);await h.controller.dispose();
});
