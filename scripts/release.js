const path = require('path');
const { release } = require(path.join('..', 'packages', 'build'));
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

console.log('Releasing mongosh with config:', config);

release(config);
