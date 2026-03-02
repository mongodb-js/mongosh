import assert from 'assert';
import { promises as fs } from 'fs';
import { once } from 'events';
import { redactConnectionString } from 'mongodb-redact';
import fleSmokeTestScript from './smoke-tests-fle';
import { baseBuildInfo, buildInfo } from './build-info';
import escapeRegexp from 'escape-string-regexp';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export interface SelfTestOptions {
  smokeTestServer: string | undefined;
  args: string[]; // includes executable + args immediately after executable
  wantPerformanceTesting: boolean;
}

// https://pkg.go.dev/github.com/evergreen-ci/poplar#TestInfo
interface PerfTestResult {
  info: {
    test_name: string;
    tags: string[];
  };
  created_at: string;
  completed_at: string;
  artifacts: unknown[];
  metrics: PerfTestMetric[];
}

interface PerfTestMetric {
  name: string;
  type:
    | 'SUM'
    | 'MEAN'
    | 'MEDIAN'
    | 'MAX'
    | 'MIN'
    | 'STANDARD_DEVIATION'
    | 'THROUGHPUT'
    | 'LATENCY'
    | 'PERCENTILE_99TH'
    | 'PERCENTILE_95TH'
    | 'PERCENTILE_90TH'
    | 'PERCENTILE_80TH'
    | 'PERCENTILE_50TH';
  value: number;
}

/**
 * Run smoke tests on an executable, e.g.
 * runSmokeTests("mongodb://localhost", "/path/to/mongosh.exe") or
 * runSmokeTests(undefined, "/path/to/node", "packages/cli-repl/bin/mongosh.js").
 *
 * @param smokeTestServer A connection string to run against
 * @param executable The Node.js/mongosh executable to use
 * @param args Arguments to pass to the Node.js/mongosh executable
 */
