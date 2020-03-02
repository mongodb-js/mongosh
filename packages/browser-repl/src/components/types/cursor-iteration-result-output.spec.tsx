import React from 'react';
import { expect } from '../../../testing/chai';
import { shallow } from '../../../testing/enzyme';

import { CursorIterationResultOutput } from './cursor-iteration-result-output';
import { ObjectOutput } from './object-output';

describe('CursorIterationResultOutput', () => {
  it('renders no ObjectOutput if value is empty', () => {
    const wrapper = shallow(<CursorIterationResultOutput value={[]} />);

    expect(wrapper.text()).to.contain('no cursor');
  });

  it('renders a ObjectOutput for each element in value', () => {
    const wrapper = shallow(<CursorIterationResultOutput value={[{ doc: 1 }, { doc: 2 }]} />);

    expect(wrapper.find(ObjectOutput)).to.have.lengthOf(2);
  });
});
