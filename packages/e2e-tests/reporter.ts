import { reporters } from 'mocha';
import type { MochaOptions, Runner } from 'mocha';
import path from 'path';

// Import the built-in reporters
const Spec = reporters.Spec;
const XUnit = reporters.XUnit;

export class MochaReporter extends reporters.Base {
  constructor(runner: Runner, options: MochaOptions) {
    super(runner, options);
    const suiteName = process.env.E2E_TASK_NAME ?? path.basename(process.cwd());
    console.info(`MOCHAREPORTER:${suiteName} ${JSON.stringify(process.env)}`);

    new Spec(runner);

    runner.on('suite', (suite) => {
      if (suite.parent?.root) {
        suite.title = `${suiteName}__${suite.title}`;
      }
    });

    new XUnit(runner, {
      reporterOptions: {
        suiteName,
        output: path.join(__dirname, '..', '..', '.logs', `${suiteName}.xml`),
      },
    });
  }
}

module.exports = MochaReporter;
