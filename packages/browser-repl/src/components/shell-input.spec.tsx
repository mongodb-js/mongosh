/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellInput } from './shell-input';

function changeValue(wrapper, value): void {
  wrapper.find('textarea').simulate('change', { target: { value } });
}

function simulateTextareaKeyEvent(wrapper, eventType, key, event: any = {}): void {
  wrapper.find('textarea').simulate(eventType, {
    key,
    ...event,
    target: {
      value: wrapper.state('currentValue'),
      selectionStart: 0,
      selectionEnd: 0,
      ...(event.target || {})
    }
  });
}

function enter(wrapper, event: any = {}): void {
  simulateTextareaKeyEvent(wrapper, 'keyup', 'Enter', event);
}

function arrowUp(wrapper, event: any = {}): void {
  simulateTextareaKeyEvent(wrapper, 'keydown', 'ArrowUp', event);
}

function arrowDown(wrapper, event: any = {}): void {
  simulateTextareaKeyEvent(wrapper, 'keydown', 'ArrowDown', event);
}

describe.only('<ShellInput />', () => {
  it('renders an input', () => {
    const wrapper = shallow(<ShellInput />);
    expect(wrapper.find('textarea')).to.have.lengthOf(1);
  });

  it('calls onInput with the current value when enter is pressed', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    changeValue(wrapper, 'value');
    enter(wrapper);

    expect(onInput).to.have.been.calledWith('value');
  });

  it('does not call onInput with the current value when enter is pressed with shift', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    changeValue(wrapper, 'value');
    enter(wrapper, {shiftKey: true});

    expect(onInput).to.not.have.been.called;
  });

  it('does not call onInput if the input is empty', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);
    enter(wrapper);
    expect(onInput).to.not.have.been.called;
  });

  it.skip('does not add new line to the output when enter is pressed', () => {
    // TODO: hard/impossible to test with enzyme
  });

  it.skip('allows newline when shift+enter is pressed', () => {
    // TODO: hard/impossible to test with enzyme
  });

  describe('history', () => {
    it('navigates history backward on ArrowUp', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history backward and stops on first element', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1']} />);

      arrowUp(wrapper);
      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history forward', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUp(wrapper);
      arrowUp(wrapper);
      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not move the history index past the last element', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates forward back to currentValue', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('navigates forward back to current value after change', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper);
      changeValue(wrapper, 'value3');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value3');
    });

    it('does not commit changed last value', () => {
      // This may happen if i change the input, navigate up and then submit that entry.
      // We do not want to submit the initially changed input.

      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      changeValue(wrapper, 'value3');
      arrowUp(wrapper);
      enter(wrapper);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does commit last value if navigated back', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      changeValue(wrapper, 'value3');
      arrowUp(wrapper);
      arrowDown(wrapper);
      enter(wrapper);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value3');
    });

    it('does not navigate back unless cursor is on first line', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      changeValue(wrapper, '1\n2\n3');

      arrowUp(wrapper, { target: { selectionStart: 4, selectionEnd: 4 } });
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      arrowUp(wrapper, { target: { selectionStart: 0, selectionEnd: 0 } });
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not navigate forward unless cursor is on last line', () => {
      const wrapper = shallow(<ShellInput initialHistory={['1\n2\n3']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      arrowDown(wrapper, { target: { selectionStart: 6, selectionEnd: 6 } });
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('does not navigate back or forward if text is selected', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper, { target: { selectionStart: 1, selectionEnd: 3 } });
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUp(wrapper, {target: { selectionStart: 1, selectionEnd: 3 }});
      expect(wrapper.state('currentValue')).to.equal('value2');
    });
  });
});
