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
import { eventually } from '../../../testing/eventually';

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
   * Beware that the caller is responsible for calling {@link kill} (and potentially {@link waitForAnyExit}).
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
    void shell.waitForAnyExit().then(() => {
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

    this._onClose = (async () => {
      const [code] = await once(shellProcess, 'close');
      return code;
    })();
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

  async waitForLine(pattern: RegExp, start = 0): Promise<void> {
    await eventually(() => {
      const output = this._output.slice(start);
      const lines = output.split('\n');
      const found = !!lines.filter((l) => pattern.exec(l));
      if (!found) {
        throw new assert.AssertionError({
          message: 'expected line',
          expected: pattern.toString(),
          actual:
            this._output.slice(0, start) + '[line search starts here]' + output,
        });
      }
    });
  }

  async waitForPrompt(
    start = 0,
    opts: { timeout?: number; promptPattern?: RegExp } = {}
  ): Promise<void> {
    await eventually(
      () => {
        const output = this._output.slice(start);
        const lines = output.split('\n');
        const found = !!lines
          .filter((l) => (opts.promptPattern ?? PROMPT_PATTERN).test(l)) // a line that is the prompt must at least match the pattern
          .find((l) => {
            // in some situations the prompt occurs multiple times in the line (but only in tests!)
            const prompts = l
              .trim()
              .replace(/>$/g, '')
              .split('>')
              .map((m) => m.trim());
            // if there are multiple prompt parts they must all equal
            if (prompts.length > 1) {
              for (const p of prompts) {
                if (p !== prompts[0]) {
                  return false;
                }
              }
            }
            return true;
          });
        if (!found) {
          throw new assert.AssertionError({
            message: 'expected prompt',
            expected: PROMPT_PATTERN.toString(),
            actual:
              this._output.slice(0, start) +
              '[prompt search starts here]' +
              output,
          });
        }
      },
      { ...opts }
    );
  }

  waitForAnyExit(): Promise<number> {
    return this._onClose;
  }

  async waitForSuccessfulExit(): Promise<void> {
    assert.strictEqual(await this.waitForAnyExit(), 0);
    this.assertNoErrors();
  }

  /**
   * Waits for the shell to exit, asserts no errors and returns the output.
   */
  async waitForCleanOutput(): Promise<string> {
    await this.waitForSuccessfulExit();
    return this.output;
  }

  async waitForPromptOrExit(
    opts: { timeout?: number; start?: number } = {}
  ): Promise<TestShellStartupResult> {
    return Promise.race([
      this.waitForPrompt(opts.start ?? 0, opts).then(
        () => ({ state: 'prompt' } as const)
      ),
      this.waitForAnyExit().then(
        (c) => ({ state: 'exit', exitCode: c } as const)
      ),
    ]);
  }

  kill(signal?: SignalType): void {
    this._process.kill(signal);
  }

  writeInput(chars: string, { end = false } = {}): void {
    this._process.stdin.write(chars);
    if (end) this._process.stdin.end();
  }

  writeInputLine(chars: string): void {
    this.writeInput(`${chars}\n`);
  }

  async executeLine(line: string): Promise<string> {
    const previousOutputLength = this._output.length;
    this.writeInputLine(line);
    await this.waitForPrompt(previousOutputLength);
    return this._output.slice(previousOutputLength);
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
    const matches = this._output.match(
      /^Current Mongosh Log ID:\s*([a-z0-9]{24})$/gm
    );
    if (!matches || matches.length === 0) {
      return null;
    }
    const lastMatch = /^Current Mongosh Log ID:\s*([a-z0-9]{24})$/.exec(
      matches[matches.length - 1]
    );
    return lastMatch ? lastMatch[1] : null;
  }
}
