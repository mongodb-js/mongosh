import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow, mount, ShallowWrapper, ReactWrapper } from '../../testing/enzyme';
import { Shell } from './shell';
import { ShellInput } from './shell-input';
import { ShellOutput } from './shell-output';
import { ShellOutputEntry } from './shell-output-line';

const wait: (ms?: number) => Promise<void> = (ms = 10) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('<Shell />', () => {
  let onOutputChangedSpy;
  let onHistoryChangedSpy;
  let fakeRuntime;
  let wrapper: ShallowWrapper | ReactWrapper;
  let scrollIntoView;
  let onInput;

  beforeEach(() => {
    onInput = async(code: string): Promise<void> => {
      wrapper.find(ShellInput).prop('onInput')(code);
      await wait();
      wrapper.update();
    };

    scrollIntoView = sinon.spy(Element.prototype, 'scrollIntoView');

    fakeRuntime = {
      evaluate: sinon.fake.returns({value: 'some result'})
    };

    onOutputChangedSpy = sinon.spy();
    onHistoryChangedSpy = sinon.spy();

    wrapper = shallow(<Shell
      runtime={fakeRuntime}
      onOutputChanged={onOutputChangedSpy}
      onHistoryChanged={onHistoryChangedSpy} />);
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

  context('when initialOutput is set', () => {
    it('allows to set intial output', async() => {
      const initialOutput: ShellOutputEntry[] = [
        { type: 'input', value: 'line 1' },
        { type: 'output', value: 'some result' }
      ];

      wrapper = shallow(<Shell
        runtime={fakeRuntime}
        initialOutput={initialOutput}
      />);

      wrapper.update();

      await wait();

      expect(wrapper.state('output')).to.deep.equal(initialOutput);
    });

    it('applies max maxOutputLength', () => {
      const initialOutput: ShellOutputEntry[] = [
        { type: 'input', value: 'line 1' },
        { type: 'output', value: 'some result' },
        { type: 'input', value: 'line 2' },
        { type: 'output', value: 'some result' }
      ];

      wrapper = shallow(<Shell
        runtime={fakeRuntime}
        maxOutputLength={3}
        initialOutput={initialOutput}
      />);

      expect(wrapper.state('output')).to.deep.equal([
        { type: 'output', value: 'some result' },
        { type: 'input', value: 'line 2' },
        { type: 'output', value: 'some result' }
      ]);
    });
  });

  context('when initialHistory is set', () => {
    it('allows to set intial history', () => {
      const history: string[] = [
        'line 1'
      ];

      wrapper = shallow(<Shell
        runtime={fakeRuntime}
        initialHistory={history}
      />);

      expect(wrapper.state('history')).to.deep.equal(history);
    });

    it('applies max maxHistoryLength', () => {
      const initialHistory: string[] = ['line3', 'line2', 'line1'];

      wrapper = shallow(<Shell
        runtime={fakeRuntime}
        maxHistoryLength={2}
        initialHistory={initialHistory}
      />);

      expect(wrapper.state('history')).to.deep.equal(['line3', 'line2']);
    });
  });

  context('when an input is entered', () => {
    beforeEach(async() => {
      await onInput('some code');
    });

    it('evaluates the input with runtime', () => {
      expect(fakeRuntime.evaluate).to.have.been.calledWith('some code');
    });

    it('adds the evaluated input and output as lines to the output', () => {
      expect(wrapper.find(ShellOutput).prop('output')).to.deep.equal([
        { type: 'input', value: 'some code' },
        { type: 'output', value: 'some result', apiType: undefined }
      ]);
    });

    it('calls onOutputChanged with output', () => {
      expect(onOutputChangedSpy).to.have.been.calledWith([
        { type: 'input', value: 'some code' },
        { type: 'output', value: 'some result', apiType: undefined }
      ]);
    });

    it('applies maxOutputLength', async() => {
      wrapper = shallow(<Shell runtime={fakeRuntime} maxOutputLength={3} />);
      await onInput('line 1');
      await onInput('line 2');
      expect(wrapper.state('output')).to.deep.equal([
        { type: 'output', value: 'some result', apiType: undefined },
        { type: 'input', value: 'line 2' },
        { type: 'output', value: 'some result', apiType: undefined }
      ]);
    });

    it('updates the history', async() => {
      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal([
        'some code'
      ]);

      await onInput('some more code');

      const expected = [
        'some more code',
        'some code'
      ];

      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal(expected);
    });

    it('calls onHistoryChanged', () => {
      expect(onHistoryChangedSpy).to.have.been.calledOnceWith(['some code']);
    });

    it('applies maxHistoryLength', async() => {
      wrapper = shallow(<Shell runtime={fakeRuntime} maxHistoryLength={2} />);
      await onInput('line 1');

      await onInput('line 2');
      expect(wrapper.state('history')).to.deep.equal(['line 2', 'line 1']);

      await onInput('line 3');
      expect(wrapper.state('history')).to.deep.equal(['line 3', 'line 2']);
    });

    it('redacts history if redactInfo is set', async() => {
      wrapper = shallow(<Shell runtime={fakeRuntime} redactInfo />);
      await onInput('some@email.com');
      expect(wrapper.state('history')).to.deep.equal(['<email>']);
    });

    it('does not add sensitive commands to the history', async() => {
      wrapper = shallow(<Shell runtime={fakeRuntime} />);
      await onInput('db.createUser()');
      expect(wrapper.state('history')).to.deep.equal([]);
    });
  });

  context('when an input is entered and it causes an error', () => {
    let error;

    beforeEach(async() => {
      error = new Error('some error');
      fakeRuntime.evaluate = sinon.fake.returns(Promise.reject(error));

      await onInput('some code');
    });

    it('adds the evaluated input and an error to the output if the evaluation fails', async() => {
      const output = wrapper.find(ShellOutput).prop('output');

      expect(output).to.deep.equal([
        { type: 'input', value: 'some code' },
        { type: 'error', value: error }
      ]);
    });


    it('calls onOutputChanged with output', () => {
      expect(onOutputChangedSpy).to.have.been.calledWith([
        { type: 'input', value: 'some code' },
        { type: 'error', value: error }
      ]);
    });

    it('updates the history', async() => {
      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal([
        'some code'
      ]);

      await onInput('some more code');

      const expected = [
        'some more code',
        'some code'
      ];

      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal(expected);
    });

    it('calls onHistoryChanged', () => {
      expect(onHistoryChangedSpy).to.have.been.calledOnceWith(['some code']);
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
