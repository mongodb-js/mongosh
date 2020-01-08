const config = require('../package.json');
const path = require('path');
const { compile } = require('mongosh-build');

/**
 * Compile the mongosh executable.
 */
compile({
  input: path.join(__dirname, '..', 'packages', 'cli-repl', 'index.js'),
  name: config.name,
  output: path.join(__dirname, '..', 'dist', config.name)
}).then(() => {
  console.log('compiled executable:', config.name);
}).catch((error) => {
  console.error('error during compilation:', error);
});
