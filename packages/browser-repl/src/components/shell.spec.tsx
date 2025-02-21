import React, { useState, useEffect } from 'react';
import sinon from 'sinon';
import { render, screen, waitFor, configure } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from '../../testing/chai';

import { Shell } from './shell';
import type { ShellOutputEntry } from './shell-output-line';
import type { RuntimeEvaluationListener } from '@mongosh/browser-runtime-core';

configure({
  getElementError: (message) => {
    // never fun when an element lookup fails inside waitFor
    return new Error(message ?? 'some error');
  },
});

function useInitialEval(initialEvaluate?: string | string[]) {
  const [initialEvalApplied, setInitialEvalApplied] = useState(false);
  useEffect(() => {
    setInitialEvalApplied(true);
  }, [setInitialEvalApplied]);
  return initialEvalApplied ? undefined : initialEvaluate;
}

function ShellWrapper({
  initialEvaluate: _initialEvaluate,
  ...props
}: React.ComponentProps<typeof Shell>) {
  const initialEvaluate = useInitialEval(_initialEvaluate);
  return <Shell initialEvaluate={initialEvaluate} {...props} />;
}

function filterEvaluateCalls(calls: any) {
  return calls.filter((args: any) => {
    return !args[0].includes('typeof prompt');
  });
}

let lastKey = 0;

