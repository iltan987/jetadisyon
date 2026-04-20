import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import turboPlugin from "eslint-plugin-turbo";
import unicorn from "eslint-plugin-unicorn";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
      import: importPlugin,
      unicorn,
    },
    rules: {
      ...turboPlugin.configs["flat/recommended"].rules,

      // Unused imports — auto-remove on fix
      "unused-imports/no-unused-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Import sorting
      "import/no-duplicates": "warn",
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            // Side effect imports
            ["^\\u0000"],
            // Node.js builtins
            ["^node:"],
            // External packages
            ["^@?\\w"],
            // Monorepo packages
            ["^@repo/"],
            // Path aliases
            ["^@/"],
            // Relative imports
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "warn",

      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      // File naming: kebab-case by default
      "unicorn/filename-case": ["warn", { case: "kebabCase" }],

      // SonarJS — tuned rules
      "sonarjs/cognitive-complexity": ["warn", 25],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
    },
  },
  // React components (.tsx) → PascalCase
  {
    files: ["**/*.tsx"],
    rules: {
      "unicorn/filename-case": ["warn", { case: "pascalCase" }],
    },
  },
  // React hooks (use*.ts) → camelCase
  {
    files: ["**/use*.ts"],
    rules: {
      "unicorn/filename-case": ["warn", { case: "camelCase" }],
    },
  },
];
