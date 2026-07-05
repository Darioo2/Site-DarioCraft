// ============================================================
//  BG — fond animé : tétrominos translucides qui dérivent
// ============================================================
import { PIECES, PIECE_TYPES } from './pieces.js';
import { COLORS } from './config.js';

export function startBackground(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const shapes = [];
  const COUNT = 20;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawn(initial) {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return {
      type,
      cells: PIECES[type].rotations[0],
      color: COLORS[type],
      cell: 16 + Math.random() * 28,          // taille d'un bloc
      x: Math.random() * W,
      y: initial ? Math.random() * H : -120,
      speed: 12 + Math.random() * 26,          // px/s vers le bas
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.4,       // rad/s
      alpha: 0.13 + Math.random() * 0.14,      // visible dans les marges
    };
  }

  function drawShape(s) {
    const c = s.cell;
    // centre géométrique de la pièce (dans une boîte 4x4)
    const cx = 2 * c, cy = 2 * c;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    for (const [bx, by] of s.cells) {
      const px = bx * c - cx;
      const py = by * c - cy;
      roundRect(ctx, px + 1, py + 1, c - 2, c - 2, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  function loop(t) {
    ctx.clearRect(0, 0, W, H);
    const dt = 1 / 60;
    for (const s of shapes) {
      s.y += s.speed * dt;
      s.angle += s.spin * dt;
      if (s.y - 120 > H) {
        Object.assign(s, spawn(false));
      }
      drawShape(s);
    }
    requestAnimationFrame(loop);
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < COUNT; i++) shapes.push(spawn(true));
  requestAnimationFrame(loop);
}
