import { expect } from 'chai';
import { SHARED_LIBRARY_SUFFIX, getCSFLELibraryPaths } from './csfle-library-paths';
import csfleLibraryDummy from 'mongodb-csfle-library-dummy';
import type { MongoshBus } from '@mongosh/types';
import { useTmpdir } from '../test/repl-helpers';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

describe('getCSFLELibraryPaths', () => {
  let bus: MongoshBus;
  let events: any[];
  let fakeMongoshExecPath: string;
  const tmpdir = useTmpdir();
  const csfleFilename = `mongosh_csfle_v1.${SHARED_LIBRARY_SUFFIX}`;
  const expectedVersion = { version: BigInt('0x0001000000000000'), versionStr: 'mongo_csfle_v1-dummy' };

  beforeEach(async function() {
    events = [];
    bus = new EventEmitter();
    bus.on('mongosh:csfle-load-found', (ev) => events.push(['mongosh:csfle-load-found', ev]));
    bus.on('mongosh:csfle-load-skip', (ev) => events.push(['mongosh:csfle-load-skip', ev]));
    fakeMongoshExecPath = path.join(tmpdir.path, 'bin', 'mongosh');
    await fs.mkdir(path.join(tmpdir.path, 'bin'), { recursive: true });
    await fs.mkdir(path.join(tmpdir.path, 'lib'), { recursive: true });
    await fs.mkdir(path.join(tmpdir.path, 'lib64'), { recursive: true });
    await fs.writeFile(fakeMongoshExecPath, '# dummy', { mode: 0o755 });
  });

  it('will look up a shared library located in <bindir>/../lib/', async function() {
    const csflePath = path.join(tmpdir.path, 'lib', csfleFilename);
    await fs.copyFile(csfleLibraryDummy, csflePath);
    expect(await getCSFLELibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({
      csflePath,
      expectedVersion
    });
    expect(events).to.deep.equal([
      [ 'mongosh:csfle-load-found', { csflePath, expectedVersion } ]
    ]);
  });

  it('will look up a shared library located in <bindir>/../lib64/', async function() {
    const csflePath = path.join(tmpdir.path, 'lib64', csfleFilename);
    await fs.copyFile(csfleLibraryDummy, csflePath);
    expect(await getCSFLELibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({
      csflePath,
      expectedVersion
    });
    expect(events).to.deep.equal([
      [ 'mongosh:csfle-load-found', { csflePath, expectedVersion } ]
    ]);
  });

  it('will look up a shared library located in <bindir>/', async function() {
    const csflePath = path.join(tmpdir.path, 'bin', csfleFilename);
    await fs.copyFile(csfleLibraryDummy, csflePath);
    expect(await getCSFLELibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({
      csflePath,
      expectedVersion
    });
    expect(events[0][0]).to.equal('mongosh:csfle-load-skip');
    expect(events[0][1].reason).to.match(/ENOENT|LoadLibraryW failed/);
    expect(events.slice(1)).to.deep.equal([
      [ 'mongosh:csfle-load-found', { csflePath, expectedVersion } ]
    ]);
  });

  it('will reject a shared library if it is not readable', async function() {
    if (process.platform === 'win32') {
      return this.skip();
    }
    const csflePath = path.join(tmpdir.path, 'lib', csfleFilename);
    await fs.copyFile(csfleLibraryDummy, csflePath);
    await fs.chmod(csflePath, 0o000);
    expect(await getCSFLELibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({});
    expect(events[0][0]).to.equal('mongosh:csfle-load-skip');
    expect(events[0][1].reason).to.include('EACCES');
  });

  it('will reject a shared library if its permissions are world-writable', async function() {
    if (process.platform === 'win32') {
      return this.skip();
    }
    const csflePath = path.join(tmpdir.path, 'lib', csfleFilename);
    await fs.copyFile(csfleLibraryDummy, csflePath);
    await fs.chmod(csflePath, 0o777);
    expect(await getCSFLELibraryPaths(bus, fakeMongoshExecPath)).to.deep.equal({});
    expect(events[0][0]).to.equal('mongosh:csfle-load-skip');
    expect(events[0][1].reason).to.include('permissions mismatch');
  });
});
