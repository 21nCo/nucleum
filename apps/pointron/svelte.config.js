import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { buildKitAliases, loadAliasMap } from "../../tools/alias-utils.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kitAliases = buildKitAliases(loadAliasMap(), __dirname);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess({
    script: true
  }),
  compilerOptions: {
    compatibility: {
      componentApi: 4
    }
  },
  kit: {
    adapter: adapter({
      fallback: "index.html",
    }),
    alias: {
      $local: "./src",
      $lib: "../../",
      ...kitAliases,
    },
    files: {
      lib: "../../",
      routes: "../../client/routes",
    },
  },
};

export default config;
