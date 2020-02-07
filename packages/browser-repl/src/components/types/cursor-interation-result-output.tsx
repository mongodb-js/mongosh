import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Document, DocumentOutput } from './document-output';

interface CursorIterationResultOutputProps {
  value: Document[];
}

export class CursorIterationResultOutput extends Component<CursorIterationResultOutputProps> {
  static propTypes = {
    value: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  render(): JSX.Element {
    if (this.props.value.length) {
      return <div>{this.props.value.map(this.renderDocument)}</div>;
    }

    return <div>no cursor</div>;
  }

  renderDocument = (document, i): JSX.Element => {
    return <DocumentOutput key={`document-${i}`} value={document} />;
  }
}


