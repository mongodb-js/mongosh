import { expect } from 'chai';
import {
  SHARED_LIBRARY_SUFFIX,
  getCryptLibraryPaths,
} from './crypt-library-paths';
import cryptLibraryDummy from 'mongodb-crypt-library-dummy';
import type { MongoshBus } from '@mongosh/types';
import { useTmpdir } from '../test/repl-helpers';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * @securityTest Loading the MongoDB `crypt_shared` library securely
 *
 * mongosh loads the `crypt_shared` MongoDB library at runtime. In order to do so securely,
 * we verify that the path resolution logic used for it adheres to expectations, and e.g.
 * the shared library will not be loaded if it comes with incorrect filesystem permissions.
 */
describe('getCryptLibraryPaths', function () {
  let bus: MongoshBus;
  let events: any[];
  let fakeMongoshExecPath: string;
  const tmpdir = useTmpdir();
  const csfleFilename = `mongosh_crypt_v1.${SHARED_LIBRARY_SUFFIX}`;
  const expectedVersion = {
    version: BigInt('0x0001000000000000'),
    versionStr: 'mongo_crypt_v1-dummy',
  };

  beforeEach(async function () {
    events = [];
    bus = new EventEmitter();
    bus.on('mongosh:crypt-library-load-found', (ev) =>
      events.push(['mongosh:crypt-library-load-found', ev])
    );
    bus.on('mongosh:crypt-library-load-skip', (ev) =>
      events.push(['mongosh:crypt-library-load-skip', ev])
    );
    fakeMongoshExecPath = path.join(tmpdir.path, 'bin', 'mongosh');
    await fs.mkdir(path.join(tmpdir.path, 'bin'), { recursive: true });
    await fs.mkdir(path.join(tmpdir.path, 'lib'), { recursive: true });
    await fs.mkdir(path.join(tmpdir.path, 'lib64'), { recursive: true });
    await fs.writeFile(fakeMongoshExecPath, '# dummy', { mode: 0o755 });
  });

  it('will look up a shared library located in <bindir>/../lib/', async function () {
    const cryptSharedLibPath = path.join(tmpdir.path, 'lib', csfleFilename);
    await fs.copyFile(cryptLibraryDummy, cryptSharedLibPath);
    expect(await getCryptLibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({
      cryptSharedLibPath,
      expectedVersion,
    });
    expect(events.slice(1)).to.deep.equal([
      [
        'mongosh:crypt-library-load-found',
        { cryptSharedLibPath, expectedVersion },
      ],
    ]);
  });

  it('will look up a shared library located in <bindir>/../lib64/', async function () {
    const cryptSharedLibPath = path.join(tmpdir.path, 'lib64', csfleFilename);
    await fs.copyFile(cryptLibraryDummy, cryptSharedLibPath);
    expect(await getCryptLibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({
      cryptSharedLibPath,
      expectedVersion,
    });
    expect(events).to.deep.equal([
      [
        'mongosh:crypt-library-load-found',
        { cryptSharedLibPath, expectedVersion },
      ],
    ]);
  });

  it('will look up a shared library located in <bindir>/', async function () {
    const cryptSharedLibPath = path.join(tmpdir.path, 'bin', csfleFilename);
    await fs.copyFile(cryptLibraryDummy, cryptSharedLibPath);
    expect(await getCryptLibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({
      cryptSharedLibPath,
      expectedVersion,
    });
    expect(events[0][0]).to.equal('mongosh:crypt-library-load-skip');
    expect(events[0][1].reason).to.match(/ENOENT|LoadLibraryW failed/);
    expect(events.slice(2)).to.deep.equal([
      [
        'mongosh:crypt-library-load-found',
        { cryptSharedLibPath, expectedVersion },
      ],
    ]);
  });

  it('will reject a shared library if it is not readable', async function () {
    if (process.platform === 'win32') {
      return this.skip();
    }
    const cryptSharedLibPath = path.join(tmpdir.path, 'lib', csfleFilename);
    await fs.copyFile(cryptLibraryDummy, cryptSharedLibPath);
    await fs.chmod(cryptSharedLibPath, 0o000);
    expect(await getCryptLibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal(
      {}
    );
    expect(events[1][0]).to.equal('mongosh:crypt-library-load-skip');
    expect(events[1][1].reason).to.include('EACCES');
  });

  it('will reject a shared library if its permissions are world-writable', async function () {
    if (process.platform === 'win32') {
      return this.skip();
    }
    const cryptSharedLibPath = path.join(tmpdir.path, 'lib', csfleFilename);
    await fs.copyFile(cryptLibraryDummy, cryptSharedLibPath);
    await fs.chmod(cryptSharedLibPath, 0o777);
    expect(await getCryptLibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal(
      {}
    );
    expect(events[1][0]).to.equal('mongosh:crypt-library-load-skip');
    expect(events[1][1].reason).to.include('permissions mismatch');
  });
});
