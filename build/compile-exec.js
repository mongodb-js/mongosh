const { compile } = require('nexe');
const path = require('path');
const config = require('../package.json');

/**
 * Compile the mongosh CLI via Nexe.
 */
compile({
  input: path.join(__dirname, '..', 'packages', 'cli-repl', 'index.js'),
  name: config.name,
  output: path.join(__dirname, '..', 'dist', config.name)
}).then(() => {
  console.log('success');
}).catch((error) => {
  console.error('error', error);
});
