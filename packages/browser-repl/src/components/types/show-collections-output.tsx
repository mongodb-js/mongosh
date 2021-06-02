import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

const styles = require('./show-collections-output.less');

interface ShowCollectionsOutputProps {
  value: CollectionObject[];
}

type CollectionObject = {
  name: string;
  badge: string;
};

export class ShowCollectionsOutput extends Component<ShowCollectionsOutputProps> {
  static propTypes = {
    value: PropTypes.array
  };

  renderTable = (value: CollectionObject[]): JSX.Element => {
    const systemCollections: CollectionObject[] = [];
    const otherCollections: CollectionObject[] = [];

    let maxCollectionNameLength = 0;
    value.forEach(coll => {
      maxCollectionNameLength = Math.max(maxCollectionNameLength, coll.name.length);
      if (coll.name.startsWith('system.')) {
        systemCollections.push(coll);
      } else {
        otherCollections.push(coll);
      }
    });

    const tableEntries: JSX.Element[] = [];
    [
      ...otherCollections,
      ...systemCollections
    ].forEach((coll, i) => {
      const fillLength = maxCollectionNameLength - coll.name.length + 1;
      const className = classNames(
        styles['shell-collections-output-collection-name'],
        {
          [styles['shell-collections-output-system-collection']]: coll.name.startsWith('system.')
        }
      );
      tableEntries.push(<span key={`row-${i}`}>
        <span className={className}>{coll.name}</span>{coll.badge ? coll.badge.padStart(coll.badge.length + fillLength) : ''}<br/>
      </span>);
    });

    return <>{...tableEntries}</>;
  };

  render(): JSX.Element {
    return <pre>{this.renderTable(this.props.value)}</pre>;
  }
}
