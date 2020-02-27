import React, { Component } from 'react';
import PropTypes from 'prop-types';
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

    // TODO: i18n
    const more = this.props.value.length < MAX_DOCUMENT_PER_ITERATION ? '' :
      (<pre>Type "it" for more</pre>);

    return (<div>
      <CursorIterationResultOutput value={this.props.value} />
      {more}
    </div>);
  }

  renderDocument = (document, i): JSX.Element => {
    return <ObjectOutput key={`document-${i}`} value={document} />;
  }
}


