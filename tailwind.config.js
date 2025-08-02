/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  darkMode: 'class',
  plugins: [
    require('daisyui')
  ],

  daisyui: {
    themes: [
      {
        dark: {
          'name': 'dark',
          'selector': '.dark',
          'theme': {
            'colors': {
              'base': '#121212',
              'surface': '#1e1e1e',
              'accent': '#8a2be2',
              'primary': '#6366f1',
              'secondary': '#f472b6',
              'info': '#06b6d4',
              'success': '#22c55e',
              'warning': '#f59e0b',
              'error': '#ef4444',
              'content': {
                'body': '#e5e5e5',
                'surface': '#1e1e1e'
              }
            },
            'borderRadius': {
              'lg': '0.5rem',
              'xl': '0.75rem',
              '2xl': '1rem'
            }
          }
        }
      }
    ]
  }
};
