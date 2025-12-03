import React from 'react';
import { CodemirrorInlineEditor } from '@mongodb-js/compass-editor';
import { expect } from '../../testing/src/chai';
import { mount } from '../../testing/src/enzyme';
import { SyntaxHighlight } from './syntax-highlight';

describe('<SyntaxHighlight />', function () {
  let wrapper;

  afterEach(function () {
    wrapper.unmount();
    wrapper = null;
  });

  it('renders Code', function () {
    wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(CodemirrorInlineEditor)).to.have.lengthOf(1);
  });

  it('passes code to Code', function () {
    wrapper = mount(<SyntaxHighlight code={'some code'} />);
    expect(wrapper.find(CodemirrorInlineEditor).prop('initialText')).to.equal(
      'some code'
    );
  });
});
