import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from 'tailwindcss' // <-- Thêm dòng này

export default defineConfig({
  plugins: [svelte()],
  css: {
    postcss: { // <-- Sửa mục này
      plugins: [tailwindcss()] // <-- Thêm plugin Tailwind vào đây
    }
  }
})