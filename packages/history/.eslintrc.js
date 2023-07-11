const fs = require('fs');

// eslint-disable-next-line no-console
console.log('paths in .eslintrc.js', {
  cwd: process.cwd(),
  __dirname,
  realpath__dirname: fs.realpathSync(__dirname),
});

module.exports = {
  root: true,
  extends: ['@mongodb-js/eslint-config-mongosh'],
  parserOptions: {
    tsconfigRootDir: process.cwd(),
    project: ['./tsconfig-lint.json'],
  },
};
