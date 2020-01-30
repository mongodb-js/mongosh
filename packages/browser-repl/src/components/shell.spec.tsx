import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow, mount } from '../../testing/enzyme';
import { Shell } from './shell';
import { ShellInput } from './shell-input';
import { ShellOutput } from './shell-output';

const wait: (ms?: number) => Promise<void> = (ms = 10) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('<Shell />', () => {
  let onInputProp;
  let onOutputProp;
  let fakeRuntime;
  let wrapper;
  let scrollIntoView;

  beforeEach(() => {
    scrollIntoView = sinon.spy(Element.prototype, 'scrollIntoView');

    fakeRuntime = {
      evaluate: sinon.fake.returns({value: 'some result'})
    };

    onInputProp = sinon.spy();
    onOutputProp = sinon.spy();
    wrapper = shallow(<Shell runtime={fakeRuntime} onInput={onInputProp} onOutput={onOutputProp} />);
  });

  afterEach(() => {
    scrollIntoView.restore();
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
    beforeEach('Name of the group', async() => {
      const onInput = wrapper.find(ShellInput).prop('onInput') as Function;
      onInput('some code');
      await wait();
      wrapper.update();
    });

    it('evaluates the input with runtime', () => {
      expect(fakeRuntime.evaluate).to.have.been.calledWith('some code');
    });

    it('adds the evaluated input and output as lines to the output', async() => {
      expect(wrapper.find(ShellOutput).prop('output')).to.deep.equal([
        { type: 'input', value: 'some code' },
        { type: 'output', value: 'some result' }
      ]);
    });

    it('calls onInput and onOutput properties', async() => {
      const onInput = wrapper.find(ShellInput).prop('onInput') as Function;
      onInput('some code');
      await wait();

      expect(onInputProp).to.have.been.calledWith({type: 'input', value: 'some code'});
      expect(onOutputProp).to.have.been.calledWith({type: 'output', value: 'some result'});
    });
  });

  context('when an input is entered and it causes an error', () => {
    let error;
    beforeEach('Name of the group', async() => {
      error = new Error('some error');
      fakeRuntime.evaluate = sinon.fake.returns(Promise.reject(error));

      const onInput = wrapper.find(ShellInput).prop('onInput') as Function;
      onInput('some code');

      await wait();
      wrapper.update();
    });

    it('adds the evaluated input and an error to the output if the evaluation fails', async() => {
      const output = wrapper.find(ShellOutput).prop('output');

      expect(output).to.deep.equal([
        { type: 'input', value: 'some code' },
        { type: 'error', value: error }
      ]);
    });

    it('calls onInput and onOutput properties', async() => {
      const onInput = wrapper.find(ShellInput).prop('onInput') as Function;
      onInput('some code');
      await wait();

      expect(onInputProp).to.have.been.calledWith({type: 'input', value: 'some code'});
      expect(onOutputProp).to.have.been.calledWith({type: 'error', value: error});
    });
  });

  it('scrolls the container to the bottom each time the output is updated', () => {
    wrapper = mount(<Shell runtime={fakeRuntime} />);

    wrapper.setState({output: [
      { type: 'input', value: 'some code' },
      { type: 'output', value: 'some result' }
    ]});

    wrapper.update();

    expect(Element.prototype.scrollIntoView).to.have.been.calledTwice;
  });
});
