import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import Shell from './shell';
import { ShellInput } from './shell-input';
import { ShellOutput } from './shell-output';

const wait: (ms?: number) => Promise<void> = (ms = 10) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('<Shell />', () => {
  let fakeInterpreter;
  let wrapper;

  beforeEach(() => {
    fakeInterpreter = {
      evaluate: sinon.fake.returns('some result')
    };

    wrapper = shallow(<Shell interpreter={fakeInterpreter} />);
  });

  it('renders a ShellOutput component', () => {
    expect(wrapper.find(ShellOutput)).to.have.lengthOf(1);
  });

  it('passes ShellOutput the initial output', () => {
    expect(wrapper.find(ShellOutput).prop('output')).to.deep.equal([]);
  });

  it('renders a ShellInput component', () => {
    expect(wrapper.find(ShellInput)).to.have.lengthOf(1);
  });

  context('when an input is entered', () => {
    it('evaluates the input with an interpreter', () => {
      const onInput = wrapper.find(ShellInput).prop('onInput') as Function;
      onInput('some code');
      expect(fakeInterpreter.evaluate.calledWith('some code')).to.be.true;
    });

    it('adds the evaluated input and output as lines to the output', async() => {
      const onInput = wrapper.find(ShellInput).prop('onInput') as Function;
      onInput('some code');
      wrapper.update();
      await wait();

      expect(wrapper.find(ShellOutput).prop('output')).to.deep.equal([
        { type: 'input', value: 'some code' },
        { type: 'output', value: 'some result' }
      ]);
    });

    it('adds the evaluated input and an error to the output if the evaluation fails', async() => {
      const error = new Error('some error');
      fakeInterpreter.evaluate = sinon.fake.returns(Promise.reject(error));

      const onInput = wrapper.find(ShellInput).prop('onInput') as Function;
      onInput('some code');

      wrapper.update();
      await wait();

      const output = wrapper.find(ShellOutput).prop('output');

      expect(output).to.deep.equal([
        { type: 'input', value: 'some code' },
        { type: 'error', value: error }
      ]);
    });
  });
});
