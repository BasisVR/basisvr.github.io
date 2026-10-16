/* theme.js
 * Theme init + mesh gradient backdrop with reduced-motion support
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

/* -----------------------------
   Backdrop: Paper Shaders mesh gradient (/vendor/paper-shaders)
-------------------------------- */
onReady(() => {
  const host = document.getElementById('site-bg');
  if (!host || !window.WebGL2RenderingContext) return;

  const style = getComputedStyle(host);
  const colors = [];
  for (let i = 0, c; (c = style.getPropertyValue(`--site-bg-${i}`).trim()); i++) colors.push(c);
  if (!colors.length) return;
  const speed = 0.5;
  const frameInterval = 1000 / 30;

  Promise.all([
    import('/vendor/paper-shaders/shader-mount.js'),
    import('/vendor/paper-shaders/shaders/mesh-gradient.js'),
    import('/vendor/paper-shaders/shader-sizing.js'),
    import('/vendor/paper-shaders/get-shader-color-from-string.js')
  ]).then(([{ ShaderMount }, { meshGradientFragmentShader }, { ShaderFitOptions }, { getShaderColorFromString }]) => {
    const mount = new ShaderMount(
      host,
      meshGradientFragmentShader,
      {
        u_colors: colors.map(getShaderColorFromString),
        u_colorsCount: colors.length,
        u_distortion: 0.8,
        u_swirl: 0.1,
        u_grainMixer: 0,
        u_grainOverlay: 0,
        u_fit: ShaderFitOptions.cover,
        u_scale: 1,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0
      },
      { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' },
      0,
      0,
      1,
      640 * 360
    );
    mount.canvasElement.addEventListener('webglcontextlost', () => host.classList.remove('is-ready'));

    const start = performance.now();
    let rafId = 0;
    let lastFrame = -Infinity;
    const tick = now => {
      rafId = requestAnimationFrame(tick);
      if (now - lastFrame < frameInterval - 1) return;
      lastFrame = now;
      mount.setFrame((now - start) * speed);
    };
    const animate = () => {
      cancelAnimationFrame(rafId);
      if (!prefersReducedMotion.matches) rafId = requestAnimationFrame(tick);
    };
    prefersReducedMotion.addEventListener?.('change', animate);
    animate();
    requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add('is-ready')));
  }).catch(() => host.querySelector('canvas')?.remove());
});
