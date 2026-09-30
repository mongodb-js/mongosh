import React from 'react';
import { expect } from '@mongosh/testing';
import { render, screen } from '@testing-library/react';

import { ShellOutputLine } from './shell-output-line';

describe('<ShellOutputLine />', function () {
  it('renders a string value', function () {
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: 'some text' }} />
    );
    expect(container.querySelectorAll('pre')).to.have.lengthOf(1);
    expect(container.textContent).to.contain('some text');
  });

  it('renders a pre-inspected string value from node-runtime-worker-thread', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{ format: 'output', value: 'some text', type: 'InspectResult' }}
      />
    );
    expect(container.querySelectorAll('.cm-editor')).to.have.lengthOf(1);
    expect(container.textContent).to.contain('some text');
    expect(container.textContent).to.not.contain("'some text'");
  });

  it('renders an integer value', function () {
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: 1 }} />
    );
    expect(container.querySelectorAll('.cm-editor')).to.have.lengthOf(1);
    expect(container.textContent).to.contain('1');
  });

  it('renders an object', function () {
    const object = { x: 1 };
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: object }} />
    );
    expect(container.textContent).to.contain('x: 1');
  });

  it('renders undefined', function () {
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: undefined }} />
    );
    expect(container.textContent).to.contain('undefined');
  });

  it('renders null', function () {
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: null }} />
    );
    expect(container.textContent).to.contain('null');
  });

  it('renders function', function () {
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: (x): any => x }} />
    );
    expect(container.textContent).to.contain('Function');
  });

  it('renders class', function () {
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: class C {} }} />
    );
    expect(container.textContent).to.contain('Function: C');
  });

  it('renders Help', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'Help',
          value: {
            help: 'Help',
            docs: '#',
            attr: [],
          },
        }}
      />
    );

    expect(container.textContent).to.contain('Help');
    expect(screen.getAllByRole('link')).to.have.lengthOf(1);
  });

  it('renders Cursor', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'Cursor',
          value: { documents: [], cursorHasMore: false },
        }}
      />
    );

    // an empty cursor renders as an empty <pre>, unlike CursorIterationResult
    expect(container.textContent).to.equal('');
    expect(container.querySelectorAll('pre')).to.have.lengthOf(1);
  });

  it('renders CursorIterationResult', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'CursorIterationResult',
          value: { documents: [], cursorHasMore: false },
        }}
      />
    );

    expect(container.textContent).to.contain('no cursor');
  });

  it('renders Database', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'Database',
          value: 'value string',
        }}
      />
    );

    expect(container.textContent).to.contain('value string');
  });

  it('renders Collection', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'Collection',
          value: 'value string',
        }}
      />
    );

    expect(container.textContent).to.contain('value string');
  });

  it('renders ShowCollectionsResult', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'ShowCollectionsResult',
          value: [
            { name: 'cats', badge: '[time-series]' },
            { name: 'coll', badge: '' },
            { name: 'decimal128', badge: '' },
            { name: 'nested_documents', badge: '' },
            { name: 'people_imported', badge: '[view]' },
            { name: 'system.views', badge: '' },
            { name: 'test', badge: '[time-series]' },
          ],
        }}
      />
    );

    expect(container.textContent).to.match(
      /cats\s+\[time-series]()coll()decimal128()nested_documents()people_imported\s+\[view]()test\s+\[time-series]()system.views/
    );
  });

  it('renders ShowDatabasesResult', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'ShowDatabasesResult',
          value: [
            { name: 'admin', sizeOnDisk: 45056, empty: false },
            { name: 'dxl', sizeOnDisk: 8192, empty: false },
            { name: 'supplies', sizeOnDisk: 2236416, empty: false },
            { name: 'test', sizeOnDisk: 5664768, empty: false },
            { name: 'test', sizeOnDisk: 599999768000, empty: false },
          ],
        }}
      />
    );

    expect(container.textContent).to.equal(
      `
admin      44.00 KiB
dxl         8.00 KiB
supplies    2.13 MiB
test        5.40 MiB
test      558.79 GiB
`.trim()
    );
  });

  it('renders StatsResult', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'StatsResult',
          value: {
            c1: { metadata: 1 },
            c2: { metadata: 2 },
          },
        }}
      />
    );

    expect(container.querySelectorAll('hr')).to.have.lengthOf(1);
    expect(container.textContent).to.include('metadata');
  });

  it('renders ListCommandsResult', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'ListCommandsResult',
          value: {
            c1: { metadata: 1, help: 'help string' },
          },
        }}
      />
    );

    expect(container.textContent).to.include('help string');
    expect(container.textContent).to.include('c1');
    expect(container.textContent).to.include('metadata');
  });

  it('renders ShowProfileResult with count = 0', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'ShowProfileResult',
          value: {
            count: 0,
          },
        }}
      />
    );
    expect(container.textContent).to.include('db.system.profile is empty');
  });

  it('renders ShowProfileResult with count > 0', function () {
    const { container } = render(
      <ShellOutputLine
        entry={{
          format: 'output',
          type: 'ShowProfileResult',
          value: {
            count: 1,
            result: [
              {
                op: 'command',
                ns: 'test.system.profile',
                command: {
                  aggregate: 'system.profile',
                  pipeline: [
                    { $match: {} },
                    { $group: { _id: 1, n: { $sum: 1 } } },
                  ],
                  cursor: {},
                  lsid: { id: 'bin' },
                  $db: 'test',
                },
                keysExamined: 0,
                docsExamined: 6,
                cursorExhausted: true,
                numYield: 0,
                nreturned: 1,
                locks: {
                  ReplicationStateTransition: { acquireCount: { w: 2 } },
                  Global: { acquireCount: { r: 2 } },
                  Database: { acquireCount: { r: 2 } },
                  Collection: { acquireCount: { r: 2 } },
                  Mutex: { acquireCount: { r: 2 } },
                },
                flowControl: {},
                responseLength: 132,
                protocol: 'op_msg',
                millis: 1,
                planSummary: 'COLLSCAN',
                ts: 'ts',
                client: '127.0.0.1',
                appName: 'mongosh 0.2.2',
                allUsers: [],
                user: '',
              },
            ],
          },
        }}
      />
    );
    expect(container.textContent).to.contain(
      'command    test.system.profile 1ms ts'
    );
    expect(container.textContent).to.contain('aggregate');
  });

  it('renders an error', function () {
    const err = new Error('x');
    const { container } = render(
      <ShellOutputLine entry={{ format: 'output', value: err }} />
    );
    // ErrorOutput renders the error name as a toggle link
    expect(screen.getAllByRole('link')).to.have.lengthOf(1);
    expect(container.textContent).to.contain('Error');
    expect(container.textContent).to.contain('x');
  });

  it('renders an input line', function () {
    const { container } = render(
      <ShellOutputLine entry={{ format: 'input', value: 'some text' }} />
    );
    expect(container.textContent).to.contain('some text');
  });
});
