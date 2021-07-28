import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isShouldReportAsBugError } from '@mongosh/errors';

import { SimpleTypeOutput } from './simple-type-output';
import { Expandable } from '../utils/expandable';


interface ErrorOutputProps {
  value: any;
}

export class ErrorOutput extends Component<ErrorOutputProps> {
  static propTypes = {
    value: PropTypes.any
  };

  renderCollapsed(toggle: () => void): JSX.Element {
    return (<div><pre>
      <a href="#" onClick={(e): void => { e.preventDefault(); toggle(); }} >
        {this.props.value.name || 'Error'}:
      </a> {this.props.value.message}
    </pre></div>);
  }

  formatStack(): string {
    return this.props.value.stack.split('\n').slice(1).join('\n');
  }

  formatErrorBugReportInfo(): JSX.Element | undefined {
    if (isShouldReportAsBugError(this.props.value)) {
      return (<div>
        This is an error inside mongosh.
        Please <a href="https://jira.mongodb.org/projects/MONGOSH/issues" target="_blank">file a bug report for the MONGOSH project</a>.
      </div>);
    }
    return undefined;
  }

  formatErrorInfo(): JSX.Element | undefined {
    if (this.props.value.errInfo) {
      return (<div>
        Additional information:
        <SimpleTypeOutput value={this.props.value.errInfo} />
      </div>);
    }
    return undefined;
  }

  formatErrorResult(): JSX.Element | undefined {
    if (this.props.value.result) {
      return (<div>
        Result:
        <SimpleTypeOutput value={this.props.value.result} />
      </div>);
    }
    return undefined;
  }

  renderExpanded(toggle: () => void): JSX.Element {
    return (<div>
      {this.renderCollapsed(toggle)}
      <div>
        {this.formatErrorBugReportInfo()}
        {this.formatErrorInfo()}
        {this.formatErrorResult()}
        <pre>{this.formatStack()}</pre>
      </div>
    </div>);
  }

  render(): JSX.Element {
    return (<Expandable>{
      (expanded: boolean, toggle: () => void): JSX.Element => (expanded ?
        this.renderExpanded(toggle) :
        this.renderCollapsed(toggle))
    }</Expandable>);
  }
}
