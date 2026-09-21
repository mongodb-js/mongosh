import React from 'react';
import { expect } from '@mongosh/testing';
import { render } from '@testing-library/react';
import { SyntaxHighlight } from './syntax-highlight';

describe('<SyntaxHighlight />', function () {
  it('renders Code', function () {
    const { container } = render(<SyntaxHighlight code={'some code'} />);
    expect(container.querySelectorAll('.cm-editor')).to.have.lengthOf(1);
  });

  it('passes code to Code', function () {
    const { container } = render(<SyntaxHighlight code={'some code'} />);
    expect(container.textContent).to.contain('some code');
  });
});
