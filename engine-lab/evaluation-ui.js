/* GPL-3.0-only. Accessible, first-player-oriented advantage distribution and history. */
window.drawShogiEvaluation=(entries,totalMoves,onSelect=()=>{},selected=null)=>{
  const $=id=>document.getElementById(id),E=ShogiEvaluation;
  const values=entries.filter(e=>Number.isFinite(e.value)).sort((a,b)=>a.ply-b.ply);
  const latest=selected?(Number.isFinite(selected.value)?selected:null):values.at(-1);
  $('advantage-number').textContent=latest?(latest.value>0?'+':'')+latest.value:'未評価';
  $('advantage-description').textContent=latest?`${latest.ply}手目後：${E.describe(latest.value)}${latest.info?.score?.type==='mate'?'（詰み評価）':''}`:'CPUが思考すると表示されます。';
  const shares=E.distribution(latest?.value);
  $('advantage-gote').style.width=(shares?shares.gote:50)+'%';$('advantage-sente').style.width=(shares?shares.sente:50)+'%';
  $('gote-share').textContent='後手 '+(shares?Math.round(shares.gote):'—');$('sente-share').textContent='先手 '+(shares?Math.round(shares.sente):'—');
  $('advantage-bar').setAttribute('aria-label',latest?`${latest.ply}手目後 ${E.describe(latest.value)}、評価${latest.value}`:'未評価');
  const svg=$('evaluation-graph'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();
  const add=(tag,attrs,text)=>{const element=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))element.setAttribute(key,value);if(text)element.textContent=text;svg.appendChild(element);return element;};
  for(const [value,y] of [[100,15],[0,90],[-100,165]]){add('line',{x1:38,x2:586,y1:y,y2:y,stroke:'#425776','stroke-dasharray':value===0?'4 4':''});add('text',{x:0,y:y+5,fill:'#b9c8db','font-size':13},value>0?'+'+value:String(value));}
  const n=Math.max(1,totalMoves,...values.map(e=>e.ply)),x=ply=>38+ply/n*548,y=value=>90-value*.75;
  if(values.length)add('polyline',{points:values.map(e=>`${x(e.ply)},${y(e.value)}`).join(' '),fill:'none',stroke:'#f6cf70','stroke-width':3});
  for(const entry of values){const circle=add('circle',{cx:x(entry.ply),cy:y(entry.value),r:6,fill:entry.value>=0?'#55c6ed':'#fa8294'});
    if(entry.position){circle.setAttribute('tabindex','0');circle.setAttribute('role','button');circle.setAttribute('aria-label',`${entry.ply}手目後を表示 評価${entry.value}`);circle.addEventListener('click',()=>onSelect(entry));circle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(entry);}});}
  }
  add('text',{x:38,y:186,fill:'#b9c8db','font-size':13},'0手');add('text',{x:550,y:186,fill:'#b9c8db','font-size':13},`${totalMoves}手`);
  svg.setAttribute('aria-label',values.length?`先手プラス・後手マイナスの形勢推移。${values.length}局面評価済み。`:'まだ評価がありません');
};
