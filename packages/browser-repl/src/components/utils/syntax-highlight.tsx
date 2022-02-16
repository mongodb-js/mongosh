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
    return (<div className={styles['syntax-highlight']}>
      {/* <pre> */}
        <Code language="javascript" darkMode>{this.props.code}</Code>
      {/* </pre> */}
    </div>);
  }
}


