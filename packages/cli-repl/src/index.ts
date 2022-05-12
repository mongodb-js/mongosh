import { parseCliArgs } from './arg-parser';
import CliRepl from './cli-repl';
import clr from './clr';
import { getStoragePaths } from './config-directory';
import { MONGOSH_WIKI, TELEMETRY_GREETING_MESSAGE, USAGE } from './constants';
import { runSmokeTests } from './smoke-tests';
import { buildInfo } from './build-info';

export default CliRepl;

export {
  clr,
  USAGE,
  TELEMETRY_GREETING_MESSAGE,
  MONGOSH_WIKI,
  CliRepl,
  parseCliArgs,
  getStoragePaths,
  runSmokeTests,
  buildInfo
};
