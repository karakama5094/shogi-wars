const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function loadGame() {
  const tasks = new Map();
  const allTasks = [];
  let id = 0, now = 0;
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {textContent: '', innerHTML: '', style: {}, dataset: {},
      classList: {add(){}, remove(){}}, addEventListener(){}});
    return nodes.get(key);
  };
  const context = vm.createContext({console, performance: {now: () => now}, window: {},
    document: {getElementById: node, querySelectorAll: () => []},
    setTimeout(fn) {const key = ++id; tasks.set(key, fn); allTasks.push(fn); return key;},
    clearTimeout(key) {tasks.delete(key);}, setInterval: () => ++id, clearInterval() {}});
  const root = path.join(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(root, 'src/domain/rules.js'), 'utf8'), context);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = html.slice(html.indexOf('    class SoundEngine'), html.indexOf('    /* --- Immediate Self-Executing Bootloader'));
  vm.runInContext(script + ';globalThis.Game=ShogiGame;globalThis.UI=UIManager;sound.enabled=false;', context);
  const game = new context.Game();
  return {game, context, tasks, allTasks, node, advance(ms) {now += ms;},
    ui() {return Object.assign(Object.create(context.UI.prototype), {game, render(){}, updateTimers(){}, showToast(){}, showCutIn(){}});},
    flush() {const jobs = [...tasks.values()]; tasks.clear(); jobs.forEach(fn => fn());}};
}
function empty(game) {
  game.board = Array.from({length:9}, () => Array(9).fill(null));
  game.board[8][8] = {type:'OU', player:'sente'};
  game.board[0][0] = {type:'OU', player:'gote'};
  game.positionHistory = [];
  game.recordPosition();
}
function put(game, r, c, type, player = 'sente') {game.board[r][c] = {type, player};}
module.exports = {loadGame, empty, put};
