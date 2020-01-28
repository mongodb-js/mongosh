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

  private onChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    this.setState({currentValue: event.target.value});
  }

  private onKeyUp = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (this.state.currentValue === '') {
      return;
    }

    if (this.isEnterWithoutShift(event)) {
      this.props.onInput(this.state.currentValue);
      this.setState({currentValue: ''});
    }
  }

  private preventDefaultEnterBehaviour = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (this.isEnterWithoutShift(event)) {
      event.preventDefault();
    }
  }

  private isEnterWithoutShift = (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    return event.key === 'Enter' && !event.shiftKey;
  }

  render(): JSX.Element {
    return (<textarea
      style={{
        width: '100%',
        resize: 'none'
      }}
      value={this.state.currentValue}
      onChange={this.onChange}
      onKeyUp={this.onKeyUp}
      onKeyDown={this.preventDefaultEnterBehaviour}
      onKeyPress={this.preventDefaultEnterBehaviour} />);
  }
}
