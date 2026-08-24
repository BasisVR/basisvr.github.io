/** Mirrors the config previously set on window.tailwind in theme.js. */
module.exports = {
  content: ['./**/*.html', './*.js', '!./node_modules/**'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      colors: {
        brand: {
          DEFAULT: '#ef1237',
          100: '#ffd6de',
          300: '#ff5775',
          500: '#ef1237',
          700: '#950a24'
        },
        basisbg: '#100f27'
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.08)'
      }
    }
  },
  // flowbite toggles these at runtime, so they never appear in the scanned markup
  safelist: ['hidden', 'block', 'invisible', 'visible', 'opacity-0', 'opacity-100']
};
