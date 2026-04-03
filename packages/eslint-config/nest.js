import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

import baseConfig from "./base.js";

export default [
  ...baseConfig,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
    },
  },
  eslintConfigPrettier,
];
