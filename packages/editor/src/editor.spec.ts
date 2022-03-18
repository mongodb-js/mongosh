import { bson } from '@mongosh/service-provider-core';
import chai, { expect } from 'chai';
import { Duplex, PassThrough } from 'stream';
import Nanobus from 'nanobus';
import path from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import rimraf from 'rimraf';
import sinon from 'ts-sinon';
import sinonChai from 'sinon-chai';

import { Editor, EditorOptions } from './editor';

chai.use(sinonChai);

interface FakeEditor {
  fakeLoadExternalCodeResult?: any;
  cmd?: string,
  contextObject?: any
}

function useTmpdir(): { readonly path: string } {
  let tmpdir: string;

  beforeEach(async() => {
    tmpdir = path.resolve(__dirname, '..', '..', '..', 'tmp', 'test', `editor-${Date.now()}-${new bson.ObjectId()}`);
    await fs.mkdir(tmpdir, { recursive: true });
  });

  afterEach(async() => {
    try {
      await promisify(rimraf)(tmpdir);
    } catch (err: any) {
      // On Windows in CI, this can fail with EPERM for some reason.
      // If it does, just log the error instead of failing all tests.
      console.error('Could not remove fake home directory:', err);
    }
  });

  return {
    get path(): string { return tmpdir; }
  };
}

const fakeExternalEditor = async(
  { base, name, flags = '', output }: { base: string, name: string, flags?: string, output?: string }
): Promise<string> => {
  const tmpDoc = path.join(base, name);
  let script: string;

  if (typeof output === 'string') {
    script = `(async () => {
      const tmpDoc = process.argv[process.argv.length - 1];
      const { promises: { writeFile } } = require('fs');

      await writeFile(tmpDoc, ${JSON.stringify(output)}, { mode: 0o600 });
    })()`;
  } else {
    script = 'process.exit(1);';
  }

  await fs.mkdir(path.dirname(tmpDoc), { recursive: true, mode: 0o700 });
  await fs.writeFile(tmpDoc, script, { mode: 0o600 });

  return `node "${tmpDoc}" ${flags}`;
};