export async function runSmokeTests({
  smokeTestServer,
  args: [executable, ...args],
  wantPerformanceTesting,
}: SelfTestOptions): Promise<void> {
  if (!wantPerformanceTesting) {
    console.log('MONGOSH_SMOKE_TEST_SERVER set?', !!smokeTestServer);
  }

  if (process.env.IS_CI || wantPerformanceTesting) {
    assert(
      !!smokeTestServer,
      'Make sure MONGOSH_SMOKE_TEST_SERVER is set in CI'
    );
  }

  const expectFipsSupport =
    !!process.env.MONGOSH_SMOKE_TEST_OS_HAS_FIPS_SUPPORT &&
    (await buildInfo()).sharedOpenssl;
  const expectAutomaticEncryptionSupport =
    !process.env.MONGOSH_NO_AUTOMATIC_ENCRYPTION_SUPPORT;
  if (!wantPerformanceTesting) {
    console.log('FIPS/FLE support required to pass?', {
      expectFipsSupport,
      expectAutomaticEncryptionSupport,
    });
  }
  const perfResults: PerfTestResult[] = [];
  const commonPerfTags = [process.arch, process.platform];

  for (const {
    name,
    tags,
    input,
    output,
    env,
    testArgs,
    includeStderr,
    exitCode,
    perfTestIterations,
  } of [
    {
      name: 'print_hello_world',
      input: 'print("He" + "llo" + " Wor" + "ld!")',
      output: /Hello World!/,
      includeStderr: false,
      testArgs: ['--nodb'],
      exitCode: 0,
      perfTestIterations: 0,
    },
    {
      name: 'eval_nodb_error',
      input: '',
      output: /ReferenceError/,
      includeStderr: true,
      testArgs: ['--nodb', '--eval', 'foo.bar()'],
      exitCode: 1,
      perfTestIterations: 0,
    },
    {
      name: 'eval_nodb_print',
      input: '',
      output: /Hello World!/,
      includeStderr: false,
      testArgs: ['--nodb', '--eval', 'print("He" + "llo" + " Wor" + "ld!")'],
      exitCode: 0,
      perfTestIterations: 0,
    },
    {
      // Regression test for MONGOSH-2233, included here because multiline support is a bit
      // more fragile when it comes to newer Node.js releases and these are the only tests
      // that run as part of the homebrew setup.
      name: 'print_multiline_terminal',
      input: ['{', 'print("He" + "llo" +', '" Wor" + "ld!")', '}'],
      env: { MONGOSH_FORCE_TERMINAL: 'true' },
      output: /Hello World!/,
      includeStderr: false,
      testArgs: ['--nodb'],
      exitCode: 0,
      perfTestIterations: 0,
    },
    {
      name: 'eval_nodb_print_plainvm',
      input: '',
      output: /Hello World!/,
      includeStderr: false,
      testArgs: [
        '--nodb',
        '--eval',
        'print("He" + "llo" + " Wor" + "ld!")',
        '--jsContext=plain-vm',
      ],
      exitCode: 0,
      perfTestIterations: 20,
      tags: ['startup'],
    },
    {
      name: 'eval_nodb_print_repl',
      input: '',
      output: /Hello World!/,
      includeStderr: false,
      testArgs: [
        '--nodb',
        '--eval',
        'print("He" + "llo" + " Wor" + "ld!")',
        '--jsContext=repl',
      ],
      exitCode: 0,
      perfTestIterations: 20,
      tags: ['startup'],
    },
    {
      name: 'eval_nodb_require',
      input: '',
      output: /foobar/,
      includeStderr: false,
      testArgs: ['--nodb', '--eval', 'require("util").format("%sbar", "foo")'],
      exitCode: 0,
      perfTestIterations: 0,
    },
    {
      name: 'mongosh_version',
      input: '',
      output: new RegExp(escapeRegexp(baseBuildInfo().version)),
      includeStderr: false,
      testArgs: ['--version'],
      exitCode: 0,
      perfTestIterations: 20,
      tags: ['startup'],
    },
    {
      name: 'crypto_fips_md5',
      input: 'crypto.createHash("md5").update("hello").digest("hex")',
      output: expectFipsSupport
        ? /disabled for FIPS|digital envelope routines::unsupported/i
        : /disabled for FIPS|digital envelope routines::unsupported|Could not enable FIPS mode/i,
      includeStderr: true,
      testArgs: ['--tlsFIPSMode', '--nodb'],
      perfTestIterations: 0,
    },
    {
      name: 'crypto_fips_sha256',
      input: 'crypto.createHash("sha256").update("hello").digest("hex")',
      output: expectFipsSupport
        ? /2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824/i
        : /2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824|digital envelope routines::unsupported|Could not enable FIPS mode/i,
      includeStderr: true,
      testArgs: ['--tlsFIPSMode', '--nodb'],
      perfTestIterations: 0,
    },
    {
      name: 'async_rewrite_foreach',
      input:
        'for (let i = 0; i < 100; i++) __asyncRewrite(String([].forEach).replace("function", "function forEach")); print("done")',
      output: /done/,
      includeStderr: false,
      testArgs: ['--exposeAsyncRewriter', '--nodb'],
      perfTestIterations: 20,
      tags: ['async_rewrite'],
    },
  ].concat(
    smokeTestServer
      ? [
          {
            name: 'db_insert_retrieve',
            input: `
      const dbname = "testdb_simplesmoke" + new Date().getTime();
      use(dbname);
      db.testcoll.insertOne({ d: new Date() });
      if (Object.keys(EJSON.serialize(db.testcoll.findOne()).d)[0] === '$date') {
        print('Test succeeded');
      }
      db.dropDatabase();`,
            output: /Test succeeded/,
            includeStderr: false,
            exitCode: 0,
            testArgs: [smokeTestServer],
            perfTestIterations: 0,
          },
          {
            name: 'fle',
            input: fleSmokeTestScript,
            output: /Test succeeded|Test skipped/,
            includeStderr: false,
            exitCode: 0,
            testArgs: [smokeTestServer],
            perfTestIterations: 0,
          },
          {
            name: 'db_eval_plainvm',
            input: '',
            output: /"ok": ?1\b/,
            includeStderr: false,
            exitCode: 0,
            testArgs: [
              smokeTestServer,
              '--eval',
              'db.hello()',
              '--json=relaxed',
              '--jsContext=plain-vm',
            ],
            perfTestIterations: 20,
            tags: ['startup'],
          },
          {
            name: 'db_eval_repl',
            input: '',
            output: /"ok": ?1\b/,
            includeStderr: false,
            exitCode: 0,
            testArgs: [
              smokeTestServer,
              '--eval',
              'db.hello()',
              '--json=relaxed',
              '--jsContext=repl',
            ],
            perfTestIterations: 20,
            tags: ['startup'],
          },
          /*{
            name: 'db_cursor_iteration_repl',
            input: `let count = 0; for (const item of ${manyDocsCursor(
              12345
            )}) count++; print(count);`,
            output:
              /\b12345\b|Unrecognized pipeline stage name|is not allowed in user requests/,
            includeStderr: true,
            testArgs: [smokeTestServer, '--jsContext=repl'],
            perfTestIterations: 20,
            tags: ['db', 'cursor_iteration'],
          },
          {
            name: 'db_cursor_iteration_plainvm',
            input: `let count = 0; for (const item of ${manyDocsCursor(
              200_000
            )}) count++; print(count);`,
            output:
              /\b200000\b|Unrecognized pipeline stage name|is not allowed in user requests/,
            includeStderr: true,
            testArgs: [
              smokeTestServer,
              '--file=$INPUT_AS_FILE',
              '--jsContext=plain-vm',
            ],
            perfTestIterations: 20,
            tags: ['db', 'cursor_iteration'],
          },*/
          {
            name: 'db_repeat_command',
            input: `let res;for (const item of [...Array(5000).keys()]) res = EJSON.stringify(db.hello()); print(res)`,
            output: /"ok": ?1\b/,
            includeStderr: false,
            exitCode: 0,
            testArgs: [
              smokeTestServer,
              '--file=$INPUT_AS_FILE',
              '--jsContext=plain-vm',
            ],
            perfTestIterations: 20,
            tags: ['db'],
          },
        ]
      : []
  )) {
    const cleanup: (() => Promise<void>)[] = [];

    let actualInput = input;
    for (const [index, arg] of testArgs.entries()) {
      if (arg.includes('$INPUT_AS_FILE')) {
        const tmpfile = path.join(
          os.tmpdir(),
          `mongosh_smoke_test_${name}_${Date.now()}.js`
        );
        await fs.writeFile(
          tmpfile,
          Array.isArray(input) ? input.join('\n') : input,
          { mode: 0o600, flag: 'wx' }
        );
        cleanup.unshift(async () => await fs.unlink(tmpfile));
        testArgs[index] = arg.replace('$INPUT_AS_FILE', tmpfile);
        actualInput = '';
      }
    }

    const smokeTestArgs = {
      name,
      executable,
      args: [...args, ...testArgs],
      input: actualInput,
      output,
      env,
      includeStderr,
      exitCode,
      printSuccessResults: !wantPerformanceTesting,
    };

    try {
      if (!wantPerformanceTesting) {
        await runSmokeTest(smokeTestArgs);
      } else {
        const created_at = new Date().toISOString();
        if (!perfTestIterations) continue;
        const durations: number[] = [];
        for (let i = 0; i < perfTestIterations; i++) {
          const { durationSeconds } = await runSmokeTest(smokeTestArgs);
          durations.push(durationSeconds);
        }
        const completed_at = new Date().toISOString();
        perfResults.push({
          info: {
            test_name: name,
            tags: [...(tags ?? []), ...commonPerfTags],
          },
          created_at,
          completed_at,
          artifacts: [],
          metrics: buildMetrics(durations),
        });
      }
    } finally {
      for (const cleaner of cleanup) await cleaner();
    }
  }
  if (wantPerformanceTesting) {
    perfResults.push({
      info: {
        test_name: 'executable_size',
        tags: [...commonPerfTags],
      },
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      artifacts: [],
      metrics: [
        {
          name: 'size_bytes_mean',
          type: 'MEAN',
          value: (await fs.stat(process.execPath)).size,
        },
      ],
    });
    console.log(JSON.stringify(perfResults));
  } else {
    console.log('all tests passed');
  }
}

