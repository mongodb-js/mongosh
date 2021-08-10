import { MongoLogWriter, MongoLogManager } from './log-writer';
import { once } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import stream from 'stream';
import { inspect } from 'util';
import sinon from 'ts-sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

describe('MongoLogWriter', () => {
  it('allows writing log messages to a stream', async() => {
    const now = new Date(1628591965386);
    const target = new stream.PassThrough().setEncoding('utf8');
    const writer = new MongoLogWriter('logid', null, target, () => now);
    writer.info('component', 12345, 'context', 'message', { foo: 'bar' });
    writer.warn('component', 12345, 'context', 'message', { foo: 'bar' });
    writer.error('component', 12345, 'context', 'message', { foo: 'bar' });
    writer.fatal('component', 12345, 'context', 'message', { foo: 'bar' });
    writer.write({
      t: now,
      s: 'E',
      c: 'x',
      id: 0,
      ctx: 'y',
      msg: 'z'
    });
    await writer.flush();
    const log = target.read()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
    expect(log).to.deep.equal([
      {
        t: { '$date': '2021-08-10T10:39:25.386Z' },
        s: 'I', c: 'component', id: 12345, ctx: 'context', msg: 'message',
        attr: { foo: 'bar' }
      },
      {
        t: { '$date': '2021-08-10T10:39:25.386Z' },
        s: 'W', c: 'component', id: 12345, ctx: 'context', msg: 'message',
        attr: { foo: 'bar' }
      },
      {
        t: { '$date': '2021-08-10T10:39:25.386Z' },
        s: 'E', c: 'component', id: 12345, ctx: 'context', msg: 'message',
        attr: { foo: 'bar' }
      },
      {
        t: { '$date': '2021-08-10T10:39:25.386Z' },
        s: 'F', c: 'component', id: 12345, ctx: 'context', msg: 'message',
        attr: { foo: 'bar' }
      },
      {
        t: { '$date': '2021-08-10T10:39:25.386Z' },
        s: 'E', c: 'x', id: 0, ctx: 'y', msg: 'z'
      }
    ]);
  });

  it('can log error object as data as-is', async() => {
    const now = new Date(1628591965386);
    const target = new stream.PassThrough().setEncoding('utf8');
    const writer = new MongoLogWriter('logid', null, target, () => now);
    writer.error('component', 12345, 'context', 'message', new Error('foo'));
    await writer.flush();
    const log = target.read()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
    log[0].attr.stack = '';
    expect(log[0].attr).to.deep.equal({
      code: null,
      message: 'foo',
      name: 'Error',
      stack: ''
    });
  });

  it('can log non-trivial data', async() => {
    const now = new Date(1628591965386);
    const target = new stream.PassThrough().setEncoding('utf8');
    const writer = new MongoLogWriter('logid', null, target, () => now);

    const cyclic: any = {};
    cyclic.cyclic = cyclic;
    writer.error('component', 12345, 'context', 'message', cyclic);

    await writer.flush();
    const log = target.read()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line).attr);
    expect(log).to.deep.equal([{
      _inspected: inspect(cyclic)
    }]);
  });

  it('rejects invalid messages', async() => {
    const errors = [];
    function tryWrite(input: any) {
      const target = new stream.PassThrough().setEncoding('utf8');
      const writer = new MongoLogWriter('logid', null, target);
      writer.on('error', (err) => errors.push(err));
      writer.write(input);
    }
    tryWrite({});
    tryWrite({ s: 'E' });
    tryWrite({ s: 'E', c: '' });
    tryWrite({ s: 'E', c: '', id: 0 });
    tryWrite({ s: 'E', c: '', id: 0, ctx: '' });
    tryWrite({ s: 'E', c: '', id: 0, ctx: '', msg: '' });

    await new Promise(setImmediate);
    expect(errors).to.have.lengthOf(5);
    expect(new Set([...errors.map(err => err.name)])).to.deep.equal(new Set(['TypeError']));
  });
});

describe('MongoLogManager', () => {
  let directory: string;
  let onwarn: any;
  let onerror: any;
  let retentionDays: number;

  beforeEach(async() => {
    retentionDays = 30;
    onwarn = sinon.stub();
    onerror = sinon.stub();
    directory = path.join(os.tmpdir(), `log-writer-test-${Math.random()}-${Date.now()}`);
    await fs.mkdir(directory, { recursive: true });
  });
  afterEach(async() => {
    await fs.rmdir(directory, { recursive: true });
  });

  it('allows creating and writing to log files', async() => {
    const manager = new MongoLogManager({
      directory, retentionDays, onwarn, onerror
    });

    const writer = await manager.createLogWriter();
    expect(path.relative(directory, writer.logFilePath)[0]).to.not.equal('.');
    expect(writer.logFilePath.includes(writer.logId)).to.equal(true);

    writer.info('component', 12345, 'context', 'message', { foo: 'bar' });
    writer.end();
    await once(writer, 'finish');

    const log = (await fs.readFile(writer.logFilePath, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
    expect(log).to.have.lengthOf(1);
    expect(log[0].t.$date).to.be.a('string');
  });

  it('cleans up old log files when requested', async() => {
    retentionDays = 0.000001; // 86.4 ms
    const manager = new MongoLogManager({
      directory, retentionDays, onwarn, onerror
    });

    const writer = await manager.createLogWriter();
    writer.info('component', 12345, 'context', 'message', { foo: 'bar' });
    writer.end();
    await once(writer, 'finish');

    await fs.stat(writer.logFilePath);
    await new Promise(resolve => setTimeout(resolve, 100));
    await manager.cleanupOldLogfiles();
    try {
      await fs.stat(writer.logFilePath);
      expect.fail('missed exception');
    } catch (err) {
      expect(err.code).to.equal('ENOENT');
    }
  });

  it('cleaning up old log files is a no-op by default', async() => {
    const manager = new MongoLogManager({
      directory: path.join('directory', 'nonexistent'), retentionDays, onwarn, onerror
    });

    await manager.cleanupOldLogfiles();
  });

  it('creates no-op write streams as a fallback', async() => {
    const manager = new MongoLogManager({
      directory: path.join('directory', 'nonexistent'), retentionDays, onwarn, onerror
    });

    const writer = await manager.createLogWriter();
    expect(onwarn).to.have.been.calledOnce;
    expect(writer.logFilePath).to.equal(null);

    writer.info('component', 12345, 'context', 'message', { foo: 'bar' });
    writer.end();
    await once(writer, 'finish');
  });
});
