/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellInput } from './shell-input';

function simulateChange(wrapper, value): void {
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

function simulateEnter(wrapper, event: any = {}): void {
  simulateTextareaKeyEvent(wrapper, 'keyup', 'Enter', event);
}

function simulateArrowUp(wrapper, event: any = {}): void {
  simulateTextareaKeyEvent(wrapper, 'keydown', 'ArrowUp', event);
}

function simulateArrowDown(wrapper, event: any = {}): void {
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

    simulateChange(wrapper, 'value');
    simulateEnter(wrapper);

    expect(onInput).to.have.been.calledWith('value');
  });

  it('does not call onInput with the current value when enter is pressed with shift', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    simulateChange(wrapper, 'value');
    simulateEnter(wrapper, {shiftKey: true});

    expect(onInput).to.not.have.been.called;
  });

  it('does not call onInput if the input is empty', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);
    simulateEnter(wrapper);
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

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history backward up to first element', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1']} />);

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history forward', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      simulateArrowUp(wrapper);
      simulateArrowUp(wrapper);
      simulateArrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not move the history index past the last element', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      simulateArrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates forward back to currentValue', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      simulateArrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('does not commit "dirty" last value', () => {
      // This may happen if i change the input, navigate up and then submit that entry.
      // We do not want to submit the initially changed input.

      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      simulateArrowUp(wrapper);
      simulateChange(wrapper, 'value3');
      simulateEnter(wrapper);

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value3');

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does commit last value if navigated back', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      simulateChange(wrapper, 'value3');
      simulateArrowUp(wrapper);
      simulateArrowDown(wrapper);
      simulateArrowDown(wrapper);
      simulateArrowUp(wrapper);
      simulateArrowDown(wrapper);
      simulateArrowDown(wrapper);

      expect(wrapper.state('currentValue')).to.equal('value3');
    });

    it('does not navigate back unless cursor is on first line', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      simulateChange(wrapper, '1\n2\n3');

      simulateArrowUp(wrapper, { target: { selectionStart: 4, selectionEnd: 4 } });
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      simulateArrowUp(wrapper, { target: { selectionStart: 0, selectionEnd: 0 } });
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not navigate forward unless cursor is on last line', () => {
      const wrapper = shallow(<ShellInput initialHistory={['1\n2\n3']} />);

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      simulateArrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      simulateArrowDown(wrapper, { target: { selectionStart: 6, selectionEnd: 6 } });
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('does not navigate back or forward if text is selected', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      simulateArrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      simulateArrowDown(wrapper, { target: { selectionStart: 1, selectionEnd: 3 } });
      expect(wrapper.state('currentValue')).to.equal('value2');

      simulateArrowUp(wrapper, {target: { selectionStart: 1, selectionEnd: 3 }});
      expect(wrapper.state('currentValue')).to.equal('value2');
    });
  });
});
