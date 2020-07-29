import React from 'react';
import { mount, shallow } from 'enzyme';
import Icon from '@leafygreen-ui/icon';
import IconButton from '@leafygreen-ui/icon-button';

import { ShellHeader } from './shell-header';
import styles from './shell-header.less';

describe('ShellHeader', () => {
  context('when isExpanded prop is true', () => {
    it('renders a close chevron button', () => {
      const wrapper = mount(<ShellHeader
        isExpanded
        onShellToggleClicked={() => {}}
        showInfoModal={() => {}}
      />);

      expect(wrapper.find(IconButton).exists()).to.equal(true);
      expect(wrapper.find(Icon).at(1).prop('glyph')).to.equal('ChevronDown');
    });

    it('renders an info button', () => {
      const wrapper = mount(<ShellHeader
        isExpanded
        onShellToggleClicked={() => {}}
        showInfoModal={() => {}}
      />);

      expect(wrapper.find(IconButton).exists()).to.equal(true);
      expect(wrapper.find(Icon).at(0).prop('glyph')).to.equal('InfoWithCircle');
    });

    it('renders an actions area', () => {
      const wrapper = mount(<ShellHeader
        isExpanded
        onShellToggleClicked={() => {}}
        showInfoModal={() => {}}
      />);

      expect(wrapper.find(`.${styles['compass-shell-header-right-actions']}`).exists()).to.equal(true);
    });
  });

  context('when isExpanded prop is false', () => {
    it('renders an open chevron button', () => {
      const wrapper = mount(<ShellHeader
        isExpanded={false}
        onShellToggleClicked={() => {}}
        showInfoModal={() => {}}
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
        showInfoModal={() => {}}
      />);

      expect(wrapper.find('button').exists()).to.equal(true);
      expect(wrapper.find(`.${styles['compass-shell-header-toggle']}`)).to.be.present();
    });
  });
});

