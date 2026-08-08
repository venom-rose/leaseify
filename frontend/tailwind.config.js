/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm Amber theme inspired by the Amber Appliances aesthetic
        amber: {
          50: '#FFFBF0',
          100: '#FFF5DB',
          200: '#FFE8B3',
          300: '#FFDA85',
          400: '#E8C36C',
          500: '#C8A96E',  // Primary brand amber/gold
          600: '#A8894E',
          700: '#8B7040',
          800: '#6B5530',
          900: '#4A3A20',
          950: '#2C2214',
        },
        warm: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F5F0E8',
          300: '#EDE6D8',
          400: '#E0D5C3',
          500: '#C8BCAA',
          600: '#A69888',
          700: '#7D7060',
          800: '#544B3C',
          900: '#332E24',
          950: '#1E1B14',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
        'amber': '0 4px 14px rgba(200, 169, 110, 0.25)',
        'amber-lg': '0 10px 40px rgba(200, 169, 110, 0.2)',
      },
    },
  },
  plugins: [],
}
