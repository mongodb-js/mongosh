import { expect } from 'chai';
import sinon from 'sinon';
import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ALL_API_VERSIONS,
  ServerVersions,
} from './enums';
import { signatures, toShellResult } from './index';
import ExplainableCursor from './explainable-cursor';

describe('ExplainableCursor', function () {
  describe('help', function () {
    const apiClass = new ExplainableCursor(
      {} as any,
      {} as any,
      'queryPlannerExtended'
    );
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signature', function () {
    it('signature for class correct', function () {
      expect(signatures.ExplainableCursor.type).to.equal('ExplainableCursor');
    });
    it('inherited (map) signature', function () {
      expect(signatures.ExplainableCursor.attributes?.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        deprecated: false,
        inherited: true,
        returnType: 'ExplainableCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
    });
  });
  describe('instance', function () {
    let wrappee: any;
    let eCursor: ExplainableCursor;
    beforeEach(function () {
      wrappee = {
        map: sinon.spy(),
        explain: sinon.spy((verbosity): any => ({ ok: verbosity })),
      };
      wrappee._cursor = wrappee;
      eCursor = new ExplainableCursor(
        {} as any,
        wrappee,
        'queryPlannerExtended'
      );
    });

    it('sets dynamic properties', async function () {
      expect((await toShellResult(eCursor)).type).to.equal('ExplainableCursor');
      expect((await toShellResult(eCursor.help)).type).to.equal('Help');
      expect((await toShellResult(eCursor)).printable).to.deep.equal({
        ok: 'queryPlannerExtended',
      });
      expect(eCursor._verbosity).to.equal('queryPlannerExtended');
      expect(wrappee.explain).to.have.callCount(1);
    });

    it('returns the same ExplainableCursor', function () {
      expect(eCursor.map((doc) => doc)).to.equal(eCursor);
    });

    it('has the correct metadata', function () {
      expect((eCursor.collation as any).serverVersions).to.deep.equal([
        '3.4.0',
        ServerVersions.latest,
      ]);
    });
  });
});
