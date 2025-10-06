import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { staticPlugin } from "../../client/static/vite-plugin.js";

export default defineConfig({
  build: {
    target: "esnext"
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext"
    }
  },
  resolve: {
    alias: [
      {
        find: "$lib",
        replacement: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../")
      }
    ]
  },
  plugins: [sveltekit(), staticPlugin()]
});
