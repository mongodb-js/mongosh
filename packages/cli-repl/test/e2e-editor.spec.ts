import { expect } from 'chai';
import path from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import rimraf from 'rimraf';

import { eventually } from '../../../testing/eventually';
import { TestShell } from './test-shell';
import { useTmpdir, fakeExternalEditor, setTemporaryHomeDirectory } from './repl-helpers';

describe('external editor e2e', () => {
  const tmpdir = useTmpdir();
  let homedir: string;
  let env: Record<string, string>;
  let shell: TestShell;

  beforeEach(async() => {
    const homeInfo = setTemporaryHomeDirectory();

    homedir = homeInfo.homedir;
    env = homeInfo.env;

    shell = TestShell.start({
      args: [ '--nodb' ],
      forceTerminal: true,
      env
    });

    await shell.waitForPrompt();
    shell.assertNoErrors();

    // make nyc happy when spawning npm below
    await fs.mkdir(path.join(tmpdir.path, '.mongodb', '.nyc_output', 'processinfo'), { recursive: true });
    await fs.mkdir(path.join(tmpdir.path, 'mongodb', '.nyc_output', 'processinfo'), { recursive: true });
  });

  afterEach(async() => {
    await TestShell.killall.call(this);
    try {
      await promisify(rimraf)(homedir);
    } catch (err: any) {
      // On Windows in CI, this can fail with EPERM for some reason.
      // If it does, just log the error instead of failing all tests.
      console.error('Could not remove fake home directory:', err);
    }
  });

  context('when editor is node command', () => {
    it('creates a file with .js extension', async() => {
      const shellOriginalInput = 'edit 111';
      const editorOutput = '222';
      const shellModifiedInput = '222';
      const editor = await fakeExternalEditor({
        output: editorOutput,
        expectedExtension: '.js',
        tmpdir: tmpdir.path,
        name: 'editor',
        isNodeCommand: true
      });
      const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

      expect(result).to.include('"editor" has been changed');
      shell.writeInputLine(shellOriginalInput);
      await eventually(() => {
        shell.assertContainsOutput(shellModifiedInput);
      });
    });

    it('returns a modified identifier for fn', async() => {
      const shellOriginalInput = "const fn = function () { console.log(111); }; edit('fn')";
      const editorOutput = `function () {
        console.log(222);
      };`;
      const shellModifiedInput = 'fn = function () { console.log(222); };';
      const editor = await fakeExternalEditor({
        output: editorOutput,
        tmpdir: tmpdir.path,
        name: 'editor',
        isNodeCommand: true
      });
      const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

      expect(result).to.include('"editor" has been changed');
      shell.writeInputLine(shellOriginalInput);
      await eventually(() => {
        shell.assertContainsOutput(shellModifiedInput);
      });
    });

    it('returns a modified identifier for var', async() => {
      const shellOriginalInput = "const myVar = '111'; edit('myVar')";
      const editorOutput = '"222"';
      const shellModifiedInput = 'myVar = "222"';
      const editor = await fakeExternalEditor({
        output: editorOutput,
        tmpdir: tmpdir.path,
        name: 'editor',
        isNodeCommand: true
      });
      const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

      expect(result).to.include('"editor" has been changed');
      shell.writeInputLine(shellOriginalInput);
      await eventually(() => {
        shell.assertContainsOutput(shellModifiedInput);
      });
    });

    it('returns a modified identifier for a.b.c', async() => {
      const shellOriginalInput = "const myObj = { field: { child: 'string value' } }; edit('myObj')";
      const editorOutput = `{
        "field": {
          "child": "new   value"
        }
      }`;
      const shellModifiedInput = 'myObj = { "field": { "child": "new   value" } }';
      const editor = await fakeExternalEditor({
        output: editorOutput,
        tmpdir: tmpdir.path,
        name: 'editor',
        isNodeCommand: true
      });
      const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

      expect(result).to.include('"editor" has been changed');
      shell.writeInputLine(shellOriginalInput);
      await eventually(() => {
        shell.assertContainsOutput(shellModifiedInput);
      });
    });

    it('returns an error when editor exits with exitCode 1', async() => {
      const shellOriginalInput = 'edit function() {}';
      const editor = await fakeExternalEditor({
        tmpdir: tmpdir.path,
        name: 'editor',
        isNodeCommand: true
      });
      const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

      expect(result).to.include('"editor" has been changed');
      shell.writeInputLine(shellOriginalInput);
      await eventually(() => {
        shell.assertContainsError('failed with an exit code 1');
      });
    });

    it('opens an empty editor', async() => {
      const output = '';
      const editor = await fakeExternalEditor({
        output,
        tmpdir: tmpdir.path,
        name: 'editor',
        isNodeCommand: true
      });
      const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

      expect(result).to.include('"editor" has been changed');
      shell.writeInputLine('edit');
      await eventually(() => {
        shell.assertContainsOutput(output);
      });
    });
  });

  context('when editor is executable file', () => {
    before(function() {
      if (process.platform === 'win32') {
        return this.skip(); // Shebangs don't work on windows.
      }
    });

    context('not vscode', () => {
      it('creates a file with .js extension', async() => {
        const editorOutput = "const name = 'Succeeded!'";
        const shellModifiedInput = "const name = 'Succeeded!'";
        const editor = await fakeExternalEditor({
          output: editorOutput,
          expectedExtension: '.js',
          tmpdir: tmpdir.path,
          name: 'editor',
          isNodeCommand: false,
          flags: '--trace-uncaught'
        });
        const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

        expect(result).to.include('"editor" has been changed');
        shell.writeInputLine("const name = 'I want to test a sequence of writeInputLine'");
        shell.writeInputLine('edit name');
        await eventually(() => {
          shell.assertContainsOutput(shellModifiedInput);
        });
      });
    });

    context('vscode', () => {
      context('when mongodb extension is installed', () => {
        beforeEach(async() => {
          // make a fake dir for vscode mongodb extension
          await fs.mkdir(
            path.join(homedir, '.vscode', 'extensions', 'mongodb.mongodb-vscode-0.0.0'),
            { recursive: true }
          );
        });

        it('creates a file with .mongodb extension', async() => {
          const shellOriginalInput = 'edit 111';
          const editorOutput = 'edit 222';
          const shellModifiedInput = '222';
          const editor = await fakeExternalEditor({
            output: editorOutput,
            expectedExtension: '.mongodb',
            tmpdir: tmpdir.path,
            name: 'code',
            isNodeCommand: false
          });
          const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

          expect(result).to.include('"editor" has been changed');
          shell.writeInputLine(shellOriginalInput);
          await eventually(() => {
            shell.assertContainsOutput(shellModifiedInput);
          });
        });

        it('allows using flags along with file names', async() => {
          const shellOriginalInput = "edit 'string    with   whitespaces'";
          const editorOutput = "'string    with   whitespaces and const x = 0;'";
          const shellModifiedInput = "'string    with   whitespaces and const x = 0;'";
          const editor = await fakeExternalEditor({
            output: editorOutput,
            expectedExtension: '.mongodb',
            tmpdir: tmpdir.path,
            name: 'code',
            flags: '--wait',
            isNodeCommand: false
          });
          const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

          expect(result).to.include('"editor" has been changed');
          shell.writeInputLine(shellOriginalInput);
          await eventually(() => {
            shell.assertContainsOutput(shellModifiedInput);
          });
        });
      });

      context('when mongodb extension is not installed', () => {
        it('creates a file with .js extension', async() => {
          const shellOriginalInput = "edit const x = 'y';";
          const editorOutput = "const x = 'zyz';";
          const shellModifiedInput = "const x = 'zyz';";
          const editor = await fakeExternalEditor({
            output: editorOutput,
            expectedExtension: '.js',
            tmpdir: tmpdir.path,
            name: 'code',
            isNodeCommand: false
          });
          const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

          expect(result).to.include('"editor" has been changed');
          shell.writeInputLine(shellOriginalInput);
          await eventually(() => {
            shell.assertContainsOutput(shellModifiedInput);
          });
        });
      });
    });
  });
});
