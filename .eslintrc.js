module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  ignorePatterns: ['*.ejs'],
  rules: {
    // Require parenthesis around arrow function argument
    'arrow-parens': 'error',
    'comma-dangle': ['error', 'never'],
    'linebreak-style': ['error', 'unix'],
    // 'max-len': ['error', { code: 100, tabWidth: 2, ignoreUrls: true }],
    'max-len': 'off',
    semi: ['error', 'always']
  }
};
