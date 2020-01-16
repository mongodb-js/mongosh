import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

import React from 'react';
import { configure, shallow } from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import { ShellInput } from './shell-input';

describe('<ShellInput />', () => {
  it('renders an input', () => {
    const wrapper = shallow(<ShellInput />);
    expect(wrapper.find('input')).to.have.lengthOf(1);
  });

  it('calls onInput with the current value when enter is pressed', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    wrapper.find('input').simulate('change', { target: { value: 'value' } });
    wrapper.find('input').simulate('keyup', {key: 'Enter'});
    expect(onInput).to.have.been.calledWith('value');
  });
});
