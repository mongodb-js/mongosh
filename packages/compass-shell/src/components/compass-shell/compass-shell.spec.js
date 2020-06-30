import sinon from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import { Shell } from '@mongosh/browser-repl';
import { Resizable } from 're-resizable';

import { CompassShell } from './compass-shell';
import ResizeHandle from '../resize-handle';
import ShellHeader from '../shell-header';
import InfoModal from '../info-modal';

function updateAndWaitAsync(wrapper) {
  wrapper.update();
  return new Promise(setImmediate);
}

describe('CompassShell', () => {
  context('when the prop isExpanded is false', () => {
    it('does not render a shell', () => {
      const fakeRuntime = {};
      const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded={false} />);
      expect(wrapper.find(Shell)).to.have.lengthOf(0);
    });
  });

  context('when the prop isExpanded is true', () => {
    context('when runtime property is not present', () => {
      it('does not render a shell if runtime is null', () => {
        const wrapper = shallow(<CompassShell runtime={null} isExpanded />);
        expect(wrapper.find(Shell)).to.have.lengthOf(0);
      });
    });

    context('when runtime property is present', () => {
      it('renders the Shell', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(wrapper.find(Shell).prop('runtime')).to.equal(fakeRuntime);
      });

      it('renders the ShellHeader component', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(wrapper.find(ShellHeader).exists()).to.equal(true);
      });

      it('renders a Resizable component', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(wrapper.find(Resizable)).to.be.present();
      });

      it('renders the info modal component', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(wrapper.find(InfoModal)).to.be.present();
      });

      it('passes the resize handle component to the Resizable component', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(wrapper.find(Resizable).prop('handleComponent')).to.deep.equal({
          top: <ResizeHandle />,
        });
      });

      it('renders the Shell with an output change handler', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded />);
        expect(!!wrapper.find(Shell).prop('onOutputChanged')).to.equal(true);
      });

      it('passes saved shell output', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell
          runtime={fakeRuntime}
          isExpanded
          shellOutput={[{
            type: 'output',
            value: 'pineapple'
          }]}
        />);

        expect(wrapper.find(Shell).prop('initialOutput')).to.deep.equal([{
          type: 'output',
          value: 'pineapple'
        }]);
      });
    });

    context('when historyStorage is not present', () => {
      it('passes an empty history to the Shell', () => {
        const fakeRuntime = {};
        const wrapper = shallow(<CompassShell runtime={fakeRuntime} isExpanded />);

        expect(wrapper.find(Shell).prop('initialHistory')).to.deep.equal([]);
      });
    });

    context('when it is clicked to collapse', () => {
      it('sets the collapsed height to 24', () => {
        const shell = new CompassShell({ isExpanded: true });
        let sizeSetTo = {};
        shell.resizableRef = {
          sizeStyle: {
            height: 100
          },
          updateSize: newSize => {
            sizeSetTo = newSize;
          }
        };
        shell.shellToggleClicked();

        expect(sizeSetTo).to.deep.equal({
          width: '100%',
          height: 24
        });
      });

      it('sets the state to collapsed', () => {
        const shell = new CompassShell({ isExpanded: true });
        shell.setState = stateUpdate => {
          shell.state = {
            ...shell.state,
            ...stateUpdate
          };
        };
        shell.resizableRef = {
          sizeStyle: {
            height: 100
          },
          updateSize: () => { }
        };
        shell.shellToggleClicked();

        expect(shell.state.isExpanded).to.equal(false);
      });

      context('when it is expanded again', () => {
        it('resumes its previous height', () => {
          const shell = new CompassShell({ isExpanded: true });
          shell.setState = stateUpdate => {
            shell.state = {
              ...shell.state,
              ...stateUpdate
            };
          };
          let sizeSetTo = {};
          shell.resizableRef = {
            sizeStyle: {
              height: 99
            },
            updateSize: newSize => {
              sizeSetTo = newSize;
            }
          };
          shell.shellToggleClicked();
          shell.shellToggleClicked();

          expect(sizeSetTo).to.deep.equal({
            width: '100%',
            height: 99
          });
        });
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

      const wrapper = shallow(<CompassShell
        runtime={fakeRuntime}
        historyStorage={fakeStorage}
        isExpanded
      />);

      await updateAndWaitAsync(wrapper);

      expect(wrapper.find(Shell).prop('initialHistory')).to.deep.equal(['line1']);
    });

    it('saves the history when history changes', async() => {
      const wrapper = shallow(<CompassShell
        runtime={fakeRuntime}
        historyStorage={fakeStorage}
        isExpanded
      />);

      await updateAndWaitAsync(wrapper);

      const onHistoryChanged = wrapper.find(Shell).prop('onHistoryChanged');
      onHistoryChanged(['line1']);

      expect(
        fakeStorage.save.calledWith(['line1'])
      ).to.equal(true);
    });
  });

  it('sets shellOutput on onShellOutputChanged', () => {
    const shell = new CompassShell({ isExpanded: true });

    shell.onShellOutputChanged([{
      type: 'output',
      value: 'some output'
    }]);
    console.log('shell.shellOutput', shell.shellOutput, [{
      type: 'output',
      value: 'some output'
    }]);

    expect(shell.shellOutput).to.deep.equal([{
      type: 'output',
      value: 'some output'
    }]);
  });
});

