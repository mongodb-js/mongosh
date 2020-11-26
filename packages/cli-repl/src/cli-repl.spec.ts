import { PassThrough, Duplex } from 'stream';
import path from 'path';
import { promises as fs } from 'fs';
import { once } from 'events';
import CliRepl, { CliReplOptions } from './cli-repl';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import { expect, useTmpdir, waitEval, fakeTTYProps } from '../test/repl-helpers';

describe('CliRepl', () => {
  let cliReplOptions: CliReplOptions;
  let cliRepl: CliRepl;
  let input: Duplex;
  let outputStream: Duplex;
  let output = '';
  let exitCode: null|number = null;
  const tmpdir = useTmpdir();

  beforeEach(async() => {
    input = new PassThrough();
    outputStream = new PassThrough();
    output = '';
    outputStream.setEncoding('utf8').on('data', (chunk) => { output += chunk; });

    cliReplOptions = {
      shellCliOptions: {},
      input: input,
      output: outputStream,
      shellHomePath: tmpdir.path,
      onExit: ((code: number) => {
        exitCode = code;
      }) as ((code: number) => never)
    };
  });

  context('with nodb', () => {
    beforeEach(() => {
      cliReplOptions.shellCliOptions = { nodb: true };
    });

    context('when ready', () => {
      beforeEach(async() => {
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start('', {});
      });

      it('evaluates javascript', async() => {
        input.write('21 + 13\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include('34');
      });

      it('toggling telemetry changes config', async() => {
        const updateUser = once(cliRepl.bus, 'mongosh:update-user');
        const evalComplete = once(cliRepl.bus, 'mongosh:eval-complete');
        input.write('disableTelemetry()\n');
        const [ userId, enableTelemetry ] = await updateUser;
        expect(typeof userId).to.equal('string');
        expect(enableTelemetry).to.equal(false);

        await evalComplete; // eval-complete includes the fs.writeFile() call.
        const content = await fs.readFile(path.join(tmpdir.path, 'config'), { encoding: 'utf8' });
        expect(JSON.parse(content).enableTelemetry).to.be.false;
      });

      it('emits exit when asked to', async() => {
        const onexit = once(cliRepl.bus, 'mongosh:exit');
        input.write('.exit\n');
        await onexit;
        expect(exitCode).to.equal(0);
      });
    });

    context('during startup', () => {
      it('persists userId', async() => {
        const userIds: string[] = [];
        for (let i = 0; i < 2; i++) {
          cliRepl = new CliRepl(cliReplOptions);
          cliRepl.bus.on('mongosh:new-user', userId => userIds.push(userId));
          cliRepl.bus.on('mongosh:update-user', userId => userIds.push(userId));
          await cliRepl.start('', {});
        }
        expect(userIds).to.have.lengthOf(2);
        expect([...new Set(userIds)]).to.have.lengthOf(1);
      });

      it('emits error for invalid config', async() => {
        await fs.writeFile(path.join(tmpdir.path, 'config'), 'notjson');
        cliRepl = new CliRepl(cliReplOptions);
        const onerror = once(cliRepl.bus, 'mongosh:error');
        try {
          await cliRepl.start('', {});
        } catch { /* not empty */ }
        await onerror;
      });

      it('emits error for inaccessible home directory', async function() {
        if (process.platform === 'win32') {
          this.skip(); // TODO: Figure out why this doesn't work on Windows.
          return;
        }
        cliReplOptions.shellHomePath = '/nonexistent/inaccesible';
        cliRepl = new CliRepl(cliReplOptions);
        const onerror = once(cliRepl.bus, 'mongosh:error');
        try {
          await cliRepl.start('', {});
        } catch { /* not empty */ }
        await onerror;
      });

      it('verifies the Node.js version', async() => {
        delete (process as any).version;
        process.version = 'v8.0.0';
        try {
          cliRepl = new CliRepl(cliReplOptions);
          const onerror = once(cliRepl.bus, 'mongosh:error');
          try {
            await cliRepl.start('', {});
          } catch { /* not empty */ }
          await onerror;
        } finally {
          process.version = process.versions.node;
        }
      });
    });
  });

  context('with an actual server', () => {
    const testServer = startTestServer('shared');

    it('connects to a server and interacts with it', async() => {
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start(await testServer.connectionString(), {});

      output = '';
      input.write('use clirepltest\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('switched to db clirepltest');

      output = '';
      input.write('db.cats.insertOne({name:"pia"})\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('acknowledged: true');

      output = '';
      input.write('db.cats.find()\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('pia');

      input.write('.exit\n');
    });

    it('asks for a password if one is required', async() => {
      cliRepl = new CliRepl(cliReplOptions);
      outputStream.on('data', (chunk) => {
        if (chunk.includes('Enter password')) {
          setImmediate(() => input.write('i want food\n'));
        }
      });
      const auth = { user: 'amy', password: '' };
      let threw = true;
      try {
        await cliRepl.start(await testServer.connectionString(), { auth });
        threw = false;
      } catch (err) {
        expect(err.message).to.equal('Authentication failed.');
      }
      expect(threw).to.be.true;
      expect(auth.password).to.equal('i want food');
      input.write('.exit\n');
    });

    it('respects a canceled password input', async() => {
      cliRepl = new CliRepl(cliReplOptions);
      outputStream.on('data', (chunk) => {
        if (chunk.includes('Enter password')) {
          setImmediate(() => input.write('\u0003')); // Ctrl+C
        }
      });
      Object.assign(outputStream, fakeTTYProps);
      Object.assign(input, fakeTTYProps);
      const auth = { user: 'foo', password: '' };
      const errored = once(cliRepl.bus, 'mongosh:error');
      try {
        await cliRepl.start(await testServer.connectionString(), { auth });
      } catch { /* not empty */ }
      const [ err ] = await errored;
      expect(err.message).to.equal('The request was aborted by the user');
    });
  });
});
