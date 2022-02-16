import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Code from '@leafygreen-ui/code';

const styles = require('./syntax-highlight.less');

interface SyntaxHighlightProps {
  code: string;
}

export class SyntaxHighlight extends Component<SyntaxHighlightProps> {
  static propTypes = {
    code: PropTypes.string.isRequired
  };

  render(): JSX.Element {
    return (
      <Code
        language="javascript"
        darkMode
        className={styles['syntax-highlight']}
        copyable={false}
      >{this.props.code}</Code>
    );
  }
}
