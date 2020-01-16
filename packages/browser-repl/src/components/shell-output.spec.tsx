import React from 'react';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellOutputLine } from './shell-output-line';
import { ShellOutput } from './shell-output';

describe('<ShellOutput />', () => {
  it('renders no output lines if none are passed', () => {
    const wrapper = shallow(<ShellOutput output={[]} />);
    expect(wrapper.find(ShellOutputLine)).to.have.lengthOf(0);
  });

  it('renders an output line if one is passed', () => {
    const line1 = {type: 'output', value: 'line 1'};
    const wrapper = shallow(<ShellOutput output={[line1]} />);
    expect(wrapper.find(ShellOutputLine)).to.have.lengthOf(1);
  });

  it('pass the entry to the output line as prop', () => {
    const line1 = {type: 'output', value: 'line 1'};
    const wrapper = shallow(<ShellOutput output={[line1]} />);

    expect(wrapper.find(ShellOutputLine).prop('entry')).to.deep.equal(line1);
  });
});

