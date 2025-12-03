import React from 'react';
import { expect } from '../../testing/src/chai';
import { shallow } from '../../testing/src/enzyme';

import { ShowDbsOutput } from './show-dbs-output';

describe('ShowDbsOutput', function () {
  it('renders no show dbs output if value is empty', function () {
    const wrapper = shallow(<ShowDbsOutput value={[]} />);

    expect(wrapper.text()).to.equal('');
  });

  it('renders a ShowDbsOutput for each element in value', function () {
    const wrapper = shallow(
      <ShowDbsOutput
        value={[
          { name: 'admin', sizeOnDisk: 45056, empty: false },
          { name: 'dxl', sizeOnDisk: 8192, empty: false },
          { name: 'supplies', sizeOnDisk: 2236416, empty: false },
          { name: 'test', sizeOnDisk: 5664768, empty: false },
          { name: 'test', sizeOnDisk: 599999768000, empty: false },
        ]}
      />
    );

    expect(wrapper.text()).to.equal(
      `
admin      44.00 KiB
dxl         8.00 KiB
supplies    2.13 MiB
test        5.40 MiB
test      558.79 GiB
`.trim()
    );
  });
});
