import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import fetchJsonPlugin from "../fetch-json-data.js";
import { staticPlugin } from "../../packages/static/vite-plugin.js";

export default defineConfig({
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Group G6 graph library to prevent tree-shaking issues
          if (id.includes("@antv/g6")) {
            return "g6";
          }
          // Group monaco editor related files
          if (id.includes("monaco-editor")) {
            return "monaco";
          }
          // Group major UI libraries
          if (id.includes("@carbon/charts-svelte")) {
            return "charts";
          }
          // Group visualization libraries
          if (id.includes("highlight.js")) {
            return "syntax";
          }
          // Group map related code
          if (id.includes("maplibre-gl")) {
            return "maps";
          }
        },
      },
      external: (id) => {
        // Prevent G6 from being tree-shaken too aggressively
        if (id.includes("@antv/g6")) {
          return false; // Keep G6 internal
        }
      },
      treeshake: {
        preset: "smallest",
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        // Preserve G6's internal extension registry
        moduleSideEffects: (id) => {
          if (id.includes("@antv/g6")) {
            return true; // Preserve side effects for G6
          }
          return false;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: ["@surrealdb/wasm", "surrealql.wasm"],
    include: [
      "@antv/g6",
      "@carbon/charts-svelte",
      "highlight.js",
      "maplibre-gl",
    ],
    esbuildOptions: {
      target: "esnext",
    },
  },
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  plugins: [sveltekit(), fetchJsonPlugin("product.json"), staticPlugin()],
});
