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
          blue: '#1e3a8a',
          'blue-dark': '#1e40af',
          'blue-light': '#3b82f6',
        },
        accent: {
          blue: '#dbeafe',
        },
        text: {
          white: '#ffffff',
          dark: '#1f2937',
          gray: '#6b7280',
        },
        bg: {
          white: '#ffffff',
          'gray-light': '#f9fafb',
        },
      },
      boxShadow: {
        light: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
} 