describe('Editor', () => {
  const base = useTmpdir();
  let input: Duplex;
  let vscodeDir: string;
  let tmpDir: string;
  let busMessages: ({ ev: any, data?: any })[];
  let makeEditor: (data?: FakeEditor) => Editor;
  let makeEditorOptions: (data?: FakeEditor) => EditorOptions;
  let makeContextObject: (cmd?: string | null) => any;

  beforeEach(async() => {
    input = new PassThrough();
    vscodeDir = path.join(base.path, '.vscode');
    tmpDir = path.join(base.path, 'editor');

    const messageBus = new Nanobus('mongosh-editor-test');
    busMessages = [];
    messageBus.on('*', (ev: any, data: any) => {
      if (typeof data === 'number') {
        busMessages.push({ ev });
      } else {
        busMessages.push({ ev, data });
      }
    });

    makeContextObject = (cmd: string | null = null) => ({
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
    });

    makeEditorOptions = (data: FakeEditor = {}): EditorOptions => {
      const {
        fakeLoadExternalCodeResult,
        cmd,
        contextObject = makeContextObject(cmd)
      } = data;

      return {
        input,
        vscodeDir,
        tmpDir,
        instanceState: {
          context: contextObject,
          shellApi: contextObject,
          registerPlugin: sinon.stub(),
          messageBus
        } as any,
        loadExternalCode: (): Promise<any> => Promise.resolve(fakeLoadExternalCodeResult)
      };
    };

    makeEditor = (data: FakeEditor = {}) => new Editor(makeEditorOptions(data));

    // make nyc happy when we spawn npm below
    await fs.mkdir(path.resolve(base.path, '.mongodb', '.nyc_output', 'processinfo'), { recursive: true });
    await fs.mkdir(path.resolve(base.path, 'mongodb', '.nyc_output', 'processinfo'), { recursive: true });
  });

  describe('create', () => {
    it('returns an editor instance', () => {
      const editor = Editor.create(makeEditorOptions());
      expect(typeof editor).to.be.equal('object');
      expect(editor instanceof Editor).to.be.equal(true);
    });
  });

  describe('wrapper fn', () => {
    it('returns a "synthetic" promise', async() => {
      const cmd = await fakeExternalEditor({
        base: base.path,
        name: 'editor-script.js',
        output: ''
      });
      const contextObject = makeContextObject(cmd);
      Editor.create(makeEditorOptions({ contextObject }));
      const result = contextObject.edit();
      expect(result[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await result).to.not.exist;
    });
  });

  describe('_getExtension', () => {
    let editor: Editor;

    beforeEach(() => {
      delete process.env.EDITOR;
      editor = makeEditor();
    });

    context('when editor is node command', () => {
      it('returns js', async() => {
        const cmd = 'node editor-script.js';
        const extension = await editor._getExtension(cmd);
        expect(extension).to.be.equal('js');
      });
    });

    context('when editor is executable file', () => {
      context('not vscode', () => {
        it('returns js', async() => {
          const cmd = '/path/to/some/executable';
          const extension = await editor._getExtension(cmd);
          expect(extension).to.be.equal('js');
        });
      });

      context('vscode', () => {
        context('when mongodb extension is not installed', () => {
          it('returns js', async() => {
            const cmd = 'code';
            const extension = await editor._getExtension(cmd);
            expect(extension).to.be.equal('js');
          });
        });

        context('when mongodb extension is installed', () => {
          beforeEach(async() => {
            // make a fake dir for vscode mongodb extension
            await fs.mkdir(
              path.join(vscodeDir, 'extensions', 'mongodb.mongodb-vscode-0.0.0'),
              { recursive: true }
            );
          });

          it('returns mongodb for code command', async() => {
            const cmd = 'code';
            const extension = await editor._getExtension(cmd);
            expect(extension).to.be.equal('mongodb');
          });

          it('returns mongodb for code path', async() => {
            const cmd = '/usr/local/bin/code';
            const extension = await editor._getExtension(cmd);
            expect(extension).to.be.equal('mongodb');
          });

          it('returns mongodb for code.exe', async() => {
            const cmd = '/usr/local/bin/code.exe';
            const extension = await editor._getExtension(cmd);
            expect(extension).to.be.equal('mongodb');
          });

          it('returns mongodb for code path with flag', async() => {
            const cmd = '/usr/local/bin/code --wait';
            const extension = await editor._getExtension(cmd);
            expect(extension).to.be.equal('mongodb');
          });
        });
      });
    });
  });

  describe('_getEditor', () => {
    let editor: Editor;

    beforeEach(() => {
      delete process.env.EDITOR;
    });

    it('returns an editor value from process.env.EDITOR', async() => {
      process.env.EDITOR = 'neweprocessditor';
      editor = makeEditor();
      const editorName = await editor._getEditor();
      expect(editorName).to.be.equal(process.env.EDITOR);
    });

    it('returns an editor value from the mongosh config', async() => {
      process.env.EDITOR = 'neweprocessditor';
      editor = makeEditor({ cmd: 'newcmdeditor' });
      const editorName = await editor._getEditor();
      expect(editorName).to.be.equal('newcmdeditor');
    });
  });

  describe('_isVscodeApp', () => {
    let editor: Editor;

    beforeEach(() => {
      editor = makeEditor();
    });

    it('returns true if command is code', () => {
      const isVscodeApp = editor._isVscodeApp('code');
      expect(isVscodeApp).to.be.equal(true);
    });

    it('returns true if command is path to code', () => {
      const isVscodeApp = editor._isVscodeApp('/usr/local/bin/code');
      expect(isVscodeApp).to.be.equal(true);
    });

    it('returns true if command is path to code on windows', () => {
      const isVscodeApp = editor._isVscodeApp('C:\\Program Files\\Microsoft VS Code\\Code.exe');
      expect(isVscodeApp).to.be.equal(true);
    });

    it('returns false if command is nano', () => {
      const isVscodeApp = editor._isVscodeApp('nano');
      expect(isVscodeApp).to.be.equal(false);
    });
  });

  describe('_isIdentifier', () => {
    let editor: Editor;

    beforeEach(() => {
      editor = makeEditor();
    });

    it('returns false if a command is an empty find statement', () => {
      const isIdentifier = editor._isIdentifier('db.test.find()');
      expect(isIdentifier).to.be.equal(false);
    });

    it('returns false if a command is a find statement with a query', () => {
      const isIdentifier = editor._isIdentifier("db.test.find({ name: 'lena' })");
      expect(isIdentifier).to.be.equal(false);
    });

    it('returns true if a command is an identifier written with dots', () => {
      const isIdentifier = editor._isIdentifier('db.test.find');
      expect(isIdentifier).to.be.equal(true);
    });

    it('returns false if a command is an identifier written as an array and double quotes', () => {
      const isIdentifier = editor._isIdentifier('db["test"]find');
      expect(isIdentifier).to.be.equal(false);
    });

    it('returns false if a command is an identifier written as an array and single quotes', () => {
      const isIdentifier = editor._isIdentifier("db['test']find");
      expect(isIdentifier).to.be.equal(false);
    });

    it('returns true if it contains $', () => {
      const isIdentifier = editor._isIdentifier('$something');
      expect(isIdentifier).to.be.equal(true);
    });

    it('returns false for sum of numbers', () => {
      const isIdentifier = editor._isIdentifier('1 + 2');
      expect(isIdentifier).to.be.equal(false);
    });

    it('returns false for a class', () => {
      const isIdentifier = editor._isIdentifier('class A {}');
      expect(isIdentifier).to.be.equal(false);
    });

    it('returns false for a string', () => {
      const isIdentifier = editor._isIdentifier('"some string"');
      expect(isIdentifier).to.be.equal(false);
    });

    it('returns false for a number', () => {
      const isIdentifier = editor._isIdentifier('111');
      expect(isIdentifier).to.be.equal(false);
    });
  });

  describe('_getEditorContent', () => {
    let editor: Editor;

    it('returns a function implementation', async() => {
      const fakeLoadExternalCodeResult = function wrapper(...args: any[]) {
        return { args, done: true };
      };
      editor = makeEditor({ fakeLoadExternalCodeResult });
      const code = 'db.test.find';
      const content = (await editor._getEditorContent(code)).replace(/\r\n/g, '\n');
      expect(content).to.be.equal('function wrapper(...args) {\n                return { args, done: true };\n            }');
    });

    it('returns var', async() => {
      editor = makeEditor({ fakeLoadExternalCodeResult: 111 });
      const code = 'myVar';
      const content = (await editor._getEditorContent(code));
      expect(content).to.be.equal('111');
    });

    it('returns a.b.c', async() => {
      editor = makeEditor({ fakeLoadExternalCodeResult: { field: { child: 'string value' } } });
      const code = 'myObj';
      const content = (await editor._getEditorContent(code));
      expect(content).to.be.equal('{"field":{"child":"string value"}}');
    });

    it('returns function', async() => {
      editor = makeEditor();
      const code = "function foo() { return 'a b'; }";
      const content = await editor._getEditorContent(code);
      expect(content).to.be.equal(code);
    });

    it('returns an unmodified statment', async() => {
      editor = makeEditor();
      const code = 'db.coll.find()';
      const content = await editor._getEditorContent(code);
      expect(content).to.be.equal(code);
    });

    it('returns a string', async() => {
      editor = makeEditor({ fakeLoadExternalCodeResult: 111 });
      const code = '"111"';
      const content = await editor._getEditorContent(code);
      expect(content).to.be.equal(code);
    });

    it('returns the last opened content for the empty edit command', async() => {
      editor = makeEditor();
      editor._lastContent = 'db.test.find()';
      const content = await editor._getEditorContent('');
      expect(content).to.be.equal('db.test.find()');
    });

    it('returns a new content for not empty edit command', async() => {
      editor = makeEditor();
      editor._lastContent = 'db.coll.find()';
      const content = await editor._getEditorContent('1 + 1');
      expect(content).to.be.equal('1 + 1');
    });
  });

  describe('_prepareResult', () => {
    let editor: Editor;

    beforeEach(() => {
      editor = makeEditor();
    });

    it('returns an assignment statement for an identifier', () => {
      const result = editor._prepareResult({ originalCode: 'fn', modifiedCode: 'function() { console.log(222); };' });
      expect(result).to.be.equal('fn = function() { console.log(222); };');
    });

    it('returns an assignment statement for an identifier', () => {
      const result = editor._prepareResult({ originalCode: '111', modifiedCode: '222' });
      expect(result).to.be.equal('222');
    });
  });

  describe('runEditCommand', () => {
    let editor: Editor;

    beforeEach(() => {
      delete process.env.EDITOR;
    });

    context('when editor is not defined', () => {
      it('returns please define an external editor error', async() => {
        editor = makeEditor();
        try {
          await editor.runEditCommand('');
        } catch (error: any) {
          expect(error.message).to.include('Command failed with an error: please define an external editor');
        }
      });
    });

    context('when editor is defined', () => {
      it('returns an error when editor exits with exitCode 1', async() => {
        const cmd = await fakeExternalEditor({ base: base.path, name: 'editor-script.js' });
        editor = makeEditor({ cmd });

        try {
          await editor.runEditCommand('function() {}');
        } catch (error: any) {
          expect(error.message).to.include('failed with an exit code 1');
        }
      });

      it('returns a modified find statement to the mongosh input', async() => {
        const shellOriginalInput = 'db.test.find()';
        const editorOutput = `db.test.find({
          field: 'new     value'
        })`;
        const shellModifiedInput = "db.test.find({ field: 'new     value' })";
        const cmd = await fakeExternalEditor({
          base: base.path,
          name: 'editor-script.js',
          output: editorOutput
        });

        editor = makeEditor({ cmd });
        await editor.runEditCommand(shellOriginalInput);

        const shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);
      });

      it('writes a modified function statement to the mongosh input', async() => {
        const shellOriginalInput = 'function () {}';
        const editorOutput = `function () {
          console.log(111);
        }`;
        const shellModifiedInput = 'function () { console.log(111); }';
        const cmd = await fakeExternalEditor({
          base: base.path,
          name: 'editor-script.js',
          output: editorOutput
        });

        editor = makeEditor({ cmd });
        await editor.runEditCommand(shellOriginalInput);

        const shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);
      });

      it('allows spaces in the editor name', async() => {
        const shellOriginalInput = '"some string"';
        const editorOutput = '"some modified string"';
        const shellModifiedInput = '"some modified string"';
        const cmd = await fakeExternalEditor({
          base: base.path,
          name: 'editor script.js',
          output: editorOutput
        });

        editor = makeEditor({ cmd });
        await editor.runEditCommand(shellOriginalInput);

        const shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);
      });

      it('allows flags in the editor', async() => {
        const shellOriginalInput = '"some string"';
        const editorOutput = '"some modified string"';
        const shellModifiedInput = '"some modified string"';

        const cmd = await fakeExternalEditor({
          base: base.path,
          name: 'editor-script.js',
          flags: '--trace-warnings',
          output: editorOutput
        });

        editor = makeEditor({ cmd });
        await editor.runEditCommand(shellOriginalInput);

        const shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);
      });

      it('returns a proper statement when editing previous code - input is not a statement', async() => {
        const shellOriginalInput = 'foo';
        const editorOutput = '20';
        const shellModifiedInput = 'foo = 20';
        const cmd = await fakeExternalEditor({
          base: base.path,
          name: 'editor-script.js',
          output: editorOutput
        });

        editor = makeEditor({ cmd });

        await editor.runEditCommand(shellOriginalInput);
        let shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);

        await editor.runEditCommand('');
        shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);
      });

      it('returns a proper statement when editing previous code - input is a statement', async() => {
        const shellOriginalInput = 'function () {}';
        const editorOutput = `function () {
          console.log(111);
        }`;
        const shellModifiedInput = 'function () { console.log(111); }';
        const cmd = await fakeExternalEditor({
          base: base.path,
          name: 'editor-script.js',
          output: editorOutput
        });

        editor = makeEditor({ cmd });

        await editor.runEditCommand(shellOriginalInput);
        let shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);

        await editor.runEditCommand('');
        shellResult = editor._input.read().toString();
        expect(shellResult).to.be.equal(shellModifiedInput);
      });
    });
  });
});
