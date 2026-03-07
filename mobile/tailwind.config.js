/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        sage:     '#A8C5A0', // Stable / calm
        sky:      '#89B4CC', // Manic / elevated
        mauve:    '#C4A0B0', // Depressive / low
        sand:     '#E8DCC8', // Neutral backgrounds
        surface:  '#FFFFFF', // Cards / surfaces
        charcoal: '#3D3935', // Primary text
        gold:     '#C9A84C', // Achievements / rewards
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
