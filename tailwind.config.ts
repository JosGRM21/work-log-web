import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/client/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-bg-canvas)',
        surface: 'var(--color-bg-surface)',
        'border-subtle': 'var(--color-border-subtle)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        state: {
          pending: '#F3F4F6',
          'pending-text': '#374151',
          progress: '#EFF6FF',
          'progress-text': '#1D4ED8',
          completed: '#ECFDF5',
          'completed-text': '#047857',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Inter"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      maxWidth: {
        '6xl': '1152px',
        '4xl': '896px',
        lg: '512px',
      },
    },
  },
  plugins: [],
};

export default config;
