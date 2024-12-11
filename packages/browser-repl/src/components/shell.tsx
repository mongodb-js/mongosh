/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EditorRef } from '@mongodb-js/compass-editor';
import {
  css,
  palette,
  fontFamilies,
  useDarkMode,
  cx,
} from '@mongodb-js/compass-components';
import type {
  Runtime,
  RuntimeEvaluationListener,
  RuntimeEvaluationResult,
} from '@mongosh/browser-runtime-core';
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

  className?: string;

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

  /**
   * A function called each time the text in the shell input is changed
   */
  onInputChanged?: (input: string) => void;

  /* A function called each time the output changes with an array of
   * ShellOutputEntries.
   */
  onOutputChanged?: (output: ShellOutputEntry[]) => void;

  /* A function called each time the history changes
   * with an array of history entries ordered from the most recent to
   * the oldest entry.
   */
  onHistoryChanged?: (history: string[]) => void;

  /* A function called when an operation has begun.
   */
  onOperationStarted?: () => void;

  /* A function called when an operation has completed (both error and success).
   */
  onOperationEnd?: () => void;

  /**
   * A set of input strings to evaluate right after shell is mounted
   */
  initialEvaluate?: string | string[];

  /**
   * Initial value in the shell input field
   */
  inputText?: string;

  /* An array of entries to be displayed in the output area.
   *
   * Can be used to restore the output between sessions, or to setup
   * a greeting message.
   *
   * Note: new entries will not be appended to the array.
   */
  output?: ShellOutputEntry[];

  /* An array of history entries to prepopulate the history.
   *
   * Can be used to restore the history between sessions.
   *
   * Entries must be ordered from the most recent to the oldest.
   *
   * Note: new entries will not be appended to the array.
   */
  history?: string[];

  /**
   * Initial value of the isOperationInProgress field.
   *
   * Can be used to restore the value between sessions.
   */
  isOperationInProgress?: boolean;

  /**
   *
   * A function called when the editor ref changes.
   *
   * Use this to keep track of the editor ref in order to call methods on the
   * editor.
   */
  onEditorChanged?: (editor: EditorRef | null) => void;
}

const normalizeInitialEvaluate = (initialEvaluate: string | string[]) => {
  return (
    Array.isArray(initialEvaluate) ? initialEvaluate : [initialEvaluate]
  ).filter((line) => {
    // Filter out empty lines if passed by accident
    return !!line;
  });
};

const noop = (): void => {
  /* */
};

const capLengthEnd = (elements: unknown[], maxLength: number) => {
  elements.splice(0, elements.length - maxLength);
};

const capLengthStart = (elements: unknown[], maxLength: number) => {
  elements.splice(maxLength);
};

