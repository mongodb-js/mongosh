import * as fse from 'fs-extra';
import * as path from 'path';
import { once } from 'events';
import { Readable } from 'stream';
import spawn from 'cross-spawn';
import { v4 as uuidv4 } from 'uuid';
import { signatures, ShellPlugin, ShellInstanceState, TypeSignature } from '@mongosh/shell-api';

import type { MongoshBus } from '@mongosh/types';

const beautify = require('js-beautify').js;

interface EditorSession {
  cmd: string;
  args: string[];
  content: string;
  code: string;
  tmpDoc: string;
}

export interface EditorOptions {
  input: Readable;
  vscodeDir: string;
  tmpDir: string;
  instanceState: ShellInstanceState;
  makeMultilineJSIntoSingleLine: any;
  loadExternalCode: any;
}

export class Editor implements ShellPlugin {
  _input: Readable;
  _vscodeDir: string;
  _tmpDir: string;
  _instanceState: ShellInstanceState;
  _makeMultilineJSIntoSingleLine: any;
  _loadExternalCode: any;
  require: any;
  _editorSession: EditorSession;
  print: (...args: any[]) => Promise<void>;

  constructor({ input, vscodeDir, tmpDir, instanceState, makeMultilineJSIntoSingleLine, loadExternalCode }: EditorOptions) {
    this._input = input;
    this._vscodeDir = vscodeDir;
    this._tmpDir = tmpDir;
    this._instanceState = instanceState;
    this._makeMultilineJSIntoSingleLine = makeMultilineJSIntoSingleLine;
    this._loadExternalCode = loadExternalCode;
    this._editorSession = { cmd: '', args: [], content: '', code: '', tmpDoc: '' };
    this.print = instanceState.context.print;

    // Add edit command support to shell api.
    const wrapperFn = (...args: string[]) => {
      return Object.assign(this.runEditCommand(args), {
        [Symbol.for('@@mongosh.syntheticPromise')]: true
      });
    };

    wrapperFn.isDirectShellCommand = true;
    wrapperFn.returnsPromise = true;
    (instanceState.shellApi as any).edit = instanceState.context.edit = wrapperFn;
    (signatures.ShellApi.attributes as any).edit = {
      type: 'function',
      returnsPromise: true,
      isDirectShellCommand: true
    } as TypeSignature;
  }

  activate(): void {
    this._instanceState.registerPlugin(this);
  }

  // In the case of using VSCode as an external editor,
  // we should detect whether the MongoDB extension is installed and open a .mongodb file.
  // In all other cases we should open a .js file.
  async _getExtension(cmd: string): Promise<string> {
    if (!this._isVscodeApp(cmd)) {
      return 'js';
    }

    try {
      const extensions = await fse.readdir(path.join(this._vscodeDir, 'extensions'));
      const hasMongodbExtension = !!extensions
        .find((name) => name.includes('mongodb.mongodb-vscode'));

      this.messageBus.emit('mongosh-editor:read-vscode-extensions-done', {
        vscodeDir: this._vscodeDir,
        hasMongodbExtension
      });

      return hasMongodbExtension ? 'mongodb' : 'js';
    } catch (error) {
      this.messageBus.emit('mongosh-editor:read-vscode-extensions-failed', {
        action: 'mongosh-editor:read-vscode-extensions-failed',
        error: error.message
      });

      return 'js';
    }
  }

  async _getEditor(): Promise<string|null> {
    // Check for an external editor in the mongosh configuration.
    let editor: string | null = await this._instanceState.shellApi.config.get('editor');

    // Check for an external editor in the environment variable.
    if (!editor && process.env.EDITOR) {
      editor = process.env.EDITOR;
    }

    return editor;
  }

  async _createTempFile(): Promise<void> {
    const ext = await this._getExtension(this._editorSession.cmd);
    const content = await this._getEditorContent();

    this._editorSession.tmpDoc = path.join(this._tmpDir, `edit-${uuidv4()}.${ext}`);

    // Create a temp file to store content that is being edited.
    await fse.ensureFile(this._editorSession.tmpDoc);
    await fse.writeFile(this._editorSession.tmpDoc, beautify(content));
  }

  async _readTempFile(tmpDoc: string): Promise<string> {
    const content = await fse.readFile(tmpDoc, 'utf8');
    await fse.unlink(tmpDoc);
    return this._makeMultilineJSIntoSingleLine(content);
  }

  _isVscodeApp(cmd: string): boolean {
    const regex = /^((.*[\/\\])*)?[cC]ode(.exe)?$/;

    try {
      return !!regex.exec(cmd);
    } catch (error) {
      this.messageBus.emit('mongosh-editor:is-vscode-app-regex-failed', { regex, cmd });
      return false;
    }
  }

  _isStatement(code: string): boolean {
    const regex = /\b[^()]+\((.*)\)$/;

    try {
      return !!regex.exec(code);
    } catch (error) {
      this.messageBus.emit('mongosh-editor:is-statement-regex-failed', { regex, code });
      return false;
    }
  }

  async _getEditorContent(): Promise<string> {
    if (!this._editorSession.code) {
      return this._editorSession.content;
    }

    const evalResult = await this._loadExternalCode(this._editorSession.code, '@(shell eval)');
    return this._isStatement(this._editorSession.code) ? this._editorSession.code : evalResult.toString();
  }

  async runEditCommand([ code, ...args ]: string[]): Promise<void> {
    await this.print('Opening an editor...');
    const editor: string|null = await this._getEditor();

    // If none of the above configurations are found return an error.
    if (!editor) {
      throw new Error(`Command failed: ${[code, ...args].join(' ')} with an error: please define an external editor`);
    }

    const [ cmd, ...cmdArgs ] = editor.split(' ');

    this._editorSession.cmd = cmd;
    this._editorSession.args = [ ...args, ...cmdArgs ];
    this._editorSession.code = code;

    this.messageBus.emit('mongosh-editor:run-edit-command', {
      tmpdoc: this._editorSession.tmpDoc,
      editor,
      args: this._editorSession.args
    });

    await this._createTempFile();
    await this._runInChildProcess();
  }

  async _runInChildProcess(): Promise<void> {
    const { cmd, tmpDoc, args, code } = this._editorSession;
    const proc = spawn(cmd, [tmpDoc, ...args], {
      env: { ...process.env, MONGOSH_RUN_NODE_SCRIPT: '1' },
      stdio: 'inherit'
    });

    let stdout = '';
    let stderr = '';

    if (proc.stdout) {
      proc.stdout.on('data', (chunk) => { stdout += chunk; });
    }
    if (proc.stderr) {
      proc.stderr.on('data', (chunk) => { stderr += chunk; });
    }

    this._input.pause();

    try {
      const [ exitCode ] = await once(proc, 'close');

      if (exitCode === 0) {
        const content = await this._readTempFile(tmpDoc);
        this._input.unshift(content);
        return;
      }

      // Allow exit code 1 if stderr is empty, i.e. no error occurred, because
      // that is how commands like `npm outdated` report their result.
      if (exitCode === 1 && stderr === '' && stdout) {
        stderr = stdout;
      }

      throw new Error(`Command failed '${cmd} ${[code, ...args].join(' ')}' with exit code ${exitCode}: ${stderr} ${stdout}`);
    } finally {
      this._input.resume();
      if (proc.exitCode === null && proc.signalCode === null) {
        proc.kill(); // Not exited yet, i.e. this was interrupted.
      }
    }
  }

  get messageBus(): MongoshBus {
    return this._instanceState.messageBus;
  }

  transformError(err: Error): Error {
    return err;
  }
}
