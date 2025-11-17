// File: vite.config.js (Phiên bản 1.3 - Chuẩn Svelte 5)
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Svelte 5 và vite-plugin-svelte sẽ TỰ ĐỘNG tìm postcss.config.js
export default defineConfig({
  plugins: [
    svelte()
  ],
  css: {
    // Mục này bảo Vite xử lý file app.css bằng PostCSS
    postcss: {} 
  }
})