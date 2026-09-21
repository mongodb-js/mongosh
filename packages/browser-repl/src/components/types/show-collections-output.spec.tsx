import React from 'react';
import { expect } from '@mongosh/testing';
import { render } from '@testing-library/react';

import { ShowCollectionsOutput } from './show-collections-output';

describe('ShowCollectionsOutput', function () {
  it('renders no show dbs output if value is empty', function () {
    const { container } = render(<ShowCollectionsOutput value={[]} />);

    expect(container.textContent).to.equal('');
  });

  it('renders a ShowCollectionsOutput for each element in value', function () {
    const { container } = render(
      <ShowCollectionsOutput
        value={[
          { name: 'nested_documents', badge: '' },
          { name: 'decimal128', badge: '' },
          { name: 'coll', badge: '' },
          { name: 'people_imported', badge: '[time-series]' },
          { name: 'cats', badge: '[view]' },
          { name: 'system.views', badge: '' },
        ]}
      />
    );

    const items = [...container.querySelectorAll('pre > span')].map(
      (item) => item.textContent ?? ''
    );
    expect(items).to.have.length(6);

    expect(items[0]).to.contain('nested_documents');
    expect(items[0]).to.not.contain('[view]');
    expect(items[0]).to.not.contain('[time-series]');

    expect(items[1]).to.contain('decimal128');
    expect(items[1]).to.not.contain('[view]');
    expect(items[1]).to.not.contain('[time-series]');

    expect(items[2]).to.contain('coll');
    expect(items[2]).to.not.contain('[view]');
    expect(items[2]).to.not.contain('[time-series]');

    expect(items[3]).to.contain('people_imported');
    expect(items[3]).to.not.contain('[view]');
    expect(items[3]).to.contain('[time-series]');

    expect(items[4]).to.contain('cats');
    expect(items[4]).to.contain('[view]');
    expect(items[4]).to.not.contain('[time-series]');

    expect(items[5]).to.contain('system.views');
    expect(items[5]).to.not.contain('[view]');
    expect(items[5]).to.not.contain('[time-series]');
  });
});
