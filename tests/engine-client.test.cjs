const {test}=require('node:test'),assert=require('node:assert/strict');
const {EngineClient}=require('../engine-lab/engine-client.js');
function harness(){
  const workers=[];const client=new EngineClient({workerFactory:()=>{
    const worker={commands:[],terminated:false,postMessage(data){
      this.commands.push(data);
      queueMicrotask(()=>{
        if(data.type==='dispose')this.onmessage({data:{type:'disposed'}});
        else if(data.type==='init')this.onmessage({data:{type:'initialized',metrics:{initMs:1}}});
        else if(data.command==='usi')this.onmessage({data:{type:'line',line:'usiok'}});
        else if(data.command==='isready')this.onmessage({data:{type:'line',line:'readyok'}});
        else if(data.command==='stop')this.onmessage({data:{type:'line',line:'bestmove 7g7f'}});
      });
    },terminate(){this.terminated=true;}};workers.push(worker);return worker;
  }});return {client,workers};
}
test('handshake sets bounded options before ready and searches are serialized',async()=>{
  const {client:c,workers:w}=harness();await c.start();assert.equal(c.state,'ready');
  const commands=w[0].commands.map(x=>x.command).filter(Boolean);assert(commands.includes('setoption name Threads value 1'));assert(commands.includes('setoption name USI_Hash value 16'));
  const search=c.search('sfen');await assert.rejects(c.search('sfen'),/not ready/);c.stop();const result=await search;assert.equal(result.bestmove,'7g7f');assert.equal(c.state,'ready');c.destroy();
});
test('destroy rejects pending search and stale worker cannot affect a new session',async()=>{
  const {client:c,workers:w}=harness();await c.start();const oldHandler=w[0].onmessage;
  const search=c.search('sfen');const rejected=assert.rejects(search,/closed/);c.destroy();await rejected;assert(w[0].terminated);
  await c.start();oldHandler({data:{type:'error',message:'stale'}});assert.equal(c.state,'ready');c.destroy();
});
test('engine errors reject pending operations and release worker',async()=>{
  const {client:c,workers:w}=harness();await c.start();const search=c.search('sfen');const rejected=assert.rejects(search,/out of memory/);
  w[0].onmessage({data:{type:'error',message:'out of memory'}});await rejected;assert.equal(c.state,'idle');assert(w[0].terminated);
});
test('timeout releases the session rather than allowing late responses to match future requests',async()=>{
  const {client:c}=harness();await c.start();const pending=c.request('is-ignored','never',5);await assert.rejects(pending,/timed out/);assert.equal(c.state,'idle');
});
test('invalid search limits and newline injection are rejected before posting commands',async()=>{
  const {client:c,workers:w}=harness();await c.start();const count=w[0].commands.length;
  await assert.rejects(c.search('sfen',{movetime:11000}));await assert.rejects(c.search('sfen\nquit'));assert.equal(w[0].commands.length,count);c.destroy();
});
test('strong settings are explicit and USI history is transmitted without losing repetitions',async()=>{
  const {client:c,workers:w}=harness();await c.start();
  assert(w[0].commands.some(x=>x.command==='setoption name SkillLevel value 20'));
  assert(w[0].commands.some(x=>x.command==='setoption name DepthLimit value 0'));
  assert(w[0].commands.some(x=>x.command==='setoption name NodesLimit value 0'));
  const search=c.search('unused',{movetime:5000,moves:['7g7f','3c3d']});
  assert(w[0].commands.some(x=>x.command==='position startpos moves 7g7f 3c3d'));c.stop();await search;
  const count=w[0].commands.length;await assert.rejects(c.search('sfen',{moves:['7g7f\nquit']}));assert.equal(w[0].commands.length,count);await c.destroy();
});
test('search returns the last scored info line for post-game analysis',async()=>{
  const {client:c,workers:w}=harness();await c.start();const pending=c.search('sfen');
  w[0].onmessage({data:{type:'line',line:'info depth 4 score cp 120 pv 7g7f'}});
  w[0].onmessage({data:{type:'line',line:'info nodes 100 time 12'}});
  c.stop();const result=await pending;assert.equal(result.infoLine,'info depth 4 score cp 120 pv 7g7f');await c.destroy();
});
