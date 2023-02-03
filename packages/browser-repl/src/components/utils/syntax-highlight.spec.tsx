import React from 'react';
import { SyntaxHighlight as CompassSyntaxHighlight } from '@mongodb-js/compass-editor';
import { expect } from '../../../testing/chai';
import { mount } from '../../../testing/enzyme';
import { SyntaxHighlight } from './syntax-highlight';

describe('<SyntaxHighlight />', () => {
  let wrapper;

  afterEach(() => {
    wrapper.unmount();
    wrapper = null;
  });

  it('renders Code', () => {
    wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(CompassSyntaxHighlight)).to.have.lengthOf(1);
  });

  it('passes code to Code', () => {
    wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(CompassSyntaxHighlight).prop('text')).to.equal('some code');
  });

  it('uses javascript as language', () => {
    wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(CompassSyntaxHighlight).prop('language')).to.equal('javascript');
  });
});
