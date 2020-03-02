import React from 'react';
import { expect } from '../../testing/chai';
import { shallow, mount } from '../../testing/enzyme';

import { ShellOutputLine } from './shell-output-line';
import { HelpOutput } from './types/help-output';
import { CursorOutput } from './types/cursor-output';
import { CursorIterationResultOutput } from './types/cursor-iteration-result-output';
import { SimpleTypeOutput } from './types/simple-type-output';
import { ObjectOutput } from './types/object-output';
import { ErrorOutput } from './types/error-output';

describe('<ShellOutputLine />', () => {
  it('renders a string value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: 'some text' }} />);
    expect(wrapper.find(SimpleTypeOutput)).to.have.lengthOf(1);
  });

  it('renders an integer value', () => {
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: 1 }} />);
    expect(wrapper.find(SimpleTypeOutput)).to.have.lengthOf(1);
  });

  it('renders an object', () => {
    const object = { x: 1 };
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: object }} />);
    expect(wrapper.find(ObjectOutput)).to.have.lengthOf(1);
  });

  it('renders undefined', () => {
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: undefined }} />);
    expect(wrapper.find(SimpleTypeOutput)).to.have.lengthOf(1);
  });

  it('renders null', () => {
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: null }} />);
    expect(wrapper.find(SimpleTypeOutput)).to.have.lengthOf(1);
  });

  it('renders function', () => {
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: (x): any => x }} />);
    expect(wrapper.find(SimpleTypeOutput)).to.have.lengthOf(1);
  });

  it('renders class', () => {
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: class C {} }} />);
    expect(wrapper.find(SimpleTypeOutput)).to.have.lengthOf(1);
  });

  it('renders Help', () => {
    const wrapper = shallow(<ShellOutputLine entry={{
      type: 'output',
      shellApiType: 'Help',
      value: {
        help: 'Help',
        docs: '#',
        attr: []
      } }
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

  it('renders an error', () => {
    const err = new Error('x');
    const wrapper = shallow(<ShellOutputLine entry={{ type: 'output', value: err }} />);
    expect(wrapper.find(ErrorOutput)).to.have.lengthOf(1);
  });

  it('renders an input line', () => {
    const wrapper = mount(<ShellOutputLine entry={{ type: 'input', value: 'some text' }} />);
    expect(wrapper.text()).to.contain('some text');
  });
});

