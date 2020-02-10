import React from 'react';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellOutputLine } from './shell-output-line';
import { HelpOutput } from './types/help-output';
import { CursorOutput } from './types/cursor-output';
import { CursorIterationResultOutput } from './types/cursor-iteration-result-output';

describe('<ShellOutputLine />', () => {
  it('renders a string value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: 'some text'}} />);
    expect(wrapper.text()).to.contain('\'some text\'');
  });

  it('renders an integer value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: 1}} />);
    expect(wrapper.text()).to.contain(1);
  });

  it('renders an object', () => {
    const object = {x: 1};
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: object}} />);
    expect(wrapper.text()).to.contain('{ x: 1 }');
  });

  it('renders undefined', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: undefined}} />);
    expect(wrapper.text()).to.contain('undefined');
  });

  it('renders null', () => {
    const wrapper = shallow(<ShellOutputLine entry={{type: 'output', value: null}} />);
    expect(wrapper.text()).to.contain('null');
  });

  it('renders Help', () => {
    const wrapper = shallow(<ShellOutputLine entry={{
      type: 'output',
      shellApiType: 'Help',
      value: {
        help: 'Help',
        docs: '#',
        attr: []
      }}
    } />);

    expect(wrapper.find(HelpOutput)).to.have.lengthOf(1);
  });

  it('renders Cursor', () => {
    const wrapper = shallow(<ShellOutputLine entry={{
      type: 'output',
      shellApiType: 'Cursor',
      value: []
    }} />);

    expect(wrapper.find(CursorOutput)).to.have.lengthOf(1);
  });

  it('renders CursorIterationResult', () => {
    const wrapper = shallow(<ShellOutputLine entry={{
      type: 'output',
      shellApiType: 'CursorIterationResult',
      value: []
    }} />);

    expect(wrapper.find(CursorIterationResultOutput)).to.have.lengthOf(1);
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

