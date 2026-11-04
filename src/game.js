    /* --- Web Audio API Procedural Synthesizer --- */
    class SoundEngine {
      constructor() {
        this.ctx = null;
        this.enabled = true;
      }
      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.ctx = new AudioContext();
        }
      }
      playPieceSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
      playCheckSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [440, 554, 659].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.04);
          gain.gain.setValueAtTime(0.3, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + 0.35);
        });
      }
      playTacticSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [261, 329, 392, 523, 659].forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0.4, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + 0.6);
        });
      }
      playKishinSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 8; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(300 + i * 150, now + i * 0.04);
          gain.gain.setValueAtTime(0.15, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + (i + 1) * 0.06);
        }
      }
      playWarningSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    }

    const sound = new SoundEngine();

    /* --- Piece Definitions & Constants --- */
    /* --- Shogi Wars Tactics & Castle Registry --- */
    const TACTICS_DB = [
      { id: 'yagura', name: '矢 倉', desc: '金銀3枚で玉を強固に守る王道の居飛車囲い', category: '囲い', unlocked: false },
      { id: 'mino', name: '美濃囲い', desc: '素早く手数がかからず横からの攻めに極めて強い振り飛車の代表的囲い', category: '囲い', unlocked: false },
      { id: 'anaguma', name: '穴 熊', desc: '玉を最深部の隅に潜り込ませ金銀で固める鉄壁の囲い', category: '囲い', unlocked: false },
      { id: 'shikenbisha', name: '四間飛車', desc: '飛車を左から4筋（6筋）に展開する最も人気の高い振り飛車戦法', category: '戦法', unlocked: false },
      { id: 'sankanbisha', name: '三間飛車', desc: '飛車を左から3筋（7筋）に振る軽快で攻防に長けた戦法', category: '戦法', unlocked: false },
      { id: 'nakabisha', name: '中飛車', desc: '飛車を盤面の中央（5筋）に据えて力強く中央突破を狙う戦法', category: '戦法', unlocked: false },
      { id: 'bogin', name: '棒 銀', desc: '銀将を真っ直ぐ前進させて相手の香・飛車先を突破する速攻戦法', category: '戦法', unlocked: false },
      { id: 'gangi', name: '雁 木', desc: '銀と金をジグザグに構えて柔軟に受ける居飛車の古典的囲い', category: '囲い', unlocked: false },
      { id: 'elmo', name: 'エルモ囲い', desc: 'AI時代に大流行した金銀2枚によるスピーディーで堅い囲い', category: '囲い', unlocked: false }
    ];

    /* --- Initial Board Setup --- */
    class ShogiGame extends ShogiRules {
      constructor() {
        super();
        this.cpu = null;
        this.isPreparing = false;
        this.isPaused = false;
        this.usiMoves = [];
        this.pendingTasks = new Set();
        this.generation = 0;
        this.result = null;
        this.recordPosition();
        this.board = getInitialBoard();
        this.senteHand = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
        this.goteHand = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
        this.currentTurn = 'sente';
        this.moveHistory = [];
        this.boardHistory = [];
        this.isGameOver = false;

        // Settings
        this.gameMode = 'ai';
        this.aiLevel = 'medium';
        this.playerSide = 'sente';
        this.timeMode = '10min';

        // Timers in seconds
        this.senteTime = 600;
        this.goteTime = 600;
        this.turnTimerSec = 10;
        this.timerInterval = null;

        // Kishin
        this.kishinRemaining = 3;
        this.isKishinActive = false;

        // Selection
        this.selectedCell = null;
        this.selectedHandPiece = null;
        this.validDestinations = [];
        this.lastMove = null;
        this.pendingPromoMove = null;

        this.flipped = false;
      }

      cancelPendingTasks() {
        this.generation++;
        if (this.cpu) this.cpu.cancel();
        for (const task of this.pendingTasks) clearTimeout(task);
        this.pendingTasks.clear();
        this.isKishinActive = false;
        this.pendingPromoMove = null;
        if (window.ui) {
          window.ui.closeModal('promo-modal');
          window.ui.showAiThinking(false);
        }
      }

      schedule(callback, delay) {
        const generation = this.generation;
        const task = setTimeout(() => {
          this.pendingTasks.delete(task);
          if (generation === this.generation && !this.isGameOver) callback();
        }, delay);
        this.pendingTasks.add(task);
      }

      queueAiMove(delay = 450) {
        if (this.isGameOver || this.isPaused || this.isPreparing || this.currentTurn === this.playerSide) return;
        if (this.cpu) { this.cpu.queue(); return; }
        if (window.ui) window.ui.showAiThinking(true);
        this.schedule(() => {
          if (this.currentTurn === this.playerSide) return;
          this.executeAiMove();
          if (window.ui) window.ui.showAiThinking(false);
        }, delay);
      }

      finishGame(reason, loser = null) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.result = { reason, loser };
        this.cancelPendingTasks();
        clearInterval(this.timerInterval);
        const labels = { repetition: '千日手・引き分け', 'perpetual-check': '連続王手の千日手・反則負け',
          mate: '詰み', 'no-legal-move': '合法手なし', resign: '投了', timeout: '時間切れ' };
        if (window.ui) {
          window.ui.render();
          window.ui.showCutIn('対局終了', labels[reason] + (loser ? ` / ${loser === 'sente' ? '後手' : '先手'}の勝ち` : ''), 'win');
        }
      }

      initNewMatch() {
        this.cancelPendingTasks();
        this.result = null;
        this.isPaused = false;
        this.usiMoves = [];
        this.gameMode = 'ai';
        this.board = getInitialBoard();
        this.senteHand = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
        this.goteHand = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
        this.currentTurn = 'sente';
        this.moveHistory = [];
        this.boardHistory = [];
        this.isGameOver = false;
        this.selectedCell = null;
        this.selectedHandPiece = null;
        this.validDestinations = [];
        this.lastMove = null;
        this.pendingPromoMove = null;
        this.isKishinActive = false;

        if (this.timeMode === '10min') {
          this.senteTime = 600;
          this.goteTime = 600;
        } else if (this.timeMode === '3min') {
          this.senteTime = 180;
          this.goteTime = 180;
        } else if (this.timeMode === '10sec') {
          this.senteTime = 10;
          this.goteTime = 10;
        }
        this.turnTimerSec = 10;
        this.positionHistory = [];
        this.recordPosition();
        if (this.cpu) this.cpu.newMatch();
        else this.startTimer();
      }

      saveSnapshot() {
        const snap = {
          board: this.board.map(row => row.map(cell => cell ? { ...cell } : null)),
          senteHand: { ...this.senteHand },
          goteHand: { ...this.goteHand },
          currentTurn: this.currentTurn,
          usiMoves: [...this.usiMoves],
          positionHistory: this.positionHistory.map(entry => ({ ...entry })),
          lastMove: this.lastMove ? { ...this.lastMove } : null,
          moveHistory: [...this.moveHistory],
          senteTime: this.senteTime,
          goteTime: this.goteTime
        };
        this.boardHistory.push(snap);
      }

      startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.clockUpdatedAt = performance.now();
        this.timerInterval = setInterval(() => {
          this.updateClock();
          if (window.ui) window.ui.updateTimers();
        }, 100);
      }

      updateClock() {
        if (this.isGameOver || this.isPaused || this.isPreparing) return;
        const now = performance.now();
        const elapsed = Math.max(0, now - (this.clockUpdatedAt ?? now)) / 1000;
        this.clockUpdatedAt = now;
        const key = this.currentTurn === 'sente' ? 'senteTime' : 'goteTime';
        const before = Math.ceil(this[key]);
        this[key] = Math.max(0, this[key] - elapsed);
        const remaining = Math.ceil(this[key]);
        if (remaining < before && remaining > 0 && remaining <= (this.timeMode === '10sec' ? 3 : 10)) sound.playWarningSound();
        if (this[key] <= 0) this.handleTimeout(this.currentTurn);
      }

      handleTimeout(loser) {
        this.finishGame('timeout', loser);
      }

      makeMove(fromR, fromC, toR, toC, promote = false) {
        if (this.isGameOver || this.isPaused || this.isPreparing || ![fromR, fromC, toR, toC].every(Number.isInteger) ||
            !this.isValidPos(fromR, fromC) || !this.isValidPos(toR, toC)) return false;
        const moving = this.board[fromR][fromC];
        if (!moving || moving.player !== this.currentTurn) return false;
        const promotion = this.checkPromotionStatus(fromR, toR, moving.type, moving.player);
        if ((promote && !promotion.canPromote) || (!promote && promotion.mustPromote)) return false;
        if (!this.getLegalMoves(fromR, fromC).some(m => m.toR === toR && m.toC === toC)) return false;
        this.updateClock();
        if (this.isGameOver) return false;
        this.cancelPendingTasks();
        this.saveSnapshot();

        const piece = this.board[fromR][fromC];
        const destPiece = this.board[toR][toC];

        if (destPiece) {
          const baseType = UNPROMOTED[destPiece.type] || destPiece.type;
          const hand = this.currentTurn === 'sente' ? this.senteHand : this.goteHand;
          hand[baseType] = (hand[baseType] || 0) + 1;
        }

        const finalType = promote ? PROMOTABLE[piece.type] : piece.type;
        this.board[toR][toC] = { type: finalType, player: piece.player };
        this.board[fromR][fromC] = null;

        sound.playPieceSound();
        this.lastMove = { fromR, fromC, toR, toC };

        const file = 9 - toC;
        const rank = ['一','二','三','四','五','六','七','八','九'][toR];
        const pieceName = PIECE_NAMES[finalType];
        const promoStr = promote ? '成' : '';
        const entry = `${this.moveHistory.length + 1}. ${this.currentTurn === 'sente' ? '▲' : '△'}${file}${rank}${pieceName}${promoStr}`;
        this.moveHistory.push(entry);

        this.usiMoves.push(`${9-fromC}${String.fromCharCode(97+fromR)}${9-toC}${String.fromCharCode(97+toR)}${promote?'+':''}`);
        this.postMoveCheck(piece.player);
        return true;
      }

      makeDrop(toR, toC, type) {
        if (this.isGameOver || this.isPaused || this.isPreparing || !Number.isInteger(toR) || !Number.isInteger(toC) || !this.isValidPos(toR, toC)) return false;
        const hand = this.currentTurn === 'sente' ? this.senteHand : this.goteHand;
        if (!(hand[type] > 0) || !this.getLegalDrops(type).some(m => m.toR === toR && m.toC === toC)) return false;
        this.updateClock();
        if (this.isGameOver) return false;
        this.cancelPendingTasks();
        this.saveSnapshot();

        hand[type]--;
        this.board[toR][toC] = { type, player: this.currentTurn };

        sound.playPieceSound();
        this.lastMove = { fromR: null, fromC: null, toR, toC };

        const file = 9 - toC;
        const rank = ['一','二','三','四','五','六','七','八','九'][toR];
        const pieceName = PIECE_NAMES[type];
        const entry = `${this.moveHistory.length + 1}. ${this.currentTurn === 'sente' ? '▲' : '△'}${file}${rank}${pieceName}打`;
        this.moveHistory.push(entry);

        const usiType = { FU:'P', KY:'L', KE:'N', GI:'S', KI:'G', KA:'B', HI:'R' }[type];
        this.usiMoves.push(`${usiType}*${9-toC}${String.fromCharCode(97+toR)}`);
        this.postMoveCheck(this.currentTurn);
        return true;
      }

      postMoveCheck(playerMoved) {
        this.detectTactics(playerMoved);

        const nextTurn = this.currentTurn === 'sente' ? 'gote' : 'sente';
        this.currentTurn = nextTurn;
        this.clockUpdatedAt = performance.now();

        if (this.timeMode === '10sec') {
          if (nextTurn === 'sente') this.senteTime = 10;
          else this.goteTime = 10;
        }

        const repetition = this.recordPosition(playerMoved);
        if (repetition) {
          this.finishGame(repetition.reason, repetition.loser);
          return;
        }
        const inCheck = this.isKingInCheck(nextTurn);
        if (this.hasNoLegalMoves(nextTurn)) {
          this.finishGame(inCheck ? 'mate' : 'no-legal-move', nextTurn);
          return;
        }
        if (inCheck) {
          sound.playCheckSound();
          if (window.ui) window.ui.triggerCheckAnimation();
        }
        if (window.ui) window.ui.render();
        this.queueAiMove();
      }

      detectTactics(player) {
        const isSente = player === 'sente';
        const p = (r, c) => this.board[r][c];

        if (isSente && !TACTICS_DB.find(t => t.id === 'mino').unlocked) {
          const king = p(8, 1) || p(7, 1);
          const silver = p(7, 1) || p(6, 1);
          const gold = p(6, 2) || p(7, 2);
          if (king && king.type === 'OU' && king.player === 'sente' &&
              silver && silver.type === 'GI' && silver.player === 'sente' &&
              gold && gold.type === 'KI' && gold.player === 'sente') {
            this.unlockTactic('mino');
          }
        }

        if (isSente && !TACTICS_DB.find(t => t.id === 'yagura').unlocked) {
          const king = p(8, 1);
          const silver = p(6, 2);
          const gold1 = p(7, 1);
          const gold2 = p(7, 2);
          if (king && king.type === 'OU' && king.player === 'sente' &&
              silver && silver.type === 'GI' &&
              gold1 && gold1.type === 'KI' && gold2 && gold2.type === 'KI') {
            this.unlockTactic('yagura');
          }
        }

        if (isSente && !TACTICS_DB.find(t => t.id === 'anaguma').unlocked) {
          const king = p(8, 0);
          const silver = p(7, 1);
          const gold = p(8, 1);
          if (king && king.type === 'OU' && king.player === 'sente' &&
              silver && silver.type === 'GI' && gold && gold.type === 'KI') {
            this.unlockTactic('anaguma');
          }
        }

        if (isSente && !TACTICS_DB.find(t => t.id === 'shikenbisha').unlocked) {
          for (let r = 0; r < 9; r++) {
            const rook = p(r, 3);
            if (rook && (rook.type === 'HI' || rook.type === 'RY') && rook.player === 'sente') {
              this.unlockTactic('shikenbisha');
              break;
            }
          }
        }

        if (isSente && !TACTICS_DB.find(t => t.id === 'sankanbisha').unlocked) {
          for (let r = 0; r < 9; r++) {
            const rook = p(r, 2);
            if (rook && (rook.type === 'HI' || rook.type === 'RY') && rook.player === 'sente') {
              this.unlockTactic('sankanbisha');
              break;
            }
          }
        }

        if (isSente && !TACTICS_DB.find(t => t.id === 'nakabisha').unlocked) {
          for (let r = 0; r < 9; r++) {
            const rook = p(r, 4);
            if (rook && (rook.type === 'HI' || rook.type === 'RY') && rook.player === 'sente') {
              this.unlockTactic('nakabisha');
              break;
            }
          }
        }

        if (isSente && !TACTICS_DB.find(t => t.id === 'bogin').unlocked) {
          const s1 = p(4, 7) || p(3, 7) || p(4, 8) || p(3, 8);
          if (s1 && s1.type === 'GI' && s1.player === 'sente') {
            this.unlockTactic('bogin');
          }
        }
      }

      unlockTactic(tacticId) {
        const item = TACTICS_DB.find(t => t.id === tacticId);
        if (!item || item.unlocked) return;
        item.unlocked = true;
        sound.playTacticSound();
        if (window.ui) window.ui.showTacticBanner(item.name, item.desc, item.category);
      }

      evaluateBoard(board = this.board) {
        let score = 0;
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            let val = PIECE_VALUES[piece.type] || 0;

            if (r >= 3 && r <= 5 && c >= 3 && c <= 5) val += 20;

            if (piece.type === 'FU' || piece.type === 'GI') {
              val += piece.player === 'sente' ? (8 - r) * 5 : r * 5;
            }

            score += piece.player === 'sente' ? val : -val;
          }
        }

        for (const [t, cnt] of Object.entries(this.senteHand)) {
          score += (PIECE_VALUES[t] * 1.05) * cnt;
        }
        for (const [t, cnt] of Object.entries(this.goteHand)) {
          score -= (PIECE_VALUES[t] * 1.05) * cnt;
        }

        return score;
      }

      getAllLegalMovesForPlayer(player) {
        const allMoves = [];

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const piece = this.board[r][c];
            if (piece && piece.player === player) {
              const raw = this.getRawMoves(r, c);
              for (const m of raw) {
                if (this.board[m.toR][m.toC]?.type === 'OU') continue;
                const orig = this.board[m.toR][m.toC];
                this.board[m.toR][m.toC] = piece;
                this.board[r][c] = null;
                const inCheck = this.isKingInCheck(player);
                this.board[r][c] = piece;
                this.board[m.toR][m.toC] = orig;

                if (!inCheck) {
                  const promo = this.checkPromotionStatus(r, m.toR, piece.type, player);
                  if (promo.canPromote) {
                    allMoves.push({ fromR: r, fromC: c, toR: m.toR, toC: m.toC, promote: true });
                    if (!promo.mustPromote) {
                      allMoves.push({ fromR: r, fromC: c, toR: m.toR, toC: m.toC, promote: false });
                    }
                  } else {
                    allMoves.push({ fromR: r, fromC: c, toR: m.toR, toC: m.toC, promote: false });
                  }
                }
              }
            }
          }
        }

        const hand = player === 'sente' ? this.senteHand : this.goteHand;
        for (const [type, cnt] of Object.entries(hand)) {
          if (cnt > 0) {
            const drops = this.getLegalDrops(type, player);
            for (const d of drops) {
              allMoves.push({ isDrop: true, dropType: type, toR: d.toR, toC: d.toC });
            }
          }
        }

        return allMoves;
      }

      getBestMove(player = this.currentTurn, depth = 2) {
        const moves = this.getAllLegalMovesForPlayer(player);
        if (moves.length === 0) return null;

        moves.sort(() => Math.random() - 0.5);

        let bestMove = moves[0];
        const isMaximizing = player === 'sente';
        let bestVal = isMaximizing ? -Infinity : Infinity;

        for (const m of moves) {
          let captured = null;
          let movedPiece = null;
          const hand = player === 'sente' ? this.senteHand : this.goteHand;

          if (m.isDrop) {
            hand[m.dropType]--;
            this.board[m.toR][m.toC] = { type: m.dropType, player };
          } else {
            movedPiece = this.board[m.fromR][m.fromC];
            captured = this.board[m.toR][m.toC];
            if (captured) {
              const base = UNPROMOTED[captured.type] || captured.type;
              hand[base] = (hand[base] || 0) + 1;
            }
            const finalType = m.promote ? PROMOTABLE[movedPiece.type] : movedPiece.type;
            this.board[m.toR][m.toC] = { type: finalType, player };
            this.board[m.fromR][m.fromC] = null;
          }

          const val = this.evaluateBoard();

          if (m.isDrop) {
            this.board[m.toR][m.toC] = null;
            hand[m.dropType]++;
          } else {
            this.board[m.fromR][m.fromC] = movedPiece;
            this.board[m.toR][m.toC] = captured;
            if (captured) {
              const base = UNPROMOTED[captured.type] || captured.type;
              hand[base]--;
            }
          }

          if (isMaximizing) {
            if (val > bestVal) { bestVal = val; bestMove = m; }
          } else {
            if (val < bestVal) { bestVal = val; bestMove = m; }
          }
        }

        return bestMove;
      }

      executeAiMove() {
        if (this.isGameOver || this.currentTurn === this.playerSide) return;
        if (this.cpu) { this.cpu.queue(); return; }
        const move = this.getBestMove(this.currentTurn, 2);
        if (!move) {
          this.finishGame('no-legal-move', this.currentTurn);
          return;
        }

        if (move.isDrop) {
          this.makeDrop(move.toR, move.toC, move.dropType);
        } else {
          this.makeMove(move.fromR, move.fromC, move.toR, move.toC, move.promote);
        }
      }

      summonKishin() {
        if (this.kishinRemaining <= 0 || this.isKishinActive || this.isGameOver) return;
        if (this.currentTurn !== this.playerSide) {
          if (window.ui) window.ui.showToast('あなたの手番でのみ棋神を降臨できます。', 'info');
          return;
        }

        this.kishinRemaining--;
        this.isKishinActive = true;
        document.getElementById('kishin-count').textContent = this.kishinRemaining;

        sound.playKishinSound();
        if (window.ui) window.ui.showCutIn('⚡ 棋神降臨 ⚡', '参考手を自動で指します', 'kishin');

        let steps = 0;
        const maxSteps = 5;

        const kishinStep = () => {
          if (this.isGameOver || steps >= maxSteps) {
            this.isKishinActive = false;
            if (window.ui) window.ui.render();
            return;
          }

          if (this.currentTurn === this.playerSide) {
            steps++;
            const best = this.getBestMove(this.playerSide, 3);
            if (best) {
              if (best.isDrop) {
                this.makeDrop(best.toR, best.toC, best.dropType);
              } else {
                this.makeMove(best.fromR, best.fromC, best.toR, best.toC, best.promote);
              }
            }
          }

          if (steps < maxSteps && !this.isGameOver) {
            this.schedule(kishinStep, 850);
          } else {
            this.isKishinActive = false;
          }
        };

        this.schedule(kishinStep, 1100);
      }
    }

    /* --- UI View Manager --- */
    class UIManager {
      constructor(game) {
        this.game = game;
        this.draftSettings = { timeMode: game.timeMode, playerSide: game.playerSide };
        this.boardEl = document.getElementById('shogi-board');
        this.toastContainer = document.getElementById('toast-container');
        this.initDOM();
      }

      initDOM() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.r = r;
            cell.dataset.c = c;

            if ((r === 3 || r === 6) && (c === 3 || c === 6)) {
              cell.classList.add('hoshi');
            }

            cell.addEventListener('click', () => {
              const clickedR = parseInt(cell.dataset.realR, 10);
              const clickedC = parseInt(cell.dataset.realC, 10);
              this.handleCellClick(clickedR, clickedC);
            });
            this.boardEl.appendChild(cell);
          }
        }

        document.getElementById('btn-sound').addEventListener('click', () => this.toggleSound());
        document.getElementById('btn-new-game').addEventListener('click', () => this.openModal('newgame-modal'));
        document.getElementById('modal-close-newgame').addEventListener('click', () => this.closeModal('newgame-modal'));
        document.getElementById('btn-start-match').addEventListener('click', () => this.startConfiguredMatch());

        document.getElementById('btn-collection').addEventListener('click', () => this.openCollectionModal());
        document.getElementById('modal-close-collection').addEventListener('click', () => this.closeModal('collection-modal'));

        document.getElementById('btn-rule').addEventListener('click', () => this.openModal('rule-modal'));
        document.getElementById('modal-close-rule').addEventListener('click', () => this.closeModal('rule-modal'));

        document.getElementById('btn-kishin').addEventListener('click', () => this.game.summonKishin());
        document.getElementById('btn-flip').addEventListener('click', () => this.toggleFlip());
        document.getElementById('btn-resign').addEventListener('click', () => this.handleResign());
        document.getElementById('btn-hint').addEventListener('click', () => this.showHint());
        document.getElementById('btn-undo').addEventListener('click', () => this.undoMove());
        document.getElementById('btn-copy-kifu').addEventListener('click', () => this.copyKifu());

        document.getElementById('btn-promote-yes').addEventListener('click', () => this.resolvePromotion(true));
        document.getElementById('btn-promote-no').addEventListener('click', () => this.resolvePromotion(false));

        this.initModalSelectors();
      }

      initModalSelectors() {
        document.querySelectorAll('.time-select-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.time-select-btn').forEach(b => {
              b.className = 'time-select-btn py-2 px-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-bold text-center cursor-pointer';
            });
            btn.className = 'time-select-btn py-2 px-2 rounded-lg border border-amber-500 bg-amber-500/20 text-amber-300 font-bold text-center cursor-pointer';
            this.draftSettings.timeMode = btn.dataset.time;
          });
        });

        document.querySelectorAll('.ai-select-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.ai-select-btn').forEach(b => {
              b.className = 'ai-select-btn py-2 px-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-bold text-center cursor-pointer';
            });
            btn.className = 'ai-select-btn py-2 px-2 rounded-lg border border-amber-500 bg-amber-500/20 text-amber-300 font-bold text-center cursor-pointer';
            this.game.aiLevel = btn.dataset.level;
          });
        });

        document.querySelectorAll('.turn-select-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.turn-select-btn').forEach(b => {
              b.className = 'turn-select-btn py-2 px-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-bold text-center cursor-pointer';
            });
            btn.className = 'turn-select-btn py-2 px-3 rounded-lg border border-amber-500 bg-amber-500/20 text-amber-300 font-bold text-center cursor-pointer';
            this.draftSettings.playerSide = btn.dataset.turn;
          });
        });
      }

      showToast(text, type = 'info') {
        const toast = document.createElement('div');
        const isSuccess = type === 'success';
        toast.className = `toast-msg pointer-events-auto py-2 px-4 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold ${isSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-700 text-amber-300'}`;
        toast.innerHTML = `<span>${isSuccess ? '✓' : 'ℹ'}</span><span>${text}</span>`;
        this.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }

      startConfiguredMatch() {
        this.closeModal('newgame-modal');
        Object.assign(this.game, this.draftSettings);
        document.getElementById('match-rule-label').textContent =
          this.game.timeMode === '10min' ? '10分切れ負け' :
          this.game.timeMode === '3min' ? '3分切れ負け' : '10秒将棋';
        document.getElementById('ai-level-label').textContent =
          this.game.cpu?.label || '簡易CPU（エンジン強化前）';

        this.game.initNewMatch();
        if (this.game.cpu) this.game.flipped = this.game.playerSide === 'gote';
        this.render();
        this.updateTimers();

        sound.playTacticSound();
        this.showCutIn('対 局 開 始 !', `${document.getElementById('match-rule-label').textContent} / 気合を入れて挑め！`, 'start');

        if (this.game.gameMode === 'ai' && this.game.playerSide === 'gote') {
          this.game.queueAiMove(800);
        }
      }

      handleCellClick(r, c) {
        if (this.game.isGameOver || this.game.isPaused || this.game.isPreparing) return;
        if (this.game.gameMode === 'ai' && this.game.currentTurn !== this.game.playerSide) return;

        if (this.game.selectedHandPiece) {
          const isDest = this.game.validDestinations.some(d => d.toR === r && d.toC === c);
          if (isDest) {
            this.game.makeDrop(r, c, this.game.selectedHandPiece);
            this.game.selectedHandPiece = null;
            this.game.validDestinations = [];
            this.render();
            return;
          } else {
            this.game.selectedHandPiece = null;
            this.game.validDestinations = [];
          }
        }

        const piece = this.game.board[r][c];

        if (this.game.selectedCell) {
          const { r: fromR, c: fromC } = this.game.selectedCell;
          const isDest = this.game.validDestinations.some(d => d.toR === r && d.toC === c);

          if (isDest) {
            const movingPiece = this.game.board[fromR][fromC];
            const promo = this.game.checkPromotionStatus(fromR, r, movingPiece.type, movingPiece.player);

            if (promo.mustPromote) {
              this.game.makeMove(fromR, fromC, r, c, true);
              this.game.selectedCell = null;
              this.game.validDestinations = [];
              this.render();
              return;
            } else if (promo.canPromote) {
              this.game.pendingPromoMove = { fromR, fromC, toR: r, toC: c };
              this.openPromotionModal(movingPiece.type);
              return;
            } else {
              this.game.makeMove(fromR, fromC, r, c, false);
              this.game.selectedCell = null;
              this.game.validDestinations = [];
              this.render();
              return;
            }
          }
        }

        if (piece && piece.player === this.game.currentTurn) {
          this.game.selectedCell = { r, c };
          this.game.selectedHandPiece = null;
          this.game.validDestinations = this.game.getLegalMoves(r, c);
          this.render();
        } else {
          this.game.selectedCell = null;
          this.game.validDestinations = [];
          this.render();
        }
      }

      handleHandClick(type, player) {
        if (this.game.isGameOver || this.game.isPaused || this.game.isPreparing) return;
        if (player !== this.game.currentTurn) return;
        if (this.game.gameMode === 'ai' && this.game.currentTurn !== this.game.playerSide) return;

        this.game.selectedCell = null;
        if (this.game.selectedHandPiece === type) {
          this.game.selectedHandPiece = null;
          this.game.validDestinations = [];
        } else {
          this.game.selectedHandPiece = type;
          this.game.validDestinations = this.game.getLegalDrops(type, player);
        }
        this.render();
      }

      openPromotionModal(pieceType) {
        const promoType = PROMOTABLE[pieceType];
        document.getElementById('promo-piece-name').textContent = PIECE_NAMES[promoType];
        document.getElementById('unpromo-piece-name').textContent = PIECE_NAMES[pieceType];
        this.openModal('promo-modal');
      }

      resolvePromotion(promote) {
        this.closeModal('promo-modal');
        if (this.game.isGameOver) return;
        if (!this.game.pendingPromoMove) return;
        const { fromR, fromC, toR, toC } = this.game.pendingPromoMove;
        this.game.makeMove(fromR, fromC, toR, toC, promote);
        this.game.pendingPromoMove = null;
        this.game.selectedCell = null;
        this.game.validDestinations = [];
        this.render();
      }

      render() {
        const isKingChecked = this.game.isKingInCheck(this.game.currentTurn);
        document.getElementById('check-status-label').textContent = isKingChecked ? '王手！' : 'なし';
        document.getElementById('check-status-label').className = isKingChecked ? 'text-rose-400 font-black animate-pulse' : 'text-slate-400';

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const dispR = this.game.flipped ? 8 - r : r;
            const dispC = this.game.flipped ? 8 - c : c;
            const idx = r * 9 + c;
            const cell = this.boardEl.children[idx];
            if (!cell) continue;

            cell.className = 'board-cell';
            cell.dataset.realR = dispR;
            cell.dataset.realC = dispC;

            if ((dispR === 3 || dispR === 6) && (dispC === 3 || dispC === 6)) {
              cell.classList.add('hoshi');
            }

            const piece = this.game.board[dispR][dispC];
            cell.innerHTML = '';

            if (this.game.selectedCell && this.game.selectedCell.r === dispR && this.game.selectedCell.c === dispC) {
              cell.classList.add('cell-selected');
            }

            if (this.game.lastMove) {
              if ((this.game.lastMove.fromR === dispR && this.game.lastMove.fromC === dispC) ||
                  (this.game.lastMove.toR === dispR && this.game.lastMove.toC === dispC)) {
                cell.classList.add('cell-last-move');
              }
            }

            if (isKingChecked && piece && piece.type === 'OU' && piece.player === this.game.currentTurn) {
              cell.classList.add('cell-check');
            }

            const isDest = this.game.validDestinations.some(d => d.toR === dispR && d.toC === dispC);
            if (isDest) {
              if (piece) cell.classList.add('cell-capture');
              else cell.classList.add('cell-movable');
            }

            if (piece) {
              const pieceEl = document.createElement('div');
              let isRotated = piece.player === 'gote';
              if (this.game.flipped) {
                isRotated = piece.player === 'sente';
              }
              pieceEl.className = `shogi-piece ${isRotated ? 'gote' : ''}`;

              const isPromoted = UNPROMOTED[piece.type] !== undefined;
              const textEl = document.createElement('span');
              textEl.className = `piece-text ${isPromoted ? 'promoted' : ''}`;
              textEl.textContent = PIECE_NAMES[piece.type];

              pieceEl.appendChild(textEl);
              cell.appendChild(pieceEl);
            }
          }
        }

        this.renderHand('sente');
        this.renderHand('gote');

        const isSenteTurn = this.game.currentTurn === 'sente';
        document.getElementById('turn-badge').textContent = isSenteTurn ? '▲ 先手番' : '△ 後手番';
        document.getElementById('turn-badge').className = isSenteTurn
          ? 'px-2 py-0.5 rounded text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          : 'px-2 py-0.5 rounded text-xs font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40';

        document.getElementById('sente-card').className = `w-full max-w-[430px] mt-2 p-2.5 rounded-xl bg-slate-900/90 border flex items-center justify-between gap-3 shadow-md transition-all ${isSenteTurn ? 'border-emerald-500/80 gold-box-glow' : 'border-slate-800'}`;
        document.getElementById('gote-card').className = `w-full max-w-[430px] mb-2 p-2.5 rounded-xl bg-slate-900/90 border flex items-center justify-between gap-3 shadow-md transition-all ${!isSenteTurn ? 'border-amber-500/80 gold-box-glow' : 'border-slate-800'}`;

        document.getElementById('move-count').textContent = `${this.game.moveHistory.length}手`;

        const score = this.game.evaluateBoard();
        const maxScore = 2000;
        const normalized = Math.max(-maxScore, Math.min(maxScore, score));
        const sentePct = 50 + (normalized / maxScore) * 50;
        document.getElementById('eval-bar-sente').style.width = `${sentePct}%`;
        document.getElementById('eval-bar-gote').style.width = `${100 - sentePct}%`;
        document.getElementById('eval-score').textContent =
          score > 150 ? `先手優勢 (+${score})` :
          score < -150 ? `後手優勢 (${score})` : `互角 (${score})`;

        this.renderKifu();
      }

      renderHand(player) {
        const hand = player === 'sente' ? this.game.senteHand : this.game.goteHand;
        const el = document.getElementById(`${player}-hand`);
        if (!el) return;
        el.innerHTML = '';

        let hasPieces = false;
        for (const [type, count] of Object.entries(hand)) {
          if (count > 0) {
            hasPieces = true;
            const item = document.createElement('div');
            item.className = 'hand-piece-item relative';
            if (this.game.selectedHandPiece === type && this.game.currentTurn === player) {
              item.classList.add('active');
            }

            const pEl = document.createElement('div');
            pEl.className = 'w-8 h-9 rounded bg-gradient-to-b from-[#fff6e5] to-[#edd7b5] border border-[#a07840] flex items-center justify-center font-serif font-black text-slate-900 text-sm shadow-md';
            pEl.textContent = PIECE_NAMES[type];

            const countBadge = document.createElement('span');
            countBadge.className = 'hand-count-badge';
            countBadge.textContent = count;

            item.appendChild(pEl);
            if (count > 1) item.appendChild(countBadge);

            item.addEventListener('click', () => this.handleHandClick(type, player));
            el.appendChild(item);
          }
        }

        if (!hasPieces) {
          el.innerHTML = '<span class="text-xs text-slate-500 italic">なし</span>';
        }
      }

      renderKifu() {
        const kifuEl = document.getElementById('kifu-list');
        if (!kifuEl) return;
        if (this.game.moveHistory.length === 0) {
          kifuEl.innerHTML = '<div class="text-slate-500 italic py-2 text-center">対局中</div>';
          return;
        }

        kifuEl.innerHTML = '';
        this.game.moveHistory.forEach((m, i) => {
          const div = document.createElement('div');
          div.className = `py-0.5 px-1.5 rounded flex justify-between ${i === this.game.moveHistory.length - 1 ? 'bg-amber-500/20 text-amber-300 font-bold' : ''}`;
          div.textContent = m;
          kifuEl.appendChild(div);
        });
        kifuEl.scrollTop = kifuEl.scrollHeight;
      }

      updateTimers() {
        const fmt = (s) => {
          const whole = Math.ceil(Math.max(0, s));
          const m = Math.floor(whole / 60);
          const sec = whole % 60;
          return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        };

        const sEl = document.getElementById('sente-timer');
        const gEl = document.getElementById('gote-timer');

        if (sEl) {
          sEl.textContent = fmt(this.game.senteTime);
          if (this.game.senteTime <= 30) sEl.classList.add('red-box-glow', 'text-rose-400');
          else sEl.classList.remove('red-box-glow', 'text-rose-400');
        }

        if (gEl) {
          gEl.textContent = fmt(this.game.goteTime);
          if (this.game.goteTime <= 30) gEl.classList.add('red-box-glow', 'text-rose-400');
          else gEl.classList.remove('red-box-glow', 'text-rose-400');
        }
      }

      showAiThinking(show) {
        const el = document.getElementById('gote-thinking-badge');
        if (el) el.style.display = show ? 'inline-flex' : 'none';
      }

      triggerCheckAnimation() {
        document.body.classList.add('shake-active');
        setTimeout(() => document.body.classList.remove('shake-active'), 400);

        this.showCutIn('王 手 !', '玉が狙われています！防ぐか逃げてください！', 'check');
      }

      showTacticBanner(name, desc, category) {
        this.showCutIn(name, `${category}発動！ ${desc}`, 'tactic');
      }

      showCutIn(title, subtitle, type = 'check') {
        const overlay = document.getElementById('cutin-overlay');
        const flash = document.getElementById('cutin-flash');
        const content = document.getElementById('cutin-content');
        if (!overlay || !content) return;

        flash.style.animation = 'thunderFlash 0.5s ease-out';

        let icon = '🔥';
        let grad = 'from-amber-400 via-yellow-300 to-amber-600';
        let bgStyle = 'bg-slate-950/90 border-2 border-amber-500';

        if (type === 'check') {
          icon = '⚔️';
          grad = 'from-rose-500 via-red-400 to-amber-500';
          bgStyle = 'bg-slate-950/95 border-2 border-rose-500';
        } else if (type === 'kishin') {
          icon = '⚡';
          grad = 'from-yellow-300 via-amber-400 to-yellow-600';
          bgStyle = 'bg-slate-950/95 border-2 border-yellow-400 gold-box-glow';
        }

        content.innerHTML = `
          <div class="wars-banner w-full py-4 px-6 rounded-2xl ${bgStyle} flex flex-col items-center shadow-2xl">
            <span class="text-3xl mb-1">${icon}</span>
            <h2 class="font-serif font-black text-3xl md:text-5xl tracking-widest bg-gradient-to-r ${grad} bg-clip-text text-transparent mb-2">
              ${title}
            </h2>
            <p class="text-xs md:text-sm text-slate-200 font-bold">${subtitle}</p>
          </div>
        `;

        overlay.classList.add('active');
        content.style.animation = 'cutinSlideIn 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';

        setTimeout(() => {
          overlay.classList.remove('active');
          content.style.animation = '';
        }, 1300);
      }

      openCollectionModal() {
        const list = document.getElementById('collection-list');
        list.innerHTML = '';
        TACTICS_DB.forEach(t => {
          const div = document.createElement('div');
          div.className = `p-3 rounded-xl border flex items-center justify-between ${t.unlocked ? 'bg-amber-950/40 border-amber-500/60' : 'bg-slate-950/60 border-slate-800 opacity-60'}`;
          div.innerHTML = `
            <div>
              <div class="flex items-center gap-2">
                <span class="font-black font-serif text-base ${t.unlocked ? 'text-amber-300' : 'text-slate-400'}">${t.name}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded ${t.unlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}">${t.category}</span>
              </div>
              <p class="text-xs text-slate-400 mt-1">${t.desc}</p>
            </div>
            <div class="text-xl">
              ${t.unlocked ? '✅' : '🔒'}
            </div>
          `;
          list.appendChild(div);
        });
        this.openModal('collection-modal');
      }

      toggleFlip() {
        this.game.flipped = !this.game.flipped;
        this.render();
      }

      toggleSound() {
        sound.enabled = !sound.enabled;
        const btn = document.getElementById('btn-sound');
        btn.innerHTML = sound.enabled
          ? '<span>🔊</span><span class="hidden md:inline">音声 ON</span>'
          : '<span>🔇</span><span class="hidden md:inline">音声 OFF</span>';
      }

      handleResign() {
        this.game.finishGame('resign', this.game.playerSide);
      }

      showHint() {
        if (this.game.isGameOver || this.game.isPaused || this.game.isPreparing || this.game.currentTurn !== this.game.playerSide) return;
        if (this.game.cpu) { this.showToast('この試験モードではヒントは利用できません', 'info'); return; }
        const best = this.game.getBestMove(this.game.currentTurn, 2);
        if (best) {
          this.game.selectedCell = null;
          this.game.selectedHandPiece = null;
          if (best.isDrop) {
            this.game.selectedHandPiece = best.dropType;
            this.game.validDestinations = [{ toR: best.toR, toC: best.toC }];
          } else {
            this.game.selectedCell = { r: best.fromR, c: best.fromC };
            this.game.validDestinations = [{ toR: best.toR, toC: best.toC }];
          }
          this.render();
          sound.playWarningSound();
          this.showToast('CPU参考手をハイライト表示しました', 'info');
        }
      }

      undoMove() {
        this.game.updateClock();
        if (this.game.boardHistory.length === 0 || this.game.isGameOver) {
          this.showToast('戻せる手がありません', 'info');
          return;
        }

        this.game.cancelPendingTasks();
        // Return to the human's previous decision, including when CPU is still waiting.
        let steps = this.game.currentTurn === this.game.playerSide ? 2 : 1;
        let snap = null;
        while (steps > 0 && this.game.boardHistory.length > 0) {
          snap = this.game.boardHistory.pop();
          steps--;
        }

        if (snap) {
          this.game.board = snap.board;
          this.game.senteHand = snap.senteHand;
          this.game.goteHand = snap.goteHand;
          this.game.currentTurn = snap.currentTurn;
          this.game.usiMoves = snap.usiMoves;
          this.game.positionHistory = snap.positionHistory;
          this.game.lastMove = snap.lastMove;
          this.game.moveHistory = snap.moveHistory;
          this.game.senteTime = snap.senteTime;
          this.game.goteTime = snap.goteTime;
          this.game.clockUpdatedAt = performance.now();

          this.game.selectedCell = null;
          this.game.selectedHandPiece = null;
          this.game.validDestinations = [];

          this.render();
          this.updateTimers();
          sound.playPieceSound();
          this.showToast('局面を戻しました（待った成立）', 'info');
          this.game.queueAiMove();
        }
      }

      copyKifu() {
        if (this.game.moveHistory.length === 0) {
          this.showToast('棋譜がまだありません', 'info');
          return;
        }
        const text = this.game.moveHistory.join('\n');
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
              this.showToast('棋譜をクリップボードにコピーしました！', 'success');
            }).catch(() => {
              this.copyFallback(text);
            });
          } else {
            this.copyFallback(text);
          }
        } catch (e) {
          this.copyFallback(text);
        }
      }

      copyFallback(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          this.showToast('棋譜をクリップボードにコピーしました！', 'success');
        } catch (err) {
          this.showToast('コピーに失敗しました', 'info');
        }
        document.body.removeChild(ta);
      }

      openModal(id) {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('hidden');
          el.classList.add('flex');
        }
      }
      closeModal(id) {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('flex');
          el.classList.add('hidden');
        }
      }
    }

    /* --- Immediate Self-Executing Bootloader --- */
    function bootShogiWars() {
      if (window.__shogi_initialized) return;
      window.__shogi_initialized = true;

      try {
        const game = new ShogiGame();
        const ui = new UIManager(game);
        window.game = game;
        window.ui = ui;
        if (window.configureShogiGame) window.configureShogiGame(game, ui);
        game.initNewMatch();
        ui.render();
      } catch (err) {
        console.error('Failed to initialize Shogi Wars:', err);
      }
    }

    // Run IMMEDIATELY if DOM elements are ready, otherwise on DOMContentLoaded or load
    if (document.getElementById('shogi-board')) {
      bootShogiWars();
    } else {
      document.addEventListener('DOMContentLoaded', bootShogiWars);
      window.addEventListener('load', bootShogiWars);
    }
