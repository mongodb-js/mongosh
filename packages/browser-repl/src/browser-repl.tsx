import React, { Component } from 'react';
import PropTypes, {InferProps} from 'prop-types';

import './browser-repl.css';

type BrowserReplProps = InferProps<typeof BrowserRepl.propTypes>;

export default class BrowserRepl extends Component<BrowserReplProps> {
  static propTypes = {
    name: PropTypes.string.isRequired,
  }

  render() {
    return <h1>Hello {this.props.name}</h1>;
  }
}

