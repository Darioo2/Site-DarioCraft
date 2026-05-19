/* ============================================
   NAVBAR — scroll + burger
   ============================================ */
const navbar  = document.getElementById('navbar');
const burger  = document.getElementById('burger');
const navMobile = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

burger.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', isOpen);
});

// Close mobile menu when a link is clicked
navMobile.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    navMobile.classList.remove('open');
    burger.classList.remove('open');
  });
});

/* ============================================
   SCROLL ANIMATIONS (IntersectionObserver)
   ============================================ */
const animatedEls = document.querySelectorAll(
  '.section-header, .card, .about-text, .about-visual, .contact-box'
);

animatedEls.forEach(el => el.classList.add('fade-in'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger children inside a grid
      const delay = entry.target.closest('.cards-grid')
        ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 80
        : 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

animatedEls.forEach(el => observer.observe(el));

/* ============================================
   ACTIVE NAV LINK on scroll
   ============================================ */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === `#${entry.target.id}`
          ? 'var(--text)'
          : '';
      });
    }
  });
}, { rootMargin: '-50% 0px -50% 0px' });

sections.forEach(s => sectionObserver.observe(s));
