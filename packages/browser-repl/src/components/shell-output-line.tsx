import React, { Component } from 'react';
import PropTypes from 'prop-types';
import browserUtilInspect from 'browser-util-inspect';

type ShellOutputEntryValue = any;

export interface ShellOutputEntry {
  type: 'input' | 'output' | 'error';
  apiType?: string;
  value: ShellOutputEntryValue;
}

interface ShellOutputLineProps {
  entry: ShellOutputEntry;
}

export class ShellOutputLine extends Component<ShellOutputLineProps> {
  static propTypes = {
    entry: PropTypes.object.isRequired
  };

  private formatValue(entry: ShellOutputEntry): string {
    if (entry.type === 'input') {
      return entry.value;
    }

    if (entry.value === undefined) {
      return 'undefined';
    }

    if (entry.value === null) {
      return 'null';
    }

    if (this.isError(entry)) {
      return entry.value.stack;
    }

    if (typeof entry.value.toReplString === 'function') {
      return entry.value.toReplString();
    }

    const inspected = browserUtilInspect(entry.value, {});

    if (typeof entry.value === 'object') {
      const displayName = entry.value.constructor ? entry.value.constructor.name : 'Object';
      return `${displayName} ${inspected}`;
    }

    return inspected;
  }

  private isError(entry: ShellOutputEntry): boolean {
    return entry.value instanceof Error ||
      entry.type === 'error' && entry.value && entry.value.stack;
  }

  renderHelpAttrRow = (attr: {[propName: string]: string}, i: number): JSX.Element => {
    const [k, v] = Object.entries(attr)[0];
    return <tr key={`row-${i}`}><td>{k}</td><td>{v}</td></tr>;
  }

  renderHelpDocsLink(docs: string): JSX.Element {
    return (<div>
      <i><a href={docs} target="_blank">{docs}</a></i>
    </div>);
  }

  renderHelp(): JSX.Element {
    const help: {
      help: string;
      docs: string;
      attr: Array<{[propName: string]: string}>;
    } = this.props.entry.value;

    return (
      <div className="alert alert-info">
        <h5><b>{help.help}</b></h5>
        <table className="table">
          {help.attr.map(this.renderHelpAttrRow)}
        </table>
        {help.docs ? this.renderHelpDocsLink(help.docs) : ''}
      </div>
    );
  }

  render(): JSX.Element {
    if (this.props.entry.apiType === 'Help') {
      return this.renderHelp();
    }

    const formattedValue = this.formatValue(this.props.entry);

    let className = `shell-output-line shell-output-line-${this.props.entry.type}`;

    if (this.props.entry.type === 'error') {
      className += ' alert alert-danger';
    }

    return <pre className={className}>{formattedValue}</pre>;
  }
}

