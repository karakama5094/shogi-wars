const {test}=require('node:test'),assert=require('node:assert/strict');
const {ShogiRules}=require('../src/domain/rules.js');
const {toSfen,parseLegalMove,apply,parseInfo}=require('../src/engine/usi-position.js');
test('initial position maps to standard SFEN and both USI coordinate edges',()=>{
  const p=new ShogiRules();assert.equal(toSfen(p),'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1');
  assert.deepEqual(parseLegalMove(p,'9g9f'),{fromC:0,fromR:6,toC:0,toR:5,promote:false});
  assert.deepEqual(parseLegalMove(p,'1g1f'),{fromC:8,fromR:6,toC:8,toR:5,promote:false});
});
test('USI moves are applied and gote SFEN side is updated',()=>{
  const p=new ShogiRules();apply(p,'7g7f');assert.equal(p.currentTurn,'gote');assert(toSfen(p).endsWith(' w - 1'));apply(p,'3c3d');assert.equal(p.board[3][6].player,'gote');
});
test('hand serialization has standard RBGSNLP order and color',()=>{
  const p=new ShogiRules();p.senteHand={HI:1,KA:2,KI:1,GI:1,KE:1,KY:1,FU:12};p.goteHand.FU=2;
  assert.equal(toSfen(p).split(' ')[2],'R2BGSNL12P2p');
});
test('promotion, capture and drops are checked at the engine boundary',()=>{
  const p=new ShogiRules();for(const m of ['7g7f','3c3d','2g2f','8c8d','2f2e','8d8e','8h7g','2b7g+','8i7g'])apply(p,m);
  assert.equal(p.goteHand.KA,1);assert.equal(p.senteHand.KA,1);assert(toSfen(p).includes(' Bb '));
  apply(p,'B*4d');assert.equal(p.goteHand.KA,0);assert.equal(p.board[3][5].type,'KA');
});
test('invalid, illegal and incorrectly promoted bestmoves preserve the position',()=>{
  const p=new ShogiRules();const before=p.positionKey();
  for(const text of ['resign','win','0000','7g7e','3c3d','7g7f+','P*5e','P*0a','2h5h\nquit','7g7f ponder 3c3d'])assert.throws(()=>apply(p,text));
  assert.equal(p.positionKey(),before);
});
test('mandatory promotion from an engine cannot be omitted',()=>{
  const p=new ShogiRules();p.board=Array.from({length:9},()=>Array(9).fill(null));
  p.board[8][8]={type:'OU',player:'sente'};p.board[0][0]={type:'OU',player:'gote'};p.board[1][4]={type:'FU',player:'sente'};
  assert.throws(()=>apply(p,'5b5a'));apply(p,'5b5a+');assert.equal(p.board[0][4].type,'TO');assert(toSfen(p).includes('+P'));
});
test('USI info parser preserves mate scores without converting them to centipawns',()=>{
  assert.deepEqual(parseInfo('info depth 14 nodes 150 time 22 nps 6800 score cp -20 pv 7g7f 3c3d'),{depth:14,nodes:150,nps:6800,time:22,score:{type:'cp',value:-20},pv:['7g7f','3c3d']});
  assert.deepEqual(parseInfo('info score mate -3 pv 5a4b'),{score:{type:'mate',value:-3},pv:['5a4b']});assert.equal(parseInfo('info string loading eval'),null);
});
