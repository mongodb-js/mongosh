import { promises as fs } from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import sinon from 'sinon';
import ConnectionString from 'mongodb-connection-string-url';
import { NodeDriverServiceProvider } from '@mongosh/service-provider-node-driver';
import { expect, useTmpdir } from '../test/repl-helpers';
import type { CliReplOptions } from './cli-repl';
import { CliRepl } from './cli-repl';

describe('prompted TLS key file password', function () {
  const tmpdir = useTmpdir();

  it('stores a prompted TLS key password without encoding it twice', async function () {
    const input = new PassThrough();
    const output = new PassThrough();
    output.setEncoding('utf8');
    const cliReplOptions: CliReplOptions = {
      shellCliOptions: {},
      input,
      output,
      shellHomePaths: {
        shellRoamingDataPath: tmpdir.path,
        shellLocalDataPath: tmpdir.path,
        shellRcPath: tmpdir.path,
      },
      onExit: () => Promise.resolve() as never,
    };
    const cliRepl = new CliRepl(cliReplOptions);
    const keyPath = path.join(tmpdir.path, 'client.pem');
    await fs.writeFile(
      keyPath,
      '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMII\n-----END ENCRYPTED PRIVATE KEY-----\n'
    );
    const password = 'p@ss w/ord';
    output.on('data', (chunk: string) => {
      if (chunk.includes('Enter TLS key file password')) {
        setImmediate(() => input.write(`${password}\n`));
      }
    });
    const connect = sinon
      .stub(NodeDriverServiceProvider, 'connect')
      .rejects(new Error('stop-before-connect'));
    try {
      const uri =
        'mongodb://127.0.0.1:1/?tls=true&tlsCertificateKeyFile=' +
        encodeURIComponent(keyPath) +
        '&serverSelectionTimeoutMS=500';
      try {
        await cliRepl.start(uri, {});
        expect.fail('start() should stop when connect is stubbed');
      } catch (err: any) {
        expect(err.message).to.equal('stop-before-connect');
      }
      expect(connect).to.have.been.calledOnce;
      const passedUri = String(connect.firstCall.args[0]);
      const parsed = new ConnectionString(passedUri);
      expect(parsed.searchParams.get('tlsCertificateKeyFilePassword')).to.equal(
        password
      );
      expect(passedUri).to.not.include('%2540');
      expect(passedUri).to.not.include('%2520');
    } finally {
      connect.restore();
      try {
        await cliRepl.close();
      } catch {
        /* start() stopped before the shell was fully up */
      }
    }
  });
});
