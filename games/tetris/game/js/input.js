// ============================================================
//  INPUT — clavier (desktop) + tactile (mobile)
// ============================================================
import { STATE } from './game.js';

// Auto-répétition douce pour les déplacements maintenus (DAS/ARR simplifié)
const DAS = 150; // délai avant répétition (ms)
const ARR = 45;  // intervalle de répétition (ms)

export function setupInput(game) {
  setupKeyboard(game);
  setupTouch(game);
}

function setupKeyboard(game) {
  const held = {};
  const timers = {};

  const startRepeat = (key, action) => {
    action();
    clearTimeout(timers[key]);
    const repeat = () => {
      action();
      timers[key] = setTimeout(repeat, ARR);
    };
    timers[key] = setTimeout(repeat, DAS);
  };

  window.addEventListener('keydown', (e) => {
    // Empêche le défilement de la page avec les flèches / espace
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }

    // Démarrer / rejouer avec Entrée depuis menu ou game over
    if (e.key === 'Enter') {
      if (game.state === STATE.MENU || game.state === STATE.OVER) {
        game.startGame();
        return;
      }
    }
    if (e.key === 'p' || e.key === 'P') { game.togglePause(); return; }
    if (e.key === 'm' || e.key === 'M') { game.audio.toggleMute(); return; }

    if (game.state !== STATE.PLAY) return;
    if (held[e.key]) return; // évite le key-repeat natif
    held[e.key] = true;

    switch (e.key) {
      case 'ArrowLeft':  startRepeat('ArrowLeft', () => game.move(-1)); break;
      case 'ArrowRight': startRepeat('ArrowRight', () => game.move(1)); break;
      case 'ArrowDown':  startRepeat('ArrowDown', () => game.softDrop()); break;
      case 'ArrowUp':
      case 'x': case 'X': game.rotate(1); break;
      case 'z': case 'Z': case 'Control': game.rotate(-1); break;
      case ' ': game.hardDrop(); break;
      case 'c': case 'C': case 'Shift': game.hold(); break;
      default: break;
    }
  });

  window.addEventListener('keyup', (e) => {
    held[e.key] = false;
    clearTimeout(timers[e.key]);
  });
}

function setupTouch(game) {
  const canvas = game.canvas;
  let startX = 0, startY = 0, startT = 0;
  let lastMoveX = 0, moved = false;
  const CELL_SWIPE = 24;   // distance (px) pour un pas horizontal
  const TAP_MAX = 12;      // seuil pour considérer un "tap" (rotation)
  const SWIPE_TIME = 250;  // durée max pour un flick

  canvas.addEventListener('touchstart', (e) => {
    if (game.state !== STATE.PLAY) return;
    const t = e.changedTouches[0];
    startX = lastMoveX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
    moved = false;
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (game.state !== STATE.PLAY) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - lastMoveX;
    if (Math.abs(dx) >= CELL_SWIPE) {
      const steps = Math.trunc(dx / CELL_SWIPE);
      for (let i = 0; i < Math.abs(steps); i++) game.move(Math.sign(steps));
      lastMoveX += steps * CELL_SWIPE;
      moved = true;
    }
    // Descente douce si on glisse franchement vers le bas
    if (t.clientY - startY > CELL_SWIPE * 2) {
      game.softDrop();
      startY = t.clientY;
      moved = true;
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (game.state !== STATE.PLAY) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startT;
    // Flick vers le bas = hard drop
    if (dy > CELL_SWIPE * 3 && dt < SWIPE_TIME && Math.abs(dx) < Math.abs(dy)) {
      game.hardDrop();
    } else if (!moved && Math.abs(dx) < TAP_MAX && Math.abs(dy) < TAP_MAX) {
      // Tap simple = rotation horaire
      game.rotate(1);
    }
    e.preventDefault();
  }, { passive: false });
}
