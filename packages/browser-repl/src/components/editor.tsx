import React, { Component } from 'react';
import { css } from '@mongodb-js/compass-components';
import { CodemirrorInlineEditor } from '@mongodb-js/compass-editor';
import type { EditorRef, Command } from '@mongodb-js/compass-editor';
import { Autocompleter } from '@mongosh/browser-runtime-core';

// TODO: update compass editor and use exported type
type Completer = React.ComponentProps<
  typeof CodemirrorInlineEditor
>['completer'];

const noop = (): void => {};

export const editorStyles = css({
  '& .cm-content': {
    paddingTop: 0,
    paddingBottom: 0
  },
  '& .cm-line': {
    paddingLeft: 1,
    paddingRight: 1
  }
});

function cursorDocEnd({ state, dispatch }: any) {
  dispatch(
    state.update({
      selection: { anchor: state.doc.length },
      scrollIntoView: true,
      userEvent: 'select'
    })
  );
  return true;
}

interface EditorProps {
  autocompleter?: Autocompleter;
  onEnter(): void | Promise<void>;
  onArrowUpOnFirstLine(): Promise<boolean>;
  onArrowDownOnLastLine(): Promise<boolean>;
  onChange(value: string): void | Promise<void>;
  onClearCommand(): void | Promise<void>;
  onSigInt(): Promise<boolean>;
  operationInProgress: boolean;
  value: string;
  editorRef?: (editor: EditorRef | null) => void;
}

export function createCommands(
  callbacks: Pick<
    EditorProps,
    | 'onEnter'
    | 'onArrowDownOnLastLine'
    | 'onArrowUpOnFirstLine'
    | 'onClearCommand'
    | 'onSigInt'
  >
): Command[] {
  return [
    {
      key: 'Enter',
      run: () => {
        void callbacks.onEnter();
        return true;
      },
      preventDefault: true
    },
    {
      key: 'ArrowUp',
      run: (context) => {
        const selection = context.state.selection.main;
        if (!selection.empty) {
          return false;
        }
        const lineBlock = context.lineBlockAt(selection.from);
        const isFirstLine = lineBlock.from === 0;
        if (!isFirstLine) {
          return false;
        }
        void callbacks.onArrowUpOnFirstLine().then((updated) => {
          if (updated) {
            cursorDocEnd(context);
          }
        });
        return true;
      },
      preventDefault: true
    },
    {
      key: 'ArrowDown',
      run: (context) => {
        const selection = context.state.selection.main;
        if (!selection.empty) {
          return false;
        }
        const lineBlock = context.lineBlockAt(selection.from);
        const isLastLine = lineBlock.to === context.state.doc.length;
        if (!isLastLine) {
          return false;
        }
        void callbacks.onArrowDownOnLastLine().then((updated) => {
          if (updated) {
            cursorDocEnd(context);
          }
        });
        return true;
      },
      preventDefault: true
    },
    {
      key: 'Mod-l',
      run: () => {
        void callbacks.onClearCommand();
        return true;
      },
      preventDefault: true
    },
    {
      key: 'Ctrl-c',
      run: () => {
        void callbacks.onSigInt();
        return true;
      },
      preventDefault: true
    }
  ];
}

export class Editor extends Component<EditorProps> {
  static defaultProps = {
    onEnter: noop,
    onArrowUpOnFirstLine: () => Promise.resolve(false),
    onArrowDownOnLastLine: () => Promise.resolve(false),
    onChange: noop,
    onClearCommand: noop,
    onSigInt: noop,
    operationInProgress: false,
    value: ''
  };

  private commands: Command[];

  private autocompleter: Completer;

  private editorId: number = Date.now();

  constructor(props: EditorProps) {
    super(props);
    this.autocompleter = (context) => {
      if (!this.props.autocompleter?.getCompletions) {
        return null;
      }

      const line = context.state.doc.lineAt(context.pos);

      return this.props.autocompleter.getCompletions(line.text).then(
        (completions) => {
          if (completions && completions.length > 0) {
            return {
              from: line.from,
              options: completions.map(({ completion }) => {
                return { label: completion };
              })
            };
          }
          return null;
        },
        () => null
      );
    };
    this.commands = createCommands(this.props);
  }

  render(): JSX.Element {
    return (
      <CodemirrorInlineEditor
        id={`mongosh-ace-${this.editorId}`}
        // As opposed to default javascript-expression
        language="javascript"
        ref={this.props.editorRef}
        readOnly={this.props.operationInProgress}
        text={this.props.value}
        onChangeText={this.props.onChange}
        commands={this.commands}
        // @ts-expect-error TODO: this works but types don't allow it, waiting
        // for update in compass-editor
        maxLines={Infinity}
        className={editorStyles}
        completer={this.autocompleter}
        lineHeight={24}
      />
    );
  }
}
