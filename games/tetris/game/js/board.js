// ============================================================
//  BOARD — la grille de jeu (collision, pose, lignes)
// ============================================================
import { COLS, ROWS, HIDDEN_ROWS } from './config.js';

const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

export class Board {
  constructor() {
    this.reset();
  }

  reset() {
    // grid[y][x] = null (vide) ou une lettre de couleur ('I','O',...)
    this.grid = Array.from({ length: TOTAL_ROWS }, () =>
      Array(COLS).fill(null)
    );
  }

  // Une case est-elle libre ? (hors grille = occupé, sauf au-dessus du haut)
  isFree(x, y) {
    if (x < 0 || x >= COLS) return false;      // murs latéraux
    if (y >= TOTAL_ROWS) return false;         // sol
    if (y < 0) return true;                     // au-dessus du plateau : ok
    return this.grid[y][x] === null;
  }

  // Une pièce (liste de cellules absolues) tient-elle ici ?
  fits(cells) {
    return cells.every(([x, y]) => this.isFree(x, y));
  }

  // Fige la pièce dans la grille.
  lock(cells, color) {
    for (const [x, y] of cells) {
      const gy = y;
      if (gy >= 0 && gy < TOTAL_ROWS && x >= 0 && x < COLS) {
        this.grid[gy][x] = color;
      }
    }
  }

  // Détecte et supprime les lignes pleines. Renvoie le nombre supprimé.
  clearLines() {
    let cleared = [];
    for (let y = 0; y < TOTAL_ROWS; y++) {
      if (this.grid[y].every((c) => c !== null)) {
        cleared.push(y);
      }
    }
    for (const y of cleared) {
      this.grid.splice(y, 1);
      this.grid.unshift(Array(COLS).fill(null));
    }
    return cleared.length;
  }

  // Game over si une case occupée reste dans la zone cachée du haut.
  isTopOut() {
    for (let y = 0; y < HIDDEN_ROWS; y++) {
      if (this.grid[y].some((c) => c !== null)) return true;
    }
    return false;
  }
}

export { TOTAL_ROWS };
