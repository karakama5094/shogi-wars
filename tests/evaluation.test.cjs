const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine/evaluation.js');
test('evaluation is first-player oriented and bounded',()=>{
  assert.equal(E.advantage({type:'cp',value:0},'sente'),0);assert.equal(E.advantage({type:'cp',value:600},'sente'),76);assert.equal(E.advantage({type:'cp',value:600},'gote'),-76);
  assert.equal(E.advantage({type:'cp',value:100000},'sente'),99);assert.equal(E.advantage({type:'cp',value:-100000},'sente'),-99);
});
test('mate values use the full scale and losing mate zero is handled',()=>{
  assert.equal(E.advantage({type:'mate',value:3},'sente'),100);assert.equal(E.advantage({type:'mate',value:3},'gote'),-100);assert.equal(E.advantage({type:'mate',value:0},'gote'),100);
});
test('missing data stays unassessed and distribution sums to 100',()=>{
  assert.equal(E.advantage(null,'sente'),null);assert.equal(E.advantage({type:'cp',value:NaN},'sente'),null);assert.equal(E.distribution(undefined),null);
  for(let v=-100;v<=100;v++)assert.equal(E.distribution(v).sente+E.distribution(v).gote,100);
  assert.equal(E.describe(0),'互角');assert.equal(E.describe(-50),'後手優勢');
});
test('suggested moves show Japanese piece names and drops',()=>{
  const {ShogiRules}=require('../src/domain/rules.js');const p=new ShogiRules();assert.equal(E.moveLabel(p,'7g7f'),'▲7六歩');assert.equal(E.moveLabel(p,'P*5e'),'▲5五歩打');
});
