// ============================================================
//  GAME — boucle de jeu, états, logique et rendu Canvas
// ============================================================
import {
  COLS, ROWS, HIDDEN_ROWS, START_DROP, DROP_DECREASE, MIN_DROP,
  LINES_PER_LEVEL, MAX_LEVEL, LINE_SCORES,
  SOFT_DROP_POINTS, HARD_DROP_POINTS, LOCK_DELAY, MAX_LOCK_RESETS, COLORS,
} from './config.js';
import { Board, TOTAL_ROWS } from './board.js';
import { Piece } from './piece.js';
import { Bag } from './bag.js';
import { AudioManager } from './audio.js';
import { saveScore, loadScores, bestScore, isHighScore, loadMode, saveMode } from './scores.js';
import { Effects } from './effects.js';
import { buildLogo } from './logo.js';

// Libellés des modes de jeu
const MODE_LABEL = { modern: 'Moderne', classic: 'Classique' };
const CLEAR_LABEL = { 1: 'SIMPLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'TETRIS !' };
const CLEAR_COLOR = { 1: '#22d3ee', 2: '#4ade80', 3: '#c084fc', 4: '#facc15' };

// États de jeu
const STATE = { MENU: 'menu', PLAY: 'play', PAUSE: 'pause', OVER: 'gameover' };

export class Game {
  constructor(canvas, nextCanvas, holdCanvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d');
    this.holdCanvas = holdCanvas;
    this.holdCtx = holdCanvas.getContext('2d');
    this.ui = ui; // { score, level, lines, best, overlay, ... } éléments DOM

    this.audio = new AudioManager();
    this.effects = new Effects();
    this.cell = 30; // taille d'une case (recalculée au resize)

    // Mode de jeu : 'modern' (ombre + réserve + rotation assistée)
    // ou 'classic' (old-school, plus difficile). Mémorisé entre sessions.
    this.mode = loadMode();

    // Plateau créé dès le départ pour que le menu puisse afficher
    // une grille vide sans planter la boucle de rendu.
    this.board = new Board();

    this.state = STATE.MENU;
    this.lastTime = 0;
    this.lineFlash = [];   // lignes en cours d'animation de disparition
    this.flashTimer = 0;

    this._bindLoop();
    this.updateBestUI();
  }

  get isClassic() { return this.mode === 'classic'; }

  setMode(mode) {
    this.mode = mode;
    saveMode(mode);
    this.updateBestUI();
    document.body.classList.toggle('classic-mode', this.isClassic);
    this._refreshTopLogo();
    // Le panneau Réserve apparaît/disparaît selon le mode : on recalcule
    // la taille du plateau pour qu'il reste parfaitement centré (pas de décalage).
    if (this.board) { this.resize(); this.render(); }
  }

  // (Re)construit le petit logo de la barre du haut. Identique quel que soit le mode.
  _refreshTopLogo() {
    const el = document.getElementById('topbar-logo');
    if (!el || el.childElementCount > 0) return; // déjà présent : on n'y touche plus
    el.appendChild(buildLogo('TETRIS', 5));
  }

  // ---------- Cycle de vie ----------

  startGame(mode = null) {
    if (mode) this.setMode(mode);
    document.body.classList.toggle('classic-mode', this.isClassic);
    document.body.classList.add('in-game'); // affiche le logo du haut en partie
    this.board = new Board();
    this.bag = new Bag();
    this.effects.reset();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.dropInterval = START_DROP;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.onGround = false;
    this.holdType = null;
    this.holdUsed = false;
    this.lineFlash = [];

    this.state = STATE.PLAY;
    this.spawnPiece();
    this.drawNext();
    this.drawHold();
    this.audio.playMusic('game');
    this.hideOverlay();
    this.updateUI();
  }

  goMenu() {
    this.state = STATE.MENU;
    document.body.classList.remove('in-game'); // masque le logo du haut sur l'accueil
    this.audio.playMusic('menu');
    this._refreshTopLogo();
    this.showOverlay('menu');
  }

  gameOver() {
    this.state = STATE.OVER;
    this.audio.playMusic('gameover');
    const high = isHighScore(this.mode, this.score);
    if (this.score > 0) {
      saveScore(this.mode, { score: this.score, level: this.level, lines: this.lines, date: Date.now() });
    }
    this.updateBestUI();
    this.showOverlay('gameover', high);
  }

  togglePause() {
    if (this.state === STATE.PLAY) {
      this.state = STATE.PAUSE;
      if (this.audio.current) this.audio.current.pause();
      this.showOverlay('pause');
    } else if (this.state === STATE.PAUSE) {
      this.state = STATE.PLAY;
      if (!this.audio.muted && this.audio.current) this.audio.current.play().catch(() => {});
      this.hideOverlay();
    }
  }

  // ---------- Pièces ----------

  spawnPiece(type = null) {
    this.current = new Piece(type || this.bag.next());
    this.holdUsed = false;
    this.onGround = false;
    this.lockTimer = 0;
    this.lockResets = 0;
    // Si ça ne rentre pas dès l'apparition -> game over
    if (!this.board.fits(this.current.cells())) {
      this.board.lock(this.current.cells(), this.current.color());
      this.gameOver();
    }
  }

  hold() {
    if (this.isClassic) return;   // pas de réserve en mode classique
    if (this.holdUsed) return;
    this.holdUsed = true;
    const currentType = this.current.type;
    if (this.holdType === null) {
      this.holdType = currentType;
      this.spawnPiece();
      this.holdUsed = true; // spawnPiece a remis à false
    } else {
      const swap = this.holdType;
      this.holdType = currentType;
      this.spawnPiece(swap);
      this.holdUsed = true;
    }
    this.drawHold();
  }

  // ---------- Actions joueur ----------

  move(dx) {
    if (this.state !== STATE.PLAY) return;
    const p = this.current;
    if (this.board.fits(p.cells(p.rotation, p.x + dx, p.y))) {
      p.x += dx;
      this.audio.playMove();
      this.onLandCheck();
      this.resetLockIfMoved();
    } else {
      this.audio.playBlocked();   // buté contre un mur / une pièce
    }
  }

  rotate(dir) {
    if (this.state !== STATE.PLAY) return;
    const p = this.current;
    const from = p.rotation;
    const to = (from + (dir > 0 ? 1 : 3)) % 4;
    // Mode classique : rotation "sèche" sans wall-kick (plus difficile).
    // Mode moderne : on essaie les décalages SRS pour faire glisser la pièce.
    const kicks = this.isClassic ? [[0, 0]] : p.kicks(from, to);
    for (const [kx, ky] of kicks) {
      // en SRS l'axe y est vers le bas : on inverse le ky de la table
      const nx = p.x + kx;
      const ny = p.y - ky;
      if (this.board.fits(p.cells(to, nx, ny))) {
        p.rotation = to;
        p.x = nx;
        p.y = ny;
        this.audio.playRotate();
        this.onLandCheck();
        this.resetLockIfMoved();
        return;
      }
    }
    this.audio.playBlocked();   // rotation impossible (bloquée)
  }

  softDrop() {
    if (this.state !== STATE.PLAY) return;
    const p = this.current;
    if (this.board.fits(p.cells(p.rotation, p.x, p.y + 1))) {
      p.y += 1;
      this.score += SOFT_DROP_POINTS;
      this.dropTimer = 0;
      this.updateUI();
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    if (this.state !== STATE.PLAY) return;
    const p = this.current;
    let dist = 0;
    while (this.board.fits(p.cells(p.rotation, p.x, p.y + 1))) {
      p.y += 1;
      dist += 1;
    }
    this.score += dist * HARD_DROP_POINTS;
    this.lockPiece();
  }

  resetLockIfMoved() {
    if (this.onGround && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets += 1;
    }
  }

  onLandCheck() {
    const p = this.current;
    this.onGround = !this.board.fits(p.cells(p.rotation, p.x, p.y + 1));
  }

  // ---------- Verrouillage & lignes ----------

  lockPiece() {
    const p = this.current;
    this.board.lock(p.cells(), p.color());
    this.audio.playLock();   // petit "toc" quand la pièce se pose

    const full = this._fullRows();
    if (full.length > 0) {
      this.lineFlash = full;
      this.flashTimer = 0.22;
      this.audio.playSfx('line');
      this._lineEffects(full);
      // le nettoyage réel se fait à la fin du flash (update)
    } else {
      this._afterLock(0);
    }
  }

  // Explosion de "jus", satisfaisante dès une seule ligne et qui escalade.
  _lineEffects(rows) {
    const n = rows.length;
    const cell = this.cell;
    const W = this.canvas.width;
    const color = CLEAR_COLOR[n] || '#fff';
    const points = (LINE_SCORES[n] || 0) * this.level;

    for (const gy of rows) {
      const py = (gy - HIDDEN_ROWS) * cell + cell / 2;
      this.effects.beam(py, W, cell, color);                 // rayon lumineux
      for (let x = 0; x < COLS; x++) {
        const c = COLORS[this.board.grid[gy][x]] || '#fff';
        this.effects.burst(x * cell + cell / 2, py, c, 8, 220 + n * 60);
      }
    }

    // "+points" qui jaillit du milieu des lignes effacées (toujours)
    const midGy = (rows[0] + rows[rows.length - 1]) / 2;
    const midY = (midGy - HIDDEN_ROWS) * cell + cell / 2;
    this.effects.pointsPopup(`+${points.toLocaleString('fr-FR')}`, color, midY);

    // Le mot n'apparaît qu'à partir de 2 lignes (le "SIMPLE" faisait plat)
    if (n >= 2) this.effects.popup(CLEAR_LABEL[n], color, n >= 4 ? 62 : 48);

    this.effects.addShake(4 + n * 3);
    this.effects.addFlash(0.15 + n * 0.12);
  }

  _fullRows() {
    const rows = [];
    for (let y = 0; y < TOTAL_ROWS; y++) {
      if (this.board.grid[y].every((c) => c !== null)) rows.push(y);
    }
    return rows;
  }

  _afterLock(clearedCount) {
    if (clearedCount > 0) {
      this.lines += clearedCount;
      this.score += (LINE_SCORES[clearedCount] || 0) * this.level;
      this.manageLevel();
    }
    if (this.board.isTopOut()) {
      this.gameOver();
      return;
    }
    this.spawnPiece();
    this.drawNext();
    this.updateUI();
  }

  manageLevel() {
    const newLevel = Math.min(Math.floor(this.lines / LINES_PER_LEVEL) + 1, MAX_LEVEL);
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.dropInterval = Math.max(START_DROP - (this.level - 1) * DROP_DECREASE, MIN_DROP);
      this.audio.playSfx('levelup');
      // Célébration de la montée de niveau
      this.effects.popup(`NIVEAU ${this.level}`, '#facc15', 50);
      this.effects.addFlash(0.35);
      this.effects.addShake(6);
    }
  }

  // ---------- Boucle ----------

  _bindLoop() {
    this.loop = (t) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;
      try {
        this.update(dt);
        this.render();
      } catch (err) {
        console.error('Erreur dans la boucle de jeu :', err);
      }
      requestAnimationFrame(this.loop); // toujours reprogrammer
    };
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    if (this.state !== STATE.PLAY) return;

    this.effects.update(dt);   // particules / textes / shake / flash

    // Animation de disparition des lignes
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        const n = this.board.clearLines();
        this.lineFlash = [];
        this._afterLock(n);
      }
      return; // on gèle la chute pendant le flash
    }

    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      const p = this.current;
      if (this.board.fits(p.cells(p.rotation, p.x, p.y + 1))) {
        p.y += 1;
        this.onGround = false;
      } else {
        this.onGround = true;
      }
    }

    // Gestion du délai de verrouillage
    if (this.onGround) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) {
        this.lockPiece();
      }
    } else {
      this.lockTimer = 0;
    }
  }

  // ---------- Rendu ----------

  ghostY() {
    const p = this.current;
    let gy = p.y;
    while (this.board.fits(p.cells(p.rotation, p.x, gy + 1))) gy += 1;
    return gy;
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Tremblement d'écran : on décale tout le contenu du plateau.
    const [sx, sy] = this.effects.shakeOffset();
    ctx.save();
    ctx.translate(sx, sy);

    // Fond de grille
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        this._cell(ctx, x, y, COLORS.grid, false);
      }
    }

    // Cases figées
    for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.board.grid[y][x];
        if (c) {
          const isFlashing = this.lineFlash.includes(y);
          this._cell(ctx, x, y - HIDDEN_ROWS, COLORS[c], true, isFlashing);
        }
      }
    }

    if (this.state === STATE.PLAY || this.state === STATE.PAUSE) {
      const p = this.current;
      // Pièce fantôme (mode moderne uniquement)
      if (!this.isClassic) {
        const gy = this.ghostY();
        for (const [x, y] of p.cells(p.rotation, p.x, gy)) {
          if (y - HIDDEN_ROWS >= 0) this._cell(ctx, x, y - HIDDEN_ROWS, COLORS.ghost, true);
        }
      }
      // Pièce active
      for (const [x, y] of p.cells()) {
        if (y - HIDDEN_ROWS >= 0) this._cell(ctx, x, y - HIDDEN_ROWS, COLORS[p.color()], true);
      }
    }

    this.effects.drawBeams(ctx);
    this.effects.drawParticles(ctx);
    ctx.restore();

    // Textes flottants et flash : au-dessus, sans tremblement
    this.effects.drawTexts(ctx, W, H);
    this.effects.drawFlash(ctx, W, H);
  }

  // Dessine une case (avec léger glow/arrondi pour le look moderne)
  _cell(ctx, x, y, color, filled, flash = false) {
    const c = this.cell;
    const px = x * c;
    const py = y * c;
    if (!filled) {
      ctx.fillStyle = color;
      ctx.fillRect(px, py, c, c);
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, c - 1, c - 1);
      return;
    }
    ctx.fillStyle = flash ? '#ffffff' : color;
    this._roundRect(ctx, px + 1, py + 1, c - 2, c - 2, 4);
    ctx.fill();
    // reflet haut
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    this._roundRect(ctx, px + 1, py + 1, c - 2, (c - 2) * 0.4, 4);
    ctx.fill();
  }

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawNext() {
    const types = this.bag.peek(1);
    this._drawMini(this.nextCtx, this.nextCanvas, types[0]);
  }

  drawHold() {
    this._drawMini(this.holdCtx, this.holdCanvas, this.holdType);
  }

  _drawMini(ctx, canvas, type) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;
    const cells = new Piece(type).def.rotations[0];
    const size = new Piece(type).def.size;
    const c = Math.floor(canvas.width / (size + 1));
    const xs = cells.map((p) => p[0]);
    const ys = cells.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const offX = (canvas.width - (maxX - minX + 1) * c) / 2;
    const offY = (canvas.height - (maxY - minY + 1) * c) / 2;
    for (const [x, y] of cells) {
      const px = offX + (x - minX) * c;
      const py = offY + (y - minY) * c;
      ctx.fillStyle = COLORS[type];
      this._roundRect(ctx, px + 1, py + 1, c - 2, c - 2, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      this._roundRect(ctx, px + 1, py + 1, c - 2, (c - 2) * 0.4, 4);
      ctx.fill();
    }
  }

  // ---------- UI ----------

  updateUI() {
    this.ui.score.textContent = this.score.toLocaleString('fr-FR');
    this.ui.level.textContent = this.level;
    this.ui.lines.textContent = this.lines;
  }

  updateBestUI() {
    this.ui.best.textContent = bestScore(this.mode).toLocaleString('fr-FR');
  }

  showOverlay(kind, high = false) {
    const o = this.ui.overlay;
    o.classList.remove('hidden');
    o.dataset.kind = kind;
    if (kind === 'menu') {
      o.innerHTML = this._menuHTML();
      // Le logo en blocs est un élément DOM : on l'insère après coup.
      // Son style dépend du mode (moderne coloré / classique vieilli).
      const slot = o.querySelector('#logo-slot');
      if (slot) slot.appendChild(buildLogo('TETRIS', this._logoCell()));
    } else if (kind === 'pause') {
      o.innerHTML = `<h1>PAUSE</h1>
        <p class="hint">Mode ${MODE_LABEL[this.mode]}</p>
        <button id="btn-resume" class="btn">Reprendre</button>
        <button id="btn-quit" class="btn btn-ghost">Quitter</button>`;
    } else if (kind === 'gameover') {
      o.innerHTML = `<h1>GAME OVER</h1>
        <p class="mode-tag">Mode ${MODE_LABEL[this.mode]}</p>
        ${high ? '<p class="new-high">★ Nouveau record !</p>' : ''}
        <p class="final">Score : <b>${this.score.toLocaleString('fr-FR')}</b></p>
        ${this._scoresHTML()}
        <button id="btn-retry" class="btn">Rejouer</button>
        <button id="btn-menu" class="btn btn-ghost">Menu</button>`;
    }
    this._wireOverlay();
  }

  hideOverlay() {
    this.ui.overlay.classList.add('hidden');
  }

  _logoCell() {
    // Taille des blocs du logo, adaptée à la largeur de l'overlay.
    const w = this.ui.overlay.clientWidth || 320;
    return Math.max(8, Math.min(16, Math.floor(w / 26)));
  }

  _menuHTML() {
    const desc = this.isClassic
      ? 'Old-school : sans ombre ni réserve, rotation sèche. Plus dur.'
      : 'Confort moderne : pièce fantôme, réserve et rotation assistée (SRS).';
    const holdHint = this.isClassic ? '' : ' · C : réserve';
    return `<div id="logo-slot" class="logo-slot"></div>
      <div class="mode-select">
        <button class="mode-btn ${this.mode === 'modern' ? 'active' : ''}" data-mode="modern">Moderne</button>
        <button class="mode-btn ${this.mode === 'classic' ? 'active' : ''}" data-mode="classic">Classique</button>
      </div>
      <p class="mode-desc">${desc}</p>
      ${this._scoresHTML()}
      <button id="btn-play" class="btn">Jouer</button>
      <p class="controls">← → déplacer · ↑ tourner · ↓ descendre<br>
      Espace : chute${holdHint} · P : pause</p>
      <p class="credit">Développé par Dario</p>`;
  }

  _scoresHTML() {
    const scores = loadScores(this.mode);
    if (!scores.length) return `<div class="highscores"><h3>Meilleurs scores — ${MODE_LABEL[this.mode]}</h3><p class="no-score">Aucun score pour l'instant</p></div>`;
    const rows = scores
      .map((s, i) => `<li><span>#${i + 1}</span><b>${s.score.toLocaleString('fr-FR')}</b><em>niv.${s.level}</em></li>`)
      .join('');
    return `<div class="highscores"><h3>Meilleurs scores — ${MODE_LABEL[this.mode]}</h3><ol>${rows}</ol></div>`;
  }

  _wireOverlay() {
    const o = this.ui.overlay;
    const play = o.querySelector('#btn-play');
    const retry = o.querySelector('#btn-retry');
    const menu = o.querySelector('#btn-menu');
    const resume = o.querySelector('#btn-resume');
    const quit = o.querySelector('#btn-quit');
    if (play) play.onclick = () => this.startGame();
    if (retry) retry.onclick = () => this.startGame();
    if (menu) menu.onclick = () => this.goMenu();
    if (resume) resume.onclick = () => this.togglePause();
    if (quit) quit.onclick = () => { this.state = STATE.MENU; this.goMenu(); };
    // Boutons de choix du mode (menu) : change le mode et rafraîchit
    o.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.onclick = () => {
        this.setMode(btn.dataset.mode);
        this.showOverlay('menu');
      };
    });
  }

  // ---------- Redimensionnement ----------

  resize() {
    const wrap = this.canvas.parentElement;
    // On réduit d'abord le canvas à 0 pour que sa colonne (flex) se
    // rétracte et révèle l'espace réellement disponible. Sinon la
    // largeur fixe du canvas empêche tout rétrécissement (débordement).
    this.canvas.width = 0;
    this.canvas.height = 0;
    const maxW = wrap.clientWidth;
    const maxH = wrap.clientHeight;
    const cellW = Math.floor(maxW / COLS);
    const cellH = Math.floor(maxH / ROWS);
    this.cell = Math.max(10, Math.min(cellW, cellH));
    this.canvas.width = this.cell * COLS;
    this.canvas.height = this.cell * ROWS;
  }
}

export { STATE };
