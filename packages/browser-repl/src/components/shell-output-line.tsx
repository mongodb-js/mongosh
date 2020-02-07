import React, { Component } from 'react';
import PropTypes from 'prop-types';
import browserUtilInspect from 'browser-util-inspect';
import classnames from 'classnames';
import { HelpOutput } from './types/help-output';
import { CursorOutput } from './types/cursor-output';
import { CursorIterationResultOutput } from './types/cursor-interation-result-output';

type ShellOutputEntryValue = any;

export interface ShellOutputEntry {
  type: 'input' | 'output' | 'error';
  shellApiType?: string;
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

    if (entry.value === null) {
      return 'null';
    }

    if (this.isError(entry)) {
      return entry.value.stack;
    }

    return this.inspect(entry.value);
  }

  private isError(entry: ShellOutputEntry): boolean {
    return entry.value instanceof Error ||
      entry.type === 'error' && entry.value && entry.value.stack;
  }

  inspect(value): string {
    const inspected = browserUtilInspect(value, {});

    if (value && typeof value === 'object') {
      const displayName = value.constructor ? value.constructor.name : 'Object';
      return `${displayName} ${inspected}`;
    }

    return inspected;
  }

  renderValue(): JSX.Element {
    const {shellApiType} = this.props.entry;

    if (shellApiType === 'Help') {
      return <HelpOutput value={this.props.entry.value} />;
    }

    if (shellApiType === 'Cursor') {
      return <CursorOutput value={this.props.entry.value} />;
    }

    if (shellApiType === 'CursorIterationResult') {
      return <CursorIterationResultOutput value={this.props.entry.value} />;
    }

    const formattedValue = this.formatValue(this.props.entry);
    return <pre>{formattedValue}</pre>;
  }

  render(): JSX.Element {
    const className = classnames({
      'shell-output-line': true,
      [`shell-output-line-${this.props.entry.type}`]: true
    });

    return <div className={className}>{this.renderValue()}</div>;
  }
}

