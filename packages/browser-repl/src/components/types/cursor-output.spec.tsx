import React from 'react';
import { expect } from '../../../testing/chai';
import { shallow } from '../../../testing/enzyme';

import { CursorOutput } from './cursor-output';
import { DocumentOutput } from './document-output';

describe('CursorOutput', () => {
  it('renders "no cursor" if value is empty', () => {
    const wrapper = shallow(<CursorOutput value={[]} />);

    expect(wrapper.find(DocumentOutput)).to.have.lengthOf(0);
  });


  it('renders a DocumentOutput for each element in value', () => {
    const wrapper = shallow(<CursorOutput value={[{doc: 1}, {doc: 2}]} />);

    expect(wrapper.find(DocumentOutput)).to.have.lengthOf(2);
  });
});
