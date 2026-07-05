// ============================================================
//  EFFECTS — le "jus" du jeu : particules, textes flottants,
//  rayons de ligne, et tremblement d'écran.
// ============================================================

export class Effects {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.beams = [];     // rayons lumineux horizontaux sur les lignes effacées
    this.shake = 0;      // magnitude courante du tremblement (px)
    this.flash = 0;      // flash blanc plein écran (0..1)
  }

  reset() {
    this.particles.length = 0;
    this.texts.length = 0;
    this.beams.length = 0;
    this.shake = 0;
    this.flash = 0;
  }

  // Éclat de particules à partir d'un point (px canvas).
  burst(x, y, color, count = 12, power = 220) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = power * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 80,
        size: 2 + Math.random() * 4,
        color,
        life: 0.5 + Math.random() * 0.6,
        max: 1.1,
      });
    }
  }

  // Rayon lumineux horizontal qui traverse une ligne effacée.
  beam(y, width, thickness, color) {
    this.beams.push({ y, width, thickness, color, life: 0.4, max: 0.4 });
  }

  // Texte qui monte et s'estompe. Si y est fourni (px plateau), le texte
  // jaillit de cette position ; sinon il s'affiche au centre du plateau.
  popup(text, color = '#fff', size = 46, y = null) {
    this.texts.push({ text, color, size, y, life: 1.3, max: 1.3 });
  }

  // "+points" qui jaillit de la ligne effacée.
  pointsPopup(text, color, y) {
    this.texts.push({ text, color, size: 30, y, life: 1.1, max: 1.1, bold: true });
  }

  addShake(mag) { this.shake = Math.max(this.shake, mag); }
  addFlash(v) { this.flash = Math.max(this.flash, v); }

  update(dt) {
    for (const p of this.particles) {
      p.vy += 520 * dt;          // gravité
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) t.life -= dt;
    this.texts = this.texts.filter((t) => t.life > 0);

    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - 60 * dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 2.5 * dt);
  }

  shakeOffset() {
    if (this.shake <= 0) return [0, 0];
    return [
      (Math.random() * 2 - 1) * this.shake,
      (Math.random() * 2 - 1) * this.shake,
    ];
  }

  drawBeams(ctx) {
    if (!this.beams.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.beams) {
      const k = b.life / b.max;            // 1 -> 0
      const h = b.thickness * (1 + (1 - k) * 2.5);
      ctx.globalAlpha = k * 0.8;
      ctx.fillStyle = b.color;             // halo coloré
      ctx.fillRect(0, b.y - h / 2, b.width, h);
      ctx.globalAlpha = k;                 // cœur blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, b.y - h / 6, b.width, h / 3);
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // rendu lumineux
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx, w, h) {
    for (const t of this.texts) {
      const k = t.life / t.max;           // 1 -> 0
      const rise = (1 - k) * 46;
      const scale = 0.6 + k * 0.6;
      const cx = w / 2;
      const cy = (t.y != null ? t.y : h * 0.4) - rise;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.8);
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.font = `${t.size}px Blocked, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 24;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  drawFlash(ctx, w, h) {
    if (this.flash <= 0) return;
    ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`;
    ctx.fillRect(0, 0, w, h);
  }
}
