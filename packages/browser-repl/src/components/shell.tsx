import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { ShellInput } from './shell-input';
import { ShellOutput, ShellOutputEntry } from './shell-output';
import { Runtime } from './runtime';

interface ShellProps {
  runtime: Runtime;
}

interface ShellState {
  output: ShellOutputEntry[];
}

export class Shell extends Component<ShellProps, ShellState> {
  static propTypes = {
    runtime: PropTypes.shape({
      evaluate: PropTypes.func.isRequired
    }).isRequired
  };

  readonly state: ShellState = {
    output: []
  };

  componentDidMount(): void {
    this.scrollToBottom();
  }

  componentDidUpdate(): void {
    this.scrollToBottom();
  }

  private onInput: (string) => Promise<void> = async(code) => {
    let outputLine;

    try {
      const result = await this.props.runtime.evaluate(code);
      outputLine = {
        type: 'output',
        value: result.value
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

  private shellInputElement?: HTMLElement;

  scrollToBottom(): void {
    if (!this.shellInputElement) {
      return;
    }

    this.shellInputElement.scrollIntoView({ behavior: 'smooth' });
  }

  render(): JSX.Element {
    return (<div>
      <div>
        <ShellOutput output={this.state.output} />
      </div>
      <div ref={(el): void => { this.shellInputElement = el; }}>
        <ShellInput onInput={this.onInput} />
      </div>
    </div>);
  }
}
