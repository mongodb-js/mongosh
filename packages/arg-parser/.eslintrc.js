module.exports = {
  root: true,
  extends: ['@mongodb-js/eslint-config-mongosh'],
  parserOptions: {
    tsconfigRootDir: process.cwd(),
    project: ['./tsconfig-lint.json'],
  },
};
