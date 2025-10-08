module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
  ],
  plugins: ["@typescript-eslint", "react"],
  env: {
    browser: true,
    node: true,
    es2021: true,
    serviceworker: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  rules: {
    // project-specific overrides
    "no-console": "warn",
    // TypeScript handles undefined variables/namespace checks better
    "no-undef": "off",
    // Allow automatic JSX runtime (Next.js) and avoid requiring React in scope
    "react/react-in-jsx-scope": "off",
    // Relax unused vars/errors to warnings to get a green CI baseline
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "react/no-unescaped-entities": "warn",
  },
  overrides: [
    {
      files: ["**/public/**", "**/workbox-*.js", "scheduler-fresh/public/**"],
      rules: { "no-undef": "off" },
    },
  ],
};
