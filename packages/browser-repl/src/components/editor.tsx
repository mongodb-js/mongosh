import React, { Component } from 'react';
import 'ace-builds';
import tools from 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-javascript';
import type { IAceEditor } from 'react-ace/lib/types';
import AceEditor from 'react-ace';
import { Autocompleter } from '@mongosh/browser-runtime-core';
import { AceAutocompleterAdapter } from './ace-autocompleter-adapter';
import './ace-theme';

const noop = (): void => {};

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
  setInputRef?(ref: { editor?: IAceEditor }): void;
  value: string;
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

  private onEditorLoad = (editor: any): void => {
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

  private onFocus = () => {
    if (this.autocompleter) {
      tools.setCompleters([this.autocompleter]);
    } else {
      tools.setCompleters([]);
    }
  };

  componentDidUpdate(prevProps: EditorProps): void {
    if (prevProps.operationInProgress !== this.props.operationInProgress) {
      if (this.props.operationInProgress) {
        this.hideCursor();
      } else {
        this.showCursor();
      }
    }

    if (prevProps.moveCursorToTheEndOfInput !== this.props.moveCursorToTheEndOfInput) {
      if (this.props.moveCursorToTheEndOfInput) {
        this.moveCursorToTheEndOfInput();
      }
    }

    if (prevProps.autocompleter !== this.props.autocompleter) {
      if (this.props.autocompleter) {
        this.autocompleter = new AceAutocompleterAdapter(
          this.props.autocompleter
        );
        tools.setCompleters([this.autocompleter]);
      } else {
        this.autocompleter = null;
        tools.setCompleters([]);
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

  private moveCursorToTheEndOfInput(): void {
    const row = this.editor.session.getLength() - 1;
    const column = this.editor.session.getLine(row).length;
    this.editor.gotoLine(row + 1, column);
  }

  render(): JSX.Element {
    return (<AceEditor
      showPrintMargin={false}
      showGutter={false}
      highlightActiveLine
      setOptions={{
        readOnly: !!this.props.operationInProgress,
        enableBasicAutocompletion: !!this.props.autocompleter,
        enableLiveAutocompletion: !!this.props.autocompleter,
        enableSnippets: false,
        showLineNumbers: false,
        tabSize: 2,
        useWorker: false
      }}
      name={`mongosh-ace-${this.editorId}`}
      mode="javascript"
      ref={(ref: AceEditor | null): void => {
        if (this.props.setInputRef && ref !== null) {
          this.props.setInputRef(ref as { editor?: IAceEditor });
        }
      }}
      theme="mongosh"
      onLoad={this.onEditorLoad}
      onFocus={this.onFocus}
      onChange={this.props.onChange}
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
      width="100%"
      maxLines={Infinity}
      editorProps={{
        $blockScrolling: Infinity
      }}
      value={this.props.value}
    />);
  }
}
