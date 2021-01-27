import { spawn } from 'child_process';
import assert from 'assert';
import { once } from 'events';

// Run smoke tests on a executable, e.g. runSmokeTests("/path/to/mongosh.exe")
// or runSmokeTests("/path/to/node", "packages/cli-repl/bin/mongosh.js").
export async function runSmokeTests(executable: string, ...args: string[]): Promise<void> {
  for (const { input, output, testArgs } of [{
    input: 'print("He" + "llo" + " Wor" + "ld!")',
    output: /Hello World!/,
    testArgs: ['--nodb']
  }]) {
    await runSmokeTest(executable, [...args, ...testArgs], input, output);
  }
  // eslint-disable-next-line no-console
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
  } catch (err) {
    console.error({ input, output, stdout, executable, args });
    throw err;
  }
}
