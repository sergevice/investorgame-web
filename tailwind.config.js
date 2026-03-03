/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // NMU Dnipro Polytechnic brand palette
        nmu: {
          dark: '#093864',    // dark navy (backgrounds)
          mid: '#035f8e',     // medium blue (surfaces, borders)
          sky: '#25aae2',     // sky blue accent (CTAs, highlights)
          light: '#4fc3f7',   // lighter sky (hover states)
        },
        surface: { DEFAULT: '#0a2d52', light: '#0d3a66' },
      },
    },
  },
  plugins: [],
}
