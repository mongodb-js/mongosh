import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Document, DocumentOutput } from './document-output';

interface CursorOutputProps {
  value: Document[];
}

export class CursorOutput extends Component<CursorOutputProps> {
  static propTypes = {
    value: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  render(): JSX.Element {
    return <div>{this.props.value.map(this.renderDocument)}</div>;
  }

  renderDocument = (document, i): JSX.Element => {
    return <DocumentOutput key={`document-${i}`} value={document} />;
  }
}


