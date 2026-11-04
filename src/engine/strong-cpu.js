/* GPL-3.0-only. Trial controller for a full-strength, five-second YaneuraOu CPU. */
(function(root){
  class StrongCpuController {
    constructor(game,{createClient,onStatus=()=>{},onReady=()=>{},toSfen,parseLegalMove,movetime=5000}){
      Object.assign(this,{game,createClient,onStatus,onReady,toSfen,parseLegalMove,movetime});
      this.label='最強設定・最大5秒';
      this.client=null;this.task=null;this.revision=0;this.cleanup=Promise.resolve();
    }
    cancel(){
      this.revision++;this.task=null;
      if(this.client&&(this.client.state!=='ready'||this.game.isGameOver)){
        const client=this.client;this.client=null;
        this.cleanup=Promise.all([this.cleanup,client.destroy()]);
      }
    }
    current(revision){return revision===this.revision&&!this.game.isGameOver&&!this.game.isPaused;}
    async ensure(revision){
      await this.cleanup;if(!this.current(revision))return null;
      if(!this.client)this.client=this.createClient();
      const client=this.client;
      if(client.state==='idle')await client.start();
      return this.current(revision)?client:null;
    }
    fail(error,revision){
      if(!this.current(revision))return;
      const g=this.game;g.updateClock();g.isPreparing=false;g.isPaused=true;clearInterval(g.timerInterval);
      g.cancelPendingTasks();this.onStatus('error',`CPUを停止しました：${error.message}。「再開・再接続」で同じ局面から再試行できます。`);
    }
    async prepare(newMatch){
      const g=this.game;g.isPreparing=true;g.isPaused=false;clearInterval(g.timerInterval);
      const revision=this.revision;this.onStatus('loading','最強CPUを準備しています…');
      try{
        const client=await this.ensure(revision);if(!client||!this.current(revision))return;
        if(newMatch)client.send('usinewgame');
        g.isPreparing=false;g.startTimer();this.onReady();this.onStatus('ready','最強設定・1手最大5秒。あなたの手番です。');g.queueAiMove();
      }catch(error){this.fail(error,revision);}
    }
    newMatch(){return this.prepare(true);}
    resume(){
      if(this.game.isGameOver||!this.game.isPaused)return Promise.resolve();
      this.game.cancelPendingTasks();return this.prepare(false);
    }
    pause(message='一時停止しました。「再開・再接続」を押してください。'){
      const g=this.game;if(g.isGameOver)return;
      g.updateClock();if(g.isGameOver)return;
      g.isPaused=true;g.isPreparing=false;clearInterval(g.timerInterval);g.cancelPendingTasks();this.onStatus('paused',message);
    }
    queue(){
      const g=this.game;
      if(g.isGameOver||g.isPreparing||g.isPaused||g.currentTurn===g.playerSide||this.task)return;
      const revision=this.revision,key=g.positionKey();
      this.onStatus('thinking','最強CPUが思考中…（最大5秒）');
      const task=(async()=>{
        try{
          const client=await this.ensure(revision);if(!client||!this.current(revision))return;
          const result=await client.search(this.toSfen(g,g.usiMoves.length+1),{movetime:this.movetime,moves:[...g.usiMoves]});
          if(!this.current(revision)||g.positionKey()!==key||g.currentTurn===g.playerSide)return;
          g.updateClock();if(!this.current(revision))return;
          if(result.bestmove==='resign'){g.finishGame('resign',g.currentTurn);this.onStatus('finished','CPUが投了しました。');return;}
          const move=this.parseLegalMove(g,result.bestmove);
          const applied=move.isDrop?g.makeDrop(move.toR,move.toC,move.dropType):g.makeMove(move.fromR,move.fromC,move.toR,move.toC,move.promote);
          if(!applied)throw new Error('CPUの着手を適用できませんでした');
          this.onReady();this.onStatus(g.isGameOver?'finished':'ready',g.isGameOver?'対局終了':'最強設定・1手最大5秒。あなたの手番です。');
        }catch(error){this.fail(error,revision);}
        finally{if(this.task===task)this.task=null;}
      })();this.task=task;
    }
    async dispose(){
      this.cancel();if(this.client){const client=this.client;this.client=null;await client.destroy();}await this.cleanup;
    }
  }
  if(typeof module!=='undefined')module.exports={StrongCpuController};else root.StrongCpuController=StrongCpuController;
})(globalThis);
