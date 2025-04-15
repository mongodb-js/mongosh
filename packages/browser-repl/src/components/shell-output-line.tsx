import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Icon, css, cx, palette } from '@mongodb-js/compass-components';
import { LineWithIcon } from './utils/line-with-icon';
import { HelpOutput } from './types/help-output';
import { ShowBannerResultOutput } from './types/show-banner-result-output';
import { ShowDbsOutput } from './types/show-dbs-output';
import { ShowCollectionsOutput } from './types/show-collections-output';
import { CursorOutput } from './types/cursor-output';
import { CursorIterationResultOutput } from './types/cursor-iteration-result-output';
import { ObjectOutput } from './types/object-output';
import { StatsResultOutput } from './types/stats-result-output';
import { SimpleTypeOutput } from './types/simple-type-output';
import { ErrorOutput } from './types/error-output';
import { ShowProfileOutput } from './types/show-profile-output';

const shellOutputLine = css({
  padding: '0 8px',
});

const shellOutputLineError = css({
  backgroundColor: 'inherit',
  color: palette.red.light1,
});

const shellOutputLineIcon = css({
  color: palette.gray.dark1,
});

const shellOutputLineIconError = css({
  color: 'inherit',
});

type ShellOutputEntryValue = any;
type Glyph = 'ChevronRight' | 'XWithCircle' | 'ChevronLeft';

export interface ShellOutputEntry {
  key: number | string;
  format: 'input' | 'output' | 'error';
  type?: string | null;
  value: ShellOutputEntryValue;
}

interface ShellOutputLineProps {
  entry: ShellOutputEntry;
}

export class ShellOutputLine extends Component<ShellOutputLineProps> {
  static propTypes = {
    entry: PropTypes.object.isRequired,
  };

  private renderValue(): JSX.Element {
    const { type, value, format } = this.props.entry;

    if (format === 'input' || this.isPreformattedResult(value, type)) {
      return <pre>{value}</pre>;
    }

    // 'InspectResult' is a special value used by node-runtime-worker-thread
    // which indicates that the value has already been inspect()ed prior to
    // serialization, in which case we also want to print its raw contents
    // rather than calling inspect() again;
    if (typeof value === 'string' && type === 'InspectResult') {
      return <SimpleTypeOutput value={value} raw />;
    }

    if (this.isPrimitiveOrFunction(value)) {
      return <SimpleTypeOutput value={value} />;
    }

    if (type === 'Help') {
      return <HelpOutput value={value} />;
    }

    if (type === 'ShowDatabasesResult') {
      return <ShowDbsOutput value={value} />;
    }

    if (type === 'StatsResult') {
      return <StatsResultOutput value={value} />;
    }

    if (type === 'ListCommandsResult') {
      return <SimpleTypeOutput value={value} />;
    }

    if (type === 'ShowCollectionsResult') {
      return <ShowCollectionsOutput value={value} />;
    }

    if (type === 'ShowBannerResult') {
      return <ShowBannerResultOutput value={value} />;
    }

    if (type === 'Cursor' || type === 'AggregationCursor') {
      return <CursorOutput value={value} />;
    }

    if (type === 'CursorIterationResult') {
      return <CursorIterationResultOutput value={value} />;
    }

    if (type === 'ShowProfileResult') {
      return <ShowProfileOutput value={value} />;
    }

    if (this.isError(value)) {
      return <ErrorOutput value={value} />;
    }

    return <ObjectOutput value={value} />;
  }

  private isError(value: any): boolean {
    return typeof value.message === 'string' && typeof value.stack === 'string';
  }

  private isPreformattedResult(value: any, type?: string | null): boolean {
    return (
      typeof value === 'string' &&
      (type === 'Database' || type === 'Collection' || !type)
    );
  }

  private isPrimitiveOrFunction(value: any): boolean {
    // any primitive type including 'null' and 'undefined',
    // function and classes
    return value !== Object(value) || typeof value === 'function';
  }

  private getIconGlyph(): Glyph {
    const { format } = this.props.entry;

    if (format === 'input') {
      return 'ChevronRight';
    }

    if (format === 'error') {
      return 'XWithCircle';
    }

    return 'ChevronLeft';
  }

  render(): JSX.Element {
    const { format } = this.props.entry;

    const icon = (
      <Icon
        size={12}
        glyph={this.getIconGlyph()}
        className={cx(
          format === 'error' ? shellOutputLineIconError : shellOutputLineIcon
        )}
      />
    );

    return (
      <LineWithIcon
        className={cx(
          shellOutputLine,
          format === 'error' && shellOutputLineError
        )}
        icon={icon}
        data-testid="shell-output"
      >
        {this.renderValue()}
      </LineWithIcon>
    );
  }
}
