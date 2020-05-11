#!/usr/bin/env node

/* eslint no-console: 0, no-new: 0*/
const { CliRepl, parseCliArgs, mapCliToDriver, generateUri, USAGE } = require('../lib');

process.title = 'mongosh';

try {
  const options = parseCliArgs(process.argv);
  const { version } = require('../package.json');

  if (options.help) {
    console.log(USAGE);
  } else if (options.version) {
    console.log(version);
  } else {
    const driverOptions = mapCliToDriver(options);
    const driverUri = generateUri(options);
    const appname = `${process.title} ${version}`;

    new CliRepl(driverUri, { appname, ...driverOptions }, options);
  }
} catch (e) {
  console.log(e.message);
}
