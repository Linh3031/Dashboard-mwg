import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'

export default defineConfig({
  plugins: [
    svelte({
      // Bảo "phiên dịch viên" Svelte tự động tìm postcss.config.js
      preprocess: [sveltePreprocess({ postcss: true })] 
    })
  ],
  // XÓA BỎ phần 'css: { postcss: ... }'
  // Vite sẽ tự động tìm postcss.config.js
})