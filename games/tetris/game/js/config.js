// ============================================================
//  CONFIG — constantes globales du jeu
// ============================================================

export const COLS = 10;          // largeur grille (cases)
export const ROWS = 20;          // hauteur grille visible (cases)
export const HIDDEN_ROWS = 2;    // lignes cachées au-dessus pour le spawn

// Réglages de difficulté — repris de la référence Lua (Gamecodeur)
// dropSpeed = intervalle (en secondes) entre 2 descentes automatiques.
// Il diminue à chaque niveau -> le jeu accélère.
export const START_DROP = 1.0;   // niveau 1
export const DROP_DECREASE = 0.08;
export const MIN_DROP = 0.05;    // plancher de vitesse
export const LINES_PER_LEVEL = 10;
export const MAX_LEVEL = 20;

// Scoring identique à la référence (multiplié par le niveau)
export const LINE_SCORES = { 1: 100, 2: 300, 3: 400, 4: 800 };
export const SOFT_DROP_POINTS = 1;   // par case en descente douce
export const HARD_DROP_POINTS = 2;   // par case en chute instantanée

// Délai de verrouillage : petit répit quand la pièce touche le sol
// (permet de la faire glisser une dernière fois avant qu'elle se pose)
export const LOCK_DELAY = 0.5;       // secondes
export const MAX_LOCK_RESETS = 15;

// Palette moderne épurée (une couleur par pièce)
export const COLORS = {
  I: '#22d3ee', // cyan
  O: '#facc15', // jaune
  T: '#c084fc', // violet
  S: '#4ade80', // vert
  Z: '#f87171', // rouge
  J: '#60a5fa', // bleu
  L: '#fb923c', // orange
  ghost: 'rgba(255,255,255,0.18)',
  grid: 'rgba(255,255,255,0.05)',
  gridLine: 'rgba(255,255,255,0.06)',
};
