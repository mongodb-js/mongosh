import React from 'react';
import { expect } from '@mongosh/testing';
import { render } from '@testing-library/react';

import { CursorOutput } from './cursor-output';

describe('CursorOutput', function () {
  it('renders "no cursor" if value is empty', function () {
    const docs = { documents: [], cursorHasMore: false };
    const { container } = render(<CursorOutput value={docs} />);

    expect(container.textContent).to.equal('');
    expect(container.querySelectorAll('.cm-editor')).to.have.lengthOf(0);
  });

  it('renders a CursorIterationResultOutput if value contains elements', function () {
    const docs = { documents: [{ doc: 1 }, { doc: 2 }], cursorHasMore: false };
    const { container } = render(<CursorOutput value={docs} />);

    expect(container.textContent).to.contain('doc: 1');
    expect(container.textContent).to.contain('doc: 2');
  });

  context('when value has more elements available', function () {
    it('prompts to type "it"', function () {
      const docs = { documents: [{}], cursorHasMore: true };
      const { container } = render(<CursorOutput value={docs} />);

      expect(container.textContent).to.contain('Type "it" for more');
    });
  });

  context('when value does not have more elements available', function () {
    it('does not prompt to type "it"', function () {
      const docs = { documents: [{}], cursorHasMore: false };
      const { container } = render(<CursorOutput value={docs} />);

      expect(container.textContent).not.to.contain('Type "it" for more');
    });
  });
});
