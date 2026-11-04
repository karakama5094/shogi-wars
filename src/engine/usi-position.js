/* USI boundary: validate every engine move with the application's shogi rules. */
(function (root) {
  const codes = {FU:'P',KY:'L',KE:'N',GI:'S',KI:'G',KA:'B',HI:'R',OU:'K',TO:'+P',NY:'+L',NK:'+N',NG:'+S',UM:'+B',RY:'+R'};
  const drops = {P:'FU',L:'KY',N:'KE',S:'GI',G:'KI',B:'KA',R:'HI'};
  const promotions = {FU:'TO',KY:'NY',KE:'NK',GI:'NG',KA:'UM',HI:'RY'};
  const bases = Object.fromEntries(Object.entries(promotions).map(([a,b]) => [b,a]));
  function toSfen(position, ply = 1) {
    const rows = position.board.map(row => {
      let text = '', empty = 0;
      for (const piece of row) {
        if (!piece) { empty++; continue; }
        if (empty) { text += empty; empty = 0; }
        const code = codes[piece.type];
        if (!code) throw new Error('Unknown piece');
        text += piece.player === 'sente' ? code : code.toLowerCase();
      }
      return text + (empty || '');
    });
    let hands = '';
    for (const player of ['sente','gote']) {
      const hand = player === 'sente' ? position.senteHand : position.goteHand;
      for (const type of ['HI','KA','KI','GI','KE','KY','FU']) {
        const n = hand[type] || 0;
        if (n > 0) hands += (n > 1 ? n : '') + (player === 'sente' ? codes[type] : codes[type].toLowerCase());
      }
    }
    return `${rows.join('/')} ${position.currentTurn === 'sente' ? 'b' : 'w'} ${hands || '-'} ${ply}`;
  }
  function parseLegalMove(position, text) {
    if (typeof text !== 'string') throw new Error('Invalid USI move');
    const drop = /^([PLNSGBR])\*([1-9])([a-i])$/.exec(text);
    if (drop) {
      const move = {isDrop:true,dropType:drops[drop[1]],toC:9-Number(drop[2]),toR:drop[3].charCodeAt(0)-97};
      if (!position.getLegalDrops(move.dropType).some(m=>m.toR===move.toR && m.toC===move.toC)) throw new Error(`Illegal engine drop: ${text}`);
      return move;
    }
    const match = /^([1-9])([a-i])([1-9])([a-i])(\+)?$/.exec(text);
    if (!match) throw new Error(`Invalid USI move: ${text}`);
    const move = {fromC:9-Number(match[1]),fromR:match[2].charCodeAt(0)-97,toC:9-Number(match[3]),toR:match[4].charCodeAt(0)-97,promote:!!match[5]};
    const piece = position.board[move.fromR][move.fromC];
    if (!piece || !position.getLegalMoves(move.fromR,move.fromC).some(m=>m.toR===move.toR&&m.toC===move.toC)) throw new Error(`Illegal engine move: ${text}`);
    const promotion = position.checkPromotionStatus(move.fromR,move.toR,piece.type,piece.player);
    if ((move.promote&&!promotion.canPromote)||(!move.promote&&promotion.mustPromote)) throw new Error(`Illegal engine promotion: ${text}`);
    return move;
  }
  function apply(position, text) {
    const move = parseLegalMove(position,text);
    const hand = position.currentTurn === 'sente' ? position.senteHand : position.goteHand;
    if (move.isDrop) {
      hand[move.dropType]--;
      position.board[move.toR][move.toC] = {type:move.dropType,player:position.currentTurn};
    } else {
      const piece = position.board[move.fromR][move.fromC], captured = position.board[move.toR][move.toC];
      if (captured) {const type=bases[captured.type]||captured.type;hand[type]=(hand[type]||0)+1;}
      position.board[move.toR][move.toC]={type:move.promote?promotions[piece.type]:piece.type,player:piece.player};
      position.board[move.fromR][move.fromC]=null;
    }
    position.currentTurn = position.currentTurn === 'sente' ? 'gote' : 'sente';
    return move;
  }
  function parseInfo(line) {
    if (!line.startsWith('info ')) return null;
    const info = {};
    for (const key of ['depth','nodes','nps','time','hashfull']) {
      const match = new RegExp(`(?:^| )${key} (\\d+)(?: |$)`).exec(line);
      if (match) info[key] = Number(match[1]);
    }
    const score=/(?:^| )score (cp|mate) (-?\d+)(?: |$)/.exec(line);
    if(score) info.score={type:score[1],value:Number(score[2])};
    const pv=/(?:^| )pv (.+)$/.exec(line);if(pv)info.pv=pv[1].split(/\s+/);
    return Object.keys(info).length ? info : null;
  }
  const api={toSfen,parseLegalMove,apply,parseInfo};
  if (typeof module !== 'undefined') module.exports=api; else root.ShogiUsi=api;
})(globalThis);
