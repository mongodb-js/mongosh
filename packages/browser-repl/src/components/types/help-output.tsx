import React, { Component } from 'react';
import PropTypes from 'prop-types';

type HelpApiObject = {
  help: string;
  docs: string;
  attr: HelpApiObjectAttr[];
}

type HelpApiObjectAttr = {
  name: string;
  description: string;
};

interface HelpOutputProps {
  value: HelpApiObject;
}

export class HelpOutput extends Component<HelpOutputProps> {
  static propTypes = {
    value: PropTypes.object.isRequired
  };

  renderAttrTable = (attr: HelpApiObjectAttr[]): JSX.Element => {
    if (!attr || !attr.length) { return; }

    return (<table className="table">
      {attr.map(this.renderAttrTableRow)}
    </table>);
  }

  renderAttrTableRow = (attr: HelpApiObjectAttr, i: number): JSX.Element => {
    return (<tr key={`row-${i}`}>
      <td>{attr.name}</td>
      <td>{attr.description}</td>
    </tr>);
  }

  renderHelpDocsLink(docs: string): JSX.Element {
    if (!docs) { return; }

    return (<div><a href={docs} target="_blank">{docs}</a></div>);
  }

  renderHelpText(helpText: string): JSX.Element {
    if (!helpText) { return; }

    return (<div>{helpText}</div>);
  }

  render(): JSX.Element {
    const help = this.props.value;

    return (
      <div>
        {this.renderHelpText(help.help)}
        {this.renderAttrTable(help.attr)}
        {this.renderHelpDocsLink(help.docs)}
      </div>
    );
  }
}
