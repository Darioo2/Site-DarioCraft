/* ============================================
   GUIDE NAV — highlight active section
   ============================================ */
const guideLinks = document.querySelectorAll('.ub-guide-nav-link');
const guideBlocks = document.querySelectorAll('.ub-guide-block[id]');

const guideObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      guideLinks.forEach(link => {
        const active = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('active', active);
      });
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

guideBlocks.forEach(b => guideObserver.observe(b));

/* ============================================
   SCREENSHOTS — placeholder on error
   ============================================ */
document.querySelectorAll('.ub-screenshot').forEach(img => {
  img.addEventListener('error', () => {
    img.closest('.ub-screenshot-wrap').classList.add('ub-screenshot-placeholder');
  });
});

/* ============================================
   LIGHTBOX
   ============================================ */
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxClose   = document.getElementById('lightboxClose');
const backdrop        = lightbox.querySelector('.lightbox-backdrop');

function openLightbox(src, alt, caption) {
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightboxCaption.textContent = caption || '';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 320);
}

document.querySelectorAll('.ub-screenshot-wrap').forEach(wrap => {
  const img     = wrap.querySelector('.ub-screenshot');
  const caption = wrap.querySelector('.ub-screenshot-caption');
  if (!img) return;

  const zoomIcon = document.createElement('div');
  zoomIcon.className = 'ub-screenshot-zoom';
  zoomIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>`;
  wrap.appendChild(zoomIcon);

  wrap.addEventListener('click', () => {
    if (wrap.classList.contains('ub-screenshot-placeholder')) return;
    openLightbox(img.src, img.alt, caption ? caption.textContent : '');
  });
});

/* Images inline dans le guide */
document.querySelectorAll('.ssh-guide-img').forEach(img => {
  img.addEventListener('click', () => {
    const caption = img.nextElementSibling?.classList.contains('ssh-guide-img-caption')
      ? img.nextElementSibling.textContent
      : img.alt;
    openLightbox(img.src, img.alt, caption);
  });
});

backdrop.addEventListener('click', closeLightbox);
lightboxClose.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
});
