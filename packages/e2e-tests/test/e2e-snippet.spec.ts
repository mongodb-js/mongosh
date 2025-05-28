import { promises as fs } from 'fs';
import path from 'path';
import { expect } from 'chai';
import type { TestShell } from './test-shell';
import { useTmpdir } from './repl-helpers';
import { eventually } from '../../../testing/eventually';

describe('snippet integration tests', function () {
  this.timeout(120_000);
  const tmpdir = useTmpdir();

  let shell: TestShell;
  let makeTestShell: () => TestShell;
  beforeEach(async function () {
    if (process.env.DISTRO_ID === 'rhel93-fips') {
      // TODO: The HTTPS requests we are making for snippet support do not work
      // with the FIPS configuration on the RHEL 9.3 FIPS-enabled machines.
      return this.skip();
    }

    makeTestShell = () =>
      this.startTestShell({
        args: ['--nodb'],
        cwd: tmpdir.path,
        env: {
          ...process.env,
          HOME: tmpdir.path,
          APPDATA: tmpdir.path,
          LOCALAPPDATA: tmpdir.path,
          MONGOSH_FORCE_TERMINAL: '1',
        },
      });
    shell = makeTestShell();
    await shell.waitForPrompt();
    shell.assertNoErrors();

    // make nyc happy when spawning npm below
    await fs.mkdir(
      path.join(tmpdir.path, '.mongodb', '.nyc_output', 'processinfo'),
      { recursive: true }
    );
    await fs.mkdir(
      path.join(tmpdir.path, 'mongodb', '.nyc_output', 'processinfo'),
      { recursive: true }
    );
  });

  it('allows managing snippets', async function () {
    shell.writeInputLine('snippet install analyze-schema');
    await eventually(
      () => {
        shell.assertContainsOutput(
          'Installed new snippets analyze-schema. Do you want to load them now?'
        );
      },
      { timeout: 90_000 }
    );
    shell.writeInput('Y');
    await shell.waitForPrompt(shell.output.length);

    const installed = await shell.executeLine('snippet ls');
    expect(installed).to.include(tmpdir.path);
    expect(installed).to.match(/mongosh:analyze-schema@/);

    const analyzedSchema = await shell.executeLine(`\
      schema({
        tryNext() {
          return (this.i = (this.i + 1) || 0) < 10 ? { prop: "value" } : null;
        }
      })`);
    expect(analyzedSchema).to.match(/\bprop\b.+100.0 %.+\bString\b/);
    shell.assertNoErrors();
  });

  it('autocompletes snippet commands', async function () {
    if (process.arch === 's390x') {
      return this.skip(); // https://jira.mongodb.org/browse/MONGOSH-746
    }
    shell.writeInput('snippet insta\t');
    await eventually(() => {
      shell.assertContainsOutput('snippet install');
    });
  });

  it('works when an index file is inaccessible', async function () {
    await shell.executeLine(
      'config.set("snippetIndexSourceURLs", "http://localhost:1/")'
    );
    shell.writeInputLine('exit');
    await shell.waitForSuccessfulExit();

    shell = makeTestShell();
    await shell.waitForPrompt();
    shell.assertNoErrors(); // This is the important assertion here

    const consistencyCheck = await shell.executeLine(
      'config.get("snippetIndexSourceURLs")'
    );
    expect(consistencyCheck).to.include('http://localhost:1/');

    const commandResult = await shell.executeLine('snippet search');
    expect(commandResult).to.include(
      'FetchError: request to http://localhost:1/ failed'
    );
  });

  it('has proper async rewriting support', async function () {
    const commandResult = await shell.executeLine(
      '({ works: snippet("ls").includes("snippets") })'
    );
    expect(commandResult).to.include('{ works: true }');
  });

  it('informs about the mongocompat snippet', async function () {
    await eventually(
      async () => {
        expect(await shell.executeLine('Date.timeFunc()')).to.match(
          /Date.timeFunc is not a function.+Try running `snippet install mongocompat`/
        );
      },
      { timeout: 30_000 }
    );
  });
});
