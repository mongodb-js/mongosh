import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellInput } from './shell-input';

describe('<ShellInput />', () => {
  it('renders an input', () => {
    const wrapper = shallow(<ShellInput />);
    expect(wrapper.find('textarea')).to.have.lengthOf(1);
  });

  it('calls onInput with the current value when enter is pressed', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    wrapper.find('textarea').simulate('change', { target: { value: 'value' } });
    wrapper.find('textarea').simulate('keyup', {key: 'Enter'});
    expect(onInput).to.have.been.calledWith('value');
  });
});
