import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Code, css } from '@mongodb-js/compass-components';

const syntaxHighlight = css({
  '& *': {
    background: 'transparent',
    border: '0px transparent',
    padding: 0,
    margin: 0,
    fontSize: 'inherit',
    borderRadius: 0,
    color: 'inherit'
  }
});

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
        className={syntaxHighlight}
        copyable={false}
      >{this.props.code}</Code>
    );
  }
}
