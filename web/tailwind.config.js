export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-0': '#0a0b0e',
        'bg-1': '#111318',
        'bg-2': '#181b22',
        'bg-3': '#222631',
        'bg-hover': '#2a2f3d',

        'fg-0': '#f3f4f6',
        'fg-1': '#d1d5db',
        'fg-2': '#9ca3af',
        'fg-3': '#6b7280',

        border: '#232834',
        'border-light': '#32394a',

        accent: '#3b82f6',
        'accent-hover': '#2563eb',

        up: '#10b981',
        down: '#ef4444',
        warn: '#f59e0b',
        info: '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};
