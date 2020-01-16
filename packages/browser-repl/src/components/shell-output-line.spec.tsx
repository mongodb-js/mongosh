import { expect } from 'chai';
import React from 'react';
import { configure, shallow } from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';

configure({adapter: new Adapter()});

import { ShellOutputLine } from './shell-output-line';

describe('<ShellOutputLine />', () => {
  it('renders a string value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: 'some text'}} />);
    expect(wrapper.text()).to.contain('some text');
  });
});

