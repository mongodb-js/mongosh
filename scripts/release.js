require('./import-expansions');

console.log('after import expansion:', {envProject: process.env.project, envPROJECT: process.env.PROJECT});

const path = require('path');
const { release } = require(path.join('..', 'packages', 'build'));
const config = require(path.join(__dirname, '..', 'config', 'build.conf.js'));

console.log('after load config:',  {configProject: config.project});


/**
 * Run the release process.
 */
const runRelease = async() => {
  await release(config);
};

runRelease().then(() => {
  process.exit(0);
});
