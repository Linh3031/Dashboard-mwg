import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Chúng ta không cần import postcss hay tailwind ở đây, 
// Vite sẽ tự động tìm file postcss.config.js

export default defineConfig({
  plugins: [svelte()],
  css: {
    postcss: './postcss.config.js', // Chỉ định rõ ràng cho Vite sử dụng file config này
  },
})