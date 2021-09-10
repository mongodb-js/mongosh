module.exports = {
  ...require('../../config/eslintrc.base'),
  root: true,
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.lint.json'
  }
};
