import React from 'react';
import { expect } from '../../testing/src/chai';
import { shallow } from '../../testing/src/enzyme';
import { LineWithIcon } from './line-with-icon';

describe('<LineWithIcon />', function () {
  const Icon: React.FunctionComponent = () => <span />;

  it('renders children element', function () {
    const wrapper = shallow(
      <LineWithIcon icon={<Icon />}>some text</LineWithIcon>
    );
    expect(wrapper.text()).to.contain('some text');
  });

  it('renders the icon', function () {
    const wrapper = shallow(
      <LineWithIcon icon={<Icon />}>some text</LineWithIcon>
    );
    expect(wrapper.find(Icon)).to.have.lengthOf(1);
  });

  it('adds className if passed as prop', function () {
    const wrapper = shallow(
      <LineWithIcon className="my-class-name" icon={<Icon />}>
        some text
      </LineWithIcon>
    );

    expect(wrapper.hasClass('my-class-name')).to.be.true;
  });
});
