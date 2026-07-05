// ============================================================
//  LOGO — "TETRIS" écrit avec des blocs colorés (style tétromino)
// ============================================================

// Chaque lettre : 5 lignes de 3 colonnes (1 = bloc plein).
const FONT = {
  T: ['111', '010', '010', '010', '010'],
  E: ['111', '100', '111', '100', '111'],
  R: ['110', '101', '110', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  S: ['111', '100', '111', '001', '111'],
};

// Une couleur de tétromino vive par lettre (identique dans tous les modes)
const LETTER_COLORS = ['#22d3ee', '#facc15', '#c084fc', '#4ade80', '#f87171', '#60a5fa'];

// Construit un élément DOM représentant le mot en blocs colorés.
//  cell = taille d'un bloc en pixels.
//  Affichage fixe (aucune animation d'apparition).
export function buildLogo(word, cell) {
  const wrap = document.createElement('div');
  wrap.className = 'logo-blocks';
  wrap.style.gap = `${cell}px`;

  [...word].forEach((ch, i) => {
    const rows = FONT[ch];
    if (!rows) return;
    const letter = document.createElement('div');
    letter.className = 'logo-letter';
    letter.style.gridTemplateColumns = `repeat(${rows[0].length}, ${cell}px)`;
    letter.style.gridAutoRows = `${cell}px`;
    const color = LETTER_COLORS[i % 6];

    rows.forEach((r) => {
      [...r].forEach((c) => {
        const span = document.createElement('span');
        if (c === '1') {
          span.className = 'on';
          span.style.background = color;
          span.style.boxShadow = `0 0 ${cell * 0.5}px ${color}55`;
        }
        letter.appendChild(span);
      });
    });
    wrap.appendChild(letter);
  });
  return wrap;
}
