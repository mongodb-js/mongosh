import { expect } from 'chai';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { signatures, toShellResult } from './index';
import ChangeStreamCursor from './change-stream-cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { ChangeStream, ChangeStreamCursor as SPCursor } from '@mongosh/service-provider-core';

describe('ChangeStreamCursor', () => {
  describe('help', () => {
    const apiClass = new ChangeStreamCursor({} as ChangeStream, 'source');
    it('calls help function', async() => {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', () => {
    it('signature for class correct', () => {
      expect(signatures.ChangeStreamCursor.type).to.equal('ChangeStreamCursor');
      expect(signatures.ChangeStreamCursor.hasAsyncChild).to.equal(true);
    });
    it('next signature', () => {
      expect(signatures.ChangeStreamCursor.attributes.next).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: { type: 'unknown', attributes: {} },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
  });
  describe('instance', () => {
    let spCursor: StubbedInstance<ChangeStream>;
    let innerCursor: StubbedInstance<SPCursor>;
    let cursor;
    beforeEach(() => {
      innerCursor = stubInterface<SPCursor>();
      spCursor = stubInterface<ChangeStream>();
      spCursor.cursor = innerCursor;
      cursor = new ChangeStreamCursor(spCursor, 'source');
    });

    it('sets dynamic properties', async() => {
      expect((await toShellResult(cursor)).type).to.equal('ChangeStreamCursor');
      const result3 = (await toShellResult(cursor)).printable;
      expect(result3).to.equal('ChangeStreamCursor on source');
      expect((await toShellResult(cursor.help)).type).to.equal('Help');
    });

    it('pretty returns the same cursor', () => {
      expect(cursor.pretty()).to.equal(cursor);
    });

    it('calls spCursor.hasNext with arguments', async() => {
      const result = false;
      spCursor.hasNext.resolves(result);
      const actual = await cursor.hasNext();
      expect(actual).to.equal(result);
      expect(spCursor.hasNext.calledWith()).to.equal(true);
    });
    it('calls spCursor.close with arguments', async() => {
      await cursor.close();
      expect(spCursor.close.calledWith()).to.equal(true);
    });
    it('calls spCursor.cursor.tryNext with arguments', async() => {
      const result = { doc: 1 };
      innerCursor.tryNext.resolves(result);
      const actual = await cursor.tryNext();
      expect(actual).to.equal(result);
      expect(innerCursor.tryNext.calledWith()).to.equal(true);
    });
    it('calls spCursor.next with arguments', async() => {
      const result = { doc: 1 };
      spCursor.next.resolves(result);
      const actual = await cursor.next();
      expect(actual).to.equal(result);
      expect(spCursor.next.calledWith()).to.equal(true);
    });
    it('calls spCursor.isClosed and tryNext with arguments', async() => {
      innerCursor.tryNext.resolves(null);
      (spCursor as any).closed = true;
      const actual = await cursor.isExhausted();
      expect(actual).to.equal(true);
      expect(innerCursor.tryNext.calledWith()).to.equal(true);
    });
  });
});
