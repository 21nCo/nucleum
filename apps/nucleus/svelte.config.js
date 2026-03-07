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
      $lib: "../../",
      // @21n/* aliases so SvelteKit does not conflict with tsconfig paths (see kit.alias docs)
      "@21n/actions": "../../client/actions",
      "@21n/components": "../../client/components",
      "@21n/elements": "../../client/elements",
      "@21n/stores": "../../client/stores",
      "@21n/utils": "../../client/utils",
      "@21n/types": "../../client/types",
      "@21n/products": "../../client/products",
      "@21n/static": "../../client/static",
      "@21n/layout": "../../client/layout",
      "@21n/persistence": "../../client/persistence",
      "@21n/landing": "../../client/landing",
      "@21n/extensions": "../../client/extensions",
      "@21n/branding": "../../client/branding",
      "@21n/icons": "../../client/icons",
      "@21n/theme": "../../client/theme",
      "@21n/legacy": "../../client/legacy",
      "@21n/data": "../../client/data",
      "@21n/illustrations": "../../client/illustrations",
      "@21n/icons-v2": "../../client/iconsV2",
      "@21n/cx": "../../client/cx",
      "@21n/client": "../../client",
      "@21n/shared-types": "../../shared/types",
      "@21n/shared-utils": "../../shared/utils",
      "@21n/shared-dbo": "../../shared/dbo"
    },
    files: {
      // lib points to the parent lib for this product
      lib: "../../",
      routes: "../../client/routes"
    }
  }
};

export default config;
