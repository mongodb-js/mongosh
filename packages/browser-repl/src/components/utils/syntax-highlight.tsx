import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { css } from '@mongodb-js/compass-components';
import { SyntaxHighlight as CompassSyntaxHighlight } from '@mongodb-js/compass-editor';

const syntaxHighlightStyles = css({
  lineHeight: '24px',
  '& .cm-scroller': {
    lineHeight: '24px'
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
      <CompassSyntaxHighlight
        language="javascript"
        text={this.props.code}
        showFoldGutter={false}
        showLineNumbers={false}
        className={syntaxHighlightStyles}
      />
    );
  }
}
