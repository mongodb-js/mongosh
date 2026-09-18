import React from 'react';
import sinon from 'sinon';
import { expect } from '@mongosh/testing';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ShellInput } from './shell-input';

describe('<ShellInput />', function () {
  function editor(): HTMLElement {
    return screen.getByRole('textbox');
  }

  function promptSlot(): HTMLElement {
    return screen.getByTestId('shell-input').firstElementChild as HTMLElement;
  }

  function promptHasIcon(): boolean {
    return !!promptSlot().querySelector('svg');
  }

  function currentValue(): string {
    return editor().textContent ?? '';
  }

  async function changeValue(value: string): Promise<void> {
    await userEvent.type(editor(), value);
    await waitFor(() => expect(currentValue()).to.equal(value));
  }

  function key(name: string): void {
    fireEvent.keyDown(editor(), { key: name });
  }

  const arrowUp = (): void => key('ArrowUp');
  const arrowDown = (): void => key('ArrowDown');
  const enter = (): void => key('Enter');

  async function expectValue(value: string): Promise<void> {
    await waitFor(() => expect(currentValue()).to.equal(value));
  }

  it('renders an editor', function () {
    render(<ShellInput />);
    expect(editor()).to.exist;
  });

  it('calls onInput with the current value when enter is pressed', async function () {
    const onInput = sinon.spy();
    render(<ShellInput onInput={onInput} />);

    await changeValue('value');
    enter();

    await waitFor(() => expect(onInput).to.have.been.calledWith('value'));
  });

  it('does not set the editor as readOnly by default', function () {
    render(<ShellInput />);
    expect(editor().getAttribute('aria-readonly')).to.not.equal('true');
  });

  describe('history', function () {
    it('navigates history backward on ArrowUp', async function () {
      render(<ShellInput history={['value2', 'value1']} />);

      arrowUp();
      await expectValue('value2');

      arrowUp();
      await expectValue('value1');
    });

    it('navigates history backward and stops on first element', async function () {
      render(<ShellInput history={['value1']} />);

      arrowUp();
      arrowUp();
      await expectValue('value1');
    });

    it('navigates history forward', async function () {
      render(<ShellInput history={['value2', 'value1']} />);

      arrowUp();
      await expectValue('value2');

      arrowUp();
      await expectValue('value1');

      arrowDown();
      await expectValue('value2');
    });

    it('does not move the history index past the last element', async function () {
      render(<ShellInput history={['value2', 'value1']} />);

      arrowDown();
      await expectValue('');

      arrowUp();
      await expectValue('value2');

      arrowUp();
      await expectValue('value1');
    });

    it('navigates forward back to currentValue', async function () {
      render(<ShellInput history={['value2', 'value1']} />);

      arrowUp();
      await expectValue('value2');

      arrowDown();
      await expectValue('');
    });

    it('navigates forward back to current value after change', async function () {
      render(<ShellInput history={['value2', 'value1']} />);

      arrowUp();
      await expectValue('value2');

      arrowDown();
      await expectValue('');

      await changeValue('value3');

      arrowUp();
      await expectValue('value2');

      arrowDown();
      await expectValue('value3');
    });

    it('shows a loader when operationInProgress is true ', function () {
      render(<ShellInput history={['value2', 'value1']} operationInProgress />);

      // ShellLoader wraps its spinner in a div, the chevron prompt is a bare svg
      expect(promptSlot().querySelector('div')).to.exist;
    });

    it('does not show a loader when operationInProgress is false', function () {
      render(
        <ShellInput
          history={['value2', 'value1']}
          operationInProgress={false}
        />
      );

      expect(promptSlot().querySelector('div')).to.be.null;
    });
  });

  describe('autocompletion', function () {
    it('forwards an autocompleter to the editor', async function () {
      const autocompleter = {
        getCompletions: sinon.stub().resolves([]),
      };
      render(<ShellInput autocompleter={autocompleter} />);

      await changeValue('db.');

      await waitFor(() =>
        expect(autocompleter.getCompletions).to.have.been.calledWith('db.')
      );
    });
  });

  describe('prompt', function () {
    it('just shows the chevron if no prompt is specified', function () {
      render(<ShellInput />);
      expect(promptSlot().textContent).to.equal('');
      expect(promptHasIcon()).to.equal(true);
    });

    it('shows the prompt as specified', function () {
      render(<ShellInput prompt={'le prompt'} />);
      expect(promptSlot().textContent).to.contain('le prompt');
      expect(promptHasIcon()).to.equal(false);
    });

    it('replaces > with a nice icon', function () {
      render(<ShellInput prompt={'mongos> '} />);
      expect(promptSlot().textContent).to.contain('mongos');
      expect(promptSlot().textContent).to.not.contain('mongos>');
      expect(promptHasIcon()).to.equal(true);
    });
  });
});
