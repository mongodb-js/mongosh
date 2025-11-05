import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isShouldReportAsBugError } from '@mongosh/errors';
import { css, palette } from '@mongodb-js/compass-components';

import { SimpleTypeOutput } from './simple-type-output';
import { Expandable } from '../utils/expandable';
import type { MongoServerError } from 'mongodb';
import stripAnsi from 'strip-ansi';

interface ErrorOutputProps {
  value: any;
}

const errInfoCss = css({
  '&&': {
    borderLeft: '3px solid',
    paddingLeft: '0px',
    borderColor: palette.red.light1,
  },
});

const messageCss = css({
  color: palette.white,
});

export class ErrorOutput extends Component<ErrorOutputProps> {
  static propTypes = {
    value: PropTypes.any,
  };

  renderCollapsed(toggle: () => void): JSX.Element {
    const { name, message, codeName } = this.props.value as MongoServerError;
    const formattedName = name + (codeName ? `[${codeName}]` : '');
    const strippedMessage =
      name === 'SyntaxError' ? stripAnsi(message) : message;
    return (
      <div>
        <pre>
          <a
            href="#"
            onClick={(e): void => {
              e.preventDefault();
              toggle();
            }}
          >
            {formattedName || 'Error'}:
          </a>{' '}
          <span className={messageCss}>{strippedMessage}</span>
        </pre>
      </div>
    );
  }

  formatStack(): string {
    const err = this.props.value;
    const stack = err.name === 'SyntaxError' ? stripAnsi(err.stack) : err.stack;
    return stack.split('\n').slice(1).join('\n');
  }

  formatErrorBugReportInfo(): JSX.Element | undefined {
    if (isShouldReportAsBugError(this.props.value)) {
      return (
        <div>
          This is an error inside mongosh. Please{' '}
          <a
            href="https://jira.mongodb.org/projects/MONGOSH/issues"
            target="_blank"
            rel="noreferrer"
          >
            file a bug report for the MONGOSH project
          </a>
          .
        </div>
      );
    }
    return undefined;
  }

  formatErrorInfo(): JSX.Element | undefined {
    if (this.props.value.errInfo) {
      return (
        <div>
          Additional information:
          <SimpleTypeOutput value={this.props.value.errInfo} />
        </div>
      );
    }
    return undefined;
  }

  formatErrorResult(): JSX.Element | undefined {
    if (this.props.value.result) {
      return (
        <div>
          Result:
          <SimpleTypeOutput value={this.props.value.result} />
        </div>
      );
    }
    return undefined;
  }

  renderExpanded(toggle: () => void): JSX.Element {
    return (
      <div>
        {this.renderCollapsed(toggle)}
        <div className={messageCss}>
          {this.formatErrorBugReportInfo()}
          {this.formatErrorInfo()}
          {this.formatErrorResult()}
          <pre className={errInfoCss}>{this.formatStack()}</pre>
        </div>
      </div>
    );
  }

  render(): JSX.Element {
    return (
      <Expandable>
        {(expanded: boolean, toggle: () => void): JSX.Element =>
          expanded ? this.renderExpanded(toggle) : this.renderCollapsed(toggle)
        }
      </Expandable>
    );
  }
}
