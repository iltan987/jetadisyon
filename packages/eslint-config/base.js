import js from "@eslint/js";
import checkFile from "eslint-plugin-check-file";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import turboPlugin from "eslint-plugin-turbo";
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
      "check-file": checkFile,
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

      // File naming convention
      "check-file/filename-naming-convention": [
        "warn",
        { "**/*.{ts,tsx,js,jsx,mjs}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],

      // SonarJS — tuned rules
      "sonarjs/cognitive-complexity": ["warn", 25],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
    },
  },
];
