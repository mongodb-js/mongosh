import chai, { expect } from 'chai';
import { Duplex, PassThrough } from 'stream';
import path from 'path';
import { promises as fs } from 'fs';
import sinonChai from 'sinon-chai';
import sinon from 'ts-sinon';
import { v4 as uuidv4 } from 'uuid';

import { Editor } from './editor';
import Nanobus from 'nanobus';
import { eventually } from '../../../testing/eventually';

chai.use(sinonChai);

describe('Editor', () => {
  let input: Duplex;
  let base: string;
  let vscodeDir: string;
  let tmpDir: string;
  let contextObject: any;
  let editor: Editor;
  let makeEditor: () => Editor;
  let busMessages: ({ ev: any, data?: any })[];

  beforeEach(async() => {
    input = new PassThrough();
    base = path.resolve(__dirname, '..', '..', '..', 'tmp', 'test', `${Date.now()}`, `${uuidv4()}`);
    vscodeDir = path.join(base, '.vscode');
    tmpDir = path.join(base, 'editor');
    contextObject = {
      config: {
        // eslint-disable-next-line @typescript-eslint/require-await
        async get(key: string): Promise<any> {
          switch (key) {
            case 'editor':
              return 'notexistingeditor';
            default:
              throw new Error(`Don’t know what to do with config key ${key}`);
          }
        }
      },
      print: sinon.stub()
    };
    busMessages = [];

    const messageBus = new Nanobus('mongosh-editor-test');

    makeEditor = () => new Editor({
      input,
      vscodeDir,
      tmpDir,
      instanceState: {
        context: contextObject,
        shellApi: contextObject,
        registerPlugin: sinon.stub(),
        messageBus
      } as any,
      makeMultilineJSIntoSingleLine: sinon.stub(),
      loadExternalCode: sinon.stub()
    });

    editor = makeEditor();
    messageBus.on('*', (ev: any, data: any) => {
      if (typeof data === 'number') {
        busMessages.push({ ev });
      } else {
        busMessages.push({ ev, data });
      }
    });

    // make nyc happy when we spawn npm below
    await fs.mkdir(path.resolve(__dirname, '..', '..', '..', 'tmp', '.nyc_output', 'processinfo'), { recursive: true });
  });

  afterEach(async() => {
    await eventually(async() => {
      // This can fail when an index fetch is being written while we are removing
      // the directory; hence, try again.
      await fs.rmdir(tmpDir, { recursive: true });
    });
  });

  it('returns an error for not existing editor', async() => {
    try {
      await editor.runEditCommand([]);
    } catch (error) {
      expect(error.message).to.include('spawn notexistingeditor ENOENT');
    }
  });
});
