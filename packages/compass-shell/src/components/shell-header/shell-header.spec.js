import React from 'react';
import { mount } from 'enzyme';
import IconButton from '@leafygreen-ui/icon-button';

import ShellHeader from './shell-header';

describe('ShellHeader', () => {
  context('when isExpanded prop is true', () => {
    it('renders an X button to close', () => {
      const wrapper = mount(<ShellHeader isExpanded />);

      expect(wrapper.find(IconButton).exists()).toBe(true);
      expect(wrapper.find('.compass-shell-header-close-btn').exists()).toBe(true);
    });
  });

  context('when isExpanded prop is false', () => {
    it('does not render an X button', () => {
      const wrapper = mount(<ShellHeader isExpanded={false} />);

      expect(wrapper.find(IconButton).exists()).toBe(false);
      expect(wrapper.find('.compass-shell-header-close-btn').exists()).toBe(false);
    });
  });

  context('when rendered', () => {
    it('has a button to toggle the container', async() => {
      const wrapper = mount(<div className="some-class" />);

      expect(wrapper.find('button').exists()).toBe(true);
      expect(wrapper.find('.compass-shell-header-toggle').exists()).toBe(true);
    });
  });
});

