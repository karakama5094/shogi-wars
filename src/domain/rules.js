/* Pure shogi rules shared by the browser and Node regression tests. */
    const PIECE_NAMES = {
      FU: '歩', KY: '香', KE: '桂', GI: '銀', KI: '金', KA: '角', HI: '飛', OU: '玉',
      TO: 'と', NY: '成香', NK: '成桂', NG: '成銀', UM: '馬', RY: '竜'
    };

    const PROMOTABLE = { FU: 'TO', KY: 'NY', KE: 'NK', GI: 'NG', KA: 'UM', HI: 'RY' };
    const UNPROMOTED = { TO: 'FU', NY: 'KY', NK: 'KE', NG: 'GI', UM: 'KA', RY: 'HI' };

    const PIECE_VALUES = {
      FU: 100, KY: 300, KE: 350, GI: 500, KI: 600, KA: 850, HI: 1000, OU: 20000,
      TO: 550, NY: 500, NK: 500, NG: 550, UM: 1150, RY: 1300
    };

    function getInitialBoard() {
      const b = Array(9).fill(null).map(() => Array(9).fill(null));

      // Gote Pieces (Row 0..2)
      b[0][0] = { type: 'KY', player: 'gote' };
      b[0][1] = { type: 'KE', player: 'gote' };
      b[0][2] = { type: 'GI', player: 'gote' };
      b[0][3] = { type: 'KI', player: 'gote' };
      b[0][4] = { type: 'OU', player: 'gote' };
      b[0][5] = { type: 'KI', player: 'gote' };
      b[0][6] = { type: 'GI', player: 'gote' };
      b[0][7] = { type: 'KE', player: 'gote' };
      b[0][8] = { type: 'KY', player: 'gote' };

      b[1][1] = { type: 'HI', player: 'gote' };
      b[1][7] = { type: 'KA', player: 'gote' };

      for (let c = 0; c < 9; c++) {
        b[2][c] = { type: 'FU', player: 'gote' };
      }

      // Sente Pieces (Row 6..8)
      for (let c = 0; c < 9; c++) {
        b[6][c] = { type: 'FU', player: 'sente' };
      }

      b[7][1] = { type: 'KA', player: 'sente' };
      b[7][7] = { type: 'HI', player: 'sente' };

      b[8][0] = { type: 'KY', player: 'sente' };
      b[8][1] = { type: 'KE', player: 'sente' };
      b[8][2] = { type: 'GI', player: 'sente' };
      b[8][3] = { type: 'KI', player: 'sente' };
      b[8][4] = { type: 'OU', player: 'sente' };
      b[8][5] = { type: 'KI', player: 'sente' };
      b[8][6] = { type: 'GI', player: 'sente' };
      b[8][7] = { type: 'KE', player: 'sente' };
      b[8][8] = { type: 'KY', player: 'sente' };

      return b;
    }

    /* --- Game State Class --- */
class ShogiRules {
  constructor() {
    this.board = getInitialBoard();
    this.senteHand = { FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 };
    this.goteHand = { ...this.senteHand };
    this.currentTurn = 'sente';
    this.positionHistory = [];
  }
      isValidPos(r, c) {
        return r >= 0 && r < 9 && c >= 0 && c < 9;
      }

      getRawMoves(r, c, board = this.board) {
        const piece = board[r][c];
        if (!piece) return [];
        const { type, player } = piece;
        const moves = [];
        const dir = player === 'sente' ? -1 : 1;

        const addMove = (nr, nc) => {
          if (!this.isValidPos(nr, nc)) return false;
          const dest = board[nr][nc];
          if (!dest) {
            moves.push({ toR: nr, toC: nc });
            return true;
          }
          if (dest.player !== player) {
            moves.push({ toR: nr, toC: nc, capture: dest });
            return false;
          }
          return false;
        };

        const addRay = (dr, dc) => {
          let step = 1;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (!this.isValidPos(nr, nc)) break;
            const dest = board[nr][nc];
            if (!dest) {
              moves.push({ toR: nr, toC: nc });
            } else {
              if (dest.player !== player) {
                moves.push({ toR: nr, toC: nc, capture: dest });
              }
              break;
            }
            step++;
          }
        };

