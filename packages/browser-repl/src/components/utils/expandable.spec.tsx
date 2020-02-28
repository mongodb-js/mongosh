import React from 'react';
import { expect } from '../../../testing/chai';
import { mount } from '../../../testing/enzyme';
import { Expandable } from './expandable';

describe('<Expandable />', () => {
  it('renders children if not function', () => {
    const wrapper = mount(<Expandable>some text</Expandable>);
    expect(wrapper.text()).to.contain('some text');
  });
});
