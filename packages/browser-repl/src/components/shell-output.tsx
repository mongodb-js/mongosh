import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ShellOutputLine } from './shell-output-line';
import type { ShellOutputEntry } from './shell-output-line';

export type { ShellOutputEntry } from './shell-output-line';

interface ShellOutputProps {
  output: readonly ShellOutputEntry[];
}

export class ShellOutput extends Component<ShellOutputProps> {
  static propTypes = {
    output: PropTypes.arrayOf(PropTypes.any).isRequired,
  };

  renderLine = (entry: ShellOutputEntry): JSX.Element => {
    return (
      <ShellOutputLine key={`shell-output-entry-${entry.key}`} entry={entry} />
    );
  };

  render(): JSX.Element[] {
    return this.props.output
      .filter((entry) => entry.value !== undefined)
      .map(this.renderLine);
  }
}
