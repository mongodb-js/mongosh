const { fixCygwinPath } = require('@mongodb-js/eslint-config-mongosh/utils');

module.exports = {
  root: true,
  extends: ['@mongodb-js/eslint-config-mongosh'],
  parserOptions: {
    tsconfigRootDir: fixCygwinPath(__dirname),
    project: ['./tsconfig-lint.json'],
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.mjs', '**/*.ts'],
      rules: {
        'no-console': 0,
      },
    },
  ],
};
