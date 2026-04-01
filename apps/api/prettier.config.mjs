import base from "@repo/eslint-config/prettier-base"

/** @type {import("prettier").Config} */
const config = {
  ...base,
  semi: true,
  singleQuote: true,
  trailingComma: "all",
}

export default config
