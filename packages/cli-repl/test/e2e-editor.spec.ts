import { expect } from 'chai';
import path from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import rimraf from 'rimraf';

import { eventually } from '../../../testing/eventually';
import { useTmpdir, fakeExternalEditor, setTemporaryHomeDirectory } from './repl-helpers';
import { TestShell } from './test-shell';

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
    } catch (err) {
      // On Windows in CI, this can fail with EPERM for some reason.
      // If it does, just log the error instead of failing all tests.
      console.error('Could not remove fake home directory:', err);
    }
  });

  it('returns a modified identifier for fn', async() => {
    const shellOriginalInput = "const fn = function () { console.log(111); }; edit('fn')";
    const editorOutput = `function () {
      console.log(222);
    };`;
    const shellModifiedInput = 'fn = function () { console.log(222); };';
    const editor = await fakeExternalEditor(editorOutput);
    const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

    expect(result).to.include('"editor" has been changed');
    shell.writeInputLine(shellOriginalInput);
    await eventually(() => {
      shell.assertContainsOutput(shellModifiedInput);
    });
  });

  it('returns a modified identifier for var', async() => {
    const shellOriginalInput = "const myVar = '111'; edit('myVar')";
    const editorOutput = "const myVar = '222';";
    const shellModifiedInput = "myVar = '222';";
    const editor = await fakeExternalEditor(editorOutput);
    const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

    expect(result).to.include('"editor" has been changed');
    shell.writeInputLine(shellOriginalInput);
    await eventually(() => {
      shell.assertContainsOutput(shellModifiedInput);
    });
  });

  it('returns a modified identifier for a.b.c', async() => {
    const shellOriginalInput = "const myObj = { field: { child: 'string value' } }; edit('myObj')";
    const editorOutput = `const myObj = {
      field: {
        child: 'new   value'
      }
    };`;
    const shellModifiedInput = "myObj = { field: { child: 'new   value' } };";
    const editor = await fakeExternalEditor(editorOutput);
    const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

    expect(result).to.include('"editor" has been changed');
    shell.writeInputLine(shellOriginalInput);
    await eventually(() => {
      shell.assertContainsOutput(shellModifiedInput);
    });
  });

  it('returns an error when editor exits with exitCode 1', async() => {
    const shellOriginalInput = 'edit function() {}';
    const editor = await fakeExternalEditor();
    const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);
    await shell.executeLine('config.set("showStackTraces", true); print(process.env.PATH);');

    expect(result).to.include('"editor" has been changed');
    shell.writeInputLine(shellOriginalInput);
    await eventually(() => {
      shell.assertContainsError('failed with an exit code 1');
    });
  });

  it('opens an empty editor', async() => {
    const output = '';
    const editor = await fakeExternalEditor(output);
    const result = await shell.executeLine(`config.set("editor", ${JSON.stringify(editor)});`);

    expect(result).to.include('"editor" has been changed');
    shell.writeInputLine('edit');
    await eventually(() => {
      shell.assertContainsOutput(output);
    });
  });
});
