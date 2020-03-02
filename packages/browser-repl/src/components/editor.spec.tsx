import sinon from 'sinon';
import React from 'react';
import { expect } from '../../testing/chai';
import { mount } from '../../testing/enzyme';
import { Editor } from './editor';
import AceEditor from 'react-ace';

describe('<Editor />', () => {
  const getAceEditorInstance = (wrapper): any => {
    const aceEditor = wrapper.find(AceEditor);
    return aceEditor.instance().editor as any;
  };

  const execCommandBoundTo = (aceEditor: any, key: string): void => {
    const commands = Object.values(aceEditor.commands.commands);
    const command: any = commands.find(({ bindKey }) => {
      if (!bindKey) {
        return false;
      }

      if (typeof bindKey === 'string') {
        return key === bindKey;
      }

      const { win, mac } = bindKey as {win: string; mac: string};
      return win === key && mac === key;
    });

    if (!command) {
      throw new Error(`No command bound to ${key}.`);
    }

    aceEditor.execCommand(command.name);
  };

  it('allows to set the value', () => {
    const wrapper = mount(<Editor value={'some value'}/>);

    const aceEditor = getAceEditorInstance(wrapper);
    expect(aceEditor.getValue()).to.equal('some value');
  });

  it('calls onChange when the content changes', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onChange={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);
    expect(spy).not.to.have.been.called;

    aceEditor.setValue('value');
    expect(spy).to.have.been.calledWith('value');
  });

  it('calls onEnter when enter is pressed', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onEnter={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);
    expect(spy).not.to.have.been.called;

    execCommandBoundTo(aceEditor, 'Return');
    expect(spy).to.have.been.calledOnce;
  });

  it('calls onArrowUpOnFirstLine when arrow up is pressed and cursor on fisrt row', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onArrowUpOnFirstLine={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);

    expect(spy).not.to.have.been.called;
    execCommandBoundTo(aceEditor, 'Up');
    expect(spy).to.have.been.calledOnce;
  });

  it('does not call onArrowUpOnFirstLine when arrow up is pressed and row > 0', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onArrowUpOnFirstLine={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);
    aceEditor.setValue('row 0\nrow 1');
    aceEditor.moveCursorToPosition({ row: 1, column: 0 });
    aceEditor.clearSelection();

    execCommandBoundTo(aceEditor, 'Up');
    expect(spy).not.to.have.been.called;
  });

  it('calls onArrowDownOnLastLine when arrow down is pressed and cursor on last row', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onArrowDownOnLastLine={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);
    aceEditor.setValue('row 0\nrow 1');
    aceEditor.moveCursorToPosition({ row: 1, column: 0 });
    aceEditor.clearSelection();

    expect(spy).not.to.have.been.called;
    execCommandBoundTo(aceEditor, 'Down');
    expect(spy).to.have.been.calledOnce;
  });

  it('does not call onArrowDownOnLastLine when arrow down is pressed and cursor not on last row', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onArrowDownOnLastLine={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);
    aceEditor.setValue('row 0\nrow 1');

    execCommandBoundTo(aceEditor, 'Down');
    expect(spy).not.to.have.been.called;
  });

  it('does not call onArrowUpOnFirstLine if text is selected', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onArrowUpOnFirstLine={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);
    aceEditor.setValue('text');
    aceEditor.selectAll();

    execCommandBoundTo(aceEditor, 'Up');
    expect(spy).not.to.have.been.called;
  });

  it('does not call onArrowDownOnLastLine if text is selected', () => {
    const spy = sinon.spy();
    const wrapper = mount(<Editor onArrowDownOnLastLine={spy} />);

    const aceEditor = getAceEditorInstance(wrapper);
    aceEditor.setValue('text');
    aceEditor.selectAll();

    execCommandBoundTo(aceEditor, 'Down');
    expect(spy).not.to.have.been.called;
  });
});
