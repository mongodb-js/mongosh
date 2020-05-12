import React from 'react';
import { mount, shallow } from 'enzyme';
import IconButton from '@leafygreen-ui/icon-button';

import ShellHeader from './shell-header';
import styles from './shell-header.less';

describe('ShellHeader', () => {
  context('when isExpanded prop is true', () => {
    it('renders a close button', () => {
      const wrapper = mount(<ShellHeader
        isExpanded
        onShellToggleClicked={() => {}}
      />);

      expect(wrapper.find(IconButton).exists()).to.equal(true);
    });

    it('renders an actions area', () => {
      const wrapper = mount(<ShellHeader
        isExpanded
        onShellToggleClicked={() => {}}
      />);

      expect(wrapper.find(`.${styles['compass-shell-header-right-actions']}`)).to.be.present();
    });
  });

  context('when isExpanded prop is false', () => {
    it('does not render an X button', () => {
      const wrapper = shallow(<ShellHeader
        isExpanded={false}
        onShellToggleClicked={() => {}}
      />);

      expect(wrapper.find(IconButton).exists()).to.equal(false);
      expect(wrapper.find(`.${styles['compass-shell-header-close-btn']}`).exists()).to.equal(false);
    });
  });

  context('when rendered', () => {
    it('has a button to toggle the container', async() => {
      const wrapper = shallow(<ShellHeader
        isExpanded={false}
        onShellToggleClicked={() => {}}
      />);

      expect(wrapper.find('button').exists()).to.equal(true);
      expect(wrapper.find(`.${styles['compass-shell-header-toggle']}`)).to.be.present();
    });
  });
});

