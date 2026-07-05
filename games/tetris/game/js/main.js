// ============================================================
//  MAIN — point d'entrée : câble tout ensemble
// ============================================================
import { Game } from './game.js';
import { setupInput } from './input.js';
import { startBackground } from './bg.js';
import { buildLogo } from './logo.js';

window.addEventListener('DOMContentLoaded', () => {
  // Fond animé de tétrominos
  startBackground(document.getElementById('bg'));

  // Logo "TETRIS" en blocs dans la barre du haut
  const topLogo = document.getElementById('topbar-logo');
  if (topLogo) topLogo.appendChild(buildLogo('TETRIS', 5));
  const ui = {
    score: document.getElementById('score'),
    level: document.getElementById('level'),
    lines: document.getElementById('lines'),
    best: document.getElementById('best'),
    overlay: document.getElementById('overlay'),
  };

  const game = new Game(
    document.getElementById('board'),
    document.getElementById('next'),
    document.getElementById('hold'),
    ui
  );

  const doResize = () => {
    game.resize();
    game.render();
    game.drawNext && game.bag && game.drawNext();
    game.drawHold && game.drawHold();
  };
  window.addEventListener('resize', doResize);
  game.resize();

  setupInput(game);

  // Boutons tactiles dédiés
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
  };
  bind('pause-btn', () => game.togglePause());
  bind('mute-btn', (e) => {
    const muted = game.audio.toggleMute();
    e.currentTarget.textContent = muted ? '🔇' : '🔊';
  });

  game.goMenu();
  game.start();
});
