import { bson } from '@mongosh/service-provider-core';
import chai, { expect } from 'chai';
import { Duplex, PassThrough } from 'stream';
import Nanobus from 'nanobus';
import path from 'path';
import { promises as fs } from 'fs';
import sinon from 'ts-sinon';
import sinonChai from 'sinon-chai';

import { Editor } from './editor';
import { eventually } from '../../../testing/eventually';

chai.use(sinonChai);

const setupExternalEditor = async(base: string): Promise<string> => {
  const tmpDoc = path.join(base, 'editor-stream.js');

  await fs.mkdir(path.dirname(tmpDoc), { recursive: true, mode: 0o700 });
  await fs.writeFile(tmpDoc, '', { mode: 0o600 });

  return tmpDoc;
};

const fakeExternalEditorOutput = async(scriptDir: string, output: string) => {
  const script = `(async () => {
    const tmpDoc = process.argv[process.argv.length - 1];
    const { promises: { writeFile } } = require('fs');

    await writeFile(tmpDoc, \`${output}\`, { mode: 0o600 });
  })()`;

  await fs.mkdir(path.dirname(scriptDir), { recursive: true, mode: 0o700 });
  await fs.writeFile(scriptDir, script, { mode: 0o600 });

  return `node ${scriptDir}`;
};

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
  let mockLoadExternalCodeResult: (...args: any[]) => { args: any[]; done: boolean };

  beforeEach(() => {
    input = new PassThrough();
    base = path.resolve(__dirname, '..', '..', '..', 'tmp', 'test', `${Date.now()}`, `${new bson.ObjectId()}`);
    vscodeDir = path.join(base, '.vscode');
    tmpDir = path.join(base, 'editor');
    cmd = null;
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
    mockLoadExternalCodeResult = function wrapper(...args: any[]) {
      return { args, done: true };
    };

    delete process.env.EDITOR;

    const messageBus = new Nanobus('mongosh-editor-test');
    busMessages = [];

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
      loadExternalCode: (): any => mockLoadExternalCodeResult
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

  it('_isIdentifier returns false if a command is an empty find statement', () => {
    const isIdentifier = editor._isIdentifier('db.test.find()');
    expect(isIdentifier).to.be.equal(false);
  });

  it('_isIdentifier returns false if a command is a find statement with a query', () => {
    const isIdentifier = editor._isIdentifier("db.test.find({ name: 'lena' })");
    expect(isIdentifier).to.be.equal(false);
  });

  it('_isIdentifier returns true if a command is an identifier written with dots', () => {
    const isIdentifier = editor._isIdentifier('db.test.find');
    expect(isIdentifier).to.be.equal(true);
  });

  it('_isIdentifier returns true if a command is an identifier written as an array and double quotes', () => {
    const isIdentifier = editor._isIdentifier('db["test"]find');
    expect(isIdentifier).to.be.equal(true);
  });

  it('_isIdentifier returns true if a command is an identifier written as an array and single quotes', () => {
    const isIdentifier = editor._isIdentifier("db['test']find");
    expect(isIdentifier).to.be.equal(true);
  });

  it('_isIdentifier returns true if it contains $', () => {
    const isIdentifier = editor._isIdentifier('$something');
    expect(isIdentifier).to.be.equal(true);
  });

  it('_isIdentifier returns false for sum of numbers', () => {
    const isIdentifier = editor._isIdentifier('1 + 2');
    expect(isIdentifier).to.be.equal(false);
  });

  it('_isIdentifier returns false for a class', () => {
    const isIdentifier = editor._isIdentifier('class A {}');
    expect(isIdentifier).to.be.equal(false);
  });

  it('_isIdentifier returns true for a string', () => {
    const isIdentifier = editor._isIdentifier('"some string"');
    expect(isIdentifier).to.be.equal(true);
  });

  it('_getEditor returns an editor value from process.env.EDITOR', async() => {
    process.env.EDITOR = 'neweprocessditor';
    const editorName = await editor._getEditor();
    expect(editorName).to.be.equal(process.env.EDITOR);
  });

  it('_getEditor returns an editor value from the mongosh config', async() => {
    cmd = 'newecmdditor';
    process.env.EDITOR = 'neweprocessditor';
    const editorName = await editor._getEditor();
    expect(editorName).to.be.equal(cmd);
  });

  it('runEditCommand returns an error for not existing editor', async() => {
    try {
      await editor.runEditCommand('');
    } catch (error) {
      expect(error.message).to.include('Command failed with an error: please define an external editor');
    }
  });

  it('_getEditorContent returns function implementation', async() => {
    const code = 'db.test.find';
    const content = (await editor._getEditorContent(code)).replace(/\r\n/g, '\n');
    expect(content).to.be.equal('function wrapper(...args) {\n            return { args, done: true };\n        }');
  });

  it('_getEditorContent returns function', async() => {
    const code = "function foo() { return 'a b'; }";
    const content = await editor._getEditorContent(code);
    expect(content).to.be.equal(code);
  });

  it('_getEditorContent returns an unmodified statment', async() => {
    const code = 'db.coll.find()';
    const content = await editor._getEditorContent(code);
    expect(content).to.be.equal(code);
  });

  it('_getEditorContent returns the last opened content for the empty edit command', async() => {
    editor._lastContent = 'db.test.find()';
    const content = await editor._getEditorContent('');
    expect(content).to.be.equal('db.test.find()');
  });

  it('_getEditorContent returns a new content for not empty edit command', async() => {
    editor._lastContent = 'db.coll.find()';
    const content = await editor._getEditorContent('1 + 1');
    expect(content).to.be.equal('1 + 1');
  });

  context('runEditCommand', () => {
    let externalEditor: string;

    beforeEach(async() => {
      externalEditor = await setupExternalEditor(base);
    });

    afterEach(async() => {
      await fs.unlink(externalEditor);
    });

    it('returns an error if editor is not defined', async() => {
      cmd = null;
      delete process.env.EDITOR;

      try {
        await editor.runEditCommand('edit');
      } catch (error) {
        expect(error.message).to.include('Command failed with an error: please define an external editor');
      }
    });

    it('writes a modified statement to the mongosh input stream', async() => {
      const input = 'edit db.test.find()';
      const editorModifiedContentMultiLine = `db.test.find({
        field: 'new     value'
      })`;
      const editorModifiedContentSingleLine = "db.test.find({ field: 'new     value' })";

      cmd = await fakeExternalEditorOutput(externalEditor, editorModifiedContentMultiLine);
      await editor.runEditCommand(input);

      const mongoshModifiedInput = editor._input.read().toString();
      expect(mongoshModifiedInput).to.be.equal(editorModifiedContentSingleLine);
    });

    it('writes a modified identifier to the mongosh input stream', async() => {
      const input = 'edit function () {}';
      const editorModifiedContentMultiLine = `function () {
        console.log(111);
      }`;
      const editorModifiedContentSingleLine = 'function () { console.log(111); }';

      cmd = await fakeExternalEditorOutput(externalEditor, editorModifiedContentMultiLine);
      await editor.runEditCommand(input);

      const mongoshModifiedInput = editor._input.read().toString();
      expect(mongoshModifiedInput).to.be.equal(editorModifiedContentSingleLine);
    });
  });
});