describe('shell', function () {
  let fakeRuntime;
  let scrollIntoView;
  let elementFocus;
  let listener: RuntimeEvaluationListener;

  beforeEach(function () {
    fakeRuntime = {
      evaluate: sinon.fake.returns({ printable: 'some result' }),
      setEvaluationListener: (_listener) => {
        listener = _listener;
      },
    };

    scrollIntoView = sinon.spy(Element.prototype, 'scrollIntoView');
    elementFocus = sinon.spy(HTMLElement.prototype, 'focus');
  });

  afterEach(function () {
    scrollIntoView.restore();
    elementFocus.restore();
  });

  it('renders the shell', function () {
    render(<ShellWrapper runtime={fakeRuntime} />);

    expect(screen.getByTestId('shell')).to.exist;
    expect(screen.getByRole('textbox').getAttribute('aria-readonly')).to.equal(
      null
    );
    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.be.empty;
  });

  it('focuses on the input if the container is clicked', function () {
    render(<ShellWrapper runtime={fakeRuntime} />);
    userEvent.click(screen.getByTestId('shell'));

    expect(HTMLElement.prototype.focus).to.have.been.calledOnce;
  });

  it('takes output', function () {
    const output: ShellOutputEntry[] = [
      { key: lastKey++, format: 'output', value: 'Welcome message goes here' },
    ];

    render(<ShellWrapper runtime={fakeRuntime} output={output} />);

    expect(screen.getByText('Welcome message goes here')).to.exist;
    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.be.empty;
  });

  it('calls onOutputChanged', async function () {
    let output = [];
    const onOutputChanged = (newOutput) => {
      output = newOutput;
    };

    const initialEvaluate = 'my command';
    const { rerender } = render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onOutputChanged={onOutputChanged}
        output={output}
      />
    );

    await waitFor(() => {
      expect(output).to.deep.equal([
        {
          format: 'input',
          value: 'my command',
        },
        {
          format: 'output',
          type: undefined,
          value: 'some result',
        },
      ]);
    });

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.have.length(1);

    // scrolls to the bottom initially and every time it outputs
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).to.have.been.calledTwice;
    });

    // make sure we scroll to the bottom every time output changes
    rerender(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onOutputChanged={onOutputChanged}
        output={output}
      />
    );
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).to.have.been.calledThrice;
    });
  });

  it('calls onHistoryChanged', async function () {
    let history = [];
    const onHistoryChanged = (newHistory) => {
      history = newHistory;
    };

    const initialEvaluate = 'my command';
    render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onHistoryChanged={onHistoryChanged}
        history={history}
      />
    );

    await waitFor(() => {
      expect(history).to.deep.equal(['my command']);
    });

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.have.length(1);
  });

  it('takes initialText', function () {
    const initialText = 'still typing';

    render(<ShellWrapper runtime={fakeRuntime} initialText={initialText} />);
    expect(screen.getByRole('textbox').textContent).to.equal(initialText);
    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.be.empty;
  });

  it('takes isOperationInProgress', function () {
    const isOperationInProgress = true;

    render(
      <ShellWrapper
        runtime={fakeRuntime}
        isOperationInProgress={isOperationInProgress}
      />
    );

    expect(screen.getByRole('textbox').getAttribute('aria-readonly')).to.equal(
      'true'
    );
    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.be.empty;
  });

  it('calls onOperationStarted and onOperationEnd', async function () {
    const initialEvaluate = 'my command';

    let isOperationInProgress = false;

    const onOperationStarted = sinon.stub().callsFake(() => {
      isOperationInProgress = true;
    });

    const onOperationEnd = sinon.stub().callsFake(() => {
      isOperationInProgress = false;
    });

    render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onOperationStarted={onOperationStarted}
        onOperationEnd={onOperationEnd}
        isOperationInProgress={isOperationInProgress}
      />
    );

    await waitFor(function () {
      expect(onOperationStarted.callCount).to.equal(1);
      expect(onOperationEnd.callCount).to.equal(1);
    });

    expect(isOperationInProgress).to.equal(false);

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.have.length(1);
  });

  it('takes redactInfo', async function () {
    let history = [];
    const onHistoryChanged = (newHistory) => {
      history = newHistory;
    };

    const initialEvaluate = 'some@email.com';
    const redactInfo = true;
    render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onHistoryChanged={onHistoryChanged}
        history={history}
        redactInfo={redactInfo}
      />
    );

    await waitFor(() => {
      expect(history).to.deep.equal(['<email>']);
    });

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.have.length(1);
  });

  it('does not evaluate empty input', async function () {
    const initialEvaluate = ' ';

    let output = [];
    const onOutputChanged = (newOutput) => {
      output = newOutput;
    };

    render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onOutputChanged={onOutputChanged}
        output={output}
      />
    );

    await waitFor(() => {
      expect(output).to.deep.equal([
        {
          format: 'input',
          value: ' ',
        },
      ]);
    });

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.be.empty;
  });

  it('adds errors to output', async function () {
    const error = new Error('some error');
    fakeRuntime.evaluate = sinon.fake.returns(Promise.reject(error));

    let output = [];
    const onOutputChanged = (newOutput) => {
      output = newOutput;
    };

    const initialEvaluate = 'my command';
    render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onOutputChanged={onOutputChanged}
        output={output}
      />
    );

    await waitFor(() => {
      expect(output).to.deep.equal([
        {
          format: 'input',
          value: 'my command',
        },
        {
          format: 'error',
          value: error,
        },
      ]);
    });

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.have.length(1);
  });

  it('takes maxOutputLength', async function () {
    let output: ShellOutputEntry[] = [];
    for (let i = 0; i < 1000; i++) {
      output.push({
        key: lastKey++,
        format: 'output',
        type: undefined,
        value: 'some result',
      });
    }
    const onOutputChanged = (newOutput) => {
      output = newOutput;
    };

    const initialEvaluate = 'my command';
    render(
      <ShellWrapper
        runtime={fakeRuntime}
        maxOutputLength={1}
        initialEvaluate={initialEvaluate}
        onOutputChanged={onOutputChanged}
        output={output}
      />
    );

    await waitFor(() => {
      expect(output).to.deep.equal([
        {
          format: 'output',
          type: undefined,
          value: 'some result',
        },
      ]);
    });

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.have.length(1);
  });

  it('takes maxHistoryLength', async function () {
    let history: string[] = [];
    for (let i = 0; i < 1000; i++) {
      history.push('foo');
    }
    const onHistoryChanged = (newHistory) => {
      history = newHistory;
    };

    const initialEvaluate = 'my command';
    render(
      <ShellWrapper
        runtime={fakeRuntime}
        maxHistoryLength={1}
        initialEvaluate={initialEvaluate}
        onHistoryChanged={onHistoryChanged}
        history={history}
      />
    );

    await waitFor(() => {
      expect(history).to.deep.equal(['my command']);
    });

    expect(filterEvaluateCalls(fakeRuntime.evaluate.args)).to.have.length(1);
  });

  it('prints when onPrint is called while evaluating', async function () {
    fakeRuntime = {
      evaluate: sinon.stub().callsFake(async (command: string) => {
        if (command === 'my command') {
          // don't print every time we update the prompt, only once for the actual command being input
          await listener?.onPrint?.([
            { type: null, printable: 'from inside onPrint' },
          ]);
        }
        return { printable: 'some result' };
      }),
      setEvaluationListener: (_listener) => {
        listener = _listener;
      },
    };

    const initialEvaluate = 'my command';

    let output = [];
    const onOutputChanged = (newOutput) => {
      output = newOutput;
    };

    render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onOutputChanged={onOutputChanged}
        output={output}
      />
    );

    await waitFor(() => {
      expect(output[output.length - 1]).to.deep.equal({
        format: 'output',
        type: undefined,
        value: 'some result',
      });
    });

    expect(output).to.deep.equal([
      // we typed "my command"
      { format: 'input', value: 'my command' },
      // while evaluating it printed something
      { format: 'output', type: null, value: 'from inside onPrint' },
      // we then printed the result of the evaluation
      { format: 'output', type: undefined, value: 'some result' },
    ]);
  });

  it('clears the output when onClearCommand is called', async function () {
    let output: ShellOutputEntry[] = [
      {
        key: lastKey++,
        format: 'output',
        type: undefined,
        value: 'some result',
      },
    ];
    const onOutputChanged = (newOutput) => {
      output = newOutput;
    };
    const initialEvaluate = 'my command';

    render(
      <ShellWrapper
        runtime={fakeRuntime}
        initialEvaluate={initialEvaluate}
        onOutputChanged={onOutputChanged}
        output={output}
      />
    );

    await waitFor(() => expect(listener).to.exist);
    await listener?.onClearCommand?.();

    await waitFor(() => {
      expect(output).to.deep.equal([]);
    });
  });

  describe('password prompt', function () {
    it('displays a password prompt when asked to', async function () {
      const initialEvaluate = 'my command';
      render(
        <ShellWrapper runtime={fakeRuntime} initialEvaluate={initialEvaluate} />
      );

      await waitFor(() => expect(listener).to.exist);
      const promise = listener?.onPrompt?.('password?', 'password');

      userEvent.type(
        screen.getByTestId('password-prompt'),
        'my password{enter}'
      );

      await promise;

      expect(screen.queryByTestId('password-prompt')).to.be.null;
    });

    it('can abort reading the password', async function () {
      const initialEvaluate = 'my command';
      render(
        <ShellWrapper runtime={fakeRuntime} initialEvaluate={initialEvaluate} />
      );

      await waitFor(() => expect(listener).to.exist);
      const promise = listener?.onPrompt?.('password?', 'password');

      userEvent.type(screen.getByTestId('password-prompt'), '{escape}');

      try {
        await promise;
        expect.fail('expected error');
      } catch (err) {
        expect(err.message).to.equal('Canceled by user');
      }

      expect(screen.queryByTestId('password-prompt')).to.be.null;
    });
  });

  describe('shell prompt', function () {
    it('defaults to >', async function () {
      render(<ShellWrapper runtime={fakeRuntime} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Chevron Right Icon')).to.exist;
      });
    });

    it('initializes with the value of getShellPrompt', async function () {
      fakeRuntime.getShellPrompt = () => {
        return '$custom$';
      };

      render(<ShellWrapper runtime={fakeRuntime} />);

      await waitFor(() => {
        expect(screen.getByText('$custom$')).to.exist;
      });
    });

    it('works with a custom user-provided prompt', async function () {
      fakeRuntime.evaluate = () => {
        return {
          type: null,
          printable: 'abc',
        };
      };

      render(<ShellWrapper runtime={fakeRuntime} />);

      await waitFor(() => {
        expect(screen.getByText('abc')).to.exist;
      });
    });

    it('updates after evaluation', async function () {
      let called = 0;
      // eslint-disable-next-line @typescript-eslint/require-await
      fakeRuntime.getShellPrompt = async () => {
        called++;
        if (called === 1) {
          return 'mongos';
        }
        return 'rs0:primary';
      };

      fakeRuntime.evaluate = () => {
        return {};
      };

      const initialEvaluate = ['command 1', 'command 2'];
      const onOutputChanged = sinon.spy();
      render(
        <ShellWrapper
          runtime={fakeRuntime}
          initialEvaluate={initialEvaluate}
          onOutputChanged={onOutputChanged}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('rs0:primary')).to.exist;
      });
    });
  });
});
