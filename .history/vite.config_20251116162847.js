// File: vite.config.js (Phiên bản 1.2 - Sửa lỗi Svelte 5)
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Svelte 5 và vite-plugin-svelte sẽ TỰ ĐỘNG tìm postcss.config.js
// Chúng ta không cần sveltePreprocess
export default defineConfig({
  plugins: [
    svelte()
  ],
  css: {
    // Chỉ cần mục này để bảo Vite xử lý file app.css bằng PostCSS
    postcss: {} 
  }
})