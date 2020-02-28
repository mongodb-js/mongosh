import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SyntaxHighlight } from '../utils/syntax-highlight';
import { inspect } from '../utils/inspect';

interface SimpleTypeOutputProps {
  value: any;
}

export class SimpleTypeOutput extends Component<SimpleTypeOutputProps> {
  static propTypes = {
    value: PropTypes.any
  };

  render(): JSX.Element {
    return (<SyntaxHighlight code={inspect(this.props.value)} />);
  }
}

