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
  let cmd: string | null;

  beforeEach(() => {
    input = new PassThrough();
    base = path.resolve(__dirname, '..', '..', '..', 'tmp', 'test', `${Date.now()}`, `${uuidv4()}`);
    vscodeDir = path.join(base, '.vscode');
    tmpDir = path.join(base, 'editor');
    cmd = 'notexistingeditor';
    contextObject = {
      config: {
        get(key: string): any {
          switch (key) {
            case 'editor':
              return cmd;
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
  });

  afterEach(async() => {
    await eventually(async() => {
      // This can fail when an index fetch is being written while we are removing
      // the directory; hence, try again.
      await fs.rmdir(tmpDir, { recursive: true });
    });
  });

  it('runEditCommand returns an error for not existing editor', async() => {
    try {
      await editor.runEditCommand([]);
    } catch (error) {
      expect(error.message).to.include('spawn notexistingeditor ENOENT');
    }
  });

  it('_isVscodeApp returns true if command is code', () => {
    const isVscodeApp = editor._isVscodeApp('code');
    expect(isVscodeApp).to.be.equal(true);
  });

  it('_isVscodeApp returns true if command is path to code', () => {
    const isVscodeApp = editor._isVscodeApp('/usr/local/bin/code');
    expect(isVscodeApp).to.be.equal(true);
  });

  it('_isVscodeApp returns true if command is path to code on windows', () => {
    const isVscodeApp = editor._isVscodeApp('C:\\Program Files\\Microsoft VS Code\\Code.exe');
    expect(isVscodeApp).to.be.equal(true);
  });

  it('_isVscodeApp returns false if command is nano', () => {
    const isVscodeApp = editor._isVscodeApp('nano');
    expect(isVscodeApp).to.be.equal(false);
  });

  it('_isStatement returns true if command is an empty find statement', () => {
    const isStatement = editor._isStatement('db.test.find()');
    expect(isStatement).to.be.equal(true);
  });

  it('_isStatement returns true if command is a find statement with a query', () => {
    const isStatement = editor._isStatement("db.test.find({ name: 'lena' })");
    expect(isStatement).to.be.equal(true);
  });

  it('_isStatement returns false if command is an identifier', () => {
    const isStatement = editor._isStatement('db.test.find');
    expect(isStatement).to.be.equal(false);
  });

  it('_getEditor returns an editor value from the mongosh config', async() => {
    cmd = 'neweditor';
    const editorName = await editor._getEditor();
    expect(editorName).to.be.equal(cmd);
    expect(editorName).to.not.be.equal(process.env.EDITOR);
  });

  it('_getEditor returns an editor value from process.env.EDITOR', async() => {
    cmd = null;
    const editorName = await editor._getEditor();
    expect(editorName).to.be.equal(process.env.EDITOR);
  });

  // TODO: e2e or mock tests for _getExtension
  // TODO: Write a node script that acts as an external editor and write e2e tests
});
