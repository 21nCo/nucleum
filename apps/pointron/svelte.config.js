import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: "index.html",
    }),
    alias: {
      $local: "./src",
      $lib: "../../",
    },
    files: {
      lib: "../../",
      routes: "../../client/routes",
    },
  },
};

export default config;
