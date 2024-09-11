import React, { Component } from 'react';
import type { EditorRef } from '@mongodb-js/compass-editor';
import {
  css,
  palette,
  fontFamilies,
  useDarkMode,
  cx,
} from '@mongodb-js/compass-components';
import type { Runtime } from '@mongosh/browser-runtime-core';
import { changeHistory } from '@mongosh/history';
import type { WorkerRuntime } from '@mongosh/node-runtime-worker-thread';
import { PasswordPrompt } from './password-prompt';
import { ShellInput } from './shell-input';
import type { ShellOutputEntry } from './shell-output';
import { ShellOutput } from './shell-output';

const shellContainer = css({
  fontSize: '13px',
  lineHeight: '24px',
  fontFamily: fontFamilies.code,
  padding: '4px 0',
  width: '100%',
  height: '100%',
  overflowY: 'scroll',
  overflowX: 'hidden',
  '& a, & a:link, & a:visited, & a:hover, & a:active': {
    fontWeight: 'bold',
    color: 'inherit',
    backgroundColor: 'transparent',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  '& pre, & code': {
    fontFamily: 'inherit',
    background: 'transparent',
    border: '0px transparent',
    padding: 0,
    margin: 0,
    fontSize: 'inherit',
    borderRadius: 0,
    color: 'inherit',
    tabSize: 2,
  },
});

const shellContainerLightModeStyles = css({
  backgroundColor: palette.white,
  color: palette.black,
});

const shellContainerDarkModeStyles = css({
  backgroundColor: palette.gray.dark4,
  color: palette.gray.light3,
});

interface ShellProps {
  /* The runtime used to evaluate code.
   */
  runtime: Runtime | WorkerRuntime;

  /* A function called each time the output changes with an array of
   * ShellOutputEntryes.
   */
  onOutputChanged: (output: readonly ShellOutputEntry[]) => void;

  /* A function called each time the history changes
   * with an array of history entries ordered from the most recent to
   * the oldest entry.
   */
  onHistoryChanged: (history: readonly string[]) => void;

  /**
   * A function called each time the text in the shell input is changed
   */
  onInputChanged?: (input: string) => void;

  /* If set, the shell will omit or redact entries containing sensitive
   * info from history. Defaults to `false`.
   */
  redactInfo?: boolean;

  /* The maxiumum number of lines to keep in the output.
   * Defaults to `1000`.
   */
  maxOutputLength: number;

  /* The maxiumum number of lines to keep in the history.
   * Defaults to `1000`.
   */
  maxHistoryLength: number;

  /* A function called when an operation has begun.
   */
  onOperationStarted: () => void;

  /* A function called when an operation has completed (both error and success).
   */
  onOperationEnd: () => void;

  /**
   * Initial value in the shell input field
   */
  initialInput?: string;

  /**
   * A set of input strings to evaluate right after shell is mounted
   */
  initialEvaluate?: string | string[];

  /* An array of entries to be displayed in the output area.
   *
   * Can be used to restore the output between sessions, or to setup
   * a greeting message.
   *
   * Note: new entries will not be appended to the array.
   */
  initialOutput: readonly ShellOutputEntry[];

  /* An array of history entries to prepopulate the history.
   *
   * Can be used to restore the history between sessions.
   *
   * Entries must be ordered from the most recent to the oldest.
   *
   * Note: new entries will not be appended to the array.
   */
  initialHistory: readonly string[];

  darkMode?: boolean;

  className?: string;
}

interface ShellState {
  operationInProgress: boolean;
  output: readonly ShellOutputEntry[];
  history: readonly string[];
  passwordPrompt: string;
  shellPrompt: string;
}

const noop = (): void => {
  /* */
};

const normalizeInitialEvaluate = (initialEvaluate: string | string[]) => {
  return (
    Array.isArray(initialEvaluate) ? initialEvaluate : [initialEvaluate]
  ).filter((line) => {
    // Filter out empty lines if passed by accident
    return !!line;
  });
};

const isInitialEvaluateEmpty = (
  initialEvaluate?: string | string[] | undefined
) => {
  return (
    !initialEvaluate || normalizeInitialEvaluate(initialEvaluate).length === 0
  );
};

/**
 * The browser-repl Shell component
 */
export class _Shell extends Component<ShellProps, ShellState> {
  static defaultProps = {
    onHistoryChanged: noop,
    onOperationStarted: noop,
    onOperationEnd: noop,
    onOutputChanged: noop,
    maxOutputLength: 1000,
    maxHistoryLength: 1000,
    initialInput: '',
    initialOutput: [],
    initialHistory: [],
  };

  private shellInputElement: HTMLElement | null = null;
  private editor?: EditorRef | null = null;
  private onFinishPasswordPrompt: (input: string) => void = noop;
  private onCancelPasswordPrompt: () => void = noop;

  readonly state: ShellState = {
    operationInProgress: !isInitialEvaluateEmpty(this.props.initialEvaluate),
    output: this.props.initialOutput.slice(-this.props.maxOutputLength),
    history: this.props.initialHistory.slice(0, this.props.maxHistoryLength),
    passwordPrompt: '',
    shellPrompt: '>',
  };

  componentDidMount(): void {
    // Store the intial prop value on mount so that we're not using potentially
    // updated one when actually running the lines
    let evalLines: string[] = [];
    if (this.props.initialEvaluate) {
      evalLines = normalizeInitialEvaluate(this.props.initialEvaluate);
    }
    this.scrollToBottom();
    void this.updateShellPrompt().then(async () => {
      for (const input of evalLines) {
        await this.onInput(input);
      }
    });
  }

  componentDidUpdate(): void {
    this.scrollToBottom();
  }

  private evaluate = async (code: string): Promise<ShellOutputEntry> => {
    let outputLine: ShellOutputEntry;

    try {
      this.props.onOperationStarted();

      this.props.runtime.setEvaluationListener(this);
      const result = await this.props.runtime.evaluate(code);
      outputLine = {
        format: 'output',
        type: result.type,
        value: result.printable,
      };
    } catch (error) {
      outputLine = {
        format: 'error',
        value: error,
      };
    } finally {
      await this.updateShellPrompt();
      this.props.onOperationEnd();
    }

    return outputLine;
  };

  private async updateShellPrompt(): Promise<void> {
    let shellPrompt = '>';
    let hasCustomPrompt = false;
    try {
      this.props.runtime.setEvaluationListener(this);
      const promptResult = await this.props.runtime.evaluate(`
      (() => {
        switch (typeof prompt) {
          case 'function':
            return prompt();
          case 'string':
            return prompt;
        }
      })()`);
      if (
        promptResult.type === null &&
        typeof promptResult.printable === 'string'
      ) {
        shellPrompt = promptResult.printable;
        hasCustomPrompt = true;
      }
    } catch {
      // Just ignore errors when getting the prompt...
    }
    if (!hasCustomPrompt) {
      try {
        shellPrompt = (await this.props.runtime.getShellPrompt()) ?? '>';
      } catch {
        // Just ignore errors when getting the prompt...
      }
    }
    this.setState({ shellPrompt });
  }

  private addEntryToHistory(code: string): readonly string[] {
    const history = [code, ...this.state.history];

    changeHistory(
      history,
      this.props.redactInfo ? 'redact-sensitive-data' : 'keep-sensitive-data'
    );
    history.splice(this.props.maxHistoryLength);

    Object.freeze(history);

    return history;
  }

  private addEntriesToOutput(
    entries: readonly ShellOutputEntry[]
  ): readonly ShellOutputEntry[] {
    const output = [...this.state.output, ...entries];

    output.splice(0, output.length - this.props.maxOutputLength);

    Object.freeze(output);

    return output;
  }

  onClearCommand = (): void => {
    const output: [] = [];

    Object.freeze(output);

    this.setState({ output });
    this.props.onOutputChanged(output);
  };

  onPrint = (result: { type: string | null; printable: any }[]): void => {
    const output = this.addEntriesToOutput(
      result.map((entry) => ({
        format: 'output',
        type: entry.type,
        value: entry.printable,
      }))
    );
    this.setState({ output });
    this.props.onOutputChanged(output);
  };

  onPrompt = (
    question: string,
    type: 'password' | 'yesno'
  ): Promise<string> => {
    if (type !== 'password') {
      return Promise.reject(new Error('yes/no prompts not implemented yet'));
    }
    const reset = () => {
      this.onFinishPasswordPrompt = noop;
      this.onCancelPasswordPrompt = noop;
      this.setState({ passwordPrompt: '' });
      setTimeout(this.focusEditor, 1);
    };

    const ret = new Promise<string>((resolve, reject) => {
      this.onFinishPasswordPrompt = (result: string) => {
        reset();
        resolve(result);
      };
      this.onCancelPasswordPrompt = () => {
        reset();
        reject(new Error('Canceled by user'));
      };
    });
    this.setState({ passwordPrompt: question });
    return ret;
  };

  private onInput = async (code: string): Promise<void> => {
    if (!code || code.trim() === '') {
      this.appendEmptyInput();
      return;
    }

    const inputLine: ShellOutputEntry = {
      format: 'input',
      value: code,
    };

    let output = this.addEntriesToOutput([inputLine]);
    this.setState({
      operationInProgress: true,
      output,
    });
    this.props.onOutputChanged(output);

    const outputLine = await this.evaluate(code);

    output = this.addEntriesToOutput([outputLine]);
    const history = this.addEntryToHistory(code);
    this.setState({
      operationInProgress: false,
      output,
      history,
    });
    this.props.onOutputChanged(output);
    this.props.onHistoryChanged(history);
  };

  private appendEmptyInput(): void {
    const inputLine: ShellOutputEntry = {
      format: 'input',
      value: ' ',
    };

    const output = this.addEntriesToOutput([inputLine]);

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
      this.focusEditor();
    }
  };

  private setEditor = (editor: any | null) => {
    this.editor = editor;
  };

  focusEditor = (): void => {
    this.editor?.focus();
  };

  private onSigInt = (): Promise<boolean> => {
    if (
      this.state.operationInProgress &&
      (this.props.runtime as WorkerRuntime).interrupt
    ) {
      return (this.props.runtime as WorkerRuntime).interrupt();
    }

    return Promise.resolve(false);
  };

  renderInput(): JSX.Element {
    if (this.state.passwordPrompt) {
      return (
        <PasswordPrompt
          onFinish={this.onFinishPasswordPrompt}
          onCancel={this.onCancelPasswordPrompt}
          prompt={this.state.passwordPrompt}
        />
      );
    }

    return (
      <ShellInput
        initialText={this.props.initialInput}
        onTextChange={this.props.onInputChanged}
        prompt={this.state.shellPrompt}
        autocompleter={this.props.runtime}
        history={this.state.history}
        onClearCommand={this.onClearCommand}
        onInput={this.onInput}
        operationInProgress={this.state.operationInProgress}
        editorRef={this.setEditor}
        onSigInt={this.onSigInt}
      />
    );
  }

  render(): JSX.Element {
    return (
      <div
        data-testid="shell"
        className={cx(
          shellContainer,
          this.props.darkMode
            ? shellContainerDarkModeStyles
            : shellContainerLightModeStyles,
          this.props.className
        )}
        onClick={this.onShellClicked}
      >
        <div>
          <ShellOutput output={this.state.output} />
        </div>
        <div
          ref={(el): void => {
            this.shellInputElement = el;
          }}
        >
          {this.renderInput()}
        </div>
      </div>
    );
  }
}

type DefaultProps = keyof (typeof _Shell)['defaultProps'];

export const Shell = React.forwardRef<
  _Shell,
  Omit<ShellProps, DefaultProps | 'darkMode'> &
    Partial<Pick<ShellProps, DefaultProps>>
>(function ShellWithDarkMode(props, ref) {
  const darkMode = useDarkMode();
  return <_Shell darkMode={darkMode} ref={ref} {...props}></_Shell>;
});
