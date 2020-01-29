/* eslint-disable react/sort-comp */
import React, { Component, ChangeEvent, KeyboardEvent } from 'react';
import PropTypes from 'prop-types';

interface ShellInputProps {
  onInput?(code: string): void | Promise<void>;
  initialHistory?: string[];
}

interface ShellInputState {
  currentValue: string;
}

export class ShellInput extends Component<ShellInputProps, ShellInputState> {
  static propTypes = {
    onInput: PropTypes.func,
    history: PropTypes.arrayOf(PropTypes.string)
  };

  readonly state: ShellInputState = {
    currentValue: ''
  };

  private history: string[];
  private historyIndex: number;
  private historyDirtyLastValue = false;

  constructor(props) {
    super(props);
    this.history = props.initialHistory || [];
    this.historyIndex = this.history.length;
  }

  private onChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    this.setState({currentValue: event.target.value});
  }

  private commitValueToHistory(value: string): void {
    if (this.historyDirtyLastValue) {
      this.history.pop();
    }

    this.history.push(value);
    this.historyIndex = this.history.length;
    this.historyDirtyLastValue = false;
  }

  private historyBack(): void {
    if (this.historyIndex <= 0) {
      return;
    }

    if (this.historyIndex === this.history.length && !this.historyDirtyLastValue) {
      this.historyDirtyLastValue = true;
      this.history.push(this.state.currentValue);
    }

    this.historyIndex--;
    const previousValue = this.history[this.historyIndex];

    this.setState({
      currentValue: previousValue
    });
  }

  private historyNext(): void {
    if (this.historyIndex >= this.history.length - 1) {
      return;
    }

    this.historyIndex++;

    const nextValue = this.history[this.historyIndex];

    this.setState({
      currentValue: nextValue
    });
  }

  private onInput = (currentValue: string): void => {
    if (!currentValue || currentValue.trim() === '') {
      return;
    }

    this.commitValueToHistory(currentValue);
    this.props.onInput(currentValue);

    this.setState({
      currentValue: ''
    });
  }

  private onKeyUp = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (this.isEnterWithoutShift(event)) {
      return this.onInput(this.state.currentValue);
    }
  }

  private onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    this.preventDefaultEnterBehaviour(event);

    if (event.key === 'ArrowUp') {
      return this.historyBack();
    }

    if (event.key === 'ArrowDown') {
      return this.historyNext();
    }
  }

  private isEnterWithoutShift = (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    return event.key === 'Enter' && !event.shiftKey;
  }

  private preventDefaultEnterBehaviour = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (this.isEnterWithoutShift(event)) {
      event.preventDefault();
    }
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
      onKeyDown={this.onKeyDown}
      onKeyPress={this.preventDefaultEnterBehaviour} />);
  }
}
