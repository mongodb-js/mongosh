import * as path from 'path';
import { once } from 'events';
import { promises as fs } from 'fs';
import type { Readable } from 'stream';
import { ObjectId } from 'bson';
import { makeMultilineJSIntoSingleLine } from '@mongosh/js-multiline-to-singleline';
import type { ShellInstanceState, TypeSignature } from '@mongosh/shell-api';
import { signatures } from '@mongosh/shell-api';
import type { ShellResult } from '@mongosh/shell-evaluator';
import { spawn } from 'child_process';
import type { MongoshBus } from '@mongosh/types';

const beautify = require('js-beautify').js;

export interface EditorOptions {
  input: Readable;
  vscodeDir: string;
  tmpDir: string;
  instanceState: ShellInstanceState;
  loadExternalCode: (input: string, filename: string) => Promise<ShellResult>;
}

export class Editor {
  _input: Readable;
  _vscodeDir: string;
  _tmpDir: string;
  _instanceState: ShellInstanceState;
  _loadExternalCode: (input: string, filename: string) => Promise<ShellResult>;
  _lastContent: string;
  _lastInputCode: string;
  print: (...args: any[]) => Promise<void>;

  private static signature: TypeSignature = {
    type: 'function',
    returnsPromise: true,
    isDirectShellCommand: true,
    acceptsRawInput: true,
  };

  constructor({
    input,
    vscodeDir,
    tmpDir,
    instanceState,
    loadExternalCode,
  }: EditorOptions) {
    this._input = input;
    this._vscodeDir = vscodeDir;
    this._tmpDir = tmpDir;
    this._instanceState = instanceState;
    this._loadExternalCode = loadExternalCode;
    this._lastContent = '';
    this._lastInputCode = '';
    this.print = instanceState.context.print;

    // Add edit command support to shell api.
    const wrapperFn = (code: string) => {
      return Object.assign(this.runEditCommand(code), {
        [Symbol.for('@@mongosh.syntheticPromise')]: true,
      });
    };

    wrapperFn.isDirectShellCommand = true;
    wrapperFn.returnsPromise = true;
    wrapperFn.acceptsRawInput = true;
    (instanceState.shellApi as any).edit = instanceState.context.edit =
      wrapperFn;
    (signatures.ShellApi.attributes as any).edit = Editor.signature;
  }

  static create(options: EditorOptions): Editor {
    return new Editor(options);
  }

  // In case of using VSCode as an external editor,
  // detect whether the MongoDB extension is installed and open a .mongodb file.
  // If not open a .js file.
  async _getExtension(cmd: string): Promise<string> {
    if (!this._isVscodeApp(cmd)) {
      return 'js';
    }

    try {
      const extensions = await fs.readdir(
        path.join(this._vscodeDir, 'extensions')
      );
      const hasMongodbExtension = !!extensions.find((name) =>
        name.includes('mongodb.mongodb-vscode')
      );

      this.messageBus.emit('mongosh-editor:read-vscode-extensions-done', {
        vscodeDir: this._vscodeDir,
        hasMongodbExtension,
      });

      return hasMongodbExtension ? 'mongodb' : 'js';
    } catch (error: any) {
      this.messageBus.emit('mongosh-editor:read-vscode-extensions-failed', {
        vscodeDir: this._vscodeDir,
        error: error as Error,
      });

      return 'js';
    }
  }

  async _getEditor(): Promise<string | null> {
    // Check for an external editor in the mongosh configuration.
    let editor: string | null = await this._instanceState.shellApi.config.get(
      'editor'
    );

    // Check for an external editor in the environment variable.
    if (!editor && process.env.EDITOR) {
      editor = process.env.EDITOR;
    }

    return editor;
  }

  async _createTempFile({
    content,
    ext,
  }: {
    content: string;
    ext: string;
  }): Promise<string> {
    const tmpDoc = path.join(
      this._tmpDir,
      `edit-${new ObjectId().toHexString()}.${ext}`
    );

    // Create a temp file to store a content that is being edited.
    await fs.mkdir(path.dirname(tmpDoc), { recursive: true, mode: 0o700 });
    await fs.writeFile(tmpDoc, beautify(content), { mode: 0o600 });

    return tmpDoc;
  }

  async _readAndDeleteTempFile(tmpDoc: string): Promise<string> {
    // Store the last opened content inside the class and delete a temp file.
    this._lastContent = await fs.readFile(tmpDoc, 'utf8');
    await fs.unlink(tmpDoc);
    // Transform a multi-line content to a single line.
    return makeMultilineJSIntoSingleLine(this._lastContent);
  }

  _isVscodeApp(cmd: string): boolean {
    const regex = /[/\\]?[cC]ode(.exe)?(\s|$)/;
    return regex.test(cmd);
  }

  _isIdentifier(code: string): boolean {
    if (this._isNumeric(code)) {
      return false;
    }

    const regex = /^([^!"#%&'()*+,\-/[\]\\^`{|}~]+)$/;
    return regex.test(code);
  }

  _isNumeric(code: string) {
    const regex = /^-?\d+$/;
    return regex.test(code);
  }

  async _getEditorContent(code: string): Promise<string> {
    // If an empty edit command was called, return the last opened content.
    if (!code) {
      return this._lastContent;
    }

    // If code is a statement return the original input string.
    if (!this._isIdentifier(code)) {
      return code;
    }

    // If code is an identifier evaluate the string to see what the result is.
    const evalResult: any = await this._loadExternalCode(code, '@(editor)');

    if (typeof evalResult === 'function') {
      return evalResult.toString();
    }

    return JSON.stringify(evalResult);
  }

  _prepareResult({
    originalCode,
    modifiedCode,
  }: {
    originalCode: string;
    modifiedCode: string;
  }): string {
    // If code is a statement return the original input string.
    if (!this._isIdentifier(originalCode)) {
      return modifiedCode;
    }

    return `${originalCode} = ${modifiedCode}`;
  }

  _setLastInputCode(code: string): void {
    if (code !== '') {
      this._lastInputCode = code;
    }
  }

  _getLastInputCode(code: string): string {
    if (code !== '') {
      return code;
    }
    return this._lastInputCode;
  }

  async runEditCommand(code: string): Promise<void> {
    await this.print('Opening an editor...');

    const editor: string | null = await this._getEditor();

    // If none of the above configurations are found return an error.
    if (!editor) {
      throw new Error(
        'Command failed with an error: please define an external editor'
      );
    }

    this._setLastInputCode(code);

    const content = await this._getEditorContent(code);
    const ext = await this._getExtension(editor);
    const tmpDoc = await this._createTempFile({ content, ext });

    this.messageBus.emit('mongosh-editor:run-edit-command', {
      tmpDoc,
      editor,
      code,
    });

    const proc = spawn(editor, [path.basename(tmpDoc)], {
      stdio: 'inherit',
      cwd: path.dirname(tmpDoc),
      shell: true,
    });

    // Pause the parent readable stream to stop emitting data events
    // and get a child the total control over the input.
    this._input.pause();

    try {
      const [exitCode] = await once(proc, 'exit');

      if (exitCode === 0) {
        const modifiedCode = await this._readAndDeleteTempFile(tmpDoc);
        const result = this._prepareResult({
          originalCode: this._getLastInputCode(code),
          modifiedCode,
        });

        // Write a content from the editor to the parent readable stream.
        this._input.unshift(result);
        return;
      }

      throw new Error(
        `Command '${editor} ${path.basename(
          tmpDoc
        )}' failed with an exit code ${exitCode}`
      );
    } finally {
      // Resume the parent readable stream to recive data events.
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
