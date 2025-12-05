import sinon from 'sinon';
import { expect } from '@mongosh/testing';
import { Editor, createCommands } from './editor';
import type { Command } from '@mongodb-js/compass-editor';
import { shallow } from '../../testing/enzyme';
import React from 'react';

describe('<Editor />', function () {
  let commandSpies: Parameters<typeof createCommands>[number];
  let commands: Record<string, Command['run']>;

  const sandbox = sinon.createSandbox();

  function mockContext(
    selection: { from: number; to?: number; empty?: boolean } = { from: 0 },
    line?: { from?: number; to?: number },
    docLength?: number
  ): any {
    selection.to = selection.to || selection.from;
    line = line || { from: selection.from };
    line.to = line.to || selection.to;
    return {
      state: {
        selection: {
          main: {
            from: selection.from,
            to: selection.to,
            empty: selection.empty || selection.from === selection.to,
          },
        },
        doc: {
          length: docLength || line.to,
        },
      },
      lineBlockAt() {
        return line;
      },
    };
  }

  beforeEach(function () {
    commandSpies = {
      onEnter: sinon.spy(),
      onArrowUpOnFirstLine: sinon.stub().resolves(false),
      onArrowDownOnLastLine: sinon.stub().resolves(false),
      onClearCommand: sinon.spy(),
      onSigInt: sinon.spy(),
    };
    commands = Object.fromEntries(
      createCommands(commandSpies).map(({ key, run }) => {
        return [key, run];
      })
    );
  });

  afterEach(function () {
    sandbox.reset();
  });

  describe('commands', function () {
    it('calls onEnter when enter is pressed', function () {
      expect(commands.Enter?.({} as any)).to.eq(true);
      expect(commandSpies.onEnter).to.have.been.calledOnce;
    });

    it('calls onClearCommand when command/ctrl+L is pressed', function () {
      expect(commands['Mod-l']?.({} as any)).to.eq(true);
      expect(commandSpies.onClearCommand).to.have.been.calledOnce;
    });

    it('calls onArrowUpOnFirstLine when arrow up is pressed and cursor on fisrt row', function () {
      expect(commands.ArrowUp?.(mockContext())).to.eq(true);
      expect(commandSpies.onArrowUpOnFirstLine).to.have.been.calledOnce;
    });

    it('does not call onArrowUpOnFirstLine when arrow up is pressed and row > 0', function () {
      expect(commands.ArrowUp?.(mockContext({ from: 6 }, { from: 3 }))).to.eq(
        false
      );
      expect(commandSpies.onArrowUpOnFirstLine).to.not.have.been.called;
    });

    it('calls onArrowDownOnLastLine when arrow down is pressed and cursor on last row', function () {
      expect(commands.ArrowDown?.(mockContext())).to.eq(true);
      expect(commandSpies.onArrowDownOnLastLine).to.have.been.called;
    });

    it('does not call onArrowDownOnLastLine when arrow down is pressed and cursor not on last row', function () {
      expect(
        commands.ArrowDown?.(mockContext({ from: 0 }, { from: 0, to: 10 }, 20))
      ).to.eq(false);
      expect(commandSpies.onArrowDownOnLastLine).to.not.have.been.called;
    });

    it('does not call onArrowUpOnFirstLine if text is selected', function () {
      expect(
        commands.ArrowUp?.(mockContext({ from: 0, to: 1, empty: false }))
      ).to.eq(false);
      expect(commandSpies.onArrowUpOnFirstLine).to.not.have.been.called;
    });

    it('does not call onArrowDownOnLastLine if text is selected', function () {
      expect(
        commands.ArrowDown?.(mockContext({ from: 0, to: 1, empty: false }))
      ).to.eq(false);
      expect(commandSpies.onArrowDownOnLastLine).to.not.have.been.called;
    });
  });

  describe('command callback props', function () {
    it('does not call callback props that can modify shell input', function () {
      const callbackPropSpies = {
        onEnter: sinon.spy(),
        onArrowUpOnFirstLine: sinon.stub().resolves(false),
        onArrowDownOnLastLine: sinon.stub().resolves(false),
        onClearCommand: sinon.spy(),
        onSigInt: sinon.spy(),
      };

      const wrapper = shallow(
        <Editor {...callbackPropSpies} operationInProgress />
      );

      wrapper.instance().onEnter();
      expect(callbackPropSpies.onEnter).to.not.have.been.called;

      wrapper.instance().onArrowUpOnFirstLine();
      expect(callbackPropSpies.onArrowUpOnFirstLine).to.not.have.been.called;

      wrapper.instance().onArrowDownOnLastLine();
      expect(callbackPropSpies.onArrowDownOnLastLine).to.not.have.been.called;

      wrapper.instance().onClearCommand();
      expect(callbackPropSpies.onClearCommand).to.not.have.been.called;

      // Only onSigInt is allowed when operation is in progress
      wrapper.instance().onSigInt();
      expect(callbackPropSpies.onSigInt).to.have.been.called;
    });
  });
});
