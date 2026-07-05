// ============================================================
//  BAG — générateur "7-bag" (chaque pièce sort une fois par lot)
// ============================================================
import { PIECE_TYPES } from './pieces.js';

export class Bag {
  constructor() {
    this.queue = [];
    this.refill();
    this.refill(); // on garde toujours de l'avance pour l'aperçu
  }

  refill() {
    const lot = [...PIECE_TYPES];
    // Mélange de Fisher-Yates
    for (let i = lot.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lot[i], lot[j]] = [lot[j], lot[i]];
    }
    this.queue.push(...lot);
  }

  next() {
    if (this.queue.length <= PIECE_TYPES.length) this.refill();
    return this.queue.shift();
  }

  peek(n = 1) {
    if (this.queue.length < n) this.refill();
    return this.queue.slice(0, n);
  }
}
