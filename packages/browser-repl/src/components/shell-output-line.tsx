import React, { Component } from 'react';
import PropTypes from 'prop-types';
import browserUtilInspect from 'browser-util-inspect';

type ShellOutputEntryValue = any;

export interface ShellOutputEntry {
  type: 'input' | 'output' | 'error';
  value: ShellOutputEntryValue;
}

interface ShellOutputLineProps {
  entry: ShellOutputEntry;
}

export class ShellOutputLine extends Component<ShellOutputLineProps> {
  static propTypes = {
    entry: PropTypes.object.isRequired
  };

  private formatValue(entry: ShellOutputEntry): string {
    if (entry.type === 'input') {
      return entry.value;
    }

    if (entry.value === undefined) {
      return 'undefined';
    }

    if (entry.value instanceof Error) {
      return entry.value.stack;
    }

    // NOTE: due to the iframe bridge entry.value instanceof Error can be false for errors
    if (entry.type === 'error' && entry.value && entry.value.stack) {
      return entry.value.stack;
    }

    if (typeof entry.value.toReplString === 'function') {
      return entry.value.toReplString();
    }

    const inspected = browserUtilInspect(entry.value, {});

    if (typeof entry.value === 'object') {
      const displayName = entry.value.constructor ? entry.value.constructor.name : 'Object';
      return `${displayName} ${inspected}`;
    }

    return inspected;
  }

  render(): JSX.Element {
    const formattedValue = this.formatValue(this.props.entry);
    const className = `shell-output-line shell-output-line-${this.props.entry.type}`;
    return <pre className={className}>{formattedValue}</pre>;
  }
}

