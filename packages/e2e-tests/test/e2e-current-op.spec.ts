import { expect } from 'chai';
import {
  skipIfApiStrict,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';
import type { TestShell } from './test-shell';

describe('e2e currentOp', function () {
  skipIfApiStrict();

  const testServer = startSharedTestServer();

  context('with 2 shells', function () {
    let helperShell: TestShell;
    let currentOpShell: TestShell;

    const OPERATION_TIME = CURRENT_OP_WAIT_TIME * 2;
    const CURRENT_OP_WAIT_TIME = 100;
    this.timeout(OPERATION_TIME * 5);

    beforeEach(async function () {
      helperShell = this.startTestShell({
        args: [await testServer.connectionString()],
      });
      currentOpShell = this.startTestShell({
        args: [await testServer.connectionString()],
      });
      await helperShell.waitForPrompt();
      await currentOpShell.waitForPrompt();

      // Insert a dummy object so find commands will actually run with the delay.
      await helperShell.executeLine('db.coll.insertOne({})');
    });

    it('should return the correct operation', async function () {
      const regexOperation = helperShell.executeLine(
        `db.coll.find({$where: function() { sleep(${OPERATION_TIME}) }}).projection({test: 1})`
      );
      helperShell.assertNoErrors();
      await currentOpShell.executeLine(`sleep(${CURRENT_OP_WAIT_TIME})`);
      let currentOpCall = await currentOpShell.executeLine(`db.currentOp()`);

      currentOpShell.assertNoErrors();
      expect(currentOpCall).to.include("find: 'coll'");
      expect(currentOpCall).to.include(
        `filter: { '$where': Code('function() { sleep(${OPERATION_TIME}) }') }`
      );
      expect(currentOpCall).to.include('projection: { test: 1 }');

      await regexOperation;

      currentOpCall = await currentOpShell.executeLine(`db.currentOp()`);

      currentOpShell.assertNoErrors();
      expect(currentOpCall).not.to.include("find: 'coll'");
      expect(currentOpCall).not.to.include(
        `filter: { '$where': Code('function() { sleep(${OPERATION_TIME}) }') }`
      );
      expect(currentOpCall).not.to.include('projection: { test: 1 }');
    });

    it('should work when the operation contains regex', async function () {
      const regExpString = '^(?i)\\\\Qchho0842\\E';
      // The values from currentOp removes redundant escapes such as \E
      const simplifiedRegExpString = '^(?i)\\\\Qchho0842E';

      void helperShell.executeLine(
        `db.coll.find({$where: function() { sleep(${OPERATION_TIME}) }}).projection({re: BSONRegExp('${regExpString}')})`
      );
      helperShell.assertNoErrors();

      await currentOpShell.executeLine(`sleep(${CURRENT_OP_WAIT_TIME})`);

      const currentOpCall = await currentOpShell.executeLine(`db.currentOp()`);
      currentOpShell.assertNoErrors();

      expect(currentOpCall).to.include(
        `projection: { re: BSONRegExp('${simplifiedRegExpString}', '') }`
      );
    });
  });
});
