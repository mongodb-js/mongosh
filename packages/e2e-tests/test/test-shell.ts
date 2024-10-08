import assert from 'assert';
import type {
  ChildProcess,
  ChildProcessWithoutNullStreams,
} from 'child_process';
import { spawn } from 'child_process';
import { once } from 'events';
import { inspect } from 'util';
import path from 'path';
import stripAnsi from 'strip-ansi';
import { EJSON } from 'bson';

/* eslint-disable mocha/no-exports -- This file export hooks wrapping Mocha's Hooks APIs */

export type TestShellStartupResult =
  | { state: 'prompt' }
  | { state: 'exit'; exitCode: number };
type SignalType = ChildProcess extends { kill: (signal: infer T) => any }
  ? T
  : never;

// Assume that prompt strings are those that end in '> ' but do not contain
// < or > (so that e.g. '- <repl>' in a stack trace is not considered a prompt).
const PROMPT_PATTERN = /^([^<>]*> ?)+$/m;
const ERROR_PATTERN_1 = /Thrown:\n([^>]*)/gm; // node <= 12.14
const ERROR_PATTERN_2 = /Uncaught[:\n ]+([^>]*)/gm;

function matches(str: string, pattern: string | RegExp): boolean {
  return typeof pattern === 'string'
    ? str.includes(pattern)
    : pattern.test(str);
}

export interface TestShellOptions {
  args: string[];
  env?: Record<string, string>;
  removeSigintListeners?: boolean;
  cwd?: string;
  forceTerminal?: boolean;
  consumeStdio?: boolean;
}

/**
 * Test shell helper class.
 */
export class TestShell {
  private static _openShells: Set<TestShell> = new Set();

  /**
   * Starts a test shell.
   *
   * Beware that the caller is responsible for calling {@link kill} (and potentially {@link waitForExit}).
   *
   * Consider calling the `startTestShell` function on a {@link Mocha.Context} instead, as that manages the lifetime the shell
   * and ensures it gets killed eventually.
   */
  static start(options: TestShellOptions = { args: [] }): TestShell {
    let shellProcess: ChildProcessWithoutNullStreams;

    let env = options.env || process.env;
    if (options.forceTerminal) {
      env = { ...env, MONGOSH_FORCE_TERMINAL: '1' };
    }

    const args = [...options.args];
    if (process.env.MONGOSH_TEST_E2E_FORCE_FIPS) {
      args.push('--tlsFIPSMode');
    }

    if (process.env.MONGOSH_TEST_EXECUTABLE_PATH) {
      shellProcess = spawn(process.env.MONGOSH_TEST_EXECUTABLE_PATH, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env,
        cwd: options.cwd,
      });
    } else {
      if (options.removeSigintListeners) {
        // We set CLEAR_SIGINT_LISTENERS to remove all `process.on('SIGINT')`
        // listeners during Shell startup. This is unfortunately necessary,
        // because nyc registers a listener that is used to gather coverage
        // in case of an unclean exit for several signals, but this particular
        // one interferes with testing the actual process.on('SIGINT')
        // functionality here.
        env = { ...env, CLEAR_SIGINT_LISTENERS: '1' };
      }

      shellProcess = spawn(
        'node',
        [
          path.resolve(__dirname, '..', '..', 'cli-repl', 'bin', 'mongosh.js'),
          ...args,
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: env,
          cwd: options.cwd,
        }
      );
    }

    const shell = new TestShell(shellProcess, options.consumeStdio);
    TestShell._openShells.add(shell);
    void shell.waitForExit().then(() => {
      TestShell._openShells.delete(shell);
    });