/**
 * Run a single smoke test.
 *
 * @param executable The Node.js/mongosh executable to use
 * @param args Arguments to pass to the Node.js/mongosh executable
 * @param input stdin contents of the executable
 * @param output Expected contents of stdout
 */
async function runSmokeTest({
  name,
  executable,
  args,
  env,
  input,
  output,
  exitCode,
  includeStderr,
  printSuccessResults,
}: {
  name: string;
  executable: string;
  args: string[];
  env?: Record<string, string | undefined>;
  input: string | string[];
  output: RegExp;
  exitCode?: number;
  includeStderr?: boolean;
  printSuccessResults?: boolean;
}): Promise<{ durationSeconds: number }> {
  const startTime = process.hrtime.bigint();
  const proc = spawn(executable, [...args], {
    stdio: 'pipe',
    env: { ...process.env, ...env },
  });
  proc.stdin.on('error', (e: unknown) => {
    // squash write errors
    console.warn('error writing to stdin of smoke test process, ignoring', e);
  });
  let stdout = '';
  let stderr = '';
  proc.stdout!.setEncoding('utf8').on('data', (chunk) => {
    stdout += chunk;
  });
  proc.stderr?.setEncoding('utf8').on('data', (chunk) => {
    stderr += chunk;
  });
  if (Array.isArray(input)) {
    for (const chunk of input) {
      proc.stdin!.write(chunk + '\n');
    }
    proc.stdin!.end();
  } else {
    proc.stdin!.end(input);
  }
  const [[actualExitCode]] = await Promise.all([
    once(proc, 'exit'),
    once(proc.stdout!, 'end'),
    proc.stderr && once(proc.stderr, 'end'),
  ]);
  const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;
  const metadata = {
    name,
    durationSeconds,
    input,
    output,
    stdout,
    stderr: includeStderr ? stderr : '',
    executable,
    actualExitCode,
    args: args.map((arg) => redactConnectionString(arg)),
  };
  try {
    assert.match(includeStderr ? `${stdout}\n${stderr}` : stdout, output);
    assert.doesNotMatch(stderr, /ExperimentalWarning/);
    if (exitCode !== undefined) {
      assert.strictEqual(actualExitCode, exitCode);
    }
    if (printSuccessResults !== false)
      console.error({ status: 'success', ...metadata });
    return {
      durationSeconds,
    };
  } catch (err: any) {
    console.error({ status: 'failure', ...metadata });
    throw err;
  }
}

