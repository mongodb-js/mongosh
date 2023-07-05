import { css, cx, palette } from '@mongodb-js/compass-components';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

const shellCollectionsOutputCollectionName = css({
  fontWeight: 'bold',
});

const shellCollectionsOutputSystemCollection = css({
  color: palette.gray.base,
});

interface ShowCollectionsOutputProps {
  value: CollectionObject[];
}

type CollectionObject = {
  name: string;
  badge: string;
};

function isSystemCollection(coll: CollectionObject): boolean {
  return coll.name.startsWith('system.') || coll.name.startsWith('enxcol_.');
}

export class ShowCollectionsOutput extends Component<ShowCollectionsOutputProps> {
  static propTypes = {
    value: PropTypes.array,
  };

  renderTable = (value: CollectionObject[]): JSX.Element => {
    const systemCollections: CollectionObject[] = [];
    const otherCollections: CollectionObject[] = [];

    let maxCollectionNameLength = 0;
    value.forEach((coll) => {
      maxCollectionNameLength = Math.max(
        maxCollectionNameLength,
        coll.name.length
      );
      if (isSystemCollection(coll)) {
        systemCollections.push(coll);
      } else {
        otherCollections.push(coll);
      }
    });

    const tableEntries: JSX.Element[] = [];
    [...otherCollections, ...systemCollections].forEach((coll, i) => {
      const fillLength = maxCollectionNameLength - coll.name.length + 1;
      const className = cx(
        shellCollectionsOutputCollectionName,
        isSystemCollection(coll) && shellCollectionsOutputSystemCollection
      );
      tableEntries.push(
        <span key={`row-${i}`}>
          <span className={className}>{coll.name}</span>
          {coll.badge
            ? coll.badge.padStart(coll.badge.length + fillLength)
            : ''}
          <br />
        </span>
      );
    });

    return <>{tableEntries}</>;
  };

  render(): JSX.Element {
    return <pre>{this.renderTable(this.props.value)}</pre>;
  }
}
