import React, { Component } from 'react';
import prettyBytes from 'pretty-bytes';
import PropTypes from 'prop-types';
import textTable from 'text-table';

interface ShowDbsOutputProps {
  value: any;
}

type DatabaseObject = {
  databases: object;
};

export class ShowDbsOutput extends Component<ShowDbsOutputProps> {
  static propTypes = {
    value: PropTypes.any
  };

  renderTable = (value: DatabaseObject): object => {
    const tableEntries = value.map(
      (db) => [db.name, prettyBytes(db.sizeOnDisk)]
    );

    return textTable(tableEntries, { align: ['l', 'r'] });
  };

  render(): JSX.Element {
    return <pre>{this.renderTable(this.props.value)}</pre>;
  }
}
