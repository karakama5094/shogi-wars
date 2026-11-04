/* GPL-3.0-only. Unlimited local post-game analysis with cancellation and immutable positions. */
(function(root){
  class KishinAnalysis {
    constructor({createPosition,apply,toSfen,parseLegalMove,parseInfo,advantage,createClient,beforeStart=async()=>{},onResult=()=>{},onProgress=()=>{}}){
      Object.assign(this,{createPosition,apply,toSfen,parseLegalMove,parseInfo,advantage,createClient,beforeStart,onResult,onProgress});
      this.client=null;this.revision=0;this.running=false;this.results=[];this.cleanup=Promise.resolve();
    }
    cancel(){
      this.revision++;this.running=false;
      if(this.client){const client=this.client;this.client=null;this.cleanup=Promise.all([this.cleanup,client.destroy()]);}
    }
    async run(moves,{movetime=1000}={}){
      if(this.running)throw new Error('解析中です');
      if(![1000,5000,10000].includes(movetime))throw new Error('Unknown analysis duration');
      this.cancel();const revision=this.revision;this.running=true;this.results=[];
      const history=[...moves];
      try{
        await this.cleanup;await this.beforeStart();if(revision!==this.revision)return null;
        const client=this.createClient();this.client=client;await client.start();
        if(revision!==this.revision)return null;
        const position=this.createPosition();
        for(let ply=0;ply<=history.length;ply++){
          if(revision!==this.revision)return null;
          this.onProgress(ply,history.length+1);
          const snapshot={board:position.board.map(row=>row.map(p=>p?{...p}:null)),senteHand:{...position.senteHand},goteHand:{...position.goteHand},currentTurn:position.currentTurn};
          let result,info;
          if(position.hasNoLegalMoves(position.currentTurn)){
            result={bestmove:null};info={score:{type:'mate',value:0},terminal:true};
          }else{
            result=await client.search(this.toSfen(position,ply+1),{movetime,moves:history.slice(0,ply)});
            if(revision!==this.revision)return null;
            if(result.bestmove!=='resign')this.parseLegalMove(position,result.bestmove);
            info=this.parseInfo(result.infoLine||'');
          }
          const entry={ply,sideToMove:position.currentTurn,bestmove:result.bestmove,info,score:info?.score||null,value:this.advantage(info?.score,position.currentTurn),position:snapshot};
          this.results.push(entry);this.onResult(entry);
          if(ply<history.length)this.apply(position,history[ply]);
        }
        this.onProgress(history.length+1,history.length+1);return [...this.results];
      }finally{
        if(revision===this.revision){const client=this.client;this.client=null;if(client)await client.destroy();this.running=false;}
      }
    }
  }
  if(typeof module!=='undefined')module.exports={KishinAnalysis};else root.KishinAnalysis=KishinAnalysis;
})(globalThis);
