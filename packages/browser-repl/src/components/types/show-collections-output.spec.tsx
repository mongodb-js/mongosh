import React from 'react';
import { expect } from '../../testing/src/chai';
import { shallow } from '../../testing/src/enzyme';

import { ShowCollectionsOutput } from './show-collections-output';

describe('ShowCollectionsOutput', function () {
  it('renders no show dbs output if value is empty', function () {
    const wrapper = shallow(<ShowCollectionsOutput value={[]} />);

    expect(wrapper.text()).to.equal('');
  });

  it('renders a ShowCollectionsOutput for each element in value', function () {
    const wrapper = shallow(
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

    const items = wrapper.find('pre > span');
    expect(items).to.have.length(6);

    expect(items.at(0).text()).to.contain('nested_documents');
    expect(items.at(0).text()).to.not.contain('[view]');
    expect(items.at(0).text()).to.not.contain('[time-series]');

    expect(items.at(1).text()).to.contain('decimal128');
    expect(items.at(1).text()).to.not.contain('[view]');
    expect(items.at(1).text()).to.not.contain('[time-series]');

    expect(items.at(2).text()).to.contain('coll');
    expect(items.at(2).text()).to.not.contain('[view]');
    expect(items.at(2).text()).to.not.contain('[time-series]');

    expect(items.at(3).text()).to.contain('people_imported');
    expect(items.at(3).text()).to.not.contain('[view]');
    expect(items.at(3).text()).to.contain('[time-series]');

    expect(items.at(4).text()).to.contain('cats');
    expect(items.at(4).text()).to.contain('[view]');
    expect(items.at(4).text()).to.not.contain('[time-series]');

    expect(items.at(5).text()).to.contain('system.views');
    expect(items.at(5).text()).to.not.contain('[view]');
    expect(items.at(5).text()).to.not.contain('[time-series]');
  });
});
