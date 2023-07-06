import React, { Component } from 'react';
import { css } from '@mongodb-js/compass-components';

import { Icon } from '@mongodb-js/compass-components';

import { LineWithIcon } from './line-with-icon';

const expandableCaret = css({
  cursor: 'pointer',
});

type ExpandableProps = {};

interface ExpandableState {
  expanded: boolean;
}

/**
 * A container that can be expanded or collapsed.
 *
 * Keeps track of the collapsed state and passes it down
 * to children.
 *
 * @example Usage - with render prop
 *
 * <Expandable>{
 *  (expanded) => <span>Parent expanded = {JSON.stringify(expanded)}</span>
 * }</Expandable>
 *
 */
export class Expandable extends Component<ExpandableProps, ExpandableState> {
  static propTypes = {};

  state: Readonly<ExpandableState> = {
    expanded: false,
  };

  toggle = (): void => {
    this.setState({ expanded: !this.state.expanded });
  };

  render(): JSX.Element {
    const icon = (
      <Icon
        size={12}
        glyph={this.state.expanded ? 'CaretDown' : 'CaretRight'}
        className={expandableCaret}
        onClick={this.toggle}
      />
    );

    return (
      <LineWithIcon icon={icon} data-testid="shell-output">
        {typeof this.props.children === 'function'
          ? this.props.children(this.state.expanded, this.toggle)
          : this.props.children}
      </LineWithIcon>
    );
  }
}
