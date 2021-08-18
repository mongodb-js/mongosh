import spawn from 'cross-spawn';
import * as fse from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { signatures, ShellPlugin, ShellInternalState, TypeSignature } from '@mongosh/shell-api';
import type { ShellUserConfig, MongoshBus } from '@mongosh/types';

export interface EditorOptions {
  vscodeDir: string,
  tmpDir: string,
  internalState: ShellInternalState;
}

export class Editor implements ShellPlugin {
  _vscodeDir: string;
  _tmpDir: string;
  _tmpDocName: string;
  _internalState: ShellInternalState;
  load: (filename: string) => Promise<void>;
  require: any;
  config: { get<T extends keyof ShellUserConfig>(key: T): Promise<ShellUserConfig[T]> };
  print: (...args: any[]) => Promise<void>;
  npmArgv: string[];

  constructor({ vscodeDir, tmpDir, internalState }: EditorOptions) {
    const { load, config, print, require } = internalState.context;
    this._vscodeDir = vscodeDir;
    this._tmpDir = tmpDir;
    this._tmpDocName = `edit-${uuidv4()}`;
    this._internalState = internalState;
    this.load = load;
    this.config = config;
    this.print = print;
    this.require = require;
    this.npmArgv = [];

    // Add edit command support to shell api.
    const wrapperFn = (...args: string[]) => {
      return Object.assign(this.runEditorCommand(args), {
        [Symbol.for('@@mongosh.syntheticPromise')]: true
      });
    };
    wrapperFn.isDirectShellCommand = true;
    wrapperFn.returnsPromise = true;
    (internalState.shellApi as any).edit = internalState.context.edit = wrapperFn;
    (signatures.ShellApi.attributes as any).edit = {
      type: 'function',
      returnsPromise: true,
      isDirectShellCommand: true,
    } as TypeSignature;
  }

  activate(): void {
    this._internalState.registerPlugin(this);
  }

  // In the case of using VSCode as an external editor,
  // we should detect whether the MongoDB extension is installed and open a .mongodb file.
  // In all other cases we should open a .js file.
  async getExtension(cmd: string): Promise<string> {
    if (!cmd.includes('code')) {
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

  async runEditorCommand([ identifier, ...args ]: string[]): Promise<string> {
    await this.print('Opening an editor...');

    // Check for an external editor in the mongosh configuration.
    let editor: string | null = await this._internalState.shellApi.config.get('editor');

    // Check for an external editor in the environment variable.
    if (!editor && process.env.EDITOR) {
      editor = process.env.EDITOR;
    }

    // If none of the above configurations are found return an error.
    if (!editor) {
      throw new Error(`Command failed: ${[identifier, ...args].join(' ')} with an error: please define an external editor`);
    }

    const [ cmd, ...cmdArgs ] = editor.split(' ');
    const ext = await this.getExtension(cmd);
    const tmpdoc = path.join(this._tmpDir, `${this._tmpDocName}.${ext}`);

    // Create a temp file to store content that is being edited.
    await fse.ensureFile(tmpdoc);
    this.messageBus.emit('mongosh-editor:run-edit-command', {
      tmpdoc,
      editor,
      args: [ identifier, ...cmdArgs, ...args ]
    });

    // Wait for an editor to close the file.
    const proc = spawn.sync(cmd, [tmpdoc, ...cmdArgs, ...args], {
      env: { ...process.env, MONGOSH_RUN_NODE_SCRIPT: '1' },
      stdio: 'inherit'
    });

    if (proc.error) {
      this.messageBus.emit('mongosh-editor:run-edit-command-failed', {
        action: 'spawn-child-sync',
        error: proc.error.message
      });
      throw proc.error;
    }

    const stdout = proc.stdout?.toString();
    const stderr = proc.stderr?.toString();

    if (proc.status !== 0) {
      throw new Error(`Command failed '${cmd} ${[identifier, ...args, ...cmdArgs].join(' ')}' with exit code ${proc.status}: ${stderr} ${stdout}`);
    }

    return fse.readFile(tmpdoc, 'utf8');
  }

  get messageBus(): MongoshBus {
    return this._internalState.messageBus;
  }

  transformError(err: Error): Error {
    return err;
  }
}
