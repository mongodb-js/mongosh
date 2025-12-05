import React from 'react';
import { expect } from '@mongosh/testing';
import { shallow, mount } from '../../../testing/enzyme';

import { CursorOutput } from './cursor-output';
import { CursorIterationResultOutput } from './cursor-iteration-result-output';

describe('CursorOutput', function () {
  it('renders "no cursor" if value is empty', function () {
    const docs = { documents: [], cursorHasMore: false };
    const wrapper = shallow(<CursorOutput value={docs} />);

    expect(wrapper.find(CursorIterationResultOutput)).to.have.lengthOf(0);
  });

  it('renders a CursorIterationResultOutput if value contains elements', function () {
    const docs = { documents: [{ doc: 1 }, { doc: 2 }], cursorHasMore: false };
    const wrapper = shallow(<CursorOutput value={docs} />);

    expect(
      wrapper.find(CursorIterationResultOutput).prop('value')
    ).to.deep.equal(docs);
  });

  context('when value has more elements available', function () {
    it('prompts to type "it"', function () {
      const docs = { documents: [{}], cursorHasMore: true };
      const wrapper = mount(<CursorOutput value={docs} />);

      expect(wrapper.find(CursorIterationResultOutput).text()).to.contain(
        'Type "it" for more'
      );
    });
  });

  context('when value does not have more elements available', function () {
    it('does not prompt to type "it"', function () {
      const docs = { documents: [{}], cursorHasMore: false };
      const wrapper = mount(<CursorOutput value={docs} />);

      expect(wrapper.find(CursorIterationResultOutput).text()).not.to.contain(
        'Type "it" for more'
      );
    });
  });
});
