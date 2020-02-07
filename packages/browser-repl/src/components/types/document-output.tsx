import React, { Component } from 'react';
import PropTypes from 'prop-types';

export interface Document {
  [property: string]: number | string | null | undefined | Document | Document[];
}

interface DocumentOutputProps {
  value: Document[];
}

export class DocumentOutput extends Component<DocumentOutputProps> {
  static propTypes = {
    value: PropTypes.object.isRequired
  };

  render(): JSX.Element {
    return <pre>{JSON.stringify(this.props.value)}</pre>;
  }
}


