import { CliRepl, parseCliArgs, mapCliToDriver, USAGE } from './index';
import { generateUri } from '@mongosh/service-provider-server';

try {
  const options = parseCliArgs(process.argv);
  const { version } = require('../package.json');

  if (options.help) {
    // eslint-disable-next-line no-console
    console.log(USAGE);
  } else if (options.version) {
    // eslint-disable-next-line no-console
    console.log(version);
  } else {
    if (process.execPath === process.argv[1]) {
      // Remove the built-in Node.js listener that prints e.g. deprecation
      // warnings in single-binary release mode.
      process.removeAllListeners('warning');
    }

    process.title = 'mongosh';
    const driverOptions = mapCliToDriver(options);
    const driverUri = generateUri(options);
    const appname = `${process.title} ${version}`;
    /* eslint no-new:0 */
    new CliRepl(driverUri, { appname, ...driverOptions }, options);
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.log(e.message);
}
