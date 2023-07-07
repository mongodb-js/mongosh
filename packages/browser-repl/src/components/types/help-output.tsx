import React, { Component } from 'react';
import { css } from '@mongodb-js/compass-components';
import PropTypes from 'prop-types';
import i18n from '@mongosh/i18n';

const helpOutput = css({
  '& table, & caption, & tbody, & tfoot, & thead, & tr, & th, & td': {
    margin: 0,
    padding: 0,
    border: 0,
    outline: 0,
    fontSize: '100%',
    verticalAlign: 'baseline',
    background: 'transparent',
  },
  '& table': {
    width: '100%',
    tableLayout: 'fixed',
    overflowWrap: 'break-word',
    textAlign: 'left',
    margin: '1em 0',
    '& th': {
      width: '25%',
      fontWeight: 'bold',
    },
    '& th, & td': {
      textAlign: 'left',
    },
  },
});

type HelpApiObject = {
  help: string;
  docs: string;
  attr: HelpApiObjectAttr[];
};

type HelpApiObjectAttr = {
  name: string;
  description: string;
};

interface HelpOutputProps {
  value: HelpApiObject;
}

export class HelpOutput extends Component<HelpOutputProps> {
  static propTypes = {
    value: PropTypes.object.isRequired,
  };

  renderAttrTable = (attr: HelpApiObjectAttr[]): JSX.Element | undefined => {
    if (!attr || !attr.length) {
      return;
    }

    return (
      <table>
        <tbody>{attr.map(this.renderAttrTableRow)}</tbody>
      </table>
    );
  };

  renderAttrTableRow = (attr: HelpApiObjectAttr, i: number): JSX.Element => {
    return (
      <tr key={`row-${i}`}>
        <th>{attr.name}</th>
        <td>{attr.description}</td>
      </tr>
    );
  };

  renderHelpDocsLink(docs: string): JSX.Element | undefined {
    if (!docs) {
      return;
    }

    return (
      <div>
        {i18n.__('cli-repl.args.moreInformation')}{' '}
        <a href={docs} target="_blank" rel="noreferrer">
          {docs}
        </a>
      </div>
    );
  }

  renderHelpText(helpText: string): JSX.Element | undefined {
    if (!helpText) {
      return;
    }

    return <div>{helpText}</div>;
  }

  render(): JSX.Element {
    const help = this.props.value;

    return (
      <div className={helpOutput}>
        {this.renderHelpText(help.help)}
        {this.renderAttrTable(help.attr)}
        {this.renderHelpDocsLink(help.docs)}
      </div>
    );
  }
}
