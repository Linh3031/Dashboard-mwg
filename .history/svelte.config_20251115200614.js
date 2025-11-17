import sveltePreprocess from 'svelte-preprocess';

export default {
  preprocess: sveltePreprocess({
    postcss: true, // Báo cho nó biết chúng ta dùng PostCSS (Tailwind)
  }),
};