import React from 'react';
import { expect } from '../../../testing/chai';
import { shallow } from '../../../testing/enzyme';

import { CursorIterationResultOutput } from './cursor-iteration-result-output';
import { DocumentOutput } from './document-output';

describe('CursorIterationResultOutput', () => {
  it('renders no DocumentOutput if value is empty', () => {
    const wrapper = shallow(<CursorIterationResultOutput value={[]} />);

    expect(wrapper.text()).to.contain('no cursor');
  });

  it('renders a DocumentOutput for each element in value', () => {
    const wrapper = shallow(<CursorIterationResultOutput value={[{doc: 1}, {doc: 2}]} />);

    expect(wrapper.find(DocumentOutput)).to.have.lengthOf(2);
  });
});
