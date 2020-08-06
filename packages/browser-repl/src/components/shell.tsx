import React, { Component } from 'react';
import classnames from 'classnames';
import { ShellInput } from './shell-input';
import { ShellOutput, ShellOutputEntry } from './shell-output';
import { Runtime } from '@mongosh/browser-runtime-core';
import { changeHistory } from '@mongosh/history';

const styles = require('./shell.less');

interface ShellProps {
  /* The runtime used to evaluate code.
  */
  runtime: Runtime;

  /* A function called each time the output changes with an array of
   * ShellOutputEntryes.
   */
  onOutputChanged?: (output: readonly ShellOutputEntry[]) => void;

  /* A function called each time the history changes
   * with an array of history entries ordered from the most recent to
   * the oldest entry.
   */
  onHistoryChanged?: (history: readonly string[]) => void;

  /* If set, the shell will omit or redact entries containing sensitive
   * info from history. Defaults to `false`.
   */
  redactInfo?: boolean;

  /* The maxiumum number of lines to keep in the output.
   * Defaults to `1000`.
   */
  maxOutputLength?: number;

  /* The maxiumum number of lines to keep in the history.
   * Defaults to `1000`.
   */
  maxHistoryLength?: number;

  /* An array of entries to be displayed in the output area.
   *
   * Can be used to restore the output between sessions, or to setup
   * a greeting message.
   *
   * Note: new entries will not be appended to the array.
   */
  initialOutput?: readonly ShellOutputEntry[];

  /* An array of history entries to prepopulate the history.
   *
   * Can be used to restore the history between sessions.
   *
   * Entries must be ordered from the most recent to the oldest.
   *
   * Note: new entries will not be appended to the array.
   */
  initialHistory?: readonly string[];
}

interface ShellState {
  operationInProgress: boolean;
  output: readonly ShellOutputEntry[];
  history: readonly string[];
}

const noop = (): void => {
  //
};

/**
 * The browser-repl Shell component
 */
export class Shell extends Component<ShellProps, ShellState> {
  static defaultProps = {
    onHistoryChanged: noop,
    onOutputChanged: noop,
    maxOutputLength: 1000,
    maxHistoryLength: 1000,
    initialOutput: [],
    initialHistory: []
  };

  private shellInputElement?: HTMLElement;
  private shellInputRef?: {
    editor?: HTMLElement;
  };

  readonly state: ShellState = {
    operationInProgress: false,
    output: this.props.initialOutput.slice(-this.props.maxOutputLength),
    history: this.props.initialHistory.slice(0, this.props.maxHistoryLength)
  };

  componentDidMount(): void {
    this.scrollToBottom();
  }

  componentDidUpdate(): void {
    this.scrollToBottom();
  }

  private evaluate = async(code: string): Promise<ShellOutputEntry> => {
    let outputLine;

    try {
      const result = await this.props.runtime.evaluate(code);
      outputLine = {
        format: 'output',
        type: result.type,
        value: result.value
      };
    } catch (error) {
      outputLine = {
        format: 'error',
        value: error
      };
    }

    return outputLine;
  };

  private addEntryToHistory(code: string): readonly string[] {
    const history = [
      code,
      ...this.state.history
    ];

    changeHistory(history, this.props.redactInfo);
    history.splice(this.props.maxHistoryLength);

    Object.freeze(history);

    return history;
  }

  private addEntriesToOutput(entries: readonly ShellOutputEntry[]): readonly ShellOutputEntry[] {
    const output = [
      ...this.state.output,
      ...entries
    ];

    output.splice(0, output.length - this.props.maxOutputLength);

    Object.freeze(output);

    return output;
  }

  private onClearCommand = (): void => {
    const output = [];

    Object.freeze(output);

    this.setState({ output });
    this.props.onOutputChanged(output);
  };

  private onInput = async(code: string): Promise<void> => {
    if (!code || code.trim() === '') {
      this.appendEmptyInput();
      return;
    }

    const inputLine: ShellOutputEntry = {
      format: 'input',
      value: code
    };

    this.setState({
      operationInProgress: true
    });

    const outputLine = await this.evaluate(code);

    const output = this.addEntriesToOutput([
      inputLine,
      outputLine
    ]);

    const history = this.addEntryToHistory(code);

    this.setState({
      operationInProgress: false,
      output,
      history
    });

    this.props.onOutputChanged(output);
    this.props.onHistoryChanged(history);
  };

  private appendEmptyInput(): void {
    const inputLine: ShellOutputEntry = {
      format: 'input',
      value: ' '
    };

    const output = this.addEntriesToOutput([
      inputLine
    ]);

    this.setState({ output });
  }

  private scrollToBottom(): void {
    if (!this.shellInputElement) {
      return;
    }

    this.shellInputElement.scrollIntoView();
  }

  private onShellClicked = (event: React.MouseEvent): void => {
    // Focus on input when clicking the shell background (not clicking output).
    if (event.currentTarget === event.target) {
      if (this.shellInputRef && this.shellInputRef.editor) {
        this.shellInputRef.editor.focus();
      }
    }
  };

  render(): JSX.Element {
    return (
      <div
        className={classnames(styles.shell)}
        onClick={this.onShellClicked}
      >
        <div>
          <ShellOutput
            output={this.state.output} />
        </div>
        <div ref={(el): void => { this.shellInputElement = el; }}>
          <ShellInput
            autocompleter={this.props.runtime}
            history={this.state.history}
            onClearCommand={this.onClearCommand}
            onInput={this.onInput}
            operationInProgress={this.state.operationInProgress}
            setInputRef={(ref): void => { this.shellInputRef = ref;}}
          />
        </div>
      </div>
    );
  }
}
