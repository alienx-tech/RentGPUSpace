import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintPluginPrettier,
  {
    rules: {
      // Matches the old TanStack Start project's gate, which never enforced
      // this — unused params are common in server-action stubs and handlers.
      "@typescript-eslint/no-unused-vars": "off",
      // Stricter than the old project's gate; several effects ported
      // verbatim (auth session bootstrap, reduced-motion detection) rely on
      // this pattern and changing it is out of scope for a like-for-like port.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