function manyDocsCursor(n: number): string {
  return `db.aggregate([
    { $documents: [{}] },
    { $set: {
      field: { $reduce: { // ~ 2**n documents
        input: [...Array(${Math.ceil(
          Math.log2(n)
        )}).keys()], initialValue: [0], in: { $concatArrays: ['$$value', '$$value'] }
      } }
    } },
    { $unwind: '$field' },
    { $limit: ${n} }
  ])`;
}

function buildMetrics(durations: number[]): PerfTestMetric[] {
  // These might not be the fastest or most numerically stable ways of computing these values,
  // but this should be fine for our purposes
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const stddev = Math.sqrt(
    durations.map((d) => (d - mean) ** 2).reduce((a, b) => a + b, 0) /
      (durations.length - 1)
  );
  durations.sort();
  const median = durations[Math.floor(durations.length * 0.5)];
  const percentile95 = durations[Math.floor(durations.length * 0.95)];
  return [
    {
      name: 'duration_sec_mean',
      type: 'MEAN',
      value: mean,
    },
    {
      name: 'duration_sec_stddev',
      type: 'STANDARD_DEVIATION',
      value: stddev,
    },
    {
      name: 'duration_sec_median',
      type: 'MEDIAN',
      value: median,
    },
    {
      name: 'duration_sec_p95',
      type: 'PERCENTILE_95TH',
      value: percentile95,
    },
  ];
}
