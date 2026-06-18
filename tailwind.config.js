/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'sage-stripes': 'linear-gradient(90deg, #dfe2d7 50%, #f4eee5 50%)',
      },
      backgroundSize: {
        'stripe-size': '340px 100%',
      },
    },
  },
  plugins: [],
}

