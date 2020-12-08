import React, { Component } from 'react';
import PropTypes from 'prop-types';
import i18n from '@mongosh/i18n';
import { CursorIterationResultOutput, Document } from './cursor-iteration-result-output';

interface CursorOutputProps {
  value: Document[];
}

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
      (<pre>{i18n.__('shell-api.classes.Cursor.iteration.type-it-for-more')}</pre>);

    return (<div>
      <CursorIterationResultOutput value={this.props.value} />
      {more}
    </div>);
  }
}


