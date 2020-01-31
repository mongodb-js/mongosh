/* eslint-disable react/sort-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Editor } from './editor';
import { History } from './history';

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

  private history: History;

  constructor(props) {
    super(props);
    this.history = new History(props.initialHistory || []);
  }

  private onChange = (value: string): void => {
    this.setState({currentValue: value});
  }

  private historyBack = (): void => {
    const value = this.history.back(this.state.currentValue);

    if (value === undefined) {
      return;
    }

    this.setState({
      currentValue: value
    });
  }

  private historyNext = (): void => {
    const value = this.history.next();

    if (value === undefined) {
      return;
    }

    this.setState({
      currentValue: value
    });
  }

  private onEnter = (): void => {
    const currentValue = this.state.currentValue;
    if (!currentValue || currentValue.trim() === '') {
      return;
    }

    this.history.commit(currentValue);

    if (this.props.onInput) {
      this.props.onInput(currentValue);
    }

    this.setState({
      currentValue: ''
    });
  }

  render(): JSX.Element {
    return (<Editor
      value={this.state.currentValue}
      onChange={this.onChange}
      onEnter={this.onEnter}
      onArrowUpOnFirstLine={this.historyBack}
      onArrowDownOnLastLine={this.historyNext}
    />);
  }
}
