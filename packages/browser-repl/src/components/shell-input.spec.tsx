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
    wrapper.find('textarea').simulate('keyup', { key: 'Enter' });
    expect(onInput).to.have.been.calledWith('value');
  });

  it('does not call onInput with the current value when enter is pressed with shift', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    wrapper.find('textarea').simulate('change', { target: { value: 'value' } });
    wrapper.find('textarea').simulate('keyup', { key: 'Enter', shiftKey: true });
    expect(onInput).to.not.have.been.called;
  });

  it('does not add new line to the output when enter is pressed', () => {
    // TODO: hard/impossible to test with enzyme
  });

  it('allows newline when shift+enter is pressed', () => {
    // TODO: hard/impossible to test with enzyme
  });
});
