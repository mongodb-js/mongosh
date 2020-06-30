import React, { Component } from 'react';
import classnames from 'classnames';
import { Editor } from './editor';
import { Autocompleter } from '@mongosh/browser-runtime-core';
import { LineWithIcon } from './utils/line-with-icon';
import Icon from '@leafygreen-ui/icon';

const styles = require('./shell-input.less');

interface ShellInputProps {
  autocompleter?: Autocompleter;
  history?: readonly string[];
  onClearCommand?(): void | Promise<void>;
  onInput?(code: string): void | Promise<void>;
  setInputRef?(ref): void;
}

interface ShellInputState {
  currentValue: string;
}

export class ShellInput extends Component<ShellInputProps, ShellInputState> {
  readonly state: ShellInputState = {
    currentValue: ''
  };

  private historyNavigationEntries: string[];
  private historyNavigationIndex: number;

  constructor(props) {
    super(props);
    this.initializeHistoryNavigation();
  }

  componentDidUpdate(prevProps: ShellInputProps): void {
    if (prevProps.history !== this.props.history) {
      this.initializeHistoryNavigation();
    }

    if (this.historyNavigationIndex === 0) {
      this.historyNavigationEntries[0] = this.state.currentValue;
    }
  }

  private initializeHistoryNavigation(): void {
    this.historyNavigationEntries = [
      this.state.currentValue,
      ...(this.props.history || [])
    ];

    this.historyNavigationIndex = 0;
  }

  private onChange = (value: string): void => {
    this.setState({ currentValue: value });
  };

  private syncCurrentValueWithHistoryNavigation(): void {
    const value = this.historyNavigationEntries[this.historyNavigationIndex];

    if (value === undefined) {
      return;
    }

    this.setState({
      currentValue: value
    });
  }

  private historyBack = (): void => {
    if (this.historyNavigationIndex >= this.historyNavigationEntries.length - 1) {
      return;
    }

    this.historyNavigationIndex++;

    this.syncCurrentValueWithHistoryNavigation();
  };

  private historyNext = (): void => {
    if (this.historyNavigationIndex <= 0) {
      return;
    }

    this.historyNavigationIndex--;

    this.syncCurrentValueWithHistoryNavigation();
  };

  private onEnter = (): void => {
    const currentValue = this.state.currentValue;
    if (!currentValue || currentValue.trim() === '') {
      return;
    }

    if (this.props.onInput) {
      this.props.onInput(currentValue);
    }

    this.setState({
      currentValue: ''
    });
  };

  render(): JSX.Element {
    const icon = (<Icon
      size={12}
      glyph={'ChevronRight'}
    />);

    const editor = (<Editor
      autocompleter={this.props.autocompleter}
      onArrowUpOnFirstLine={this.historyBack}
      onArrowDownOnLastLine={this.historyNext}
      onChange={this.onChange}
      onEnter={this.onEnter}
      onClearCommand={this.props.onClearCommand}
      setInputRef={this.props.setInputRef}
      value={this.state.currentValue}
    />);

    const className = classnames(styles['shell-input']);

    return <LineWithIcon className={className} icon={icon}>{editor}</LineWithIcon>;
  }
}
