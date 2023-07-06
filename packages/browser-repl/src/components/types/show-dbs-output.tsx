import React, { Component } from 'react';
import numeral from 'numeral';
import PropTypes from 'prop-types';
import textTable from 'text-table';

interface ShowDbsOutputProps {
  value: any;
}

type DatabaseObject = {
  databases: object;
  map: any;
};

function formatBytes(value: number): string {
  const precision = value <= 1000 ? '0' : '0.00';
  return numeral(value).format(precision + ' ib');
}

export class ShowDbsOutput extends Component<ShowDbsOutputProps> {
  static propTypes = {
    value: PropTypes.any,
  };

  renderTable = (value: DatabaseObject): string => {
    const tableEntries = value.map((db: any) => [
      db.name,
      formatBytes(db.sizeOnDisk),
    ]);

    return textTable(tableEntries, { align: ['l', 'r'] });
  };

  render(): JSX.Element {
    return <pre>{this.renderTable(this.props.value)}</pre>;
  }
}
