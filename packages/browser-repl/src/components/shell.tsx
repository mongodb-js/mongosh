import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { ShellInput } from './shell-input';
import { ShellOutput, ShellOutputEntry } from './shell-output';
import { Interpreter } from '../lib/interpreter';

import './shell.css';

interface ShellProps {
  interpreter: Interpreter;
}

interface ShellState {
  output: ShellOutputEntry[];
}

export default class Shell extends Component<ShellProps, ShellState> {
  static propTypes = {
    interpreter: PropTypes.shape({
      evaluate: PropTypes.func.isRequired
    }).isRequired
  };

  readonly state: ShellState = {
    output: []
  };

  private onInput: (string) => Promise<void> = async(code) => {
    let outputLine;

    try {
      const result = await this.props.interpreter.evaluate(code);
      outputLine = {
        type: 'output',
        value: result
      };
    } catch (error) {
      outputLine = {
        type: 'error',
        value: error
      };
    }

    const inputLine = {
      type: 'input',
      value: code
    };

    this.setState({
      output: [
        ...this.state.output,
        inputLine,
        outputLine
      ]
    });
  }

  render(): JSX.Element {
    return (<div>
      <ShellOutput output={this.state.output} />
      <ShellInput onInput={this.onInput} />
    </div>);
  }
}
