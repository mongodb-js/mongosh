import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CodemirrorInlineEditor } from '@mongodb-js/compass-editor';
import { editorStyles } from '../editor';

interface SyntaxHighlightProps {
  code: string;
}

export class SyntaxHighlight extends Component<SyntaxHighlightProps> {
  static propTypes = {
    code: PropTypes.string.isRequired
  };

  render(): JSX.Element {
    return (
      <CodemirrorInlineEditor
        readOnly
        language="javascript"
        text={this.props.code}
        showFoldGutter={false}
        showLineNumbers={false}
        showAnnotationsGutter={false}
        highlightActiveLine={false}
        maxLines={Infinity}
        lineHeight={24}
        className={editorStyles}
      />
    );
  }
}
