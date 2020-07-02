import { StringDecoder } from 'string_decoder';
import { eventually } from './helpers';

import { spawn, ChildProcess } from 'child_process';

import path from 'path';
import stripAnsi from 'strip-ansi';
import assert from 'assert';

const PROMPT_PATTERN = /^> /m;
const ERROR_PATTERN_1 = /Thrown:\n([^>]*)/m; // node <= 12.14
const ERROR_PATTERN_2 = /Uncaught[:\n ]+([^>]*)/m;

/**
 * Test shell helper class.
 */
export class TestShell {
  private static _openShells: TestShell[] = [];

  static start(options: {
    args: string[];
  } = { args: [] }): TestShell {
    let shellProcess: ChildProcess;

    if (process.env.MONGOSH_TEST_EXECUTABLE_PATH) {
      shellProcess = spawn(process.env.MONGOSH_TEST_EXECUTABLE_PATH, [...options.args], {
        stdio: [ 'pipe', 'pipe', 'pipe' ]
      });
    } else {
      shellProcess = spawn('node', [path.resolve(__dirname, '..', 'bin', 'mongosh.js'), ...options.args], {
        stdio: [ 'pipe', 'pipe', 'pipe' ]
      });
    }

    const shell = new TestShell(shellProcess);
    TestShell._openShells.push(shell);

    return shell;
  }

  static killall(): void {
    while (TestShell._openShells.length) {
      TestShell._openShells.pop().kill();
    }
  }

  private _process: ChildProcess;

  private _output: string;

  constructor(shellProcess: ChildProcess) {
    this._process = shellProcess;
    this._output = '';

    const stdoutDecoder = new StringDecoder();

    shellProcess.stdout.on('data', (chunk) => {
      this._output += stripAnsi(stdoutDecoder.write(chunk));
    });

    const stderrDecoder = new StringDecoder();

    shellProcess.stderr.on('data', (chunk) => {
      this._output += stripAnsi(stderrDecoder.write(chunk));
    });
  }

  get output(): string {
    return this._output;
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

  kill(): void {
    this._process.kill();
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

    console.log(allErrors);

    if (!allErrors.find((error) => error.includes(expectedError))) {
      throw new assert.AssertionError({
        message: `Expected shell errors to include ${JSON.stringify(expectedError)}`,
        actual: this._output,
        expected: expectedError
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
}
