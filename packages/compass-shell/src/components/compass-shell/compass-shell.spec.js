import sinon from 'sinon';
import React from 'react';
import { mount } from 'enzyme';
import { Shell } from '@mongosh/browser-repl';

import { CompassShell } from './compass-shell';
import ShellHeader from '../shell-header';

function updateAndWaitAsync(wrapper) {
  wrapper.update();
  return new Promise(setImmediate);
}

describe('CompassShell', () => {
  context('when the prop isExpanded is false', () => {
    it('does not render a shell', () => {
      const fakeRuntime = {};
      const wrapper = mount(<CompassShell runtime={fakeRuntime} isExpanded={false} />);
      expect(wrapper.find(Shell)).to.have.lengthOf(0);
    });
  });

  context('when the prop isExpanded is true', () => {
    context('when runtime property is not present', () => {
      it('does not render a shell if runtime is null', () => {
        const wrapper = mount(<CompassShell runtime={null} isExpanded />);
        expect(wrapper.find(Shell)).to.have.lengthOf(0);
      });
    });

    context('when runtime property is present', () => {
      it('renders the Shell', () => {
        const fakeRuntime = {};
        const wrapper = mount(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(wrapper.find(Shell).prop('runtime')).to.equal(fakeRuntime);
      });

      it('renders the ShellHeader component', () => {
        const fakeRuntime = {};
        const wrapper = mount(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(wrapper.find(ShellHeader).exists()).to.be(true);
      });
    });

    context('when historyStorage is not present', () => {
      it('passes an empty history to the Shell', () => {
        const fakeRuntime = {};
        const wrapper = mount(<CompassShell runtime={fakeRuntime} isExpanded />);

        expect(wrapper.find(Shell).prop('initialHistory')).to.deep.equal([]);
      });
    });
  });

  context('when historyStorage is present', () => {
    let fakeStorage;
    let fakeRuntime;

    beforeEach(() => {
      fakeStorage = {
        load: sinon.spy(() => Promise.resolve([])),
        save: sinon.spy(() => Promise.resolve()),
      };

      fakeRuntime = {};
    });

    it('passes the loaded history as initialHistory to Shell', async() => {
      fakeStorage.load = sinon.spy(() => Promise.resolve(['line1']));

      const wrapper = mount(<CompassShell
        runtime={fakeRuntime}
        historyStorage={fakeStorage} />);

      await updateAndWaitAsync(wrapper);

      expect(wrapper.find(Shell).prop('initialHistory')).to.deep.equal(['line1']);
    });

    it('saves the history when history changes', async() => {
      const wrapper = mount(<CompassShell
        runtime={fakeRuntime}
        historyStorage={fakeStorage} />);

      await updateAndWaitAsync(wrapper);

      const onHistoryChanged = wrapper.find(Shell).prop('onHistoryChanged');
      onHistoryChanged(['line1']);

      expect(
        fakeStorage.save.calledWith(['line1'])
      ).to.equal(true);
    });
  });
});

