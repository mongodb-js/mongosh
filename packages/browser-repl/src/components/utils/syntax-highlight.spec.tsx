import React from 'react';
import { Code } from '@mongodb-js/compass-components';
import { expect } from '../../../testing/chai';
import { mount } from '../../../testing/enzyme';
import { SyntaxHighlight } from './syntax-highlight';

describe('<SyntaxHighlight />', function () {
  let wrapper;

  afterEach(function () {
    wrapper.unmount();
    wrapper = null;
  });

  it('renders Code', function () {
    wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(Code)).to.have.lengthOf(1);
  });

  it('passes code to Code', function () {
    wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(Code).prop('children')).to.equal('some code');
  });
});
