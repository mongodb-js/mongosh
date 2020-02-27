import React from 'react';
import { expect } from '../../../testing/chai';
import { shallow } from '../../../testing/enzyme';

import { CursorOutput } from './cursor-output';
import { CursorIterationResultOutput } from './cursor-iteration-result-output';

describe('CursorOutput', () => {
  it('renders "no cursor" if value is empty', () => {
    const wrapper = shallow(<CursorOutput value={[]} />);

    expect(wrapper.find(CursorIterationResultOutput)).to.have.lengthOf(0);
  });


  it('renders a CursorIterationResultOutput if value contains elements', () => {
    const docs = [{doc: 1}, {doc: 2}];
    const wrapper = shallow(<CursorOutput value={docs} />);

    expect(wrapper.find(CursorIterationResultOutput).prop('value')).to.deep.equal(docs);
  });

  context('when value contains more than 20 docs', () => {
    it('prompts to type "it"', () => {
      const docs = new Array(21).fill({});
      const wrapper = shallow(<CursorOutput value={docs} />);

      expect(wrapper.find(CursorIterationResultOutput)
        .text()).to.contain('Type "it" for more');
    });
  });

  context('when value contains 20 docs', () => {
    it('prompts to type "it"', () => {
      const docs = new Array(20).fill({});
      const wrapper = shallow(<CursorOutput value={docs} />);

      expect(wrapper.find(CursorIterationResultOutput)
        .text()).to.contain('Type "it" for more');
    });
  });

  context('when value contains less than 20 docs', () => {
    it('does not prompt to type "it"', () => {
      const docs = new Array(1).fill({});
      const wrapper = shallow(<CursorOutput value={docs} />);

      expect(wrapper.find(CursorIterationResultOutput)
        .text()).not.to.contain('Type "it" for more');
    });
  });
});