        switch (type) {
          case 'FU':
            addMove(r + dir, c);
            break;
          case 'KY':
            addRay(dir, 0);
            break;
          case 'KE':
            addMove(r + dir * 2, c - 1);
            addMove(r + dir * 2, c + 1);
            break;
          case 'GI':
            addMove(r + dir, c);
            addMove(r + dir, c - 1);
            addMove(r + dir, c + 1);
            addMove(r - dir, c - 1);
            addMove(r - dir, c + 1);
            break;
          case 'KI':
          case 'TO':
          case 'NY':
          case 'NK':
          case 'NG':
            addMove(r + dir, c);
            addMove(r + dir, c - 1);
            addMove(r + dir, c + 1);
            addMove(r, c - 1);
            addMove(r, c + 1);
            addMove(r - dir, c);
            break;
          case 'KA':
            addRay(1, 1); addRay(1, -1); addRay(-1, 1); addRay(-1, -1);
            break;
          case 'UM':
            addRay(1, 1); addRay(1, -1); addRay(-1, 1); addRay(-1, -1);
            addMove(r + 1, c); addMove(r - 1, c); addMove(r, c + 1); addMove(r, c - 1);
            break;
          case 'HI':
            addRay(1, 0); addRay(-1, 0); addRay(0, 1); addRay(0, -1);
            break;
          case 'RY':
            addRay(1, 0); addRay(-1, 0); addRay(0, 1); addRay(0, -1);
            addMove(r + 1, c + 1); addMove(r + 1, c - 1); addMove(r - 1, c + 1); addMove(r - 1, c - 1);
            break;
          case 'OU':
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr !== 0 || dc !== 0) addMove(r + dr, c + dc);
              }
            }
            break;
        }

        return moves;
      }

      isKingInCheck(player, board = this.board) {
        let kR = -1, kC = -1;
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const p = board[r][c];
            if (p && p.player === player && p.type === 'OU') {
              kR = r; kC = c; break;
            }
          }
          if (kR !== -1) break;
        }
        if (kR === -1) return true;

        const opponent = player === 'sente' ? 'gote' : 'sente';
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const p = board[r][c];
            if (p && p.player === opponent) {
              const raw = this.getRawMoves(r, c, board);
              if (raw.some(m => m.toR === kR && m.toC === kC)) {
                return true;
              }
            }
          }
        }
        return false;
      }

      getLegalMoves(r, c) {
        const piece = this.board[r][c];
        if (!piece || piece.player !== this.currentTurn) return [];

        const raw = this.getRawMoves(r, c);
        return raw.filter(move => {
          if (this.board[move.toR][move.toC]?.type === 'OU') return false;
          const originalDest = this.board[move.toR][move.toC];
          this.board[move.toR][move.toC] = piece;
          this.board[r][c] = null;

          const inCheck = this.isKingInCheck(this.currentTurn);

          this.board[r][c] = piece;
          this.board[move.toR][move.toC] = originalDest;
          return !inCheck;
        });
      }

      getLegalDrops(type, player = this.currentTurn) {
        const drops = [];
        const hand = player === 'sente' ? this.senteHand : this.goteHand;
        if (!(hand[type] > 0)) return drops;
        const isSente = player === 'sente';

        const columnHasFriendlyPawn = (c) => {
          for (let r = 0; r < 9; r++) {
            const p = this.board[r][c];
            if (p && p.player === player && p.type === 'FU') return true;
          }
          return false;
        };

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (this.board[r][c] !== null) continue;

            if (type === 'FU' || type === 'KY') {
              if (isSente && r === 0) continue;
              if (!isSente && r === 8) continue;
            }
            if (type === 'KE') {
              if (isSente && r <= 1) continue;
              if (!isSente && r >= 7) continue;
            }

            if (type === 'FU' && columnHasFriendlyPawn(c)) continue;

            if (type === 'FU') {
              this.board[r][c] = { type: 'FU', player };
              const opp = isSente ? 'gote' : 'sente';
              const kingRow = r + (isSente ? -1 : 1);
              const king = this.isValidPos(kingRow, c) ? this.board[kingRow][c] : null;
              if (king?.type === 'OU' && king.player === opp && !this.hasBoardReply(opp)) {
                this.board[r][c] = null;
                continue;
              }
              this.board[r][c] = null;
            }

            this.board[r][c] = { type, player };
            const inCheck = this.isKingInCheck(player);
            this.board[r][c] = null;

            if (!inCheck) {
              drops.push({ toR: r, toC: c, isDrop: true, dropType: type });
            }
          }
        }
        return drops;
      }

      hasBoardReply(player) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const p = this.board[r][c];
            if (p && p.player === player) {
              const raw = this.getRawMoves(r, c);
              for (const m of raw) {
                const orig = this.board[m.toR][m.toC];
                this.board[m.toR][m.toC] = p;
                this.board[r][c] = null;
                const inCheck = this.isKingInCheck(player);
                this.board[r][c] = p;
                this.board[m.toR][m.toC] = orig;
                if (!inCheck && orig?.type !== 'OU') return true;
              }
            }
          }
        }

        return false;
      }

      hasNoLegalMoves(player) {
        if (this.hasBoardReply(player)) return false;
        const hand = player === 'sente' ? this.senteHand : this.goteHand;
        for (const [type, count] of Object.entries(hand)) {
          if (count > 0) {
            const drops = this.getLegalDrops(type, player);
            if (drops.length > 0) return false;
          }
        }

        return true;
      }

      checkPromotionStatus(fromR, toR, pieceType, player) {
        if (!PROMOTABLE[pieceType]) return { canPromote: false, mustPromote: false };

        const isSente = player === 'sente';
        const inZone = isSente ? (toR <= 2 || fromR <= 2) : (toR >= 6 || fromR >= 6);
        if (!inZone) return { canPromote: false, mustPromote: false };

        let must = false;
        if (pieceType === 'FU' || pieceType === 'KY') {
          if ((isSente && toR === 0) || (!isSente && toR === 8)) must = true;
        } else if (pieceType === 'KE') {
          if ((isSente && toR <= 1) || (!isSente && toR >= 7)) must = true;
        }

        return { canPromote: true, mustPromote: must };
      }


      positionKey() {
        const hands = [this.senteHand, this.goteHand].map(hand =>
          ['FU','KY','KE','GI','KI','KA','HI'].map(type => hand[type] || 0));
        const board = this.board.map(row => row.map(piece => piece ? [piece.type, piece.player] : null));
        return JSON.stringify([board, hands, this.currentTurn]);
      }

      recordPosition(playerMoved = null) {
        this.positionHistory.push({ key: this.positionKey(), playerMoved,
          check: playerMoved !== null && this.isKingInCheck(this.currentTurn) });
        const key = this.positionKey();
        const matches = this.positionHistory.flatMap((entry, i) => entry.key === key ? [i] : []);
        if (matches.length < 4) return null;
        const cycle = this.positionHistory.slice(matches[matches.length - 4] + 1);
        for (const player of ['sente', 'gote']) {
          const turns = cycle.filter(entry => entry.playerMoved === player);
          if (turns.length && turns.every(entry => entry.check)) {
            return { reason: 'perpetual-check', loser: player };
          }
        }
        return { reason: 'repetition', loser: null };
      }
}
if (typeof module !== 'undefined') module.exports = { ShogiRules, getInitialBoard, PROMOTABLE };
