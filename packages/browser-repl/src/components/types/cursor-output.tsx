import React, { Component } from 'react';
import PropTypes from 'prop-types';
import i18n from 'mongosh-i18n';
import { ObjectOutput } from './object-output';
import { CursorIterationResultOutput, Document } from './cursor-iteration-result-output';

interface CursorOutputProps {
  value: Document[];
}

// TODO: use a shared constant?
const MAX_DOCUMENT_PER_ITERATION = 20;

export class CursorOutput extends Component<CursorOutputProps> {
  static propTypes = {
    value: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  render(): JSX.Element {
    if (!this.props.value.length) {
      return <pre/>;
    }

    const more = this.props.value.length < MAX_DOCUMENT_PER_ITERATION ? '' :
      (<pre>{i18n.__('shell-api.cursor.iteration.type-it-for-more')}</pre>);

    return (<div>
      <CursorIterationResultOutput value={this.props.value} />
      {more}
    </div>);
  }

  renderDocument = (document, i): JSX.Element => {
    return <ObjectOutput key={`document-${i}`} value={document} />;
  }
}


