import React, { Component } from 'react';
import { Icon, css } from '@mongodb-js/compass-components';
import type { Autocompleter } from '@mongosh/browser-runtime-core';
import type { EditorRef } from '@mongodb-js/compass-editor';
import { Editor } from './editor';
import ShellLoader from './shell-loader';
import { LineWithIcon } from './utils/line-with-icon';

const shellInput = css({
  padding: '0 8px',
  minHeight: '24px',
});

interface ShellInputProps {
  autocompleter?: Autocompleter;
  history?: readonly string[];
  onClearCommand?(): void | Promise<void>;
  onInput?(code: string): void | Promise<void>;
  operationInProgress?: boolean;
  prompt?: string;
  onSigInt?(): Promise<boolean>;
  editorRef?: (editor: EditorRef | null) => void;
  initialText?: string;
  onTextChange?: (text: string) => void;
}

interface ShellInputState {
  currentValue: string;
  readOnly: boolean;
}

export class ShellInput extends Component<ShellInputProps, ShellInputState> {
  readonly state: ShellInputState = {
    currentValue: this.props.initialText ?? '',
    readOnly: false,
  };

  private historyNavigationEntries: string[] = [];
  private historyNavigationIndex = 0;

  constructor(props: ShellInputProps) {
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
      ...(this.props.history || []),
    ];

    this.historyNavigationIndex = 0;
  }

  private onChange = (value: string): void => {
    this.props.onTextChange?.(value);
    this.setState({ currentValue: value });
  };

  private syncCurrentValueWithHistoryNavigation(
    cb: (updated: boolean) => void
  ): void {
    const value = this.historyNavigationEntries[this.historyNavigationIndex];

    if (value === undefined) {
      return cb(false);
    }

    this.setState({ currentValue: value }, () => {
      cb(true);
    });
  }

  private historyBack = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (
        this.historyNavigationIndex >=
        this.historyNavigationEntries.length - 1
      ) {
        return resolve(false);
      }

      this.historyNavigationIndex++;

      this.syncCurrentValueWithHistoryNavigation(resolve);
    });
  };

  private historyNext = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (this.historyNavigationIndex <= 0) {
        return resolve(false);
      }

      this.historyNavigationIndex--;

      this.syncCurrentValueWithHistoryNavigation(resolve);
    });
  };

  private onEnter = async (): Promise<void> => {
    const value = this.state.currentValue;
    // clear the value before evaluating the input because it could take a long
    // time
    this.setState({ currentValue: '' });

    if (this.props.onInput) {
      await this.props.onInput(value);
    }
  };

  render(): JSX.Element {
    let prompt: JSX.Element;
    if (this.props.operationInProgress) {
      prompt = <ShellLoader />;
    } else if (this.props.prompt) {
      const trimmed = this.props.prompt.trim();
      if (trimmed.endsWith('>')) {
        prompt = (
          <>
            <span>{trimmed.replace(/>$/g, '')}</span>
            <Icon size={12} glyph={'ChevronRight'} />
          </>
        );
      } else {
        prompt = <span>{trimmed}</span>;
      }
    } else {
      prompt = <Icon size={12} glyph={'ChevronRight'} />;
    }

    const editor = (
      <Editor
        autocompleter={this.props.autocompleter}
        onArrowUpOnFirstLine={this.historyBack}
        onArrowDownOnLastLine={this.historyNext}
        onChange={this.onChange}
        onEnter={this.onEnter}
        onClearCommand={this.props.onClearCommand}
        editorRef={this.props.editorRef}
        value={this.state.currentValue}
        operationInProgress={this.props.operationInProgress}
        onSigInt={this.props.onSigInt}
      />
    );

    return (
      <LineWithIcon
        className={shellInput}
        icon={prompt}
        data-testid="shell-input"
      >
        {editor}
      </LineWithIcon>
    );
  }
}
