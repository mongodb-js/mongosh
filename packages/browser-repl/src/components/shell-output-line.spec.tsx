import React from 'react';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellOutputLine } from './shell-output-line';

describe('<ShellOutputLine />', () => {
  it('renders a string value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: 'some text'}} />);
    expect(wrapper.text()).to.contain('"some text"');
  });

  it('renders an integer value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: 1}} />);
    expect(wrapper.text()).to.contain(1);
  });

  it('renders an object', () => {
    const object = {x: 1};
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: object}} />);
    expect(wrapper.text()).to.contain(JSON.stringify(object, null, 2));
  });

  it('renders undefined', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: undefined}} />);
    expect(wrapper.text()).to.contain('undefined');
  });

  it('renders an error as stack trace', () => {
    const err = new Error('x');
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: err}} />);
    expect(wrapper.text()).to.contain(err.stack);
  });

  it('does not stringify input', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'input', value: 'some text'}} />);
    expect(wrapper.text()).not.to.contain('"');
  });
});

