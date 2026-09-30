import React from 'react';
import { expect } from '@mongosh/testing';
import { render } from '@testing-library/react';

import { CursorIterationResultOutput } from './cursor-iteration-result-output';

describe('CursorIterationResultOutput', function () {
  it('renders no ObjectOutput if value is empty', function () {
    const printable = { documents: [], cursorHasMore: false };
    const { container } = render(
      <CursorIterationResultOutput value={printable} />
    );

    expect(container.textContent).to.contain('no cursor');
  });

  it('renders a ObjectOutput for each element in value', function () {
    const printable = {
      documents: [{ doc: 1 }, { doc: 2 }],
      cursorHasMore: false,
    };
    const { container } = render(
      <CursorIterationResultOutput value={printable} />
    );

    expect(container.querySelectorAll('.cm-editor')).to.have.lengthOf(2);
    expect(container.textContent).to.contain('doc: 1');
    expect(container.textContent).to.contain('doc: 2');
  });
});
