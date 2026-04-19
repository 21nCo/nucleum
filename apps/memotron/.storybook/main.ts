import type { StorybookConfig } from "@storybook/sveltekit";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
function getAbsolutePath(value: string) {
  return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
  stories: ["../../../client/**/*.stories.@(ts|svelte)"],
  addons: [
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("@storybook/addon-coverage")
  ],
  framework: {
    name: getAbsolutePath("@storybook/sveltekit"),
    options: {}
  },
  docs: {
    autodocs: false
  }
};

export default config;
