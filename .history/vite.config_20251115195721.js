import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

export default defineConfig({
  plugins: [
    svelte({
      // Mục này xử lý CSS BÊN TRONG file .svelte
      preprocess: [sveltePreprocess({ postcss: true })] 
    })
  ],
  // THÊM LẠI MỤC NÀY:
  // Mục này xử lý file .css toàn cục (như app.css)
  css: {
    postcss: {} // Báo cho Vite tự tìm và dùng postcss.config.js
  }
})