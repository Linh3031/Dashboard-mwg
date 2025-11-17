import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess' // <-- 1. IMPORT "PHIÊN DỊCH VIÊN"

export default defineConfig({
  plugins: [
    svelte({ // <-- 2. SỬA CHỖ NÀY
      // 3. BẢO SVELTE DÙNG "PHIÊN DỊCH VIÊN" VỚI POSTCSS
      preprocess: [sveltePreprocess({ postcss: true })] 
    })
  ],
  // Mục css: postcss ở dưới này VẪN GIỮ NGUYÊN
  // Nó dùng để xử lý file app.css chính
  css: {
    postcss: {
      plugins: [await import('tailwindcss')]
    }
  }
})