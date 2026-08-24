/* theme.js
 * Theme init + parallax (mousemove + scroll) with reduced-motion support
 */

/* Tailwind theme (brand colours, Inter, soft shadow) now lives in tailwind.config.js
   and is compiled into /dist/tailwind.css by `npm run build:css`. */

/* -----------------------------
   Theme: dark mode bootstrap
-------------------------------- */
(() => {
  try {
    const stored = localStorage.getItem('theme');
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (systemDark ? 'dark' : 'light');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch {
    // no-op if storage blocked
  }
})();

/* -----------------------------
   DOM-ready helper
-------------------------------- */
function onReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

/* -----------------------------
   Reduced motion detection
-------------------------------- */
const prefersReducedMotion = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false, addEventListener: () => {} };

/* Utility to pause CSS gradient animations when reduced motion.
   The animation lives on .animated-gradient::before, which inline styles
   cannot reach, so toggle a class the stylesheet keys off instead. */
function updateAnimatedGradients() {
  const paused = prefersReducedMotion.matches;
  document.querySelectorAll('.animated-gradient').forEach(el => {
    el.classList.toggle('motion-paused', paused);
  });
}
prefersReducedMotion.addEventListener?.('change', updateAnimatedGradients);
onReady(updateAnimatedGradients);

/* -----------------------------
   Parallax: mousemove (desktop)
   - Uses requestAnimationFrame to throttle
   - GPU-friendly translate3d
   - Controlled by [data-parallax] (number)
   - Layers are collected once; promotion comes from .parallax-will-change
     in the stylesheet rather than a style write on every frame
-------------------------------- */
(() => {
  if (prefersReducedMotion.matches) return;

  // only run on devices that have a mouse/touchpad pointer
  if (!(window.matchMedia && window.matchMedia('(pointer: fine)').matches)) return;

  let layers = [];
  let rafId = null;
  let lastCx = 0, lastCy = 0;

  function onMouseMove(e) {
    lastCx = e.clientX / window.innerWidth - 0.5;   // -0.5..0.5
    lastCy = e.clientY / window.innerHeight - 0.5;  // -0.5..0.5
    if (rafId === null) rafId = requestAnimationFrame(applyMouseParallax);
  }

  function applyMouseParallax() {
    rafId = null;
    for (const { el, speed } of layers) {
      // tune multiplier for subtle motion
      el.style.transform = `translate3d(${-lastCx * speed * 10}px, ${-lastCy * speed * 10}px, 0)`;
    }
  }

  onReady(() => {
    layers = Array.from(document.querySelectorAll('[data-parallax]'), el => ({
      el,
      speed: parseFloat(el.getAttribute('data-parallax')) || 1
    }));
    if (layers.length) window.addEventListener('mousemove', onMouseMove, { passive: true });
  });
})();

/* -----------------------------
   Parallax: scroll (mobile/touch fallback)
   - Elements with [data-parallax-scroll]
   - speed attribute: number (e.g., 2, 4, 8)
   - Effect: translateY based on scroll position
-------------------------------- */
(() => {
  if (prefersReducedMotion.matches) return;

  let layers = [];
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyScrollParallax);
  }

  function applyScrollParallax() {
    ticking = false;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    for (const { el, speed } of layers) {
      // smaller multiplier keeps it subtle; tweak to taste
      el.style.transform = `translate3d(0, ${scrollY * speed * 0.05}px, 0)`;
    }
  }

  onReady(() => {
    layers = Array.from(document.querySelectorAll('[data-parallax-scroll]'), el => ({
      el,
      speed: parseFloat(el.getAttribute('data-parallax-scroll')) || 1
    }));
    if (!layers.length) return; // skip if not used
    for (const { el } of layers) el.style.willChange = 'transform';
    window.addEventListener('scroll', onScroll, { passive: true });
    applyScrollParallax(); // initial position
  });
})();
