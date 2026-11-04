/* GPL-3.0-only. One serialized USI request at a time; timed-out sessions are destroyed. */
(function(root) {
  class EngineClient {
    constructor({workerFactory=()=>new Worker(new URL('./engine.worker.js',document.currentScript?.src||location.href)),onLine=()=>{}}={}) {
      this.workerFactory=workerFactory;this.onLine=onLine;this.worker=null;this.pending=null;this.state='idle';this.generation=0;this.releasing=Promise.resolve();
    }
    waitFor(type, predicate=()=>true, timeout=15000) {
      if(this.pending) throw new Error('Another USI request is in progress');
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{this.destroy(new Error('Engine response timed out'));},timeout);
        this.pending={type,predicate,resolve:value=>{clearTimeout(timer);this.pending=null;resolve(value);},reject:error=>{clearTimeout(timer);this.pending=null;reject(error);}};
      });
    }
    receive(event, generation) {
      if(generation!==this.generation) return;
      const data=event.data;
      if(data.type==='error'){this.destroy(new Error(data.message));return;}
      if(data.type==='line') this.onLine(data.line);
      if(this.pending && data.type===this.pending.type && this.pending.predicate(data))this.pending.resolve(data);
    }
    send(command) {
      if(!this.worker) throw new Error('Engine is not running');
      this.worker.postMessage({type:'command',command});
    }
    request(command, prefix, timeout=15000) {
      const response=this.waitFor('line',data=>data.line===prefix||data.line.startsWith(prefix+' '),timeout);
      try{this.send(command);}catch(error){this.destroy(error);}return response;
    }
    async start() {
      if(this.state!=='idle')throw new Error('Engine is already running');
      this.state='starting';const generation=++this.generation;
      try {
        await this.releasing;
        if(generation!==this.generation)throw new Error('Engine session closed');
        this.worker=this.workerFactory();
        this.worker.onmessage=event=>this.receive(event,generation);
        this.worker.onerror=event=>{event.preventDefault?.();this.destroy(new Error(event.message||'Worker failed'));};
        this.worker.onmessageerror=()=>this.destroy(new Error('Worker message failed'));
        const initialized=this.waitFor('initialized',()=>true,30000);
        this.worker.postMessage({type:'init'});
        const {metrics}=await initialized;
        await this.request('usi','usiok');
        for(const command of ['setoption name Threads value 1','setoption name USI_Hash value 16','setoption name USI_Ponder value false','setoption name USI_OwnBook value false','setoption name EnteringKingRule value NoEnteringKing','setoption name GenerateAllLegalMoves value true'])this.send(command);
        await this.request('isready','readyok');
        this.send('usinewgame');this.state='ready';return metrics;
      }catch(error){this.destroy(error);throw error;}
    }
    async search(sfen,{movetime=1000,infinite=false}={}) {
      if(this.state!=='ready')throw new Error('Engine is not ready');
      if(typeof sfen!=='string'||/[\r\n]/.test(sfen))throw new Error('Invalid SFEN');
      if(!Number.isInteger(movetime)||movetime<50||movetime>5000)throw new Error('Invalid search duration');
      this.send('position sfen '+sfen);this.state='searching';const started=performance.now();
      try{
        const result=await this.request(infinite?'go infinite':`go movetime ${movetime}`,'bestmove',infinite?8000:movetime+5000);
        this.state='ready';return {bestmove:result.line.split(/\s+/)[1],elapsedMs:performance.now()-started};
      }catch(error){this.destroy(error);throw error;}
    }
    async metrics(){
      if(this.state!=='ready')throw new Error('Engine is not ready');
      const response=this.waitFor('metrics',()=>true,1000);this.worker.postMessage({type:'metrics'});return response;
    }
    stop(){if(this.state==='searching'){this.state='stopping';this.send('stop');}}
    destroy(error=new Error('Engine session closed')) {
      this.generation++;
      const worker=this.worker;this.worker=null;
      if(this.pending)this.pending.reject(error);
      this.state='idle';
      if(worker){
        // Release pthread children before terminating their owning Worker.
        this.releasing=new Promise(resolve=>{
          const finish=()=>{clearTimeout(timer);worker.terminate();resolve();};
          const timer=setTimeout(finish,750);
          worker.onmessage=event=>{if(event.data.type==='disposed')finish();};
          worker.onerror=finish;
          try{worker.postMessage({type:'dispose'});}catch{finish();}
        });
      }
      return this.releasing;
    }
  }
  if(typeof module!=='undefined')module.exports={EngineClient};else root.EngineClient=EngineClient;
})(globalThis);
