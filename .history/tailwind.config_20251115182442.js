/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts}", // Dòng này bảo Tailwind quét tất cả file .svelte
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}