import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import type { ReactWrapper, ShallowWrapper } from '../../testing/enzyme';
import { mount, shallow } from '../../testing/enzyme';
import { PasswordPrompt } from './password-prompt';
import { Shell } from './shell';
import { ShellInput } from './shell-input';
import { ShellOutput } from './shell-output';
import type { ShellOutputEntry } from './shell-output-line';

const wait: (ms?: number) => Promise<void> = (ms = 10) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe('<Shell />', function () {
  let onOutputChangedSpy;
  let onHistoryChangedSpy;
  let onOperationStartedSpy;
  let onOperationEndSpy;
  let fakeRuntime;
  let wrapper: ShallowWrapper | ReactWrapper;
  let scrollIntoView;
  let elementFocus;
  let onInput;

  beforeEach(function () {
    onInput = async (code: string): Promise<void> => {
      wrapper.find(ShellInput).prop('onInput')(code);
      await wait();
      wrapper.update();
    };

    scrollIntoView = sinon.spy(Element.prototype, 'scrollIntoView');
    elementFocus = sinon.spy(HTMLElement.prototype, 'focus');

    fakeRuntime = {
      evaluate: sinon.fake.returns({ printable: 'some result' }),
      setEvaluationListener: () => {},
    };

    onOutputChangedSpy = sinon.spy();
    onHistoryChangedSpy = sinon.spy();
    onOperationStartedSpy = sinon.spy();
    onOperationEndSpy = sinon.spy();

    wrapper = shallow(
      <Shell
        runtime={fakeRuntime}
        onOutputChanged={onOutputChangedSpy}
        onHistoryChanged={onHistoryChangedSpy}
        onOperationStarted={onOperationStartedSpy}
        onOperationEnd={onOperationEndSpy}
      />
    );
  });

  afterEach(function () {
    scrollIntoView.restore();
    elementFocus.restore();
  });

  it('renders a ShellOutput component', function () {
    expect(wrapper.find(ShellOutput)).to.have.lengthOf(1);
  });

  it('passes the initial output to ShellOutput', function () {
    expect(wrapper.find(ShellOutput).prop('output')).to.deep.equal([]);
  });

  it('renders a ShellInput component', function () {
    expect(wrapper.find(ShellInput)).to.have.lengthOf(1);
  });

  it('passes runtime as autocompleter to ShellInput', function () {
    expect(wrapper.find(ShellInput).prop('autocompleter')).to.equal(
      fakeRuntime
    );
  });

  it('does not set the editor as readOnly by default', function () {
    expect(wrapper.find(ShellInput).prop('operationInProgress')).to.equal(
      false
    );
  });

  context('when initialOutput is set', function () {
    it('allows to set intial output', async function () {
      const initialOutput: ShellOutputEntry[] = [
        { format: 'input', value: 'line 1' },
        { format: 'output', value: 'some result' },
      ];

      wrapper = shallow(
        <Shell runtime={fakeRuntime} initialOutput={initialOutput} />
      );

      wrapper.update();

      await wait();

      expect(wrapper.state('output')).to.deep.equal(initialOutput);
    });

    it('applies max maxOutputLength', function () {
      const initialOutput: ShellOutputEntry[] = [
        { format: 'input', value: 'line 1' },
        { format: 'output', value: 'some result' },
        { format: 'input', value: 'line 2' },
        { format: 'output', value: 'some result' },
      ];

      wrapper = shallow(
        <Shell
          runtime={fakeRuntime}
          maxOutputLength={3}
          initialOutput={initialOutput}
        />
      );

      expect(wrapper.state('output')).to.deep.equal([
        { format: 'output', value: 'some result' },
        { format: 'input', value: 'line 2' },
        { format: 'output', value: 'some result' },
      ]);
    });
  });

  context('when initialHistory is set', function () {
    it('allows to set intial history', function () {
      const history: string[] = ['line 1'];

      wrapper = shallow(
        <Shell runtime={fakeRuntime} initialHistory={history} />
      );

      expect(wrapper.state('history')).to.deep.equal(history);
    });

    it('applies max maxHistoryLength', function () {
      const initialHistory: string[] = ['line3', 'line2', 'line1'];

      wrapper = shallow(
        <Shell
          runtime={fakeRuntime}
          maxHistoryLength={2}
          initialHistory={initialHistory}
        />
      );

      expect(wrapper.state('history')).to.deep.equal(['line3', 'line2']);
    });
  });

  context('when an input is entered', function () {
    beforeEach(async function () {
      await onInput('some code');
    });

    it('evaluates the input with runtime', function () {
      expect(fakeRuntime.evaluate).to.have.been.calledWith('some code');
    });

    it('adds the evaluated input and output as lines to the output', function () {
      expect(wrapper.find(ShellOutput).prop('output')).to.deep.equal([
        { format: 'input', value: 'some code' },
        { format: 'output', value: 'some result', type: undefined },
      ]);
    });

    it('calls onOutputChanged with output', function () {
      expect(onOutputChangedSpy).to.have.been.calledWith([
        { format: 'input', value: 'some code' },
        { format: 'output', value: 'some result', type: undefined },
      ]);
    });

    it('applies maxOutputLength', async function () {
      wrapper = shallow(<Shell runtime={fakeRuntime} maxOutputLength={3} />);
      await onInput('line 1');
      await onInput('line 2');
      expect(wrapper.state('output')).to.deep.equal([
        { format: 'output', value: 'some result', type: undefined },
        { format: 'input', value: 'line 2' },
        { format: 'output', value: 'some result', type: undefined },
      ]);
    });

    it('updates the history', async function () {
      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal([
        'some code',
      ]);

      await onInput('some more code');

      const expected = ['some more code', 'some code'];

      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal(expected);
    });

    it('calls onHistoryChanged', function () {
      expect(onHistoryChangedSpy).to.have.been.calledOnceWith(['some code']);
    });

    it('applies maxHistoryLength', async function () {
      wrapper = shallow(<Shell runtime={fakeRuntime} maxHistoryLength={2} />);
      await onInput('line 1');

      await onInput('line 2');
      expect(wrapper.state('history')).to.deep.equal(['line 2', 'line 1']);

      await onInput('line 3');
      expect(wrapper.state('history')).to.deep.equal(['line 3', 'line 2']);
    });

    it('redacts history if redactInfo is set', async function () {
      wrapper = shallow(<Shell runtime={fakeRuntime} redactInfo />);
      await onInput('some@email.com');
      expect(wrapper.state('history')).to.deep.equal(['<email>']);
    });

    it('does not add sensitive commands to the history', async function () {
      wrapper = shallow(<Shell runtime={fakeRuntime} />);
      await onInput('db.createUser()');
      expect(wrapper.state('history')).to.deep.equal([]);
    });

    it('calls onOperationStarted', function () {
      expect(onOperationStartedSpy).to.have.been.calledOnce;
    });

    it('calls onOperationEnd', function () {
      expect(onOperationEndSpy).to.have.been.calledOnce;
    });
  });

  context('when empty input is entered', function () {
    beforeEach(async function () {
      await onInput('');
    });

    it('does not evaluate the input with runtime', function () {
      expect(fakeRuntime.evaluate).not.to.have.been.calledWith('');
    });

    it('adds a blank line to the output', function () {
      expect(wrapper.find(ShellOutput).prop('output')).to.deep.equal([
        { format: 'input', value: ' ' },
      ]);
    });

    it('does not update the history', function () {
      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal([]);
    });
  });

  it('sets the editor as readOnly/operationInProgress true while onInput is executed', async function () {
    let onInputDone;
    wrapper = shallow(
      <Shell
        runtime={
          {
            evaluate: (code: string): Promise<any> => {
              if (code.includes('typeof prompt')) {
                return Promise.resolve({});
              }
              return new Promise((resolve) => {
                onInputDone = resolve;
              });
            },
            setEvaluationListener: () => {},
          } as any
        }
      />
    );

    const onInputStub = wrapper.find(ShellInput).prop('onInput');
    onInputStub('ok');

    // Check operationInProgress is true while eval is called
    expect(wrapper.find(ShellInput).prop('operationInProgress')).to.equal(true);

    // Fufill eval.
    onInputDone();
    await wait();

    wrapper.update();

    // Ensure operationInProgress is false.
    expect(wrapper.find(ShellInput).prop('operationInProgress')).to.equal(
      false
    );
  });

  context('when an input is entered and it causes an error', function () {
    let error;

    beforeEach(async function () {
      error = new Error('some error');
      fakeRuntime.evaluate = sinon.fake.returns(Promise.reject(error));

      await onInput('some code');
    });

    it('adds the evaluated input and an error to the output if the evaluation fails', function () {
      const output = wrapper.find(ShellOutput).prop('output');

      expect(output).to.deep.equal([
        { format: 'input', value: 'some code' },
        { format: 'error', value: error },
      ]);
    });

    it('sets the editor as operationInProgress false after the execution', function () {
      expect(wrapper.find(ShellInput).prop('operationInProgress')).to.equal(
        false
      );
    });

    it('calls onOutputChanged with output', function () {
      expect(onOutputChangedSpy).to.have.been.calledWith([
        { format: 'input', value: 'some code' },
        { format: 'error', value: error },
      ]);
    });

    it('updates the history', async function () {
      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal([
        'some code',
      ]);

      await onInput('some more code');

      const expected = ['some more code', 'some code'];

      expect(wrapper.find(ShellInput).prop('history')).to.deep.equal(expected);
    });

    it('calls onHistoryChanged', function () {
      expect(onHistoryChangedSpy).to.have.been.calledOnceWith(['some code']);
    });

    it('calls onOperationEnd', function () {
      expect(onOperationEndSpy).to.have.been.calledOnce;
    });
  });

  it('scrolls the container to the bottom each time the output is updated', function () {
    wrapper = mount(<Shell runtime={fakeRuntime} />);

    wrapper.setState({
      output: [
        { format: 'input', value: 'some code' },
        { format: 'output', value: 'some result' },
      ],
    });

    wrapper.update();

    expect(Element.prototype.scrollIntoView).to.have.been.calledTwice;
  });

  it('focuses on the input when the background container is clicked', function () {
    wrapper = mount(<Shell runtime={fakeRuntime} />);
    const container = wrapper.find('div[data-testid="shell"]');

    const fakeMouseEvent: any = {
      target: 'a',
      currentTarget: 'a',
    };
    container.prop('onClick')(fakeMouseEvent);

    expect(HTMLElement.prototype.focus).to.have.been.calledOnce;
  });

  it('does not focus on the input when an element that is not the background container is clicked', function () {
    wrapper = mount(<Shell runtime={fakeRuntime} />);
    const container = wrapper.find('div[data-testid="shell"]');

    const fakeMouseEvent: any = {
      target: 'a',
      currentTarget: 'b',
    };
    container.prop('onClick')(fakeMouseEvent);

    expect(HTMLElement.prototype.focus).to.not.have.been.called;
  });

  it('updated the output when .onPrint is called', function () {
    wrapper.instance().onPrint([{ type: null, printable: 42 }]);

    expect(onOutputChangedSpy).to.have.been.calledWith([
      { format: 'output', value: 42, type: null },
    ]);
  });

  it('clears the current output when cls is used', function () {
    wrapper.setState({
      output: [
        { format: 'input', value: 'some code' },
        { format: 'output', value: 'some result' },
      ],
    });

    wrapper.instance().onClearCommand();

    expect(onOutputChangedSpy).to.have.been.calledWith([]);
  });
  describe('password prompt', function () {
    let pressKey: (key: string) => Promise<void>;
    beforeEach(function () {
      wrapper = mount(<Shell runtime={fakeRuntime} />);
      pressKey = async (key: string) => {
        wrapper
          .find(PasswordPrompt)
          .instance()
          .onKeyDown({
            key,
            target: wrapper.find('input').instance(),
          });
        await wait();
        wrapper.update();
      };
    });

    it('displays a password prompt when asked to', async function () {
      expect(wrapper.find(PasswordPrompt)).to.have.lengthOf(0);

      const passwordPromise = wrapper
        .instance()
        .onPrompt('Enter password', 'password');
      await wait();
      wrapper.update();
      expect(wrapper.state('passwordPrompt')).to.equal('Enter password');
      expect(wrapper.find(PasswordPrompt)).to.have.lengthOf(1);
      wrapper.find('input').instance().value = '12345';
      await pressKey('Enter');

      expect(await passwordPromise).to.equal('12345');
      expect(HTMLElement.prototype.focus).to.have.been.called;
    });

    it('can abort reading the password', async function () {
      const passwordPromise = wrapper
        .instance()
        .onPrompt('Enter password', 'password');
      await wait();
      wrapper.update();
      await pressKey('Esc');

      try {
        await passwordPromise;
      } catch {
        expect(HTMLElement.prototype.focus).to.have.been.called;
        return;
      }
      expect.fail('should have been rejected');
    });
  });

  context('shows a shell prompt', function () {
    it('defaults to >', async function () {
      wrapper = mount(<Shell runtime={fakeRuntime} />);
      await wait();
      expect(wrapper.find('ShellInput').prop('prompt')).to.equal('>');
    });

    it('initializes with the value of getShellPrompt', async function () {
      // eslint-disable-next-line @typescript-eslint/require-await
      fakeRuntime.getShellPrompt = async () => {
        return 'mongos>';
      };
      wrapper = mount(<Shell runtime={fakeRuntime} />);
      await wait();
      wrapper.update();
      expect(wrapper.find('ShellInput').prop('prompt')).to.equal('mongos>');
    });

    it('updates after evaluation', async function () {
      let called = 0;
      // eslint-disable-next-line @typescript-eslint/require-await
      fakeRuntime.getShellPrompt = async () => {
        if (called++ <= 1) {
          return 'mongos>';
        }
        return 'rs0:primary>';
      };
      // eslint-disable-next-line @typescript-eslint/require-await
      fakeRuntime.evaluate = async () => {
        return {};
      };

      wrapper = mount(<Shell runtime={fakeRuntime} />);
      await wait();
      wrapper.update();
      expect(wrapper.find('ShellInput').prop('prompt')).to.equal('mongos>');

      await onInput('some code');
      expect(wrapper.find('ShellInput').prop('prompt')).to.equal(
        'rs0:primary>'
      );
    });

    it('works with a custom user-provided prompt', async function () {
      // eslint-disable-next-line @typescript-eslint/require-await
      fakeRuntime.evaluate = async () => {
        return {
          type: null,
          printable: 'abc>',
        };
      };

      wrapper = mount(<Shell runtime={fakeRuntime} />);
      await wait();
      wrapper.update();
      expect(wrapper.find('ShellInput').prop('prompt')).to.equal('abc>');
    });
  });

  it('sets initial text for the shell input', function () {
    wrapper = mount(
      <Shell runtime={fakeRuntime} initialInput="db.coll.find({})" />
    );
    expect(wrapper.find('Editor').prop('value')).to.eq('db.coll.find({})');
  });
});
