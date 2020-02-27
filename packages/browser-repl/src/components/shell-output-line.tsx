import React, { Component } from 'react';
import classnames from 'classnames';

import PropTypes from 'prop-types';
import Icon from '@leafygreen-ui/icon';

import { LineWithIcon } from './utils/line-with-icon';

import { HelpOutput } from './types/help-output';
import { CursorOutput } from './types/cursor-output';
import { CursorIterationResultOutput } from './types/cursor-iteration-result-output';
import { ObjectOutput } from './types/object-output';
import { SimpleTypeOutput } from './types/simple-type-output';
import { ErrorOutput } from './types/error-output';

const styles = require('./shell-output-line.less');

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

  private renderValue(): JSX.Element {
    const { shellApiType, value, type } = this.props.entry;

    if (
      typeof value === 'string' &&
      type === 'input' ||
      shellApiType === 'Database' ||
      shellApiType === 'Collection') {
      return <pre>{value}</pre>;
    }

    // any primitive type including 'null' and 'undefined'
    if (value !== Object(value)) {
      return <SimpleTypeOutput value={value} />;
    }

    if (shellApiType === 'Help') {
      return <HelpOutput value={value} />;
    }

    if (shellApiType === 'Cursor') {
      return <CursorOutput value={value} />;
    }

    if (shellApiType === 'CursorIterationResult') {
      return <CursorIterationResultOutput value={value} />;
    }

    if (typeof value.message === 'string' && typeof value.stack === 'string') {
      return <ErrorOutput value={value} />;
    }

    return <ObjectOutput value={value} />;
  }

  private getIconGlyph(): string {
    const { type } = this.props.entry;

    if (type === 'input') {
      return 'ChevronRight';
    }

    if (type === 'error') {
      return 'XWithCircle';
    }

    return 'ChevronLeft';
  }

  render(): JSX.Element {
    const { type } = this.props.entry;

    const className = classnames(
      styles['shell-output-line'],
      styles[`shell-output-line-${type}`]
    );

    const icon = (<Icon
      size={12}
      glyph={this.getIconGlyph()}
      className={styles['shell-output-line-icon']}
    />);

    return <LineWithIcon className={className} icon={icon}>{this.renderValue()}</LineWithIcon>;
  }
}