    return shell;
  }

  debugInformation() {
    return {
      pid: this.process.pid,
      output: this.output,
      rawOutput: this.rawOutput,
      exitCode: this.process.exitCode,
      signal: this.process.signalCode,
    };
  }

  static printShells() {
    for (const shell of TestShell._openShells) {
      console.error(shell.debugInformation());
    }
  }

  static assertNoOpenShells() {
    const debugInformation = [...TestShell._openShells].map((shell) =>
      shell.debugInformation()
    );
    assert.strictEqual(
      TestShell._openShells.size,
      0,
      `Expected no open shells, found: ${JSON.stringify(
        debugInformation,
        null,
        2
      )}`
    );
  }

  private _process: ChildProcessWithoutNullStreams;

  private _output: string;
  private _rawOutput: string;
  private _onClose: Promise<number>;
  private _previousOutputLength = 0;

  constructor(
    shellProcess: ChildProcessWithoutNullStreams,
    consumeStdio = true
  ) {
    this._process = shellProcess;
    this._output = '';
    this._rawOutput = '';

    if (consumeStdio) {
      shellProcess.stdout.setEncoding('utf8').on('data', (chunk) => {
        this._output += stripAnsi(chunk);
        this._rawOutput += chunk;
      });

      shellProcess.stderr.setEncoding('utf8').on('data', (chunk) => {
        this._output += stripAnsi(chunk);
        this._rawOutput += chunk;
      });
    }

    this._onClose = once(shellProcess, 'close').then(([code]) => code);
  }

  get output(): string {
    return this._output;
  }

  get rawOutput(): string {
    return this._rawOutput;
  }

  get process(): ChildProcessWithoutNullStreams {
    return this._process;
  }

  /**
   * Wait for the last line of the output to become a prompt and resolve with it
   */
  async waitForPrompt(start = 0): Promise<string> {
    return this.eventually(() => {
      const output = this._output.slice(start).trim();
      const lines = output.split('\n');
      const lastLine = lines[lines.length - 1];
      assert(
        PROMPT_PATTERN.test(lastLine),
        `Expected a prompt (last line was "${lastLine}")`
      );
      return lastLine;
    });
  }

  waitForExit(): Promise<number> {
    return this._onClose;
  }

  /**
   * Waits for the shell to exit, asserts no errors and returns the output.
   */
  async waitForCleanOutput(): Promise<string> {
    await this.waitForExit();
    this.assertNoErrors();
    return this.output;
  }

  async waitForPromptOrExit(): Promise<TestShellStartupResult> {
    return Promise.race([
      this.waitForPrompt().then(() => ({ state: 'prompt' } as const)),
      this.waitForExit().then((c) => ({ state: 'exit', exitCode: c } as const)),
    ]);
  }

  /**
   * Like the `eventually` utility, but instead of calling the callback on a timer,
   * the callback is called as output is emitted.
   */
  eventually<T = unknown>(
    cb: () => Promise<T> | T,
    { timeout = 10_000 }: { timeout?: number } = {}
  ) {
    return new Promise<T>((resolve, reject) => {
      const { stdout, stderr } = this._process;
      let lastError: Error | null = null;
      let currentCheck = Promise.resolve();

      const timeoutTimer = setTimeout(() => {
        cleanUp();
        reject(
          new Error(
            `Timed out (waited ${timeout}ms): ${
              lastError instanceof Error ? lastError.message : 'No cause'
            }`
          )
        );
      }, timeout);

      function check() {
        // Awaits any previous check to ensure there's only one check in-flight
        // This is to prevent a new call to the `cb` if a previous call returned a promise which hasn't yet resolved
        currentCheck = currentCheck.then(async () => {
          try {
            const result = await cb();
            cleanUp();
            resolve(result);
          } catch (err) {
            if (err instanceof Error) {
              lastError = err;
            } else {
              throw new Error(
                'Expected the callback to throw instances of Error'
              );
            }
          }
        }, reject);
      }

      function cleanUp() {
        stdout.off('data', check);
        stderr.off('data', check);
        clearTimeout(timeoutTimer);
      }

      // Check as the process emits output
      stdout.on('data', check);
      stderr.on('data', check);
      // Check right away
      process.nextTick(check);
    });
  }

  kill(signal?: SignalType): void {
    this._process.kill(signal);
  }

  writeInput(chars: string, { end = false } = {}): void {
    this._process.stdin.write(chars);
    if (end) this._process.stdin.end();
  }

  writeInputLine(chars: string): void {
    this.writeInput(`${chars.trim()}\n`);
  }

  async executeLine(line: string): Promise<string> {
    // Waiting for a prompt to appear since the last execution
    await this.waitForPrompt(this._previousOutputLength);
    // Keeping an the length of the output to return only output as result of the input
    const outputLengthBefore = this._output.length;
    this.writeInputLine(line);
    // Wait for the execution and a new prompt to appear
    const prompt = await this.waitForPrompt(outputLengthBefore);
    // Store the output (excluding the following prompt)
    const output = this._output.slice(
      outputLengthBefore,
      this._output.length - prompt.length - 1
    );
    // Storing the output for future executions
    this._previousOutputLength = outputLengthBefore + output.length;
    return output;
  }

  async executeLineWithJSONResult(line: string): Promise<any> {
    const output = await this.executeLine(
      `">>>>>>" + EJSON.stringify(${line}, {relaxed:false}) + "<<<<<<"`
    );
    const matching = output.match(/>>>>>>(.+)<<<<<</)?.[1];
    if (!matching)
      throw new Error(`Could not parse output from line: '${output}'`);
    return EJSON.parse(matching);
  }

  assertNoErrors(): void {
    const allErrors = this._getAllErrors();

    if (allErrors.length) {
      throw new assert.AssertionError({
        message: `Expected no errors in stdout but got: ${allErrors[0]}`,
        expected: '',
        actual: this._output,
      });
    }
  }

  assertContainsOutput(expectedOutput: string | RegExp): void {
    const onlyOutputLines = this._getOutputLines();
    if (!matches(onlyOutputLines.join('\n'), expectedOutput)) {
      throw new assert.AssertionError({
        message: `Expected shell output to include ${inspect(expectedOutput)}`,
        actual: this._output,
        expected: expectedOutput,
      });
    }
  }

  assertContainsError(expectedError: string | RegExp): void {
    const allErrors = this._getAllErrors();

    if (!allErrors.find((error) => matches(error, expectedError))) {
      throw new assert.AssertionError({
        message: `Expected shell errors to include ${inspect(expectedError)}`,
        actual: this._output,
        expected: expectedError,
      });
    }
  }

  assertNotContainsOutput(unexpectedOutput: string | RegExp): void {
    const onlyOutputLines = this._getOutputLines();
    if (matches(onlyOutputLines.join('\n'), unexpectedOutput)) {
      throw new assert.AssertionError({
        message: `Expected shell output not  to include ${inspect(
          unexpectedOutput
        )}`,
        actual: this._output,
        expected: `NOT ${unexpectedOutput}`,
      });
    }
  }

  private _getOutputLines(): string[] {
    return this._output.split('\n');
  }

  private _getAllErrors(): string[] {
    const output = this._output as any;
    return [
      ...output.matchAll(ERROR_PATTERN_1),
      ...output.matchAll(ERROR_PATTERN_2),
    ].map((m) => m[1].trim());
  }

  get logId(): string | null {
    const match = /^Current Mongosh Log ID:\s*(?<logId>[a-z0-9]{24})$/m.exec(
      this._output
    );
    if (!match) {
      return null;
    }
    return match.groups!.logId;
  }
}
