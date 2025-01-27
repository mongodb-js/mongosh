import React from 'react';
import { expect } from '../../testing/chai';
import { screen, render, waitFor, cleanup } from '@testing-library/react';

import type { ShellOutputEntry } from './shell-output-line';
import { ShellOutput } from './shell-output';

function WrappedShellOutput(props: { output: ShellOutputEntry[] }) {
  return (
    <div style={{ height: '200px' }}>
      <ShellOutput
        output={props.output}
        __TEST_LIST_HEIGHT={200}
        setInnerContainerRef={() => {
          /** */
        }}
      />
    </div>
  );
}

describe('<ShellOutput />', function () {
  beforeEach(cleanup);

  it('renders no output lines if none are passed', function () {
    render(<WrappedShellOutput output={[]} />);
    expect(screen.queryByTestId('shell-output-line')).to.not.exist;
  });

  it('renders an output line if one is passed', function () {
    const line1: ShellOutputEntry = {
      type: 'output',
      value: 'line 1',
      format: 'output',
    };
    render(<WrappedShellOutput output={[line1]} />);
    expect(screen.getByText(/line 1/i)).to.exist;
    expect(screen.getAllByTestId('shell-output-line')).to.have.lengthOf(1);
  });

  it('scrolls to the newly added item', async function () {
    const output: ShellOutputEntry[] = Array.from({ length: 100 }, (_, i) => ({
      type: 'output',
      value: `line ${i}`,
      format: 'output',
    }));

    const { rerender } = render(<WrappedShellOutput output={output} />);

    const newLine: ShellOutputEntry = {
      type: 'output',
      value: 'new line',
      format: 'output',
    };

    rerender(<WrappedShellOutput output={[...output, newLine]} />);

    await waitFor(() => {
      expect(screen.getByText(/new line/i)).to.exist;
    });
  });
});
