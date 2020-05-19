import React from 'react';
import { mount, shallow } from 'enzyme';
import Icon from '@leafygreen-ui/icon';
import IconButton from '@leafygreen-ui/icon-button';

import ShellHeader from './shell-header';
import styles from './shell-header.less';

describe('ShellHeader', () => {
  context('when isExpanded prop is true', () => {
    it('renders a close chevron button', () => {
      const wrapper = mount(<ShellHeader
        isExpanded
        onShellToggleClicked={() => {}}
      />);

      expect(wrapper.find(IconButton).exists()).to.equal(true);
      expect(wrapper.find(Icon).prop('glyph')).to.equal('ChevronDown');
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
    it('renders an open chevron button', () => {
      const wrapper = mount(<ShellHeader
        isExpanded={false}
        onShellToggleClicked={() => {}}
      />);

      expect(wrapper.find(IconButton).exists()).to.equal(true);
      expect(wrapper.find(Icon).prop('glyph')).to.equal('ChevronUp');
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

