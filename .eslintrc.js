module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "no-console": "off",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
