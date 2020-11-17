import { expect } from 'chai';
import sinon from 'ts-sinon';
import { signatures, toShellResult } from './index';
import ChangeStreamCursor from './change-stream-cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES } from './enums';
import { ChangeStream } from '@mongosh/service-provider-core';

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
    let wrappee;
    let cursor;
    beforeEach(() => {
      wrappee = {
        next: sinon.spy(),
        isClosed: (): boolean => true
      };
      cursor = new ChangeStreamCursor(wrappee as ChangeStream, 'source');
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

    it('calls wrappee.next with arguments', () => {
      cursor.next();
      expect(wrappee.next.calledWith()).to.equal(true);
    });
  });
});
