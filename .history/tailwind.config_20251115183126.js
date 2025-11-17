/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts}", // Bảo nó quét các file svelte
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}