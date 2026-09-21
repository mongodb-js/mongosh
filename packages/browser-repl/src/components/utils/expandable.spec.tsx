import React from 'react';
import sinon from 'sinon';
import { expect } from '@mongosh/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Expandable } from './expandable';

describe('<Expandable />', function () {
  // The caret is the only interactive element Expandable itself renders.
  function caret(): Element {
    const icon = screen.getByTestId('shell-output').querySelector('svg');
    if (!icon) {
      throw new Error('no caret icon rendered');
    }
    return icon;
  }

  it('renders children element', function () {
    const { container } = render(<Expandable>some text</Expandable>);
    expect(container.textContent).to.contain('some text');
  });

  it('renders child function', function () {
    const { container } = render(
      <Expandable>{(): string => 'some text'}</Expandable>
    );
    expect(container.textContent).to.contain('some text');
  });

  it('passes expanded to children', async function () {
    const child = sinon.spy(() => '');
    render(<Expandable>{child}</Expandable>);
    expect(child).to.have.been.calledWith(false);

    await userEvent.click(caret());
    expect(child).to.have.been.calledWith(true);
  });

  it('passes toggle to children', async function () {
    let toggle;

    render(
      <Expandable>
        {(expanded, _toggle): string => {
          toggle = _toggle;
          return expanded ? 'expanded' : 'collapsed';
        }}
      </Expandable>
    );

    expect(screen.getByTestId('shell-output').textContent).to.contain(
      'collapsed'
    );

    await userEvent.click(caret());

    expect(screen.getByTestId('shell-output').textContent).to.contain(
      'expanded'
    );
    expect(toggle).to.be.a('function');
  });

  it('renders a caret right icon when not expanded', function () {
    render(<Expandable />);
    expect(caret().getAttribute('aria-label')).to.equal('Caret Right Icon');
  });

  it('renders a caret down icon when expanded', async function () {
    render(<Expandable />);
    await userEvent.click(caret());
    expect(caret().getAttribute('aria-label')).to.equal('Caret Down Icon');
  });
});
