/* eslint-disable no-console */
import { spawn } from 'child_process';
import assert from 'assert';
import { once } from 'events';
import { redactURICredentials } from '@mongosh/history';
import fleSmokeTestScript from './smoke-tests-fle';

// Run smoke tests on a executable, e.g.
// runSmokeTests("mongodb://localhost", "/path/to/mongosh.exe") or
// runSmokeTests(undefined, "/path/to/node", "packages/cli-repl/bin/mongosh.js").
export async function runSmokeTests(smokeTestServer: string | undefined, executable: string, ...args: string[]): Promise<void> {
  console.log('MONGOSH_SMOKE_TEST_SERVER set?', !!smokeTestServer);
  if (process.env.IS_CI) {
    assert(!!smokeTestServer, 'Make sure MONGOSH_SMOKE_TEST_SERVER is set in CI');
  }

  for (const { input, output, testArgs } of [{
    input: 'print("He" + "llo" + " Wor" + "ld!")',
    output: /Hello World!/,
    testArgs: ['--nodb'],
  }].concat(smokeTestServer ? [{
    input: `
      const dbname = "testdb_simplesmoke" + new Date().getTime();
      use(dbname);
      db.testcoll.insertOne({ d: new Date() });
      if (Object.keys(EJSON.serialize(db.testcoll.findOne()).d)[0] === '$date') {
        print('Test succeeded');
      }
      db.dropDatabase();`,
    output: /Test succeeded/,
    testArgs: [smokeTestServer as string]
  }, {
    input: fleSmokeTestScript,
    output: /Test succeeded|Test skipped/,
    testArgs: [smokeTestServer as string]
  }] : [])) {
    await runSmokeTest(executable, [...args, ...testArgs], input, output);
  }
  console.log('all tests passed');
}

async function runSmokeTest(executable: string, args: string[], input: string, output: RegExp): Promise<void> {
  const proc = spawn(executable, [...args], {
    stdio: ['pipe', 'pipe', 'inherit']
  });
  let stdout = '';
  proc.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  proc.stdin.end(input);
  await once(proc.stdout, 'end');
  try {
    assert.match(stdout, output);
    console.error({ status: 'success', input, output, stdout, executable, args: args.map(redactURICredentials) });
  } catch (err) {
    console.error({ status: 'failure', input, output, stdout, executable, args: args.map(redactURICredentials) });
    throw err;
  }
}
