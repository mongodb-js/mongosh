import React, { Component } from 'react';
import PropTypes from 'prop-types';

export interface ShellOutputEntry {
  type: string;
  value: object | string;
}

interface ShellOutputLineProps {
  entry: ShellOutputEntry;
}

export class ShellOutputLine extends Component<ShellOutputLineProps> {
  static propTypes = {
    entry: PropTypes.object.isRequired
  };

  render(): JSX.Element {
    return <div>{this.props.entry.value}</div>;
  }
}
