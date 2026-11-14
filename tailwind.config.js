const { light } = require('./design/tokens');
const colors = Object.fromEntries(Object.keys(light).map(k => [k, `rgb(var(--c-${k}) / <alpha-value>)`]));
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem', full: '9999px' },
      spacing: { 'space-xs': '0.25rem', 'margin-desktop': '3rem', 'space-xl': '2.5rem', 'space-md': '1rem', 'margin-tablet': '2rem', gutter: '1rem', 'gutter-desktop': '1.5rem', 'space-sm': '0.5rem', 'space-lg': '1.5rem', margin: '1rem' },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'], 'headline-lg': ['var(--font-playfair)', 'serif'], 'headline-lg-mobile': ['var(--font-playfair)', 'serif'],
        'headline-md': ['var(--font-playfair)', 'serif'], 'headline-sm': ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-manrope)', 'sans-serif'], 'title-lg': ['var(--font-manrope)'], 'title-md': ['var(--font-manrope)'], 'body-lg': ['var(--font-manrope)'],
        'body-md': ['var(--font-manrope)'], 'body-sm': ['var(--font-manrope)'], 'label-lg': ['var(--font-manrope)'], 'label-md': ['var(--font-manrope)'],
        'label-sm': ['var(--font-manrope)'], 'currency-display': ['var(--font-manrope)']
      },
      fontSize: {
        display: ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['36px', { lineHeight: '44px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-lg-mobile': ['28px', { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '500' }],
        'title-lg': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'title-md': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '700' }],
        'currency-display': ['24px', { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '700' }]
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(13,37,56,0.04)',
        raised: '0 8px 30px -4px rgba(13,37,56,0.08)',
        sheet: '0 -12px 40px 0 rgba(13,37,56,0.12)'
      }
    }
  },
  plugins: []
};
