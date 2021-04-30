import React, { Component } from 'react';
import PropTypes from 'prop-types';

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
