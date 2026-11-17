import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {ignores: ["build/**", "**/node_modules/**"]},
  {files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {settings: {react: {version: "detect"}}},
  // Jest test files (Create React App runs them with jest globals).
  {files: ["src/**/*.test.js", "src/setupTests.js"], languageOptions: { globals: globals.jest }},
  // Node code: content scripts and the Azure Functions API, with their tests.
  {files: ["scripts/**/*.mjs", "api/**/*.{js,mjs}"], languageOptions: { globals: globals.node }},
];
