import { bson } from '@mongosh/service-provider-core';
import type { Db, Collection, Document } from '@mongosh/service-provider-core';
import { MongoClient } from 'mongodb';
import { expect } from 'chai';
import type { TestShell } from './test-shell';
import { sleep } from './util-helpers';
import { eventually } from '../../../testing/eventually';

const {
  STREAMS_E2E_SPI_CONNECTION_STRING = '',
  STREAMS_E2E_DB_USER = '',
  STREAMS_E2E_DB_PASSWORD = '',
  STREAMS_E2E_CLUSTER_CONNECTION_STRING = '',
} = process.env;

describe('e2e Streams', function () {
  this.timeout(60_000);
  let shell: TestShell;

  before(function () {
    if (!STREAMS_E2E_SPI_CONNECTION_STRING) {
      console.error(
        'Stream Instance connection string not found - skipping Streams E2E tests...'
      );
      return this.skip();
    }

    if (!STREAMS_E2E_CLUSTER_CONNECTION_STRING) {
      console.error(
        'Cluster connection string not found - skipping Streams E2E tests...'
      );
      return this.skip();
    }

    if (!STREAMS_E2E_DB_USER) {
      console.error(
        'Atlas database user for Stream Processing not found - skipping Streams E2E tests...'
      );
      return this.skip();
    }

    if (!STREAMS_E2E_DB_PASSWORD) {
      console.error(
        'Password for Atlas database user not found - skipping Streams E2E tests...'
      );
      return this.skip();
    }
  });

  describe('basic stream processor operations', function () {
    let processorName = '';
    let db: Db;
    let collection: Collection<Document>;
    let client: MongoClient;

    beforeEach(async function () {
      shell = this.startTestShell({
        args: [
          STREAMS_E2E_SPI_CONNECTION_STRING,
          '--tls',
          '--authenticationDatabase admin',
          '--username',
          STREAMS_E2E_DB_USER,
          '--password',
          STREAMS_E2E_DB_PASSWORD,
        ],
        removeSigintListeners: true,
      });
      await shell.waitForPromptOrExit({ timeout: 45_000 });

      processorName = `spi${new bson.ObjectId().toHexString()}`;
      client = await MongoClient.connect(
        STREAMS_E2E_CLUSTER_CONNECTION_STRING,
        {}
      );
      db = client.db(processorName);
      const collectionName = 'processedData';
      collection = db.collection(collectionName);

      // this stream processor reads from the sample stream and inserts documents into an Atlas database
      const sourceStage = {
        $source: {
          connectionName: 'sample_stream_solar',
        },
      };

      const mergeStage = {
        $merge: {
          into: {
            connectionName: 'testClusterConnection',
            db: processorName,
            coll: collectionName,
          },
        },
      };

      const aggPipeline = [sourceStage, mergeStage];

      const createResult = await shell.executeLine(
        `sp.createStreamProcessor("${processorName}", ${JSON.stringify(
          aggPipeline
        )})`,
        { timeout: 45_000 }
      );
      expect(createResult).to.include(
        `Atlas Stream Processor: ${processorName}`
      );
    });

    afterEach(async function () {
      try {
        await db.dropDatabase();
        await client.close();

        const result = await shell.executeLine(`sp.${processorName}.drop()`, {
          timeout: 45_000,
        });
        expect(result).to.include(`{ ok: 1 }`);
      } catch (err: any) {
        console.error(
          `Could not clean up stream processor ${processorName}:`,
          err
        );
      }
    });

    it('can list stream processors', async function () {
      const listResult = await shell.executeLine(`sp.listStreamProcessors()`, {
        timeout: 45_000,
      });
      // make sure the processor created in the beforeEach is present
      expect(listResult).to.include(`name: '${processorName}'`);
    });

    it('can start and stop a stream processor', async function () {
      // this should be a unique collection for this test run, so no data to start
      const initialDocsCount = await collection.countDocuments();
      expect(initialDocsCount).to.eq(0);

      const startResult = await shell.executeLine(
        `sp.${processorName}.start()`,
        { timeout: 45_000 }
      );
      expect(startResult).to.include('{ ok: 1 }');

      let updatedDocCount = 0;
      await eventually(async () => {
        updatedDocCount = await collection.countDocuments();
        expect(updatedDocCount).to.be.greaterThan(0);
      });

      const stopResult = await shell.executeLine(`sp.${processorName}.stop()`, {
        timeout: 45_000,
      });
      expect(stopResult).to.include('{ ok: 1 }');

      const statsResult = await shell.executeLine(
        `sp.${processorName}.stats()`,
        { timeout: 45_000 }
      );
      expect(statsResult).to.include(`state: 'STOPPED'`);
    });

    it(`can modify an existing stream processor's pipeline`, async function () {
      // this field is not present on any docs emit by the stream processor
      // created in the beforeEach
      const newField = 'newField';

      const startResult = await shell.executeLine(
        `sp.${processorName}.start()`,
        { timeout: 45_000 }
      );
      expect(startResult).to.include('{ ok: 1 }');

      // sleep for a bit to let the processor do stuff
      await sleep(500);

      const stopResult = await shell.executeLine(`sp.${processorName}.stop()`, {
        timeout: 45_000,
      });
      expect(stopResult).to.include('{ ok: 1 }');

      const initialDocsWithNewField = await collection.countDocuments({
        [newField]: { $exists: true },
      });
      expect(initialDocsWithNewField).to.eq(0);

      // define a new pipeline that will append our newField to the docs the stream
      // processor inserts into the database
      const sourceStage = {
        $source: {
          connectionName: 'sample_stream_solar',
        },
      };

      const addFieldStage = {
        $addFields: {
          newField,
        },
      };

      const mergeStage = {
        $merge: {
          into: {
            connectionName: 'testClusterConnection',
            db: processorName,
            coll: collection.collectionName,
          },
        },
      };

      const updatedAggPipeline = [sourceStage, addFieldStage, mergeStage];

      const modifyResult = await shell.executeLine(
        `sp.${processorName}.modify(${JSON.stringify(updatedAggPipeline)})`,
        { timeout: 45_000 }
      );
      expect(modifyResult).to.include('{ ok: 1 }');

      const secondStartResult = await shell.executeLine(
        `sp.${processorName}.start()`,
        { timeout: 45_000 }
      );
      expect(secondStartResult).to.include('{ ok: 1 }');

      await eventually(async () => {
        const updatedDocsWithNewField = await collection.countDocuments({
          [newField]: { $exists: true },
        });
        expect(updatedDocsWithNewField).to.be.greaterThan(0);
      });
    });

    it('can view stats for a stream processor', async function () {
      const statsResult = await shell.executeLine(
        `sp.${processorName}.stats()`,
        { timeout: 45_000 }
      );
      expect(statsResult).to.include(`name: '${processorName}'`);
      expect(statsResult).to.include(`state: 'CREATED'`);
      expect(statsResult).to.include('stats: {');
      expect(statsResult).to.include(`pipeline: [`);
      expect(statsResult).to.include(
        `{ '$source': { connectionName: 'sample_stream_solar' } },`
      );
    });
  });

  describe('sampling from a running stream processor', function () {
    beforeEach(async function () {
      shell = this.startTestShell({
        args: [
          STREAMS_E2E_SPI_CONNECTION_STRING,
          '--tls',
          '--authenticationDatabase admin',
          '--username',
          STREAMS_E2E_DB_USER,
          '--password',
          STREAMS_E2E_DB_PASSWORD,
        ],
        removeSigintListeners: true,
      });
      await shell.waitForPromptOrExit({ timeout: 45_000 });
    });

    it('should output streamed documents to the shell', async function () {
      if (process.platform === 'win32') {
        return this.skip(); // No SIGINT on Windows.
      }

      // this processor is pre-defined on the cloud-dev test project
      // it reads from sample solar stream, appends a field with the processor name to each doc, and
      // inserts the docs into an Atlas collection
      const immortalProcessorName = 'immortalProcessor';

      shell.writeInputLine(`sp.${immortalProcessorName}.sample()`);
      // data from the sample solar stream isn't deterministic, so just assert that
      // the processorName field appears in the shell output after sampling
      await eventually(
        () => {
          shell.assertContainsOutput(
            `processorName: '${immortalProcessorName}'`
          );
        },
        { timeout: 45_000 }
      );

      shell.kill('SIGINT');
    });
  });

  describe('creating an interactive stream processor with .process()', function () {
    let interactiveId = '';
    const collectionName = 'processedData';

    beforeEach(async function () {
      shell = this.startTestShell({
        args: [
          STREAMS_E2E_SPI_CONNECTION_STRING,
          '--tls',
          '--authenticationDatabase admin',
          '--username',
          STREAMS_E2E_DB_USER,
          '--password',
          STREAMS_E2E_DB_PASSWORD,
        ],
        removeSigintListeners: true,
      });
      await shell.waitForPromptOrExit({ timeout: 45_000 });

      interactiveId = new bson.ObjectId().toHexString();
    });

    it('should output streamed documents to the shell', async function () {
      if (process.platform === 'win32') {
        return this.skip(); // No SIGINT on Windows.
      }

      // the pipeline for our interactive processor reads from sample solar stream, adds a
      // unique test id to each document, and inserts it into an Atlas collection
      const sourceStage = {
        $source: {
          connectionName: 'sample_stream_solar',
        },
      };

      const addFieldStage = {
        $addFields: {
          interactiveId,
        },
      };

      const mergeStage = {
        $merge: {
          into: {
            connectionName: 'testClusterConnection',
            db: interactiveId,
            coll: collectionName,
          },
        },
      };

      const aggPipeline = [sourceStage, addFieldStage, mergeStage];

      shell.writeInputLine(`sp.process(${JSON.stringify(aggPipeline)})`);
      // data from the sample solar stream isn't deterministic, so just assert that
      // the interactiveId field appears in the shell output after sampling
      await eventually(
        () => {
          shell.assertContainsOutput(`interactiveId: '${interactiveId}'`);
        },
        { timeout: 45_000 }
      );

      shell.kill('SIGINT');
    });
  });
});