// eslint-disable-next-line react/display-name
export const Shell = ({
  runtime,
  className,
  redactInfo,
  maxOutputLength = 1000,
  maxHistoryLength = 1000,
  onInputChanged,
  onOutputChanged,
  onHistoryChanged,
  onOperationStarted,
  onOperationEnd,
  initialEvaluate,
  inputText,
  output,
  history,
  isOperationInProgress = false,
  onEditorChanged,
}: ShellProps) => {
  const darkMode = useDarkMode();

  const [editor, setEditor] = useState<EditorRef | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState('');
  const [shellPrompt, setShellPrompt] = useState('>');
  const [shellInputElement, setShellInputElement] =
    useState<HTMLElement | null>(null);
  const [onFinishPasswordPrompt, setOnFinishPasswordPrompt] = useState<
    () => (result: string) => void
  >(() => noop);
  const [onCancelPasswordPrompt, setOnCancelPasswordPrompt] = useState<
    () => () => void
  >(() => noop);

  const focusEditor = useCallback(() => {
    editor?.focus();
  }, [editor]);

  const editorChanged = useCallback(
    (editor: EditorRef | null) => {
      setEditor(editor);
      onEditorChanged?.(editor);
    },
    [onEditorChanged]
  );

  const listener = useMemo<RuntimeEvaluationListener>(() => {
    return {
      onPrint: (result: RuntimeEvaluationResult[]): void => {
        const newOutput = [
          ...(output ?? []),
          ...result.map(
            (entry): ShellOutputEntry => ({
              format: 'output',
              type: entry.type,
              value: entry.printable,
            })
          ),
        ];

        capLengthEnd(newOutput, maxOutputLength);
        onOutputChanged?.(newOutput);
      },
      onPrompt: async (
        question: string,
        type: 'password' | 'yesno'
      ): Promise<string> => {
        if (type !== 'password') {
          throw new Error('yes/no prompts not implemented yet');
        }

        const reset = () => {
          setOnFinishPasswordPrompt(() => noop);
          setOnCancelPasswordPrompt(() => noop);
          setPasswordPrompt('');
          setTimeout(focusEditor, 1);
        };

        const ret = new Promise<string>((resolve, reject) => {
          setOnFinishPasswordPrompt(() => (result: string) => {
            reset();
            resolve(result);
          });
          setOnCancelPasswordPrompt(() => () => {
            reset();
            reject(new Error('Canceled by user'));
          });
        });

        setPasswordPrompt(question);

        return ret;
      },
      onClearCommand: (): void => {
        onOutputChanged?.([]);
      },
    };
  }, [focusEditor, maxOutputLength, onOutputChanged, output]);

  const updateShellPrompt = useCallback(async (): Promise<void> => {
    let newShellPrompt = '>';
    let hasCustomPrompt = false;
    try {
      runtime.setEvaluationListener(listener);
      const promptResult = await runtime.evaluate(`
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
        newShellPrompt = promptResult.printable;
        hasCustomPrompt = true;
      }
    } catch {
      // Just ignore errors when getting the prompt...
    }
    if (!hasCustomPrompt) {
      try {
        newShellPrompt = (await runtime.getShellPrompt()) ?? '>';
      } catch {
        // Just ignore errors when getting the prompt...
      }
    }
    setShellPrompt(newShellPrompt);
  }, [listener, runtime]);

  const evaluate = useCallback(
    async (code: string): Promise<ShellOutputEntry> => {
      let outputLine: ShellOutputEntry;

      try {
        onOperationStarted?.();

        runtime.setEvaluationListener(listener);
        const result = await runtime.evaluate(code);
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
        await updateShellPrompt();
        onOperationEnd?.();
      }

      return outputLine;
    },
    [listener, onOperationEnd, onOperationStarted, runtime, updateShellPrompt]
  );

  const onInput = useCallback(
    async (code: string) => {
      const newOutput = [...(output ?? [])];
      const newHistory = [...(history ?? [])];

      // don't evaluate empty input, but do add it to the output
      if (!code || code.trim() === '') {
        newOutput.push({
          format: 'input',
          value: ' ',
        });
        capLengthEnd(newOutput, maxOutputLength);
        onOutputChanged?.(newOutput);
        return;
      }

      // add input to output
      newOutput.push({
        format: 'input',
        value: code,
      });
      capLengthEnd(newOutput, maxOutputLength);
      onOutputChanged?.(newOutput);

      const outputLine = await evaluate(code);

      // add output to output
      newOutput.push(outputLine);
      capLengthEnd(newOutput, maxOutputLength);
      onOutputChanged?.(newOutput);

      // update history
      newHistory.unshift(code);
      changeHistory(
        newHistory,
        redactInfo ? 'redact-sensitive-data' : 'keep-sensitive-data'
      );
      capLengthStart(newHistory, maxHistoryLength);
      onHistoryChanged?.(newHistory);
    },
    [
      output,
      history,
      onOutputChanged,
      evaluate,
      redactInfo,
      maxHistoryLength,
      onHistoryChanged,
      maxOutputLength,
    ]
  );

  const scrollToBottom = useCallback(() => {
    if (!shellInputElement) {
      return;
    }

    shellInputElement.scrollIntoView();
  }, [shellInputElement]);

  useEffect(() => {
    scrollToBottom();

    void updateShellPrompt().then(async () => {
      if (initialEvaluate) {
        const evalLines = normalizeInitialEvaluate(initialEvaluate);
        for (const input of evalLines) {
          await onInput(input);
        }
      }
    });
  }, [initialEvaluate, onInput, scrollToBottom, updateShellPrompt, output]);

  const onShellClicked = useCallback(
    (event: React.MouseEvent): void => {
      // Focus on input when clicking the shell background (not clicking output).
      if (event.currentTarget === event.target) {
        focusEditor();
      }
    },
    [focusEditor]
  );

  const onSigInt = useCallback((): Promise<boolean> => {
    if (isOperationInProgress && (runtime as WorkerRuntime).interrupt) {
      return (runtime as WorkerRuntime).interrupt();
    }

    return Promise.resolve(false);
  }, [isOperationInProgress, runtime]);

  return (
    <div
      data-testid="shell"
      className={cx(
        shellContainer,
        darkMode ? shellContainerDarkModeStyles : shellContainerLightModeStyles,
        className
      )}
      onClick={onShellClicked}
    >
      <div>
        <ShellOutput output={output ?? []} />
      </div>
      <div
        ref={(el): void => {
          setShellInputElement(el);
        }}
      >
        {passwordPrompt ? (
          <PasswordPrompt
            onFinish={onFinishPasswordPrompt}
            onCancel={onCancelPasswordPrompt}
            prompt={passwordPrompt}
          />
        ) : (
          <ShellInput
            initialText={inputText}
            onTextChange={onInputChanged}
            prompt={shellPrompt}
            autocompleter={runtime}
            history={history}
            onClearCommand={listener.onClearCommand}
            onInput={onInput}
            operationInProgress={isOperationInProgress}
            editorRef={editorChanged}
            onSigInt={onSigInt}
          />
        )}
      </div>
    </div>
  );
};
