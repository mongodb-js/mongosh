module.exports = {
  root: true,
  extends: ['../../config/eslintrc.base'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig-lint.json'],
  },
};
