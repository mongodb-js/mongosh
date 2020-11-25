import { eventually } from './helpers';
import { once } from 'events';
import { spawn, ChildProcess } from 'child_process';

import path from 'path';
import stripAnsi from 'strip-ansi';
import assert from 'assert';

type SignalType = ChildProcess extends { kill: (signal: infer T) => any } ? T : never;

const PROMPT_PATTERN = /^> /m;
const ERROR_PATTERN_1 = /Thrown:\n([^>]*)/mg; // node <= 12.14
const ERROR_PATTERN_2 = /Uncaught[:\n ]+([^>]*)/mg;

/**
 * Test shell helper class.
 */
export class TestShell {
  private static _openShells: TestShell[] = [];

  static start(options: {
    args: string[];
    env?: Record<string, string>;
    removeSigintListeners?: boolean;
    cwd?: string;
  } = { args: [] }): TestShell {
    let shellProcess: ChildProcess;

    let env = options.env || process.env;

    // TODO: Test (some) cases also without MONGOSH_FORCE_TERMINAL.
    if (process.env.MONGOSH_TEST_EXECUTABLE_PATH) {
      shellProcess = spawn(process.env.MONGOSH_TEST_EXECUTABLE_PATH, [...options.args], {
        stdio: [ 'pipe', 'pipe', 'pipe' ],
        env: { ...env, MONGOSH_FORCE_TERMINAL: '1' },
        cwd: options.cwd
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

      shellProcess = spawn('node', [path.resolve(__dirname, '..', 'bin', 'mongosh.js'), ...options.args], {
        stdio: [ 'pipe', 'pipe', 'pipe' ],
        env: { ...env, MONGOSH_FORCE_TERMINAL: '1' },
        cwd: options.cwd
      });
    }

    const shell = new TestShell(shellProcess);
    TestShell._openShells.push(shell);

    return shell;
  }

  static async killall(): Promise<void> {
    const exitPromises: Promise<unknown>[] = [];
    while (TestShell._openShells.length) {
      const shell = TestShell._openShells.pop();
      shell.kill();
      exitPromises.push(shell.waitForExit());
    }
    await Promise.all(exitPromises);
  }

  private _process: ChildProcess;

  private _output: string;
  private _onClose: Promise<number>;

  constructor(shellProcess: ChildProcess) {
    this._process = shellProcess;
    this._output = '';

    shellProcess.stdout.setEncoding('utf8').on('data', (chunk) => {
      this._output += stripAnsi(chunk);
    });

    shellProcess.stderr.setEncoding('utf8').on('data', (chunk) => {
      this._output += stripAnsi(chunk);
    });

    this._onClose = (async() => {
      const [ code ] = await once(shellProcess, 'close');
      return code;
    })();
  }

  get output(): string {
    return this._output;
  }

  get process(): ChildProcess {
    return this._process;
  }

  async waitForPrompt(start = 0): Promise<void> {
    await eventually(() => {
      if (!this._output.slice(start).match(PROMPT_PATTERN)) {
        throw new assert.AssertionError({
          message: 'expected prompt',
          expected: PROMPT_PATTERN.toString(),
          actual: this._output
        });
      }
    });
  }

  waitForExit(): Promise<number> {
    return this._onClose;
  }

  kill(signal?: SignalType): void {
    this._process.kill(signal);
  }

  writeInput(chars: string): void {
    this._process.stdin.write(chars);
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

  assertNoErrors(): void {
    const allErrors = this._getAllErrors();

    if (allErrors.length) {
      throw new assert.AssertionError({
        message: `Expected no errors in stdout but got: ${allErrors[0]}`,
        expected: '',
        actual: this._output
      });
    }
  }

  assertContainsOutput(expectedOutput: string): void {
    const onlyOutputLines = this._getOutputLines();
    if (!onlyOutputLines.join('\n').includes(expectedOutput)) {
      throw new assert.AssertionError({
        message: `Expected shell output to include ${JSON.stringify(expectedOutput)}`,
        actual: this._output,
        expected: expectedOutput
      });
    }
  }

  assertContainsError(expectedError: string): void {
    const allErrors = this._getAllErrors();

    if (!allErrors.find((error) => error.includes(expectedError))) {
      throw new assert.AssertionError({
        message: `Expected shell errors to include ${JSON.stringify(expectedError)}`,
        actual: this._output,
        expected: expectedError
      });
    }
  }

  assertNotContainsOutput(unexpectedOutput: string): void {
    const onlyOutputLines = this._getOutputLines();
    if (onlyOutputLines.join('\n').includes(unexpectedOutput)) {
      throw new assert.AssertionError({
        message: `Expected shell output not  to include ${JSON.stringify(unexpectedOutput)}`,
        actual: this._output,
        expected: `NOT ${unexpectedOutput}`
      });
    }
  }

  private _getOutputLines(): string[] {
    return this._output.split('\n')
      .filter((line) => !line.match(PROMPT_PATTERN));
  }

  private _getAllErrors(): string[] {
    const output = (this._output as any);
    return [
      ...output.matchAll(ERROR_PATTERN_1),
      ...output.matchAll(ERROR_PATTERN_2)
    ]
      .map(m => m[1].trim());
  }

  get sessionId(): string | null {
    const match = this._output.match(/^Current sessionID:\s*(?<sessionId>[a-z0-9]{24})$/m);
    if (!match) {
      return null;
    }
    return match.groups.sessionId;
  }
}
