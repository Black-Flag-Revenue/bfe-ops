import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0B0D0C',        // near-black background
        panel: '#1C201D',       // raised surface - brighter than before so cards actually separate from bg
        line: '#33382F',        // hairline borders - brighter for definition against the new panel color
        ink: '#EDEAE3',         // primary text, warm off-white
        muted: '#8A8F8B',       // secondary text
        brass: '#B8933F',       // signature accent - insignia gold, not terracotta
        brassLight: '#D4B366', // for glows/hovers - brighter gold
        emerald: '#1F3D2E',     // deep hunter green - old-money secondary accent
        flag: '#8C2F2F',        // status-red for alerts/overdue
        steel: '#4A4F4D',       // secondary UI elements
      },
      fontFamily: {
        display: ['var(--font-barlow-condensed)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      letterSpacing: {
        wide2: '0.08em',
      },
    },
  },
  plugins: [],
};

export default config;
