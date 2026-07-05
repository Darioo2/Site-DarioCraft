// ============================================================
//  PIECE — une pièce active (type, position, rotation)
// ============================================================
import { PIECES, KICKS_JLSTZ, KICKS_I } from './pieces.js';
import { COLS, HIDDEN_ROWS } from './config.js';

export class Piece {
  constructor(type) {
    this.type = type;
    this.def = PIECES[type];
    this.rotation = 0;
    // Spawn : centré horizontalement, et positionné pour apparaître
    // pleinement en haut de la zone visible (juste sous le buffer caché).
    this.x = Math.floor((COLS - this.def.size) / 2);
    const minY = Math.min(...this.def.rotations[0].map((c) => c[1]));
    this.y = HIDDEN_ROWS - minY;
  }

  // Cellules absolues [x, y] occupées, pour une rotation/offset donnés.
  cells(rotation = this.rotation, ox = this.x, oy = this.y) {
    return this.def.rotations[rotation].map(([cx, cy]) => [cx + ox, cy + oy]);
  }

  color() {
    return this.def.color;
  }

  // Renvoie la table de kicks selon le type de pièce.
  kicks(from, to) {
    const key = `${from}>${to}`;
    if (this.type === 'I') return KICKS_I[key] || [[0, 0]];
    if (this.type === 'O') return [[0, 0]]; // O ne tourne pas visuellement
    return KICKS_JLSTZ[key] || [[0, 0]];
  }

  clone() {
    const p = new Piece(this.type);
    p.rotation = this.rotation;
    p.x = this.x;
    p.y = this.y;
    return p;
  }
}
