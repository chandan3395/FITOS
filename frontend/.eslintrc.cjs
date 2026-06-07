module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  plugins: ["react-refresh"],
  rules: {
    // prop-types is not enforced — no TypeScript in Phase 1
    "react/prop-types": "off",
    // context files intentionally export multiple values
    "react-refresh/only-export-components": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};
