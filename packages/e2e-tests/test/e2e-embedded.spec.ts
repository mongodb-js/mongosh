import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { startTestShell } from './test-shell-context';

describe('e2e embedded MongoDB', function () {
  let directory: string;

  beforeEach(function () {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mongosh-embedded-'));
  });

  afterEach(function () {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('opens the directory a mongodb_embedded:// URI names', async function () {
    const shell = startTestShell(this, {
      args: [`mongodb_embedded://${directory}`],
    });
    await shell.waitForPrompt();
    await shell.executeLine('db.items.insertOne({ answer: 42 })');
    await shell.executeLine('db.items.findOne()');
    shell.assertContainsOutput('answer: 42');
    shell.assertNoErrors();
  });

  it('keeps the data for the next shell', async function () {
    const first = startTestShell(this, {
      args: [`mongodb_embedded://${directory}`],
    });
    await first.waitForPrompt();
    await first.executeLine('db.items.insertOne({ _id: "kept" })');
    first.writeInputLine('exit');
    await first.waitForSuccessfulExit();

    const second = startTestShell(this, {
      args: [`mongodb_embedded://${directory}`],
    });
    await second.waitForPrompt();
    await second.executeLine('db.items.findOne()');
    second.assertContainsOutput("_id: 'kept'");
    second.assertNoErrors();
  });

  it('runs a script against it with --eval', async function () {
    const shell = startTestShell(this, {
      args: [
        `mongodb+embedded://${directory}`,
        '--quiet',
        '--eval',
        'db.items.insertOne({ n: 1 }); db.items.countDocuments()',
      ],
    });
    await shell.waitForSuccessfulExit();
    expect(shell.output.trim()).to.equal('1');
  });

  it('rejects an embedded URI carrying more than a directory', async function () {
    const shell = startTestShell(this, {
      args: [`mongodb_embedded://${directory}?x=1`],
    });
    const exitCode = await shell.waitForAnyExit();
    expect(exitCode).to.not.equal(0);
    shell.assertContainsOutput('only a database directory');
  });
});
