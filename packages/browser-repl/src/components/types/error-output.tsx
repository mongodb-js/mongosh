import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { Expandable } from '../utils/expandable';

const styles = require('./error-output.less');

interface ErrorOutputProps {
  value: any;
}

export class ErrorOutput extends Component<ErrorOutputProps> {
  static propTypes = {
    value: PropTypes.any
  };

  renderCollapsed(toggle): JSX.Element {
    return (<div className={classnames(styles['error-output-header'])}><pre>
      <a href="#" onClick={(e): void => { e.preventDefault(); toggle(); }} >
        {this.props.value.name || 'Error'}:
      </a> {this.props.value.message}
    </pre></div>);
  }

  renderExpanded(toggle): JSX.Element {
    return (<div className={classnames(styles['error-output-stack'])}>
      {this.renderCollapsed(toggle)}
      <div><pre>{this.props.value.stack}</pre></div>
    </div>);
  }

  render(): JSX.Element {
    return (<Expandable>{
      (expanded, toggle): JSX.Element => (expanded ?
        this.renderExpanded(toggle) :
        this.renderCollapsed(toggle))
    }</Expandable>);
  }
}

