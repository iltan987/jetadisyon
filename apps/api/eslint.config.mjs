import { globalIgnores } from "eslint/config"
import nestConfig from "@repo/eslint-config/nest"

export default [globalIgnores(["dist/", "eslint.config.mjs"]), ...nestConfig]
