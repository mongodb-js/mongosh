const { fixCygwinPath } = require('@mongodb-js/eslint-config-mongosh/utils');

// eslint-disable-next-line no-console
console.log('paths in .eslintrc.js', {
  cwd: process.cwd(),
  __dirname,
  fixed__dirmame: fixCygwinPath(__dirname),
});

module.exports = {
  root: true,
  extends: ['@mongodb-js/eslint-config-mongosh'],
  parserOptions: {
    tsconfigRootDir: fixCygwinPath(__dirname),
    project: ['./tsconfig-lint.json'],
  },
};
