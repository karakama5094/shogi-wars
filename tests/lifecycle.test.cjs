const {test} = require('node:test');
const assert = require('node:assert/strict');
const {loadGame, empty, put} = require('./helpers.cjs');

test('new match invalidates even a callback already dispatched by the browser',()=>{
  const h=loadGame(),g=h.game;assert(g.makeMove(6,0,5,0));const stale=h.allTasks[0];
  g.initNewMatch();const key=g.positionKey();stale();h.flush();assert.equal(g.positionKey(),key);assert.equal(g.moveHistory.length,0);
});
test('undo during CPU wait restores one human ply and cancels CPU',()=>{
  const h=loadGame(),g=h.game;const initial=g.positionKey();g.makeMove(6,0,5,0);const stale=h.allTasks[0];
  h.ui().undoMove();stale();assert.equal(g.positionKey(),initial);assert.equal(g.boardHistory.length,0);assert.equal(g.positionHistory.length,1);
});
test('undo after CPU move restores both plies and repetition history',()=>{
  const h=loadGame(),g=h.game;const initial=g.positionKey();g.makeMove(6,0,5,0);h.flush();assert.equal(g.moveHistory.length,2);
  h.ui().undoMove();assert.equal(g.positionKey(),initial);assert.equal(g.positionHistory.length,1);assert.equal(g.moveHistory.length,0);
});
for(const reason of ['resign','timeout']) test(`${reason} cancels CPU and prevents further moves`,()=>{
  const h=loadGame(),g=h.game;g.makeMove(6,0,5,0);const stale=h.allTasks[0];g.finishGame(reason,'sente');const key=g.positionKey();
  stale();assert.equal(g.makeMove(2,0,3,0),false);assert.equal(g.makeDrop(4,4,'FU'),false);assert.equal(g.positionKey(),key);assert.equal(h.tasks.size,0);
});
test('promotion dialog cannot commit after timeout',()=>{
  const h=loadGame(),g=h.game;empty(g);put(g,3,4,'GI');g.pendingPromoMove={fromR:3,fromC:4,toR:2,toC:4};
  g.handleTimeout('sente');const key=g.positionKey();h.ui().resolvePromotion(true);assert.equal(g.positionKey(),key);assert.equal(g.pendingPromoMove,null);
});
test('CPU only executes on CPU turn, including duplicate requests',()=>{
  const h=loadGame(),g=h.game;g.executeAiMove();assert.equal(g.moveHistory.length,0);
  g.makeMove(6,0,5,0);g.queueAiMove();h.flush();assert.equal(g.moveHistory.length,2);
});
test('human playing gote can undo the CPU opening without leaving a stalled game',()=>{
  const h=loadGame(),g=h.game;g.playerSide='gote';g.initNewMatch();g.queueAiMove();h.flush();assert.equal(g.moveHistory.length,1);
  h.ui().undoMove();assert.equal(g.currentTurn,'sente');h.flush();assert.equal(g.moveHistory.length,1);assert.equal(g.currentTurn,'gote');
});
test('elapsed time counts delayed callbacks and prevents late move after deadline',()=>{
  const h=loadGame(),g=h.game;g.initNewMatch();h.advance(5500);g.updateClock();assert.equal(g.senteTime,594.5);
  h.advance(600000);assert.equal(g.makeMove(6,0,5,0),false);assert.equal(g.result.reason,'timeout');assert.equal(g.moveHistory.length,0);
});
test('ten second mode resets next player clock and undo rebases clock',()=>{
  const h=loadGame(),g=h.game;g.timeMode='10sec';g.initNewMatch();h.advance(1500);g.makeMove(6,0,5,0);
  assert.equal(g.senteTime,8.5);assert.equal(g.goteTime,10);h.advance(500);g.updateClock();assert.equal(g.goteTime,9.5);
  h.ui().undoMove();h.advance(1000);g.updateClock();assert.equal(g.senteTime,7.5);
});
test('normal mate finishes immediately and clears CPU callbacks',()=>{
  const h=loadGame(),g=h.game;empty(g);g.board[0][0]=null;put(g,0,4,'OU','gote');
  put(g,0,3,'KY','gote');put(g,0,5,'KY','gote');put(g,1,3,'FU','gote');put(g,1,5,'FU','gote');put(g,2,4,'KI');put(g,2,3,'GI');
  assert(g.makeMove(2,4,1,4));assert.equal(g.result.reason,'mate');assert.equal(g.result.loser,'gote');assert.equal(h.tasks.size,0);
});
test('fixed-seed legal play preserves all 40 pieces and undo restores every position',()=>{
  const h=loadGame(),g=h.game;let seed=5094;
  for(let i=0;i<160&&!g.isGameOver;i++) {
    const before=g.positionKey(), moves=g.getAllLegalMovesForPlayer(g.currentTurn);
    if(!moves.length)break;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const m=moves[seed%moves.length];
    const apply=()=>m.isDrop?g.makeDrop(m.toR,m.toC,m.dropType):g.makeMove(m.fromR,m.fromC,m.toR,m.toC,m.promote);
    assert(apply());g.cancelPendingTasks();
    const pieces=g.board.flat().filter(Boolean).length+Object.values(g.senteHand).reduce((a,b)=>a+b,0)+Object.values(g.goteHand).reduce((a,b)=>a+b,0);
    assert.equal(pieces,40);
    const after=g.positionKey(), snap=g.boardHistory.pop();Object.assign(g,snap);g.isGameOver=false;assert.equal(g.positionKey(),before);
    assert(apply());g.cancelPendingTasks();assert.equal(g.positionKey(),after);
  }
});
test('accepted moves invalidate older callbacks even after the same side gets another turn',()=>{
  const h=loadGame(),g=h.game;g.makeMove(6,0,5,0);const stale=h.allTasks[0];
  g.makeMove(2,0,3,0);g.makeMove(6,1,5,1);const key=g.positionKey();stale();assert.equal(g.positionKey(),key);
});
test('new game selector changes stay in draft until Start',()=>{
  const h=loadGame(),g=h.game;const handlers={};
  const timeButton={dataset:{time:'10sec'},addEventListener(event,fn){handlers.time=fn;}};
  const sideButton={dataset:{turn:'gote'},addEventListener(event,fn){handlers.side=fn;}};
  h.context.document.querySelectorAll=selector=>selector==='.time-select-btn'?[timeButton]:selector==='.turn-select-btn'?[sideButton]:[];
  const ui=h.ui();ui.draftSettings={timeMode:g.timeMode,playerSide:g.playerSide};ui.initModalSelectors();handlers.time();handlers.side();
  assert.equal(g.timeMode,'10min');assert.equal(g.playerSide,'sente');
  ui.startConfiguredMatch();assert.equal(g.timeMode,'10sec');assert.equal(g.playerSide,'gote');h.flush();assert.equal(g.moveHistory.length,1);
});
