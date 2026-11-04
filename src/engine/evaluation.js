/* GPL-3.0-only. Display scale, not a calibrated win probability or player rating. */
(function(root){
  function advantage(score,sideToMove){
    if(!score||!Number.isFinite(score.value)||!['sente','gote'].includes(sideToMove))return null;
    const sign=sideToMove==='sente'?1:-1;
    if(score.type==='mate')return (score.value>0?1:-1)*sign*100;
    if(score.type!=='cp')return null;
    return Math.max(-99,Math.min(99,Math.round(100*Math.tanh(score.value*sign/600))));
  }
  function describe(value){
    if(value===null||!Number.isFinite(value))return '未評価';
    if(Math.abs(value)<10)return '互角';
    const side=value>0?'先手':'後手',n=Math.abs(value);
    return side+(n<30?'やや有利':n<70?'優勢':'勝勢');
  }
  function distribution(value){
    if(value===null||!Number.isFinite(value))return null;
    const sente=(100+Math.max(-100,Math.min(100,value)))/2;
    return {sente,gote:100-sente};
  }
  function moveLabel(position,text){
    if(text==='resign')return '投了';
    const pieceNames={P:'歩',L:'香',N:'桂',S:'銀',G:'金',B:'角',R:'飛',FU:'歩',KY:'香',KE:'桂',GI:'銀',KI:'金',KA:'角',HI:'飛',OU:'玉',TO:'と',NY:'成香',NK:'成桂',NG:'成銀',UM:'馬',RY:'竜'};
    const drop=/^([PLNSGBR])\*([1-9])([a-i])$/.exec(text);
    const normal=/^([1-9])([a-i])([1-9])([a-i])(\+)?$/.exec(text);
    if(!drop&&!normal)return text;
    const file=drop?drop[2]:normal[3],rank=(drop?drop[3]:normal[4]).charCodeAt(0)-97;
    const type=drop?drop[1]:position.board[normal[2].charCodeAt(0)-97][9-Number(normal[1])]?.type;
    return (position.currentTurn==='sente'?'▲':'△')+file+['一','二','三','四','五','六','七','八','九'][rank]+(pieceNames[type]||'?')+(drop?'打':normal[5]?'成':'');
  }
  const api={advantage,describe,distribution,moveLabel};
  if(typeof module!=='undefined')module.exports=api;else root.ShogiEvaluation=api;
})(globalThis);
