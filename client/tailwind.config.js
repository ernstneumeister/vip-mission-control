/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        sidebar: {
          bg: '#FFFFFF',
          border: '#E5E7EB',
        },
        status: {
          scheduled: '#6B7280',
          queue: '#3B82F6',
          'in-progress': '#F59E0B',
          done: '#10B981',
        },
        agent: {
          henry: '#6366f1',
          codex: '#10b981',
          research: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
