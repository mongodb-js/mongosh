import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ObjectOutput } from './object-output';
import { SyntaxHighlight } from '../utils/syntax-highlight';
import i18n from '@mongosh/i18n';

export interface Document {
  [property: string]: number | string | null | undefined | Document | Document[];
}

interface CursorIterationResultOutputProps {
  value: (Document | string)[];
}

export class CursorIterationResultOutput extends Component<CursorIterationResultOutputProps> {
  static propTypes = {
    value: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  render(): JSX.Element {
    if (this.props.value.length) {
      return <div>{this.props.value.map(this.renderDocument)}</div>;
    }

    return <div>{i18n.__('shell-api.classes.Cursor.iteration.no-cursor')}</div>;
  }

  renderDocument = (document: Document | string, i: number): JSX.Element => {
    if (typeof document === 'string') {
      return <SyntaxHighlight key={`document-${i}`} code={document} />;
    }

    return <ObjectOutput key={`document-${i}`} value={document} />;
  };
}


