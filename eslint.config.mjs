import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Nookly local repair/backup artifacts are not deployable source.
    ".nookly-backups/**",
    "nookly-sos-buzzer-until-seen/**",
    "**/*.before-*.js",

    // One-off local audit/install scripts.
    "audit-*.cjs",
    "install-*.cjs",
    "remove-*.cjs",

    // Temporary source copies created during repair work.
    "drivers-page-with-inspect-rides-ui.tsx",
    "organization-handler-with-inspect-rides.js",
  ]),
]);

export default eslintConfig;
