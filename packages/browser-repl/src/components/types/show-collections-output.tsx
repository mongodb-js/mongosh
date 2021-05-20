import React, { Component } from 'react';
import PropTypes from 'prop-types';
import textTable from 'text-table';

interface ShowCollectionsOutputProps {
  value: any;
}

type CollectionObject = {
  name: string;
  badge: string;
};

export class ShowCollectionsOutput extends Component<ShowCollectionsOutputProps> {
  static propTypes = {
    value: PropTypes.array
  };

  renderTable = (value: CollectionObject[]): string => {
    const tableEntries = value.map(
      (coll: any) => [coll.name, coll.badge]
    );

    return textTable(tableEntries, { align: ['l', 'l'] });
  };

  render(): JSX.Element {
    return <pre>{this.renderTable(this.props.value)}</pre>;
  }
}
