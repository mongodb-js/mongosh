import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CursorIterationResultOutput, Document } from './cursor-iteration-result-output';

interface CursorOutputProps {
  value: Document[] & { cursorHasMore: boolean };
}

export class CursorOutput extends Component<CursorOutputProps> {
  static propTypes = {
    value: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  render(): JSX.Element {
    if (!this.props.value.length) {
      return <pre/>;
    }

    return <CursorIterationResultOutput value={this.props.value} />;
  }
}


