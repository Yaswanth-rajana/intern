/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
        },
        secondary: {
          DEFAULT: '#64748b',
          light: '#94a3b8',
          dark: '#475569',
        },
        neutral: {
          50: '#fcfcfc', // Extremely light gray / almost white
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#f87171',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
        },
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
        },
        chart: {
          aqi: '#10b981', 
          co2: '#3b82f6', 
          temp: '#f97316', 
          humidity: '#06b6d4', 
        },
        status: {
          good: '#10b981', // Green
          moderate: '#f59e0b', // Yellow
          poor: '#f97316', // Orange
          unhealthy: '#ef4444', // Red
          hazardous: '#8b5cf6', // Purple
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'small-label': '13px',
        'section-title': '22px',
        'main-title': '32px',
        'metric-value': '42px',
      },
      boxShadow: {
        'soft': '0 4px 24px -4px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'card': '16px',
      },
      spacing: {
        'gap': '20px',
        'pad': '24px',
      }
    },
  },
  plugins: [],
}
