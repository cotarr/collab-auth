module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: 'standard',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  ignorePatterns: ['*.ejs'],
  rules: {
    // Require parenthesis around arrow function argument
    'arrow-parens': 'error',
    'comma-dangle': ['error', 'never'],
    'linebreak-style': ['error', 'unix'],
    'max-len': ['error', { code: 100, tabWidth: 2, ignoreUrls: true }],
    // 'max-len': 'off',
    semi: ['error', 'always'],
    'object-shorthand': 'off'
  }
};
