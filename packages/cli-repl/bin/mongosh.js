#!/usr/bin/env node
const { CliRepl, parseCliArgs, mapCliToDriver, generateUri } = require('../lib');

process.title = 'mongosh';

const options = parseCliArgs(process.argv);

if (options.help) {
  console.log('help');
} else if (options.version) {
  console.log(require('../package.json').version);
} else {
  const driverOptions = mapCliToDriver(options);
  const driverUri = generateUri(options);
  new CliRepl(driverUri, driverOptions, options);
}
