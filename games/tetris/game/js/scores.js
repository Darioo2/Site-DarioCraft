// ============================================================
//  SCORES — meilleurs scores locaux, séparés par mode de jeu
// ============================================================
//  Le mode "classique" (sans ombre/réserve/wall-kicks) est plus
//  difficile : ses scores sont stockés à part.
// ============================================================

const KEY_BASE = 'dariocraft_tetris_highscores';
const MODE_KEY = 'dariocraft_tetris_mode';
const MAX_ENTRIES = 5;

function storageKey(mode) {
  return `${KEY_BASE}_${mode}`;
}

export function loadScores(mode) {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveScore(mode, entry) {
  const scores = loadScores(mode);
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(trimmed));
  } catch {
    /* stockage indisponible : on ignore silencieusement */
  }
  return trimmed;
}

export function bestScore(mode) {
  const scores = loadScores(mode);
  return scores.length ? scores[0].score : 0;
}

export function isHighScore(mode, score) {
  const scores = loadScores(mode);
  if (score <= 0) return false;
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}

// Mémorise le dernier mode choisi
export function loadMode() {
  const m = localStorage.getItem(MODE_KEY);
  return m === 'classic' ? 'classic' : 'modern';
}

export function saveMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
}
