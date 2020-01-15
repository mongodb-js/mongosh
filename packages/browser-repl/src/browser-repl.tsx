import React, { Component } from 'react';
import PropTypes, {InferProps} from 'prop-types';

import './browser-repl.css';

export default class BrowserRepl extends Component<InferProps<typeof BrowserRepl.propTypes>> {
  static propTypes = {
    name: PropTypes.string.isRequired,
  }

  render(): JSX.Element {
    return <h1>Hello {this.props.name}</h1>;
  }
}

