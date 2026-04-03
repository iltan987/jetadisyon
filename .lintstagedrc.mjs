export default {
  "apps/web/src/**/*.{ts,tsx}": [
    "eslint --fix --no-warn-ignored --max-warnings=0 -c apps/web/eslint.config.mjs",
    "prettier --write",
  ],
  "packages/ui/src/**/*.{ts,tsx}": (filenames) => {
    const other = filenames.filter((f) => !f.includes("/shadcn/"));
    return [
      ...(other.length
        ? [
            `eslint --fix --no-warn-ignored --max-warnings=0 -c packages/ui/eslint.config.mjs ${other.join(" ")}`,
          ]
        : []),
      `prettier --write ${filenames.join(" ")}`,
    ];
  },
  "apps/admin/src/**/*.{ts,tsx}": [
    "eslint --fix --no-warn-ignored --max-warnings=0 -c apps/admin/eslint.config.mjs",
    "prettier --write",
  ],
  "apps/desktop/src/**/*.{ts,tsx}": [
    "eslint --fix --no-warn-ignored --max-warnings=0 -c apps/desktop/eslint.config.mjs",
    "prettier --write",
  ],
  "apps/api/{src,test}/**/*.ts": [
    "eslint --fix --no-warn-ignored --max-warnings=0 -c apps/api/eslint.config.mjs",
    "prettier --write",
  ],
  "*.{js,mjs,cjs}": ["prettier --write"],
  "*.{json,md,css,html,yaml,yml}": ["prettier --write"],
};
