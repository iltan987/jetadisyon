import tailwind from "@repo/eslint-config/prettier-tailwind"

/** @type {import("prettier").Config} */
export default {
  ...tailwind,
  tailwindStylesheet: "src/styles/globals.css",
}
