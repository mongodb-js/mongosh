import {uiColors} from '@leafygreen-ui/palette';

// eslint-disable-next-line no-undef
ace.define(
  'ace/theme/mongosh',
  ['require', 'exports', 'module', 'ace/lib/dom'], function(acequire, exports, module) {
    const palette = {
      background: uiColors.gray.dark3, // Background
      borders: uiColors.black, // Borders / non-text graphical accents
      comments: uiColors.gray.light1, // Comments, Doctags, Formulas
      defaultText: uiColors.gray.light3, // Default Text
      highlights: uiColors.gray.dark2, // Highlights
      variables: '#FF6F44', // Variables, XML Tags, Markup Link Text, Markup Lists, Diff Deleted
      classes: '#EDB210', // Classes, Markup Bold, Search Text Background
      strings: '#35DE7B', // Strings, Inherited Class, Markup Code, Diff Inserted
      support: '#a5e3ff', // Support, Regular Expressions, Escape Characters, Markup Quotes
      literals: '#2DC4FF', // Functions, Methods, Classes, Names, Sections, Literals
      keywords: '#FF7DC3', // Keywords, Storage, Selector, Markup Italic, Diff Changed
    };

    const syntax = `
    .ace-mongosh .ace_keyword {
      color: ${palette.keywords};
      font-weight: normal;
    }
    .ace-mongosh .ace_identifier {
      color: ${palette.defaultText}
    }
    .ace-mongosh .ace_string {
      color: ${palette.strings};
    }
    .ace-mongosh .ace_boolean {
      color: ${palette.literals};
      font-weight: normal;
    }
    .ace-mongosh .ace_constant.ace_numeric {
      color: ${palette.variables};
    }
    .ace-mongosh .ace_string.ace_regexp {
      color: ${palette.support};
    }
    .ace-mongosh .ace_variable.ace_class {
      color: ${palette.classes};
    }
    .ace-mongosh .ace_constant.ace_buildin {
      color: ${palette.literals};
    }
    .ace-mongosh .ace_support.ace_function {
      color: ${palette.literals};
    }
    .ace-mongosh .ace_comment {
      color: ${palette.comments};
      font-style: italic;
    }
    .ace-mongosh .ace_variable  {
      color: ${palette.variables};
    }
    .ace-mongosh .ace_paren {
      font-weight: normal;
    }
    .ace-mongosh .ace_variable.ace_instance {
      color: ${palette.variables};
    }
  `;

    exports.isDark = true;
    exports.cssClass = 'ace-mongosh';
    exports.cssText = `
  .ace-mongosh.ace_editor {
    font: inherit;
    font-size: inherit;
    font-family: inherit;
    margin-left: -4px;
    background: transparent;
    color: ${uiColors.white};
  }
  .ace-mongosh .ace_cursor {
    background: transparent;
    color: ${uiColors.green.base};
    border-color: ${uiColors.green.base};
  }
  .ace-mongosh.ace_focus .ace_marker-layer .ace_active-line {
    background: transparent;
  }
  .ace-mongosh .ace_marker-layer .ace_active-line {
    background: transparent;
  }
  .ace-mongosh .ace_marker-layer .ace_selection {
    background: transparent;
  }
  ${syntax}`;

    const dom = acequire('../lib/dom');
    dom.importCssString(exports.cssText, exports.cssClass);
  });
