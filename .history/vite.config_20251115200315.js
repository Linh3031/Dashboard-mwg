import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sveltePreprocess from 'svelte-preprocess'
import tailwindcss from 'tailwindcss' // <-- Import Tailwind
import autoprefixer from 'autoprefixer' // <-- Import Autoprefixer

export default defineConfig({
  plugins: [
    svelte({
      // Mục này xử lý CSS BÊN TRONG file .svelte
      preprocess: [sveltePreprocess({ 
        // Chúng ta bảo sveltePreprocess TỰ nó dùng PostCSS
        postcss: {
          plugins: [tailwindcss(), autoprefixer()]
        }
      })] 
    })
  ],
  // Mục này xử lý file .css toàn cục (như app.css)
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()]
    }
  }
})