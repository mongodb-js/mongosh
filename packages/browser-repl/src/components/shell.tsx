import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ForwardRefRenderFunction } from 'react';
import type { EditorRef } from '@mongodb-js/compass-editor';
import {
  css,
  palette,
  fontFamilies,
  useDarkMode,
  cx,
  rafraf,
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
  initialText?: string;

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

const normalizeInitialEvaluate = (initialEvaluate?: string | string[]) => {
  if (!initialEvaluate) {
    return [];
  }

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

const _Shell: ForwardRefRenderFunction<EditorRef | null, ShellProps> = (
  {
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
    initialText,
    output,
    history,
    isOperationInProgress = false,
  },
  ref
) => {
  const darkMode = useDarkMode();

  const editorRef = useRef<EditorRef | null>(null);
  const shellInputContainerRef = useRef<HTMLDivElement>(null);
  const initialEvaluateRef = useRef(initialEvaluate);
  const outputRef = useRef(output);
  const historyRef = useRef(history);
  const virtualListScrollRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(
    ref,
    () => {
      return {
        foldAll() {
          return editorRef.current?.foldAll() ?? false;
        },
        unfoldAll() {
          return editorRef.current?.unfoldAll() ?? false;
        },
        copyAll() {
          return editorRef.current?.copyAll() ?? false;
        },
        prettify() {
          return editorRef.current?.prettify() ?? false;
        },
        focus() {
          return editorRef.current?.focus() ?? false;
        },
        applySnippet(template: string) {
          return editorRef.current?.applySnippet(template) ?? false;
        },
        get editor() {
          return editorRef.current?.editor ?? null;
        },
      };
    },
    []
  );

  const [passwordPrompt, setPasswordPrompt] = useState('');
  const [passwordPromptValue, setPasswordPromptValue] = useState('');
  const [shellPrompt, setShellPrompt] = useState('>');
  const [onFinishPasswordPrompt, setOnFinishPasswordPrompt] = useState<
    () => (result: string) => void
  >(() => noop);
  const [onCancelPasswordPrompt, setOnCancelPasswordPrompt] = useState<
    () => () => void
  >(() => noop);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const focusInputPrompt = useCallback(() => {
    if (passwordPrompt) {
      passwordInputRef.current?.focus();
    } else {
      editorRef.current?.focus();
    }
  }, [editorRef, passwordInputRef, passwordPrompt]);

  const listener = useMemo<RuntimeEvaluationListener>(() => {
    return {
      onPrint: (result: RuntimeEvaluationResult[]): void => {
        const newOutput = [
          ...(outputRef.current ?? []),
          ...result.map(
            (entry): ShellOutputEntry => ({
              format: 'output',
              type: entry.type,
              value: entry.printable,
            })
          ),
        ];

        capLengthEnd(newOutput, maxOutputLength);
        outputRef.current = newOutput;
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
          setPasswordPromptValue('');
          setTimeout(focusInputPrompt, 1);
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
        outputRef.current = [];
        onOutputChanged?.([]);
      },
    };
  }, [focusInputPrompt, maxOutputLength, onOutputChanged]);

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
      const newOutputBeforeEval = [...(outputRef.current ?? [])];

      // don't evaluate empty input, but do add it to the output
      if (!code || code.trim() === '') {
        newOutputBeforeEval.push({
          format: 'input',
          value: ' ',
        });
        capLengthEnd(newOutputBeforeEval, maxOutputLength);
        outputRef.current = newOutputBeforeEval;
        onOutputChanged?.(newOutputBeforeEval);
        return;
      }

      // add input to output
      newOutputBeforeEval.push({
        format: 'input',
        value: code,
      });
      capLengthEnd(newOutputBeforeEval, maxOutputLength);
      outputRef.current = newOutputBeforeEval;
      onOutputChanged?.(newOutputBeforeEval);

      const outputLine = await evaluate(code);

      // outputRef.current could have changed if evaluate() used onPrint
      const newOutputAfterEval = [...(outputRef.current ?? [])];

      // add output to output
      newOutputAfterEval.push(outputLine);
      capLengthEnd(newOutputAfterEval, maxOutputLength);
      outputRef.current = newOutputAfterEval;
      onOutputChanged?.(newOutputAfterEval);

      // update history
      const newHistory = [...(historyRef.current ?? [])];
      newHistory.unshift(code);
      capLengthStart(newHistory, maxHistoryLength);
      changeHistory(
        newHistory,
        redactInfo ? 'redact-sensitive-data' : 'keep-sensitive-data'
      );
      historyRef.current = newHistory;
      onHistoryChanged?.(newHistory);
    },
    [
      onOutputChanged,
      evaluate,
      redactInfo,
      maxHistoryLength,
      onHistoryChanged,
      maxOutputLength,
    ]
  );

  const setEditorRef = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!shellInputContainerRef.current) {
      return;
    }

    shellInputContainerRef.current.scrollIntoView();
    focusInputPrompt();
  }, [shellInputContainerRef, focusInputPrompt]);

  const onShellClicked = useCallback(
    (event: React.MouseEvent): void => {
      const path = event.nativeEvent.composedPath();
      const isEditorClicked = path.some(
        (el) => el === shellInputContainerRef.current
      );
      if (isEditorClicked) {
        return focusInputPrompt();
      }

      // If a click originates from the virtualListScrollRef children (except for the last one),
      // that means we have to ignore it. Or else, we set isClickedOutside to true.
      const listItems: Array<Node> = [];
      virtualListScrollRef.current?.firstChild?.childNodes.forEach((child) => {
        listItems.push(child);
      });
      // Remove the last item where we render the input prompt.
      listItems.pop();
      const isClickedOutside = !path.some((el) =>
        listItems.includes(el as Node)
      );
      if (isClickedOutside) {
        focusInputPrompt();
      }
    },
    [focusInputPrompt]
  );

  const onSigInt = useCallback((): Promise<boolean> => {
    if (isOperationInProgress && (runtime as WorkerRuntime).interrupt) {
      return (runtime as WorkerRuntime).interrupt();
    }

    return Promise.resolve(false);
  }, [isOperationInProgress, runtime]);

  useEffect(() => {
    const evalLines = normalizeInitialEvaluate(initialEvaluateRef.current);
    if (evalLines.length) {
      void (async () => {
        for (const input of evalLines) {
          await onInput(input);
        }
      })();
    } else {
      void updateShellPrompt();
    }
  }, [onInput, updateShellPrompt]);

  useEffect(() => {
    rafraf(() => {
      // Scroll to the bottom every time we render so the input/output will be
      // in view.
      scrollToBottom();
    });
  });

  const setScrollRef = useCallback((ref: HTMLDivElement) => {
    virtualListScrollRef.current = ref;
  }, []);

  // Password prompt being part of VirtualList, we need to focus it manually
  // or else if auto-focussed, it will not let user scroll up and will always
  // scroll to the bottom, where its visible.
  // As the password prompt is visible, we will focus it automatically.
  useEffect(() => {
    if (passwordPrompt && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [passwordPrompt]);

  // Focus the password input when it becomes visible
  useEffect(() => {
    if (!shellInputContainerRef.current) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (
        entry.target === shellInputContainerRef.current &&
        entry.isIntersecting
      ) {
        passwordInputRef.current?.focus();
      }
    });
    observer.observe(shellInputContainerRef.current);
    return () => observer.disconnect();
  }, [shellInputContainerRef]);

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  /* eslint-disable jsx-a11y/click-events-have-key-events */
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
      <ShellOutput
        setScrollRef={setScrollRef}
        output={output ?? []}
        renderInputPrompt={() => (
          <div ref={shellInputContainerRef}>
            {passwordPrompt ? (
              <PasswordPrompt
                prompt={passwordPrompt}
                password={passwordPromptValue}
                onCancel={onCancelPasswordPrompt}
                onFinish={onFinishPasswordPrompt}
                onChange={setPasswordPromptValue}
                ref={passwordInputRef}
              />
            ) : (
              <ShellInput
                initialText={initialText}
                onTextChange={onInputChanged}
                prompt={shellPrompt}
                autocompleter={runtime}
                history={history}
                onClearCommand={listener.onClearCommand}
                onInput={onInput}
                operationInProgress={isOperationInProgress}
                editorRef={setEditorRef}
                onSigInt={onSigInt}
              />
            )}
          </div>
        )}
      />
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
  /* eslint-enable jsx-a11y/click-events-have-key-events */
};

export const Shell = React.forwardRef(_Shell);
