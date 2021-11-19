import { uiColors } from '@leafygreen-ui/palette';

const foregroundColor = uiColors.gray.light3;
const backgroundColor = uiColors.gray.dark3;
const borderColor = uiColors.gray.dark1;
const activeLineColor = uiColors.gray.dark2;
const selectionColor = uiColors.gray.dark1;

const cursorColor = uiColors.green.base;

const keywordsColor = '#FF7DC3';
const stringsColor = '#35DE7B';
const literalsColor = '#2DC4FF';
const supportColor = '#a5e3ff';
const classesColor = '#EDB210';
const commentsColor = uiColors.gray.light1;
const variablesColor = '#FF6F44';

const layoutCss = `
  .ace_dark.ace-mongosh.ace_editor {
    font-family: Menlo, Monaco, 'Courier New', monospace;
    font-size: 13px;
    line-height: 24px;
    margin-left: -4px;
    background: transparent;
    color: ${foregroundColor};
  }
  .ace_dark.ace-mongosh .ace_cursor {
    background: transparent;
    color: ${cursorColor};
    border-color: ${cursorColor};
  }
  .ace_dark.ace-mongosh .ace_hidden-cursors .ace_cursor {
    opacity: 0;
    visibility: hidden;
  }
  .ace_dark.ace-mongosh.ace_focus .ace_marker-layer .ace_active-line {
    background: transparent;
  }
  .ace_dark.ace-mongosh .ace_marker-layer .ace_active-line {
    background: transparent;
  }
  .ace_dark.ace-mongosh .ace_marker-layer .ace_selection {
    background: ${selectionColor};
  }
`;

const syntaxCss = `
  .ace_dark.ace-mongosh .ace_keyword {
    color: ${keywordsColor};
    font-weight: normal;
  }
  .ace_dark.ace-mongosh .ace_identifier {
    color: ${foregroundColor}
  }
  .ace_dark.ace-mongosh .ace_string {
    color: ${stringsColor};
  }
  .ace_dark.ace-mongosh .ace_boolean {
    color: ${literalsColor};
    font-weight: normal;
  }
  .ace_dark.ace-mongosh .ace_constant.ace_numeric {
    color: ${variablesColor};
  }
  .ace_dark.ace-mongosh .ace_string.ace_regexp {
    color: ${supportColor};
  }
  .ace_dark.ace-mongosh .ace_variable.ace_class {
    color: ${classesColor};
  }
  .ace_dark.ace-mongosh .ace_constant.ace_buildin {
    color: ${literalsColor};
  }
  .ace_dark.ace-mongosh .ace_support.ace_function {
    color: ${literalsColor};
  }
  .ace_dark.ace-mongosh .ace_comment {
    color: ${commentsColor};
    font-style: italic;
  }
  .ace_dark.ace-mongosh .ace_variable  {
    color: ${variablesColor};
  }
  .ace_dark.ace-mongosh .ace_variable.ace_instance {
    color: ${variablesColor};
  }
  .ace_dark.ace-mongosh .ace_paren {
    font-weight: normal;
  }
`;

const autocompleteCss = `
  .ace_dark.ace-mongosh.ace_editor.ace_autocomplete {
    box-sizing: border-box;
    border: 1px solid ${borderColor};
    background-color: ${backgroundColor};
    box-shadow: 0 5px 8px 0 rgba(0,0,0,0.5);
    color: ${commentsColor};
    line-height: 24px;
  }

  .ace_dark.ace-mongosh.ace_editor.ace_autocomplete .ace_completion-highlight {
    color: ${foregroundColor};
    text-shadow: none;
    font-weight: bold;
  }

  .ace_dark.ace-mongosh.ace_editor.ace_autocomplete .ace_marker-layer .ace_active-line {
    background-color: ${activeLineColor};
  }
`;

function mongoshAceTheme(acequire, exports, module) {
  exports.isDark = true;
  exports.cssClass = 'ace-mongosh';
  exports.cssText = [
    layoutCss,
    syntaxCss,
    autocompleteCss
  ].join('\n');

  const dom = acequire('../lib/dom');
  dom.importCssString(exports.cssText, exports.cssClass);
}

// eslint-disable-next-line no-undef
ace.define(
  'ace/theme/mongosh',
  ['require', 'exports', 'module', 'ace/lib/dom'],
  mongoshAceTheme
);
