import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CodemirrorInlineEditor } from '@mongodb-js/compass-editor';
import { editorStyles } from '../editor';

interface SyntaxHighlightProps {
  code: string;
}

export class SyntaxHighlight extends Component<SyntaxHighlightProps> {
  static propTypes = {
    code: PropTypes.string.isRequired,
  };

  render(): JSX.Element {
    return (
      <CodemirrorInlineEditor
        readOnly
        initialText={this.props.code}
        // @ts-expect-error TODO: this works but types don't allow it, waiting
        // for update in compass-editor
        maxLines={Infinity}
        lineHeight={24}
        className={editorStyles}
      />
    );
  }
}
