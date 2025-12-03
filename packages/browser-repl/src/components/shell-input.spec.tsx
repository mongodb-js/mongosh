import React from 'react';
import sinon from 'sinon';
import { expect } from '../../testing/src/chai';
import { shallow, mount } from '../../testing/src/enzyme';

import { ShellInput } from './shell-input';
import { Editor } from './editor';
import ShellLoader from './shell-loader';

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

describe('<ShellInput />', function () {
  it('renders an editor', function () {
    const wrapper = shallow(<ShellInput />);
    expect(wrapper.find('Editor')).to.have.lengthOf(1);
  });

  it('calls onInput with the current value when enter is pressed', function () {
    const onInput = sinon.spy();
    const wrapper = shallow(<ShellInput onInput={onInput} />);

    changeValue(wrapper, 'value');
    enter(wrapper);

    expect(onInput).to.have.been.calledWith('value');
  });

  it('does not set the editor as readOnly by default', function () {
    const wrapper = shallow(<ShellInput />);
    expect(wrapper.find('Editor').prop('operationInProgress')).to.equal(false);
  });

  describe('history', function () {
    it('navigates history backward on ArrowUp', function () {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history backward and stops on first element', function () {
      const wrapper = shallow(<ShellInput history={['value1']} />);

      arrowUp(wrapper);
      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates history forward', function () {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowUp(wrapper);
      arrowUp(wrapper);
      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');
    });

    it('does not move the history index past the last element', function () {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value1');
    });

    it('navigates forward back to currentValue', function () {
      const wrapper = shallow(<ShellInput history={['value2', 'value1']} />);

      arrowUp(wrapper);
      expect(wrapper.state('currentValue')).to.equal('value2');

      arrowDown(wrapper);
      expect(wrapper.state('currentValue')).to.equal('');
    });

    it('navigates forward back to current value after change', function () {
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

    it('shows a loader when operationInProgress is true ', function () {
      const wrapper = mount(
        <ShellInput history={['value2', 'value1']} operationInProgress />
      );

      expect(wrapper.find(ShellLoader).exists()).to.equal(true);
    });

    it('does not show a loader when operationInProgress is false', function () {
      const wrapper = shallow(
        <ShellInput
          history={['value2', 'value1']}
          operationInProgress={false}
        />
      );

      expect(wrapper.find(ShellLoader).exists()).to.equal(false);
    });
  });

  describe('autocompletion', function () {
    it('forwards an autocompleter to the editor', function () {
      const autocompleter = {
        getCompletions: (): Promise<any[]> => Promise.resolve([]),
      };
      const wrapper = shallow(<ShellInput autocompleter={autocompleter} />);
      expect(wrapper.find('Editor').prop('autocompleter')).to.equal(
        autocompleter
      );
    });
  });

  describe('prompt', function () {
    it('just shows the chevron if no prompt is specified', function () {
      const wrapper = mount(<ShellInput />);
      expect(wrapper.find('LineWithIcon').find('Icon').exists()).to.equal(true);
    });

    it('shows the prompt as specified', function () {
      const wrapper = mount(<ShellInput prompt={'le prompt'} />);
      expect(wrapper.find('LineWithIcon').text()).to.contain('le prompt');
      expect(wrapper.find('LineWithIcon').find('Icon').exists()).to.equal(
        false
      );
    });

    it('replaces > with a nice icon', function () {
      const wrapper = mount(<ShellInput prompt={'mongos> '} />);
      expect(wrapper.find('LineWithIcon').text()).to.contain('mongos');
      expect(wrapper.find('LineWithIcon').text()).to.not.contain('mongos>');
      expect(wrapper.find('LineWithIcon').find('Icon').exists()).to.equal(true);
    });
  });
});
