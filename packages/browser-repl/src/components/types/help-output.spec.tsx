import React from 'react';
import { expect } from '@mongosh/testing';
import { render, screen } from '@testing-library/react';

import { HelpOutput } from './help-output';

describe('HelpOutput', function () {
  const renderHelp = (value): HTMLElement => {
    return render(
      <HelpOutput
        value={{
          help: value.help,
          docs: value.docs,
          attr: value.attr,
        }}
      />
    ).container;
  };

  it('renders the help text', function () {
    const container = renderHelp({
      help: 'some text',
    });
    expect(container.textContent).to.contain('some text');
  });

  it('renders the docs link', function () {
    renderHelp({
      help: 'some text',
      docs: 'https://docs.example.com',
    });

    const anchors = screen.getAllByRole('link');
    expect(anchors).to.have.lengthOf(1);
    expect(anchors[0].getAttribute('href')).to.equal(
      'https://docs.example.com'
    );
  });

  it('does not render the docs link if none passed', function () {
    renderHelp({
      help: 'some text',
    });

    expect(screen.queryAllByRole('link')).to.have.lengthOf(0);
  });

  it('renders the attrs table', function () {
    const container = renderHelp({
      help: 'some text',
      attr: [
        {
          name: 'command name',
          description: 'command description',
        },
      ],
    });

    expect(container.textContent).to.contain('command name');
    expect(container.textContent).to.contain('command description');
  });

  it('does not render the attrs table if none passed', function () {
    const container = renderHelp({
      help: 'some text',
    });

    expect(container.querySelectorAll('table')).to.have.lengthOf(0);
  });
});
