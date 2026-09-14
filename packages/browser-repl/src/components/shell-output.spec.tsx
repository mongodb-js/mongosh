import React from 'react';
import { expect } from '@mongosh/testing';
import { render, screen } from '@testing-library/react';

import type { ShellOutputEntry } from './shell-output-line';
import { ShellOutput } from './shell-output';

describe('<ShellOutput />', function () {
  it('renders no output lines if none are passed', function () {
    render(<ShellOutput output={[]} />);
    expect(screen.queryAllByTestId('shell-output')).to.have.lengthOf(0);
  });

  it('renders an output line if one is passed', function () {
    const line1: ShellOutputEntry = { type: 'output', value: 'line 1' };
    render(<ShellOutput output={[line1]} />);
    expect(screen.queryAllByTestId('shell-output')).to.have.lengthOf(1);
  });

  it('renders no output lines if only one with a value of undefined is passed', function () {
    const line1: ShellOutputEntry = { type: 'output', value: undefined };
    render(<ShellOutput output={[line1]} />);
    expect(screen.queryAllByTestId('shell-output')).to.have.lengthOf(0);
  });

  it('renders the value of the entry in the output line', function () {
    const line1: ShellOutputEntry = { type: 'output', value: 'line 1' };
    render(<ShellOutput output={[line1]} />);

    expect(screen.getByTestId('shell-output').textContent).to.contain('line 1');
  });
});
