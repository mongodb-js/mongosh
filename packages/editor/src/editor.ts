import * as path from 'path';
import { once } from 'events';
import { promises as fs } from 'fs';
import { Readable } from 'stream';
import spawn from 'cross-spawn';

import { bson } from '@mongosh/service-provider-core';
import { signatures, ShellInstanceState, TypeSignature } from '@mongosh/shell-api';
import { ShellResult } from '@mongosh/shell-evaluator';

import type { MongoshBus } from '@mongosh/types';

const beautify = require('js-beautify').js;

export interface EditorOptions {
  input: Readable;
  vscodeDir: string;
  tmpDir: string;
  instanceState: ShellInstanceState;
  makeMultilineJSIntoSingleLine: any;
  loadExternalCode: any;
}

export class Editor {
  _input: Readable;
  _vscodeDir: string;
  _tmpDir: string;
  _instanceState: ShellInstanceState;
  _makeMultilineJSIntoSingleLine: (code: string) => string;
  _loadExternalCode: (input: string, filename: string) => Promise<ShellResult>;
  _content: string;
  require: any;
  print: (...args: any[]) => Promise<void>;

  constructor({ input, vscodeDir, tmpDir, instanceState, makeMultilineJSIntoSingleLine, loadExternalCode }: EditorOptions) {
    this._input = input;
    this._vscodeDir = vscodeDir;
    this._tmpDir = tmpDir;
    this._instanceState = instanceState;
    this._makeMultilineJSIntoSingleLine = makeMultilineJSIntoSingleLine;
    this._loadExternalCode = loadExternalCode;
    this._content = '';
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

  static create(options: EditorOptions): Editor {
    return new Editor(options);
  }

  // In the case of using VSCode as an external editor,
  // detect whether the MongoDB extension is installed and open a .mongodb file.
  // In all other cases open a .js file.
  async _getExtension(cmd: string): Promise<string> {
    if (!this._isVscodeApp(cmd)) {
      return 'js';
    }

    try {
      const extensions = await fs.readdir(path.join(this._vscodeDir, 'extensions'));
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

  async _createTempFile({ content, ext }: { content: string; ext: string }): Promise<string> {
    const tmpDoc = path.join(this._tmpDir, `edit-${new bson.ObjectId()}.${ext}`);

    // Create a temp file to store content that is being edited.
    await fs.mkdir(path.dirname(tmpDoc), { recursive: true, mode: 0o600 });
    await fs.writeFile(tmpDoc, beautify(content));

    return tmpDoc;
  }

  async _readTempFile(tmpDoc: string): Promise<string> {
    const content = await fs.readFile(tmpDoc, 'utf8');
    await fs.unlink(tmpDoc);
    return this._makeMultilineJSIntoSingleLine(content);
  }

  _isVscodeApp(cmd: string): boolean {
    const regex = /^(.*)[\/\\]?[cC]ode(.exe)?$/;
    return regex.test(cmd);
  }

  _isStatement(code: string): boolean {
    const regex = /\b[^()]+\((.*)\)$/;
    return regex.test(code);
  }

  async _getEditorContent(code: string): Promise<string> {
    if (!code) {
      return this._content;
    }

    if (this._isStatement(code)) {
      return code;
    }

    const evalResult = await this._loadExternalCode(code, '@(shell eval)');
    return evalResult.toString();
  }

  async runEditCommand([ code, ...codeArgs ]: string[]): Promise<void> {
    await this.print('Opening an editor...');
    const editor: string|null = await this._getEditor();

    // If none of the above configurations are found return an error.
    if (!editor) {
      throw new Error(`Command failed: ${[code, ...codeArgs].join(' ')} with an error: please define an external editor`);
    }

    const [ editorName, ...editorArgs ] = editor.split(' ');
    const content = await this._getEditorContent(code);
    const ext = await this._getExtension(editorName);
    const args = [ ...codeArgs, ...editorArgs ];
    const tmpDoc = await this._createTempFile({ content, ext });

    this.messageBus.emit('mongosh-editor:run-edit-command', {
      tmpDoc,
      editor,
      args
    });

    const proc = spawn(editorName, [tmpDoc, ...args], {
      stdio: 'inherit'
    });

    let stdout = '';
    let stderr = '';

    if (proc.stdout) {
      (proc.stdout as NodeJS.ReadableStream).setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    }
    if (proc.stderr) {
      (proc.stdout as NodeJS.ReadableStream).setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    }

    this._input.pause();

    try {
      const [ exitCode ] = await once(proc, 'exit');

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

      throw new Error(`Command failed '${editorName} ${[code, ...args].join(' ')}' with exit code ${exitCode}: ${stderr} ${stdout}`);
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
}
