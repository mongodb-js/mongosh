import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/chai';
import { shallow } from '../../testing/enzyme';

import { ShellInput } from './shell-input';
import { Editor } from './editor';
import { Completion } from '../autocompleter/autocompleter';

function changeValue(wrapper, value): void {
  wrapper.find(Editor).prop('onChange')(value);
}

function enter(wrapper): void {
  wrapper.find(Editor).prop('onEnter')();
}

function arrowUp(wrapper): void {
  wrapper.find(Editor).prop('onArrowUpOnFirstLine')();
}

function arrowDown(wrapper): void {
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
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history backward and stops on first element', () => {
      const wrapper = shallow(<ShellInput history={['value1']} />);

      arrowUp(wrapper);
      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history forward', () => {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowUp(wrapper);
      arrowUp(wrapper);
      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not move the history index past the last element', () => {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates forward back to currentValue', () => {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('navigates forward back to current value after change', () => {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper);
      changeValue(wrapper, 'value3');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value3');
    });
  });

  describe('autocompletion', () => {
    it('forwards an autocompleter to the editor', () => {
      const autocompleter = { getCompletions: (): Promise<Completion[]> => Promise.resolve([]) };
      const wrapper = shallow(<ShellInput autocompleter={autocompleter} />);
      expect(wrapper.find('Editor').prop('autocompleter')).to.equal(autocompleter);
    });
  });
});
