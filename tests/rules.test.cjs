const {test} = require('node:test');
const assert = require('node:assert/strict');
const {loadGame, empty, put} = require('./helpers.cjs');
const has = (moves,r,c) => moves.some(m => m.toR === r && m.toC === c);

test('initial position has 30 legal moves for either side', () => {
  const {game:g} = loadGame();
  for (const side of ['sente','gote']) assert.equal(g.getAllLegalMovesForPlayer(side).length,30);
});
for (const [type,count] of Object.entries({FU:1,KY:4,KE:2,GI:5,KI:6,KA:16,HI:16,OU:8,TO:6,NY:6,NK:6,NG:6,UM:20,RY:20})) {
  test(`${type} movement is symmetric for both sides`, () => {
    const {game:g} = loadGame();empty(g);g.board[0][0]=null;g.board[8][8]=null;
    for (const player of ['sente','gote']) {put(g,4,4,type,player); assert.equal(g.getRawMoves(4,4).length,count);}
  });
}
test('sliding pieces stop at friendly pieces and capture only first enemy', () => {
  const {game:g} = loadGame();empty(g);put(g,4,4,'HI');put(g,4,6,'FU');put(g,2,4,'FU','gote');
  const moves=g.getRawMoves(4,4); assert(!has(moves,4,6));assert(has(moves,2,4));assert(!has(moves,1,4));
});
test('pinned piece cannot expose own king', () => {
  const {game:g} = loadGame();empty(g);put(g,8,8,'OU');put(g,8,0,'HI','gote');put(g,8,7,'GI');
  assert.equal(g.getLegalMoves(8,7).length,0);
});
test('king capture is never legal, including engine candidates', () => {
  const {game:g} = loadGame();empty(g);put(g,1,0,'HI');
  assert(!has(g.getLegalMoves(1,0),0,0));assert(!g.getAllLegalMovesForPlayer('sente').some(m=>m.toR===0&&m.toC===0));
  assert.equal(g.makeMove(1,0,0,0),false);
});
test('illegal moves, invalid promotion, and drops do not alter board or history', () => {
  const {game:g} = loadGame();g.senteHand.FU=1; const before=JSON.stringify(g);
  for (const args of [[6,0,4,0],[2,0,3,0],[6,0,5,0,true],[-1,0,1,0],[6,0,5.5,0]]) assert.equal(g.makeMove(...args),false);
  assert.equal(g.makeDrop(4,0,'FU'),false);assert.equal(g.makeDrop(6,0,'FU'),false);assert.equal(g.makeDrop(4,0,'HI'),false);
  assert.equal(JSON.stringify(g),before);
});
test('promotion zones and mandatory promotion for both sides', () => {
  const {game:g}=loadGame();
  for(const player of ['sente','gote']) {
    const end=player==='sente'?0:8, pen=player==='sente'?1:7;
    for(const type of ['FU','KY','KE']) assert(g.checkPromotionStatus(4,end,type,player).mustPromote);
    assert(g.checkPromotionStatus(4,pen,'KE',player).mustPromote);
    assert(!g.checkPromotionStatus(4,pen,'GI',player).mustPromote);
    assert(g.checkPromotionStatus(player==='sente'?2:6,4,'GI',player).canPromote);
  }
  empty(g);put(g,1,4,'FU');assert.equal(g.makeMove(1,4,0,4,false),false);assert.equal(g.makeMove(1,4,0,4,true),true);assert.equal(g.board[0][4].type,'TO');
});
test('drop restrictions distinguish a pawn from a promoted pawn', () => {
  const {game:g}=loadGame();empty(g);g.senteHand.FU=1;g.senteHand.KE=1;g.senteHand.KY=1;
  put(g,4,4,'FU');put(g,4,5,'TO');
  assert(!has(g.getLegalDrops('FU'),3,4));assert(has(g.getLegalDrops('FU'),3,5));
  assert(!has(g.getLegalDrops('KY'),0,4));assert(!has(g.getLegalDrops('KE'),1,4));assert(has(g.getLegalDrops('KE'),2,4));
});
test('drop can block rook check but cannot ignore check', () => {
  const {game:g}=loadGame();empty(g);put(g,8,0,'HI','gote');g.senteHand.KI=1;
  assert(has(g.getLegalDrops('KI'),8,4));assert(!has(g.getLegalDrops('KI'),4,4));
});
function pawnMate(g) {
  empty(g);g.board[0][0]=null;put(g,0,4,'OU','gote');put(g,0,3,'KY','gote');put(g,0,5,'KY','gote');
  put(g,1,3,'FU','gote');put(g,1,5,'FU','gote');put(g,2,4,'KI');g.senteHand.FU=1;
}
test('pawn drop mate is forbidden without recursive hand generation',()=>{
  const {game:g}=loadGame();pawnMate(g);g.goteHand.FU=18;
  assert(!has(g.getLegalDrops('FU'),1,4));assert.equal(g.makeDrop(1,4,'FU'),false);
});
test('checking pawn drop is legal when king can capture or escape',()=>{
  const {game:g}=loadGame();pawnMate(g);g.board[2][4]=null;assert(has(g.getLegalDrops('FU'),1,4));
  put(g,2,4,'KI');g.board[0][3]=null;assert(has(g.getLegalDrops('FU'),1,4));
});
test('captured promoted piece becomes unpromoted hand piece',()=>{
  const {game:g}=loadGame();empty(g);put(g,4,4,'HI');put(g,4,5,'TO','gote');
  assert(g.makeMove(4,4,4,5));assert.equal(g.senteHand.FU,1);assert.equal(g.senteHand.TO,undefined);
});
test('four identical positions draw; three do not',()=>{
  const {game:g}=loadGame();
  for(let i=0;i<3;i++) {
    for(const move of [[8,4,7,4],[0,4,1,4],[7,4,8,4],[1,4,0,4]]) assert(g.makeMove(...move));
    assert.equal(g.isGameOver,i===2);
  }
  assert.equal(g.result.reason,'repetition');
});
test('continuous checking side loses on fourth occurrence',()=>{
  const {game:g}=loadGame();empty(g);g.board[0][0]=null;put(g,0,4,'OU','gote');put(g,1,3,'HI');
  g.currentTurn='sente';g.positionHistory=[];g.recordPosition();
  for(let i=0;i<3;i++) for(const move of [[1,3,1,4],[0,4,0,3],[1,4,1,3],[0,3,0,4]]) assert(g.makeMove(...move));
  assert.equal(g.result.reason,'perpetual-check');assert.equal(g.result.loser,'sente');
});
test('position keys include hands and side and ignore object property order',()=>{
  const {game:g}=loadGame();const key=g.positionKey();g.board[0][0]={player:'gote',type:'KY'};assert.equal(g.positionKey(),key);
  g.senteHand.FU++;assert.notEqual(g.positionKey(),key);g.senteHand.FU--;g.currentTurn='gote';assert.notEqual(g.positionKey(),key);
});
test('gote pawn drop mate is also forbidden',()=>{
  const {game:g}=loadGame();pawnMate(g);
  g.board=g.board.reverse().map(row=>row.reverse().map(p=>p?{type:p.type,player:p.player==='sente'?'gote':'sente'}:null));
  g.goteHand.FU=1;g.senteHand.FU=0;g.currentTurn='gote';assert(!has(g.getLegalDrops('FU'),7,4));assert.equal(g.makeDrop(7,4,'FU'),false);
});
test('checking intermittently is a draw rather than perpetual-check loss',()=>{
  const {game:g}=loadGame();empty(g);g.positionHistory=[];g.recordPosition();
  const initial=g.positionKey();
  // A prior nonchecking turn breaks continuity even when all repeated endpoints match.
  for(let i=0;i<3;i++) {
    g.positionHistory.push({key:'intermediate',playerMoved:'sente',check:i!==1});
    g.positionHistory.push({key:initial,playerMoved:'gote',check:false});
  }
  // Evaluate the fourth occurrence using a newly recorded endpoint.
  g.positionHistory.pop();const result=g.recordPosition('gote');assert.equal(result.reason,'repetition');
});
