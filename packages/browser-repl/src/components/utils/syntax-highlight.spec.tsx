import React from 'react';
import { Code } from '@mongodb-js/compass-components';
import { expect } from '../../../testing/chai';
import { mount } from '../../../testing/enzyme';
import { SyntaxHighlight } from './syntax-highlight';

describe('<SyntaxHighlight />', () => {
  it('renders Code', () => {
    const wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(Code)).to.have.lengthOf(1);
  });

  it('passes code to Code', () => {
    const wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(Code).children().text()).to.contain('some code');
  });

  it('uses javascript as language', () => {
    const wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(Code).prop('language')).to.equal('javascript');
  });
});
