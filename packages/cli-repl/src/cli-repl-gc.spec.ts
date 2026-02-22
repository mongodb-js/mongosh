import { PassThrough } from 'stream';
import { CliRepl } from './cli-repl';
import { expect, useTmpdir, waitEval } from '../test/repl-helpers';
import * as v8 from 'v8';

describe('CliRepl GC', function () {
  before(function () {
    this.timeout(120_000);
  });
  const tmpdir = useTmpdir();

  async function createTaggedObjectFromInsideRepl() {
    const output = new PassThrough();
    const input = new PassThrough();
    const cliRepl = new CliRepl({
      input,
      output,
      shellCliOptions: { nodb: true },
      onExit: () => {
        return null as never;
      },
      shellHomePaths: {
        shellRoamingDataPath: tmpdir.path,
        shellLocalDataPath: tmpdir.path,
        shellRcPath: tmpdir.path,
      },
    });
    // avoid external HTTP requests with uncontrollable durations
    cliRepl.config.snippetIndexSourceURLs = '';
    cliRepl.config.updateURL = '';

    await cliRepl.start('', {} as any);
    input.write(
      'a = new class CliReplGcTaggedObject { some = "taggedObject" }; void 0\n'
    );
    await waitEval(cliRepl.bus);
    const obj = cliRepl.mongoshRepl.runtimeState().context.a;

    await cliRepl.close();
    {
      // Working around https://github.com/nodejs/node/pull/61895
      const removableProcessNewListener = process
        .listeners('newListener' as any)
        .find((listener) =>
          listener.toString().includes('ERR_INVALID_REPL_INPUT')
        );
      if (removableProcessNewListener)
        process.removeListener(
          'newListener',
          removableProcessNewListener as any
        );
    }

    // cliRepl.close() will kick off async cleanup like closing the
    // repl history file handle, but we do not get a notification
    // for when it finishes
    await new Promise((resolve) => setTimeout(resolve, 100));

    return obj;
  }

  function* listNodesInHeapSnapshot(
    snapshotString: string
  ): Iterable<{ type: string; name: string }> {
    const { snapshot, nodes, strings } = JSON.parse(snapshotString);
    const { node_fields, node_types } = snapshot.meta;
    for (let i = 0; i < nodes.length; i += node_fields.length) {
      const description: any = {};
      for (let j = 0; j < node_fields.length; j++) {
        const type = node_types[j];
        if (Array.isArray(type)) {
          description[node_fields[j]] = type[nodes[i + j]];
        } else if (type === 'string') {
          description[node_fields[j]] = strings[nodes[i + j]];
        } else if (type === 'number') {
          description[node_fields[j]] = nodes[i + j];
        }
      }
      yield description;
    }
  }

  async function takeHeapSnapshot(): Promise<string> {
    return (await v8.getHeapSnapshot().setEncoding('utf8').toArray()).join('');
  }
  function* taggedObjectsInHeap(
    snapshot: string
  ): Iterable<{ type: string; name: string }> {
    for (const node of listNodesInHeapSnapshot(snapshot)) {
      if (node.type === 'object' && node.name === 'CliReplGcTaggedObject') {
        yield node;
      }
    }
  }

  it('objects from inside a REPL can be garbage collected', async function () {
    const objHolder: { obj: any } = {
      obj: await createTaggedObjectFromInsideRepl(),
    };
    expect(objHolder.obj).to.deep.equal({ some: 'taggedObject' });

    let finalizersCalled = 0;
    const reg = new FinalizationRegistry(() => finalizersCalled++);
    reg.register(objHolder.obj, 'obj');

    expect([...taggedObjectsInHeap(await takeHeapSnapshot())]).to.have.lengthOf(
      1
    );
    objHolder.obj = null;
    await new Promise(setImmediate);
    expect([...taggedObjectsInHeap(await takeHeapSnapshot())]).to.have.lengthOf(
      0
    );
    await new Promise(setImmediate);
    expect(finalizersCalled).to.equal(1);
  });
});
