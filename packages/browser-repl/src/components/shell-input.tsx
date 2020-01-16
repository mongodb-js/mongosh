import React, { Component, ChangeEvent, KeyboardEvent } from 'react';
import PropTypes from 'prop-types';

interface ShellInputProps {
  onInput?(code: string): void | Promise<void>;
}

interface ShellInputState {
  currentValue: string;
}

export class ShellInput extends Component<ShellInputProps, ShellInputState> {
  static propTypes = {
    onInput: PropTypes.func
  };

  readonly state: ShellInputState = {
    currentValue: ''
  };

  onChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    this.setState({currentValue: event.target.value});
  }

  onKeyUp = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter') {
      this.props.onInput(this.state.currentValue);
      this.setState({currentValue: ''});
    }
  }

  render(): JSX.Element {
    return (<textarea
      value={this.state.currentValue}
      onChange={this.onChange}
      onKeyUp={this.onKeyUp} />);
  }
}
