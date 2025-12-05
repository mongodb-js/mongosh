import React from 'react';
import { expect } from '@mongosh/testing';
import { shallow } from '../../../testing/enzyme';

import { CursorIterationResultOutput } from './cursor-iteration-result-output';
import { ObjectOutput } from './object-output';

describe('CursorIterationResultOutput', function () {
  it('renders no ObjectOutput if value is empty', function () {
    const printable = { documents: [], cursorHasMore: false };
    const wrapper = shallow(<CursorIterationResultOutput value={printable} />);

    expect(wrapper.text()).to.contain('no cursor');
  });

  it('renders a ObjectOutput for each element in value', function () {
    const printable = {
      documents: [{ doc: 1 }, { doc: 2 }],
      cursorHasMore: false,
    };
    const wrapper = shallow(<CursorIterationResultOutput value={printable} />);

    expect(wrapper.find(ObjectOutput)).to.have.lengthOf(2);
  });
});
