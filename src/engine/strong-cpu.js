/* GPL-3.0-only. Three full-strength time budgets and unlimited one-move assistance. */
(function(root){
  const LEVELS=Object.freeze({meijin:{name:'名人',ms:10000},pro:{name:'プロ',ms:5000},amateur:{name:'アマ',ms:1000}});
  class StrongCpuController {
    constructor(game,{createClient,onStatus=()=>{},onReady=()=>{},onEvaluation=()=>{},parseInfo=()=>null,toSfen,parseLegalMove,movetime=5000}){
      Object.assign(this,{game,createClient,onStatus,onReady,onEvaluation,parseInfo,toSfen,parseLegalMove,movetime});
      this.level='pro';this.label='プロ・最大5秒';this.client=null;this.task=null;this.context=null;this.revision=0;this.cleanup=Promise.resolve();
    }
    setLevel(level){
      if(!Object.hasOwn(LEVELS,level))throw new Error('Unknown CPU level');
      this.level=level;this.movetime=LEVELS[level].ms;this.label=`${LEVELS[level].name}・最大${this.movetime/1000}秒`;
    }
    cancel(){
      this.revision++;this.task=null;this.context=null;this.game.isAssisting=false;
      if(this.client&&(this.client.state!=='ready'||this.game.isGameOver)){
        const client=this.client;this.client=null;this.cleanup=Promise.all([this.cleanup,client.destroy()]);
      }
    }
    current(revision){return revision===this.revision&&!this.game.isGameOver&&!this.game.isPaused;}
    receive(line){
      const context=this.context;if(!context||!this.current(context.revision)||this.game.positionKey()!==context.key)return;
      const info=this.parseInfo(line);if(info?.score)this.onEvaluation({...info,ply:context.ply,sideToMove:context.sideToMove,purpose:context.purpose});
    }
    async ensure(revision){
      await this.cleanup;if(!this.current(revision))return null;
      if(!this.client)this.client=this.createClient();
      const client=this.client;if(client.state==='idle')await client.start();
      return this.current(revision)?client:null;
    }
    fail(error,revision){
      if(!this.current(revision))return;
      const g=this.game;g.updateClock();if(g.isGameOver)return;g.isPreparing=false;g.isPaused=true;clearInterval(g.timerInterval);
      g.cancelPendingTasks();this.onStatus('error',`CPUを停止しました：${error.message}。「再開・再接続」で同じ局面から再試行できます。`);
    }
    readyText(){return `${this.label}。あなたの手番です。`;}
    async prepare(newMatch){
      const g=this.game;g.isPreparing=true;g.isPaused=false;clearInterval(g.timerInterval);
      const revision=this.revision;this.onStatus('loading','AIを準備しています…');
      try{
        const client=await this.ensure(revision);if(!client||!this.current(revision))return;
        if(newMatch)client.send('usinewgame');
        g.isPreparing=false;g.startTimer();this.onReady();this.onStatus('ready',this.readyText());g.queueAiMove();
      }catch(error){this.fail(error,revision);}
    }
    newMatch(){this.setLevel(this.game.cpuLevel||this.level);return this.prepare(true);}
    resume(){if(this.game.isGameOver||!this.game.isPaused)return Promise.resolve();this.game.cancelPendingTasks();return this.prepare(false);}
    pause(message='一時停止しました。「再開・再接続」を押してください。'){
      const g=this.game;if(g.isGameOver)return;g.updateClock();if(g.isGameOver)return;
      g.isPaused=true;g.isPreparing=false;clearInterval(g.timerInterval);g.cancelPendingTasks();this.onStatus('paused',message);
    }
    queue(){return this.searchMove(false);}
    assist(){return this.searchMove(true);}
    searchMove(assist){
      const g=this.game;
      if(g.isGameOver||g.isPreparing||g.isPaused||g.pendingPromoMove||this.task||(assist?g.currentTurn!==g.playerSide:g.currentTurn===g.playerSide))return;
      const revision=this.revision,key=g.positionKey(),sideToMove=g.currentTurn;
      g.isAssisting=assist;
      this.context={revision,key,sideToMove,ply:g.usiMoves.length,purpose:assist?'assist':'cpu'};
      this.onStatus(assist?'assisting':'thinking',assist?'棋神が推奨手を思考中…（最大10秒）':`${this.label}で思考中…`);
      const task=(async()=>{
        try{
          const client=await this.ensure(revision);if(!client||!this.current(revision))return;
          g.updateClock();if(!this.current(revision))return;
          const remaining=(g.currentTurn==='sente'?g.senteTime:g.goteTime)*1000;
          const budget=Math.max(50,Math.min(assist?10000:this.movetime,Math.floor(remaining-150)));
          const result=await client.search(this.toSfen(g,g.usiMoves.length+1),{movetime:budget,moves:[...g.usiMoves]});
          if(!this.current(revision)||g.positionKey()!==key||g.currentTurn!==sideToMove)return;
          g.updateClock();if(!this.current(revision))return;
          if(result.infoLine)this.receive(result.infoLine);
          if(result.bestmove==='resign'){
            if(assist){g.isAssisting=false;this.onStatus('ready','棋神は投了を推奨しています。投了する場合は「投了」を押してください。');return;}
            g.finishGame('resign',g.currentTurn);this.onStatus('finished','CPUが投了しました。');return;
          }
          const move=this.parseLegalMove(g,result.bestmove);
          const applied=move.isDrop?g.makeDrop(move.toR,move.toC,move.dropType):g.makeMove(move.fromR,move.fromC,move.toR,move.toC,move.promote);
          if(!applied)throw new Error('CPUの着手を適用できませんでした');
          this.onReady();
          if(g.isGameOver)this.onStatus('finished','対局終了');
          else if(g.currentTurn===g.playerSide)this.onStatus('ready',this.readyText());
        }catch(error){this.fail(error,revision);}
        finally{if(this.task===task){this.task=null;this.context=null;g.isAssisting=false;}}
      })();this.task=task;return task;
    }
    async dispose(){this.cancel();if(this.client){const client=this.client;this.client=null;await client.destroy();}await this.cleanup;}
  }
  const api={StrongCpuController,LEVELS};
  if(typeof module!=='undefined')module.exports=api;else Object.assign(root,api);
})(globalThis);
