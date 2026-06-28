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
          DEFAULT: '#111827', // Slate 900
          dark: '#030712',
          light: '#F3F4F6',
        },
        accent: {
          DEFAULT: '#E11D48', // Pink/Rose dot color
          dark: '#BE123C',
          light: '#FFE4E6',
        },
        slate: {
          50: '#FAFBFB',
          100: '#F4F5F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        }
      },
      borderRadius: {
        '2xl': '20px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 10px -1px rgba(0, 0, 0, 0.02)',
        'premium': '0 10px 30px -10px rgba(17, 24, 39, 0.05), 0 1px 3px rgba(0, 0, 0, 0.01)',
      },
    },
  },
  plugins: [],
}
