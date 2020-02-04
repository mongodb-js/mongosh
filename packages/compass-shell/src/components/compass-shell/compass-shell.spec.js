import React from 'react';
import { shallow } from 'enzyme';
import { Shell } from 'mongosh-browser-repl';
import { CompassShell } from './compass-shell';

describe('CompassShell', () => {
  it('renders shell if runtime is passed as prop', () => {
    const fakeRuntime = {};
    const wrapper = shallow(<CompassShell runtime={fakeRuntime}/>);
    expect(wrapper.find(Shell).prop('runtime')).to.equal(fakeRuntime);
  });

  it('does not renders a shell if runtime is null', () => {
    const wrapper = shallow(<CompassShell runtime={null}/>);
    expect(wrapper.find(Shell)).to.have.lengthOf(0);
  });
});
