import { signatures, ShellPlugin, ShellInternalState, TypeSignature } from '@mongosh/shell-api';
import type { ShellUserConfig, MongoshBus } from '@mongosh/types';
import spawn from 'cross-spawn';
import * as fse from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface EditorOptions {
  tmpdir: string,
  internalState: ShellInternalState;
}

export class Editor implements ShellPlugin {
  _tmpdoc: string;
  _internalState: ShellInternalState;
  load: (filename: string) => Promise<void>;
  require: any;
  config: { get<T extends keyof ShellUserConfig>(key: T): Promise<ShellUserConfig[T]> };
  print: (...args: any[]) => Promise<void>;
  npmArgv: string[];

  constructor({ tmpdir, internalState }: EditorOptions) {
    const { load, config, print, require } = internalState.context;
    this._tmpdoc = path.join(tmpdir, `edit-${uuidv4()}.js`);
    this._internalState = internalState;
    this.load = load;
    this.config = config;
    this.print = print;
    this.require = require;
    this.npmArgv = [];

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

  async runEditorCommand([ identifier, ...args ]: string[]): Promise<string> {
    await this.print('Opening an editor...');
    await fse.ensureFile(this._tmpdoc);

    this.messageBus.emit('mongosh-editor:run-edit-command', {
      tmpdoc: this._tmpdoc,
      args: [ identifier, ...args ]
    });

    const proc = spawn.sync('nano', [this._tmpdoc], {
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
      throw new Error(`Command failed: ${[this._tmpdoc, identifier, ...args].join(' ')} with exit code ${proc.status}: ${stderr} ${stdout}`);
    }

    return fse.readFile(this._tmpdoc, 'utf8');
  }

  get messageBus(): MongoshBus {
    return this._internalState.messageBus;
  }

  transformError(err: Error): Error {
    return err;
  }
}
