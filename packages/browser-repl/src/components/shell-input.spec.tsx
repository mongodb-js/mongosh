import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellInput } from './shell-input';

describe.only('<ShellInput />', () => {
  it('renders an input', () => {
    const wrapper = shallow(<ShellInput />);
    expect(wrapper.find('textarea')).to.have.lengthOf(1);
  });

  it('calls onInput with the current value when enter is pressed', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    wrapper.find('textarea').simulate('change', { target: { value: 'value' } });
    wrapper.find('textarea').simulate('keyup', { key: 'Enter', target: {} });
    expect(onInput).to.have.been.calledWith('value');
  });

  it('does not call onInput with the current value when enter is pressed with shift', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    wrapper.find('textarea').simulate('change', { target: { value: 'value' } });
    wrapper.find('textarea').simulate('keyup', { key: 'Enter', target: {}, shiftKey: true });
    expect(onInput).to.not.have.been.called;
  });

  it('does not call onInput if the input is empty', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);
    wrapper.find('textarea').simulate('keyup', { key: 'Enter', target: {} });
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
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value2');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history backward up to first element', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      wrapper.update();
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history forward', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      textarea.simulate('keydown', { key: 'ArrowDown', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not move the history index past the last element', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('keydown', { key: 'ArrowDown', target: {} });
      expect(wrapper.state('currentValue')).to.equal('');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value2');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates forward back to currentValue', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value2');

      textarea.simulate('keydown', { key: 'ArrowDown', target: {} });
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('does not commit "dirty" last value', () => {
      // This may happen if i change the input, navigate up and then submit that entry.
      // We do not want to submit the initially changed input.

      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      textarea.simulate('change', { target: { value: 'value3' } });
      textarea.simulate('keyup', { key: 'Enter', target: {} });

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value3');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does commit last value if navigated back', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('change', { target: { value: 'value3' } });
      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      textarea.simulate('keydown', { key: 'ArrowDown', target: {} });
      textarea.simulate('keydown', { key: 'ArrowDown', target: {} });
      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      textarea.simulate('keydown', { key: 'ArrowDown', target: {} });
      textarea.simulate('keydown', { key: 'ArrowDown', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value3');
    });

    it('does not navigate back unless cursor is on first line', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('change', { target: { value: '1\n2\n3' } });
      textarea.simulate('keydown', { key: 'ArrowUp', target: {
        value: wrapper.state('currentValue'), selectionStart: 4, selectionEnd: 4 } });
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');
      textarea.simulate('keydown', { key: 'ArrowUp', target: {
        value: wrapper.state('currentValue'), selectionStart: 0, selectionEnd: 0 } });
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not navigate forward unless cursor is on last line', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['1\n2\n3']} />);

      const textarea = wrapper.find('textarea');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      textarea.simulate('keydown', { key: 'ArrowDown', target: {
        selectionStart: 0, selectionEnd: 0, value: wrapper.state('currentValue') } });
      expect(wrapper.state('currentValue')).to.equal('1\n2\n3');

      textarea.simulate('keydown', { key: 'ArrowDown', target: {
        selectionStart: 6, selectionEnd: 6, value: wrapper.state('currentValue') } });
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('does not navigate back or forward if text is selected', () => {
      const onInput = sinon.spy();
      const wrapper = shallow(<ShellInput onInput={onInput} initialHistory={['value1', 'value2']} />);

      const textarea = wrapper.find('textarea');
      textarea.simulate('keydown', { key: 'ArrowUp', target: {} });
      expect(wrapper.state('currentValue')).to.equal('value2');

      textarea.simulate('keydown', { key: 'ArrowDown', target: {
        selectionStart: 1, selectionEnd: 3, value: wrapper.state('currentValue') } });
      expect(wrapper.state('currentValue')).to.equal('value2');

      textarea.simulate('keydown', { key: 'ArrowUp', target: {
        selectionStart: 1, selectionEnd: 3, value: wrapper.state('currentValue') } });
      expect(wrapper.state('currentValue')).to.equal('value2');
    });
  });
});
