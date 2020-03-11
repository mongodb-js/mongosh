import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { ShellInput } from './shell-input';
import { ShellOutput, ShellOutputEntry } from './shell-output';
import { Runtime } from 'mongosh-browser-runtime-core';
import changeHistory from 'mongosh-cli-repl/lib/history';

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
  static propTypes = {
    runtime: PropTypes.shape({
      evaluate: PropTypes.func.isRequired
    }).isRequired,
    onOutputChanged: PropTypes.func,
    onHistoryChanged: PropTypes.func,
    redactInfo: PropTypes.bool,
    maxOutputLength: PropTypes.number,
    maxHistoryLength: PropTypes.number,
    initialOutput: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string.isRequired,
      value: PropTypes.any.isRequired
    })),
    initialHistory: PropTypes.arrayOf(PropTypes.string)
  };

  static defaultProps = {
    onHistoryChanged: noop,
    onOutputChanged: noop,
    maxOutputLength: 1000,
    maxHistoryLength: 1000,
    initialOutput: [],
    initialHistory: []
  };

  private shellInputElement?: HTMLElement;

  readonly state: ShellState = {
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
        type: 'output',
        shellApiType: result.shellApiType,
        value: result.value
      };
    } catch (error) {
      outputLine = {
        type: 'error',
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

  private onInput = async(code: string): Promise<void> => {
    const inputLine: ShellOutputEntry = {
      type: 'input',
      value: code
    };

    const outputLine = await this.evaluate(code);

    const output = this.addEntriesToOutput([
      inputLine,
      outputLine
    ]);

    const history = this.addEntryToHistory(code);

    this.setState({ output, history });

    this.props.onOutputChanged(output);
    this.props.onHistoryChanged(history);
  };

  private scrollToBottom(): void {
    if (!this.shellInputElement) {
      return;
    }

    this.shellInputElement.scrollIntoView();
  }

  render(): JSX.Element {
    return (<div className={classnames(styles.shell)}>
      <div>
        <ShellOutput
          output={this.state.output} />
      </div>
      <div ref={(el): void => { this.shellInputElement = el; }}>
        <ShellInput
          onInput={this.onInput}
          history={this.state.history}
          autocompleter={this.props.runtime} />
      </div>
    </div>);
  }
}
