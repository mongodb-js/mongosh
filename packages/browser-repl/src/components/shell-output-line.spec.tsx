import React from 'react';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellOutputLine } from './shell-output-line';

describe('<ShellOutputLine />', () => {
  it('renders a string value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: 'some text'}} />);
    expect(wrapper.text()).to.contain('some text');
  });
});

