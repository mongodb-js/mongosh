#!/usr/bin/env node
const { CliRepl, parseCliArgs, mapCliToDriver, generateUri, USAGE } = require('../lib');

process.title = 'mongosh';

try {
  const options = parseCliArgs(process.argv);

  if (options.help) {
    console.log(USAGE);
  } else if (options.version) {
    console.log(require('../package.json').version);
  } else {
    const driverOptions = mapCliToDriver(options);
    const driverUri = generateUri(options);
    new CliRepl(driverUri, driverOptions, options);
  }
} catch (e) {
  console.log(e.message);
}
