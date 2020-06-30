import React, { Component } from 'react';
import AceEditor from 'react-ace';
import { Autocompleter } from '@mongosh/browser-runtime-core';
import { AceAutocompleterAdapter } from './ace-autocompleter-adapter';

import 'brace/ext/language_tools';
import 'brace/mode/javascript';
import './ace-theme';

import ace from 'brace';
const tools = ace.acequire('ace/ext/language_tools');

const noop = (): void => {};

interface EditorProps {
  onEnter?(): void | Promise<void>;
  onArrowUpOnFirstLine?(): void | Promise<void>;
  onArrowDownOnLastLine?(): void | Promise<void>;
  onChange?(value: string): void | Promise<void>;
  onClearCommand?(): void | Promise<void>;
  autocompleter?: Autocompleter;
  setInputRef?(ref): void;
  value?: string;
}

export class Editor extends Component<EditorProps> {
  static defaultProps = {
    onEnter: noop,
    onArrowUpOnFirstLine: noop,
    onArrowDownOnLastLine: noop,
    onChange: noop,
    onClearCommand: noop,
    value: ''
  };

  private editor: any;

  private onEditorLoad = (editor: any): void => {
    this.editor = editor;

    if (this.props.autocompleter) {
      editor.commands.on('afterExec', function(e) {
        if (e.command.name === 'insertstring' && /^[\w.]$/.test(e.args)) {
          editor.execCommand('startAutocomplete');
        }
      });

      tools.setCompleters([new AceAutocompleterAdapter(this.props.autocompleter)]);
    }
  };

  render(): JSX.Element {
    const { onClearCommand } = this.props;

    return (<AceEditor
      showPrintMargin={false}
      showGutter={false}
      highlightActiveLine
      setOptions={{
        enableBasicAutocompletion: !!this.props.autocompleter,
        enableLiveAutocompletion: !!this.props.autocompleter,
        enableSnippets: false,
        showLineNumbers: false,
        tabSize: 2
      }}
      name={`mongosh-ace-${Date.now()}`}
      mode="javascript"
      ref={(ref: any): void => {
        if (this.props.setInputRef) {
          this.props.setInputRef(ref);
        }
      }}
      theme="mongosh"
      onChange={this.props.onChange}
      onLoad={this.onEditorLoad}
      commands={[
        {
          name: 'return',
          bindKey: { win: 'Return', mac: 'Return' },
          exec: (): void => {
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

            this.props.onArrowDownOnLastLine();
          }
        },
        {
          name: 'clearShell',
          bindKey: { win: 'Ctrl-L', mac: 'Command-L' },
          exec: onClearCommand
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
