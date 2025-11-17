// File: vite.config.js (Phiên bản 1.1 - Đã sửa lỗi PostCSS)
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess' // <-- 1. Import "phiên dịch viên"

export default defineConfig({
  plugins: [
    svelte({
      // 2. Bảo Svelte dùng "phiên dịch viên" cho thẻ <style>
      preprocess: sveltePreprocess({
        postcss: true, // Tự động tìm postcss.config.js
      }),
    })
  ],
  
  // 3. (QUAN TRỌNG) Bảo Vite dùng PostCSS cho file app.css
  css: {
    postcss: {} // Tự động tìm postcss.config.js
  }
})