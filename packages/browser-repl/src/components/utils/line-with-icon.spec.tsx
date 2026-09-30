import React from 'react';
import { expect } from '@mongosh/testing';
import { render, screen } from '@testing-library/react';
import { LineWithIcon } from './line-with-icon';

describe('<LineWithIcon />', function () {
  const Icon: React.FunctionComponent = () => <span data-testid="icon" />;

  it('renders children element', function () {
    const { container } = render(
      <LineWithIcon icon={<Icon />}>some text</LineWithIcon>
    );
    expect(container.textContent).to.contain('some text');
  });

  it('renders the icon', function () {
    render(<LineWithIcon icon={<Icon />}>some text</LineWithIcon>);
    expect(screen.getAllByTestId('icon')).to.have.lengthOf(1);
  });

  it('adds className if passed as prop', function () {
    const { container } = render(
      <LineWithIcon className="my-class-name" icon={<Icon />}>
        some text
      </LineWithIcon>
    );

    expect(
      (container.firstChild as HTMLElement).classList.contains('my-class-name')
    ).to.be.true;
  });
});
