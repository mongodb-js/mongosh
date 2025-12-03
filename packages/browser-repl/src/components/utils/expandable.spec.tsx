import React from 'react';
import sinon from 'sinon';
import { Icon } from '@mongodb-js/compass-components';
import { expect } from '../../testing/src/chai';
import { mount } from '../../testing/src/enzyme';
import { Expandable } from './expandable';

describe('<Expandable />', function () {
  it('renders children element', function () {
    const wrapper = mount(<Expandable>some text</Expandable>);
    expect(wrapper.text()).to.contain('some text');
  });

  it('renders child function', function () {
    const wrapper = mount(<Expandable>{(): string => 'some text'}</Expandable>);
    expect(wrapper.text()).to.contain('some text');
  });

  it('passes expanded to children', function () {
    const child1 = sinon.spy(() => '');
    mount(<Expandable>{child1}</Expandable>);
    expect(child1).to.have.been.calledWith(false);

    const child2 = sinon.spy(() => '');
    const wrapper = mount(<Expandable>{child2}</Expandable>);
    wrapper.setState({ expanded: true });
    expect(child2).to.have.been.calledWith(true);
  });

  it('passes toggle to children', function () {
    let toggle;

    const wrapper = mount(
      <Expandable>
        {(expanded, _toggle): void => {
          toggle = _toggle;
        }}
      </Expandable>
    );

    toggle();

    expect(wrapper.state('expanded')).to.be.true;
  });

  it('renders a caret right icon when not expanded', function () {
    const wrapper = mount(<Expandable />);
    expect(wrapper.find(Icon).prop('glyph')).to.equal('CaretRight');
  });

  it('renders a caret down icon when expanded', function () {
    const wrapper = mount(<Expandable />);
    wrapper.setState({ expanded: true });
    expect(wrapper.find(Icon).prop('glyph')).to.equal('CaretDown');
  });
});
