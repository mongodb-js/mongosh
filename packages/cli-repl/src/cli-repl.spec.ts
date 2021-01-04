import { PassThrough, Duplex } from 'stream';
import path from 'path';
import { promises as fs } from 'fs';
import { once } from 'events';
import CliRepl, { CliReplOptions } from './cli-repl';
import { startTestServer, MongodSetup } from '../../../testing/integration-testing-hooks';
import { expect, useTmpdir, waitEval, fakeTTYProps, readReplLogfile, tick } from '../test/repl-helpers';
import { CliReplErrors } from './error-codes';
import { MongoshInternalError } from '@mongosh/errors';

describe('CliRepl', () => {
  let cliReplOptions: CliReplOptions;
  let cliRepl: CliRepl;
  let input: Duplex;
  let outputStream: Duplex;
  let output = '';
  let exitCode: null|number = null;
  const tmpdir = useTmpdir();

  async function log(): Promise<any[]> {
    return readReplLogfile(path.join(tmpdir.path, `${cliRepl.logId}_log`));
  }

  beforeEach(async() => {
    input = new PassThrough();
    outputStream = new PassThrough();
    output = '';
    outputStream.setEncoding('utf8').on('data', (chunk) => { output += chunk; });

    cliReplOptions = {
      shellCliOptions: {},
      input: input,
      output: outputStream,
      shellHomePaths: {
        shellRoamingDataPath: tmpdir.path,
        shellLocalDataPath: tmpdir.path,
      },
      onExit: ((code: number) => {
        exitCode = code;
      }) as ((code: number) => never)
    };
  });

  context('with a broken output stream', () => {
    beforeEach(async() => {
      cliReplOptions.shellCliOptions = { nodb: true };
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start('', {});
      cliReplOptions.output.end();
    });

    it("doesn't throw errors", (done) => {
      const replCall = async() => {
        input.write('21 + 13\n');
        await waitEval(cliRepl.bus);
      };

      expect(replCall()).to.be.fulfilled.and.notify(done);
    });
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

      it('emits exit when asked to, Node.js-style', async() => {
        const onexit = once(cliRepl.bus, 'mongosh:exit');
        input.write('.exit\n');
        await onexit;
        expect(exitCode).to.equal(0);
      });

      it('emits exit when asked to, mongosh-style', async() => {
        const onexit = once(cliRepl.bus, 'mongosh:exit');
        input.write('exit\n');
        await onexit;
        expect(exitCode).to.equal(0);
      });

      it('writes syntax errors to the log file', async() => {
        expect((await log()).filter(entry => entry.stack?.startsWith('SyntaxError:'))).to.have.lengthOf(0);
        input.write('<cat>\n');
        await waitEval(cliRepl.bus);
        expect((await log()).filter(entry => entry.stack?.startsWith('SyntaxError:'))).to.have.lengthOf(1);
      });

      it('writes JS errors to the log file', async() => {
        input.write('throw new Error("plain js error")\n');
        await waitEval(cliRepl.bus);
        expect((await log()).filter(entry => entry.stack?.startsWith('Error: plain js error'))).to.have.lengthOf(1);
      });

      it('writes Mongosh errors to the log file', async() => {
        input.write('db.auth()\n');
        await waitEval(cliRepl.bus);
        expect((await log()).filter(entry => entry.stack?.startsWith('MongoshInvalidInputError:'))).to.have.lengthOf(1);
      });

      it('emits the error event when exit() fails', async() => {
        const onerror = once(cliRepl.bus, 'mongosh:error');
        try {
          // calling exit will not "exit" since we are not stopping the process
          cliRepl.exit(1);
        } catch (e) {
          const [emitted] = await onerror;
          expect(emitted).to.be.instanceOf(MongoshInternalError);
          expect((await log()).filter(entry => entry.stack?.startsWith('MongoshInternalError:'))).to.have.lengthOf(1);
          return;
        }
        expect.fail('expected error');
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
        cliReplOptions.shellHomePaths.shellRoamingDataPath = '/nonexistent/inaccesible';
        cliReplOptions.shellHomePaths.shellLocalDataPath = '/nonexistent/inaccesible';
        cliRepl = new CliRepl(cliReplOptions);
        const onerror = once(cliRepl.bus, 'mongosh:error');
        try {
          await cliRepl.start('', {});
        } catch { /* not empty */ }
        await onerror;
      });

      it('verifies the Node.js version', async() => {
        const origVersionCheckEnvVar = process.env.MONGOSH_SKIP_NODE_VERSION_CHECK;
        delete process.env.MONGOSH_SKIP_NODE_VERSION_CHECK;
        delete (process as any).version;
        process.version = 'v8.0.0';

        try {
          cliRepl = new CliRepl(cliReplOptions);
          const onerror = once(cliRepl.bus, 'mongosh:error');
          try {
            await cliRepl.start('', {});
          } catch { /* not empty */ }
          const [e] = await onerror;
          expect(e.name).to.equal('MongoshWarning');
          expect(e.code).to.equal(CliReplErrors.NodeVersionMismatch);
        } finally {
          process.version = process.versions.node;
          process.env.MONGOSH_SKIP_NODE_VERSION_CHECK = origVersionCheckEnvVar || '';
        }
      });
    });

    verifyAutocompletion({
      testServer: null,
      wantWatch: true,
      wantShardDistribution: true
    });
  });

  context('with an actual server', () => {
    const testServer = startTestServer('shared');
    let cliRepl: CliRepl;

    beforeEach(() => {
      cliRepl = new CliRepl(cliReplOptions);
    });

    afterEach(async() => {
      await cliRepl.mongoshRepl.close();
    });

    it('connects to a server and interacts with it', async() => {
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

    it('prints cursor output in batches as requested', async() => {
      await cliRepl.start(await testServer.connectionString(), {});

      input.write('use clirepltest\n');
      await waitEval(cliRepl.bus);

      input.write(`for (let i = 0; i < 35; i++) { \
        db.coll.insertOne({ index: i }); \
      }
`);
      await waitEval(cliRepl.bus);

      // Get the first batch of 20 results.
      output = '';
      input.write('crs = db.coll.find()\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('index: 10');
      expect(output).not.to.include('index: 30');
      expect(output).to.include('Type "it" for more');

      // Print it again -- no change until iterated.
      output = '';
      input.write('crs\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('index: 10');
      expect(output).not.to.include('index: 30');

      // Iterate forward explicitly.
      output = '';
      input.write('it\n');
      await waitEval(cliRepl.bus);
      expect(output).not.to.include('index: 10');
      expect(output).to.include('index: 30');
      expect(output).not.to.include('Type "it" for more');

      // Still not iterating implicitly when we're printing the cursor itself.
      output = '';
      input.write('crs\n');
      await waitEval(cliRepl.bus);
      expect(output).not.to.include('index: 10');
      expect(output).to.include('index: 30');

      input.write('.exit\n');
    });

    it('asks for a password if one is required', async() => {
      outputStream.on('data', (chunk) => {
        if (chunk.includes('Enter password')) {
          setImmediate(() => input.write('i want food\n'));
        }
      });
      const auth = { username: 'amy', password: '' };
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
      outputStream.on('data', (chunk) => {
        if (chunk.includes('Enter password')) {
          setImmediate(() => input.write('\u0003')); // Ctrl+C
        }
      });
      Object.assign(outputStream, fakeTTYProps);
      Object.assign(input, fakeTTYProps);
      const auth = { username: 'foo', password: '' };
      const errored = once(cliRepl.bus, 'mongosh:error');
      try {
        await cliRepl.start(await testServer.connectionString(), { auth });
      } catch { /* not empty */ }
      const [ err ] = await errored;
      expect(err.message).to.equal('The request was aborted by the user');
    });

    it('allows .forEach with async code for cursors', async() => {
      await cliRepl.start(await testServer.connectionString(), {});

      input.write('use clirepltest\n');
      await waitEval(cliRepl.bus);
      input.write('db.test.insertMany([{a:2},{a:4},{a:6}])\n');
      await waitEval(cliRepl.bus);
      input.write('let cursor = db.test.find();\n');
      await waitEval(cliRepl.bus);

      const rewrittenPromise = once(cliRepl.bus, 'mongosh:rewritten-async-input');
      input.write('cursor.forEach(doc => db.test.insertOne({ a: doc.a + 1 }))\n');
      const [{ rewritten }] = await rewrittenPromise;
      expect(rewritten).to.include('toIterator'); // Make sure we're testing the right thing
      await waitEval(cliRepl.bus);

      output = '';
      input.write('db.test.find().sort({a:1}).map(doc => doc.a)\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('[ 2, 3, 4, 5, 6, 7 ]');

      input.write('.exit\n');
    });

    verifyAutocompletion({
      testServer: testServer,
      wantWatch: false,
      wantShardDistribution: false
    });
  });

  context('with a replset node', () => {
    verifyAutocompletion({
      testServer: startTestServer('not-shared', '--replicaset', '--nodes', '1'),
      wantWatch: true,
      wantShardDistribution: false
    });
  });

  context('with a mongos', () => {
    verifyAutocompletion({
      testServer: startTestServer('not-shared', '--replicaset', '--sharded', '0'),
      wantWatch: true,
      wantShardDistribution: true
    });
  });

  function verifyAutocompletion({ testServer, wantWatch, wantShardDistribution }: {
    testServer: MongodSetup | null,
    wantWatch: boolean,
    wantShardDistribution: boolean
  }): void {
    describe('autocompletion', () => {
      let cliRepl: CliRepl;

      beforeEach(async() => {
        if (testServer === null) {
          cliReplOptions.shellCliOptions = { nodb: true };
        }
        cliReplOptions.nodeReplOptions = { terminal: true };
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(testServer ? await testServer.connectionString() : '', {});
      });

      afterEach(async() => {
        await cliRepl.mongoshRepl.close();
      });

      it(`${wantWatch ? 'completes' : 'does not complete'} the watch method`, async() => {
        output = '';
        input.write('db.wat\u0009\u0009');
        await tick();
        if (wantWatch) {
          expect(output).to.include('db.watch');
        } else {
          expect(output).not.to.include('db.watch');
        }
      });

      it(`${wantShardDistribution ? 'completes' : 'does not complete'} the getShardDistribution method`, async() => {
        output = '';
        input.write('db.coll.getShardDis\u0009\u0009');
        await tick();
        if (wantShardDistribution) {
          expect(output).to.include('db.coll.getShardDistribution');
        } else {
          expect(output).not.to.include('db.coll.getShardDistribution');
        }
      });
    });
  }
});

