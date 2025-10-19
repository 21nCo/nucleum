import aliasImportsRule from "./tools/eslint/rules/alias-imports.mjs";

const tidigitPlugin = {
  rules: {
    "alias-imports": aliasImportsRule
  }
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.svelte-kit/**",
      "**/dist/**",
      "**/build/**",
      "tools/eslint/dist/**"
    ]
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      tidigit: tidigitPlugin
    },
    rules: {
      "tidigit/alias-imports": "warn"
    }
  }
];
