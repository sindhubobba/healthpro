/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        bg3: 'var(--bg3)',
        bg4: 'var(--bg4)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        ink2: 'var(--ink2)',
        ink3: 'var(--ink3)',
        ink4: 'var(--ink4)',
        ink5: 'var(--ink5)',
        sage: {
          DEFAULT: 'var(--sage)',
          soft: 'var(--sage-soft)',
          mid: 'var(--sage-mid)',
          deep: 'var(--sage-deep)',
        },
        olive: {
          DEFAULT: 'var(--olive)',
          soft: 'var(--olive-soft)',
          mid: 'var(--olive-mid)',
        },
        copper: {
          DEFAULT: 'var(--copper)',
          soft: 'var(--copper-soft)',
          mid: 'var(--copper-mid)',
          deep: 'var(--copper-deep)',
        },
        teal: {
          DEFAULT: 'var(--teal)',
          soft: 'var(--teal-soft)',
          mid: 'var(--teal-mid)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        r: 'var(--r)',
        r2: 'var(--r2)',
        r3: 'var(--r3)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
