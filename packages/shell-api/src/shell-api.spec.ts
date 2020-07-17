/* eslint-disable new-cap */
import { expect } from 'chai';
import ShellApi from './shell-api';
import { signatures } from './index';
import Cursor from './cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, asShellResult } from './enums';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import Mongo from './mongo';
import { ReplPlatform, ServiceProvider, bson } from '@mongosh/service-provider-core';
import { EventEmitter } from 'events';
import ShellInternalState from './shell-internal-state';

describe('ShellApi', () => {
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.ShellApi.type).to.equal('ShellApi');
    });
    it('attributes', () => {
      expect(signatures.ShellApi.attributes.use).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.show).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.exit).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.it).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.Mongo).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: 'Mongo',
        platforms: [ ReplPlatform.CLI ],
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
      expect(signatures.ShellApi.attributes.connect).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: 'Database',
        platforms: [ ReplPlatform.CLI ],
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
  });
  describe('help', () => {
    const apiClass: any = new ShellApi({} as any);
    it('calls help function', async() => {
      expect((await apiClass.help()[asShellResult]()).type).to.equal('Help');
      expect((await apiClass.help[asShellResult]()).type).to.equal('Help');
    });
  });
  describe('commands', () => {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;
    let mongo: Mongo;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      const newSP = stubInterface<ServiceProvider>();
      newSP.initialDb = 'test';
      serviceProvider = stubInterface<ServiceProvider>({ getNewConnection: newSP });
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      mongo = stubInterface<Mongo>();
      mongo._serviceProvider = serviceProvider;
      internalState = new ShellInternalState(serviceProvider, bus);
      internalState.currentDb._mongo = mongo;
      serviceProvider.platform = ReplPlatform.CLI;
    });
    describe('use', () => {
      beforeEach(() => {
        internalState.shellApi.use('testdb');
      });
      it('calls use with arg', async() => {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', () => {
      beforeEach(() => {
        internalState.shellApi.show('databases');
      });
      it('calls show with arg', async() => {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('it', () => {
      it('returns empty result if no current cursor', async() => {
        internalState.currentCursor = null;
        const res: any = await internalState.shellApi.it();
        expect((await res[asShellResult]()).type).to.deep.equal('CursorIterationResult');
      });
      it('calls _it on current Cursor', async() => {
        internalState.currentCursor = stubInterface<Cursor>();
        await internalState.shellApi.it();
        expect(internalState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', () => {
      beforeEach(() => {
        serviceProvider.platform = ReplPlatform.CLI;
      });
      it('returns a new Mongo object', async() => {
        const m = await internalState.shellApi.Mongo('localhost:27017');
        expect((await m[asShellResult]()).type).to.equal('Mongo');
        expect(m._uri).to.equal('mongodb://localhost:27017/test');
      });
      it('fails for non-CLI', async() => {
        serviceProvider.platform = ReplPlatform.Browser;
        try {
          await internalState.shellApi.Mongo('uri');
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
      it('parses URI with mongodb://', async() => {
        const m = await internalState.shellApi.Mongo('mongodb://127.0.0.1:27017');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017');
      });
      it('parses URI with just db', async() => {
        const m = await internalState.shellApi.Mongo('dbname');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017/dbname');
      });
    });
    describe('connect', () => {
      it('returns a new DB', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await internalState.shellApi.connect('localhost:27017', 'username', 'pwd');
        expect((await db[asShellResult]()).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://localhost:27017/test');
      });
      it('fails with no arg', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          await internalState.shellApi.connect();
        } catch (e) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for connect');
      });
    });
  });
  describe('from context', () => {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;
    let mongo: Mongo;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      const newSP = stubInterface<ServiceProvider>();
      newSP.initialDb = 'test';
      serviceProvider = stubInterface<ServiceProvider>({ getNewConnection: newSP });
      serviceProvider.initialDb = 'test';
      serviceProvider.platform = ReplPlatform.CLI;
      serviceProvider.bsonLibrary = bson;
      mongo = stubInterface<Mongo>();
      mongo._serviceProvider = serviceProvider;
      internalState = new ShellInternalState(serviceProvider, bus);
      internalState.setCtx({});
      internalState.currentDb._mongo = mongo;
    });
    it('calls help function', async() => {
      expect((await internalState.context.use.help()[asShellResult]()).type).to.equal('Help');
      expect((await internalState.context.use.help[asShellResult]()).type).to.equal('Help');
    });
    describe('use', () => {
      beforeEach(() => {
        internalState.context.use('testdb');
      });
      it('calls use with arg', async() => {
        expect(mongo.use).to.have.been.calledWith('testdb');
      });
    });
    describe('show', () => {
      beforeEach(() => {
        internalState.context.show('databases');
      });
      it('calls show with arg', async() => {
        expect(mongo.show).to.have.been.calledWith('databases');
      });
    });
    describe('it', () => {
      it('returns empty result if no current cursor', async() => {
        internalState.currentCursor = null;
        const res: any = await internalState.context.it();
        expect((await res[asShellResult]()).type).to.deep.equal('CursorIterationResult');
      });
      it('calls _it on current Cursor', async() => {
        internalState.currentCursor = stubInterface<Cursor>();
        await internalState.context.it();
        expect(internalState.currentCursor._it).to.have.been.called;
      });
    });
    describe('Mongo', () => {
      beforeEach(() => {
        serviceProvider.platform = ReplPlatform.CLI;
      });
      it('returns a new Mongo object', async() => {
        const m = await internalState.context.Mongo('mongodb://127.0.0.1:27017');
        expect((await m[asShellResult]()).type).to.equal('Mongo');
        expect(m._uri).to.equal('mongodb://127.0.0.1:27017');
      });
      it('fails for non-CLI', async() => {
        serviceProvider.platform = ReplPlatform.Browser;
        try {
          await internalState.shellApi.Mongo('mongodb://127.0.0.1:27017');
        } catch (e) {
          return expect(e.name).to.equal('MongoshUnimplementedError');
        }
        expect.fail('MongoshInvalidInputError not thrown for Mongo');
      });
    });
    describe('connect', () => {
      it('returns a new DB', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await internalState.context.connect('mongodb://127.0.0.1:27017');
        expect((await db[asShellResult]()).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://127.0.0.1:27017');
      });
      it('handles username/pwd', async() => {
        serviceProvider.platform = ReplPlatform.CLI;
        const db = await internalState.context.connect('mongodb://127.0.0.1:27017', 'username', 'pwd');
        expect((await db[asShellResult]()).type).to.equal('Database');
        expect(db.getMongo()._uri).to.equal('mongodb://127.0.0.1:27017');
        expect(db.getMongo()._options).to.deep.equal({ auth: { username: 'username', password: 'pwd' } });
      });
    });
  });
});
