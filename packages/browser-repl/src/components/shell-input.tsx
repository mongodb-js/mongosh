import React, { Component } from 'react';
import { Icon, css } from '@mongodb-js/compass-components';
import { Autocompleter } from '@mongosh/browser-runtime-core';
import { Editor } from './editor';
import ShellLoader from './shell-loader';
import { LineWithIcon } from './utils/line-with-icon';
import type { AceEditor as IAceEditor } from '@mongodb-js/compass-editor';


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
  onEditorLoad?: (editor: IAceEditor) => void;
  onSigInt?(): Promise<boolean>;
}

interface ShellInputState {
  currentValue: string;
  readOnly: boolean;
}

export class ShellInput extends Component<ShellInputProps, ShellInputState> {
  readonly state: ShellInputState = {
    currentValue: '',
    readOnly: false
  };

  private editor: IAceEditor | null = null;
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

    this.setState({ currentValue: value }, () => {
      // eslint-disable-next-line chai-friendly/no-unused-expressions
      this.editor?.navigateFileEnd();
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

  private onEnter = async(): Promise<void> => {
    if (this.props.onInput) {
      await this.props.onInput(this.state.currentValue);
    }

    this.setState({ currentValue: '' });
  };

  render(): JSX.Element {
    let prompt: JSX.Element;
    if (this.props.operationInProgress) {
      prompt = (<ShellLoader />);
    } else if (this.props.prompt) {
      const trimmed = this.props.prompt.trim();
      if (trimmed.endsWith('>')) {
        prompt = (<>
          <span>{trimmed.replace(/>$/g, '')}</span>
          <Icon
            size={12}
            glyph={'ChevronRight'}
          />
        </>);
      } else {
        prompt = (<span>{trimmed}</span>);
      }
    } else {
      prompt = (<Icon
        size={12}
        glyph={'ChevronRight'}
      />);
    }

    const editor = (
      <Editor
        autocompleter={this.props.autocompleter}
        onArrowUpOnFirstLine={this.historyBack}
        onArrowDownOnLastLine={this.historyNext}
        onChange={this.onChange}
        onEnter={this.onEnter}
        onClearCommand={this.props.onClearCommand}
        onEditorLoad={(editor) => {
          this.editor = editor;
          // eslint-disable-next-line chai-friendly/no-unused-expressions
          this.props.onEditorLoad?.(editor);
        }}
        value={this.state.currentValue}
        operationInProgress={this.props.operationInProgress}
        onSigInt={this.props.onSigInt}
      />
    );

    return (
      <LineWithIcon className={shellInput} icon={prompt}>
        {editor}
      </LineWithIcon>
    );
  }
}
