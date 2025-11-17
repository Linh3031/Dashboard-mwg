// File: vite.config.js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Svelte 5 + vite-plugin-svelte sẽ TỰ ĐỘNG tìm postcss.config.js
export default defineConfig({
  plugins: [svelte()],
})