import { fileURLToPath } from "node:url"
import base from "./prettier-base.mjs"

const pluginPath = fileURLToPath(
  import.meta.resolve("prettier-plugin-tailwindcss")
)

/** @type {import("prettier").Config} */
const config = {
  ...base,
  plugins: [pluginPath],
  tailwindFunctions: ["cn", "cva"],
}

export default config
