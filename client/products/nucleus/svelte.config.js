// import adapter from '@sveltejs/adapter-auto';
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: "index.html"
    }),
    alias: {
      $local: "./src",
      // Point $lib to the parent lib directory (3 levels up)
      $lib: "../../../"
    },
    files: {
      // lib points to the parent lib for this product
      lib: "../../../",
      routes: "../../../client/routes"
    }
  }
};

export default config;
