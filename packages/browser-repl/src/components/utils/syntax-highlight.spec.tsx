import React from 'react';
import { expect } from '../../../testing/chai';
import { shallow } from '../../../testing/enzyme';
import { SyntaxHighlight } from './syntax-highlight';

describe('<SyntaxHighlight />', () => {
  it('renders Code', () => {
    const wrapper = shallow(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find('Code')).to.have.lengthOf(1);
  });

  it('passes code to Code', () => {
    const wrapper = shallow(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find('Code').children().text()).to.contain('some code');
  });

  it('uses javascript as language', () => {
    const wrapper = shallow(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find('Code').prop('language')).to.equal('javascript');
  });
});
