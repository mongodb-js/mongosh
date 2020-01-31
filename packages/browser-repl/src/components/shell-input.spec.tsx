/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellInput } from './shell-input';
import { Editor } from './editor';

function changeValue(wrapper, value): void {
  wrapper.find(Editor).prop('onChange')(value);
}

function enter(wrapper): void {
  wrapper.find(Editor).prop('onEnter')();
}

function arrowUpOnFirstLine(wrapper): void {
  wrapper.find(Editor).prop('onArrowUpOnFirstLine')();
}

function arrowDownOnLastLine(wrapper): void {
  wrapper.find(Editor).prop('onArrowDownOnLastLine')();
}

describe('<ShellInput />', () => {
  it('renders an editor', () => {
    const wrapper = shallow(<ShellInput />);
    expect(wrapper.find('Editor')).to.have.lengthOf(1);
  });

  it('calls onInput with the current value when enter is pressed', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);

    changeValue(wrapper, 'value');
    enter(wrapper);

    expect(onInput).to.have.been.calledWith('value');
  });

  it('does not call onInput if the input is empty', () => {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput}/>);
    enter(wrapper);
    expect(onInput).to.not.have.been.called;
  });

  describe('history', () => {
    it('navigates history backward on ArrowUp', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history backward and stops on first element', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1']} />);

      arrowUpOnFirstLine(wrapper);
      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history forward', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUpOnFirstLine(wrapper);
      arrowUpOnFirstLine(wrapper);
      arrowDownOnLastLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not move the history index past the last element', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowDownOnLastLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates forward back to currentValue', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDownOnLastLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('navigates forward back to current value after change', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDownOnLastLine(wrapper);
      changeValue(wrapper, 'value3');

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDownOnLastLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value3');
    });

    it('does not commit changed last value', () => {
      // This may happen if i change the input, navigate up and then submit that entry.
      // We do not want to submit the initially changed input.

      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      changeValue(wrapper, 'value3');
      arrowUpOnFirstLine(wrapper);
      enter(wrapper);

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does commit last value if navigated back', () => {
      const wrapper = shallow(<ShellInput initialHistory={['value1', 'value2']} />);

      changeValue(wrapper, 'value3');
      arrowUpOnFirstLine(wrapper);
      arrowDownOnLastLine(wrapper);
      enter(wrapper);

      arrowUpOnFirstLine(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value3');
    });
  });
});
