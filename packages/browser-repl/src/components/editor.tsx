import React, { Component } from 'react';
import { css } from '@mongodb-js/compass-components';
import { InlineEditor, AceEditor as IAceEditor } from '@mongodb-js/compass-editor';
import { Autocompleter } from '@mongosh/browser-runtime-core';
import { AceAutocompleterAdapter } from './ace-autocompleter-adapter';

const noop = (): void => {};

const editor = css({
  lineHeight: '24px !important',
  marginLeft: '-4px',
});

interface EditorProps {
  autocompleter?: Autocompleter;
  moveCursorToTheEndOfInput: boolean;
  onEnter(): void | Promise<void>;
  onArrowUpOnFirstLine(): void | Promise<void>;
  onArrowDownOnLastLine(): void | Promise<void>;
  onChange(value: string): void | Promise<void>;
  onClearCommand(): void | Promise<void>;
  onSigInt(): Promise<boolean>;
  operationInProgress: boolean;
  value: string;
  onEditorLoad?: (editor: IAceEditor) => void;
}

export class Editor extends Component<EditorProps> {
  static defaultProps = {
    onEnter: noop,
    onArrowUpOnFirstLine: noop,
    onArrowDownOnLastLine: noop,
    onChange: noop,
    onClearCommand: noop,
    onSigInt: noop,
    operationInProgress: false,
    value: '',
    moveCursorToTheEndOfInput: false
  };

  private editor: any;
  private visibleCursorDisplayStyle = '';

  private onEditorLoad = (editor: IAceEditor): void => {
    this.editor = editor;
    this.visibleCursorDisplayStyle = this.editor.renderer.$cursorLayer.element.style.display;

    editor.commands.on('afterExec', (e: any) => {
      if (
        // Only suggest autocomplete if autocompleter was set
        this.autocompleter &&
        e.command.name === 'insertstring' &&
        /^[\w.]$/.test(e.args)
      ) {
        this.editor.execCommand('startAutocomplete');
      }
    });

    // eslint-disable-next-line chai-friendly/no-unused-expressions
    this.props.onEditorLoad?.(editor);
  };

  private autocompleter: AceAutocompleterAdapter | null = null;

  private editorId: number = Date.now();

  constructor(props: EditorProps) {
    super(props);
    if (this.props.autocompleter) {
      this.autocompleter = new AceAutocompleterAdapter(
        this.props.autocompleter
      );
    }
  }

  componentDidUpdate(prevProps: EditorProps): void {
    if (prevProps.operationInProgress !== this.props.operationInProgress) {
      if (this.props.operationInProgress) {
        this.hideCursor();
      } else {
        this.showCursor();
      }
    }
  }

  componentWillUnmount(): void {
    this.autocompleter = null;
  }

  private hideCursor(): void {
    this.editor.renderer.$cursorLayer.element.style.display = 'none';
  }

  private showCursor(): void {
    this.editor.renderer.$cursorLayer.element.style.display = this.visibleCursorDisplayStyle;
  }

  render(): JSX.Element {
    return (<InlineEditor
      options={{
        readOnly: !!this.props.operationInProgress
      }}
      className={editor}
      name={`mongosh-ace-${this.editorId}`}
      onLoad={this.onEditorLoad}
      text={this.props.value}
      onChangeText={this.props.onChange}
      completer={this.autocompleter}
      commands={[
        {
          name: 'return',
          bindKey: { win: 'Return', mac: 'Return' },
          exec: (): void => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.props.onEnter();
          }
        },
        {
          name: 'arrowUpOnFirstLine',
          bindKey: { win: 'Up', mac: 'Up' },
          exec: (): void => {
            const selectionRange = this.editor.getSelectionRange();
            if (!selectionRange.isEmpty() || selectionRange.start.row !== 0) {
              return this.editor.selection.moveCursorUp();
            }

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.props.onArrowUpOnFirstLine();
          }
        },
        {
          name: 'arrowDownOnLastLine',
          bindKey: { win: 'Down', mac: 'Down' },
          exec: (): void => {
            const selectionRange = this.editor.getSelectionRange();
            const lastRowIndex = this.editor.session.getLength() - 1;

            if (!selectionRange.isEmpty() || selectionRange.start.row !== lastRowIndex) {
              return this.editor.selection.moveCursorDown();
            }

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.props.onArrowDownOnLastLine();
          }
        },
        {
          name: 'clearShell',
          bindKey: { win: 'Ctrl-L', mac: 'Command-L' },
          exec: this.props.onClearCommand
        },
        {
          name: 'SIGINT',
          bindKey: { win: 'Ctrl-C', mac: 'Ctrl-C' },
          exec: this.props.onSigInt,
          // Types don't have it but it exists
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          readOnly: true,
        }
      ]}
      maxLines={Infinity}
      editorProps={{
        $blockScrolling: Infinity
      }}
    />);
  }
}
