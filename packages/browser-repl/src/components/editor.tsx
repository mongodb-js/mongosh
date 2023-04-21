import React, { Component } from 'react';
import { css } from '@mongodb-js/compass-components';
import { CodemirrorInlineEditor } from '@mongodb-js/compass-editor';
import { Autocompleter } from '@mongosh/browser-runtime-core';
import { AceAutocompleterAdapter } from './ace-autocompleter-adapter';

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
  moveCursorToTheEndOfInput: boolean;
  onEnter(): void | Promise<void>;
  onArrowUpOnFirstLine(): Promise<boolean>;
  onArrowDownOnLastLine(): Promise<boolean>;
  onChange(value: string): void | Promise<void>;
  onClearCommand(): void | Promise<void>;
  onSigInt(): Promise<boolean>;
  operationInProgress: boolean;
  value: string;
  editorRef?: (editor: any | null) => void;
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
    value: '',
    moveCursorToTheEndOfInput: false
  };

  private commands: any;

  private autocompleter: (context: any) => null | Promise<any | null>;

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
    this.commands = [
      {
        key: 'Enter',
        run: () => {
          void this.props.onEnter();
          return true;
        },
        preventDefault: true
      },
      {
        key: 'ArrowUp',
        run: (context) => {
          const selection = context.state.selection.main;
          const lineBlock = context.lineBlockAt(selection.from);
          const isFirstLine = lineBlock.from === 0;
          if (!isFirstLine) {
            return false;
          }
          void this.props.onArrowUpOnFirstLine().then((updated) => {
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
          const lineBlock = context.lineBlockAt(selection.from);
          const isLastLine = lineBlock.to === context.state.doc.length;
          if (!isLastLine) {
            return false;
          }
          void this.props.onArrowDownOnLastLine().then((updated) => {
            if (updated) {
              cursorDocEnd(context);
            }
          });
          return true;
        },
        preventDefault: true
      },
      {
        key: 'Ctrl-l',
        run: () => {
          this.props.onClearCommand();
          return true;
        },
        preventDefault: true
      },
      {
        key: 'Ctrl-c',
        run: () => {
          this.props.onSigInt();
          return true;
        },
        preventDefault: true
      }
    ];
  }

  render(): JSX.Element {
    return (
      <CodemirrorInlineEditor
        readOnly={!!this.props.operationInProgress}
        name={`mongosh-ace-${this.editorId}`}
        ref={this.props.editorRef}
        text={this.props.value}
        onChangeText={this.props.onChange}
        commands={this.commands}
        maxLines={Infinity}
        className={editorStyles}
        completer={this.autocompleter}
        lineHeight={24}
      ></CodemirrorInlineEditor>
    );
  }
}
