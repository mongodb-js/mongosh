/* eslint-disable no-console, @typescript-eslint/no-non-null-assertion, chai-friendly/no-unused-expressions */
import { spawn } from 'child_process';
import assert from 'assert';
import { once } from 'events';
import { redactURICredentials } from '@mongosh/history';
import fleSmokeTestScript from './smoke-tests-fle';
import { buildInfo } from './build-info';

/**
 * Run smoke tests on an executable, e.g.
 * runSmokeTests("mongodb://localhost", "/path/to/mongosh.exe") or
 * runSmokeTests(undefined, "/path/to/node", "packages/cli-repl/bin/mongosh.js").
 *
 * @param smokeTestServer A connection string to run against
 * @param executable The Node.js/mongosh executable to use
 * @param args Arguments to pass to the Node.js/mongosh executable
 */
export async function runSmokeTests(smokeTestServer: string | undefined, executable: string, ...args: string[]): Promise<void> {
  console.log('MONGOSH_SMOKE_TEST_SERVER set?', !!smokeTestServer);
  if (process.env.IS_CI) {
    assert(!!smokeTestServer, 'Make sure MONGOSH_SMOKE_TEST_SERVER is set in CI');
  }
  const expectFipsSupport = !!process.env.MONGOSH_SMOKE_TEST_OS_HAS_FIPS_SUPPORT && buildInfo().sharedOpenssl;
  console.log('FIPS support required to pass?', expectFipsSupport);

  for (const { input, output, testArgs, includeStderr } of [{
    input: 'print("He" + "llo" + " Wor" + "ld!")',
    output: /Hello World!/,
    testArgs: ['--nodb'],
  }, {
    input: 'crypto.createHash("md5").update("hello").digest("hex")',
    output: expectFipsSupport ?
      /disabled for FIPS/i :
      /disabled for FIPS|Could not enable FIPS mode/i,
    includeStderr: true,
    testArgs: ['--tlsFIPSMode', '--nodb']
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
    await runSmokeTest(executable, [...args, ...testArgs], input, output, includeStderr);
  }
  console.log('all tests passed');
}

/**
 * Run a single smoke test.
 *
 * @param executable The Node.js/mongosh executable to use
 * @param args Arguments to pass to the Node.js/mongosh executable
 * @param input stdin contents of the executable
 * @param output Expected contents of stdout
 */
async function runSmokeTest(executable: string, args: string[], input: string, output: RegExp, includeStderr?: boolean): Promise<void> {
  const proc = spawn(executable, [...args], {
    stdio: ['pipe', 'pipe', includeStderr ? 'pipe' : 'inherit']
  });
  let stdout = '';
  let stderr = '';
  proc.stdout!.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  proc.stderr?.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  proc.stdin!.end(input);
  await once(proc.stdout!, 'end');
  try {
    assert.match(includeStderr ? `${stdout}\n${stderr}` : stdout, output);
    console.error({ status: 'success', input, output, stdout, executable, args: args.map(arg => redactURICredentials(arg)) });
  } catch (err: any) {
    console.error({ status: 'failure', input, output, stdout, executable, args: args.map(arg => redactURICredentials(arg)) });
    throw err;
  }
}
