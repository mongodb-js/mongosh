import React, { Component } from 'react';
import { css, cx } from '@mongodb-js/compass-components';
import PropTypes from 'prop-types';

const lineWithIcon = css({
  display: 'flex',
  flexDirection: 'row',
});

const lineWithIconIcon = css({
  display: 'flex',
  alignItems: 'center',
  marginRight: '3px',
  maxHeight: '24px',
});

const lineWithIconContent = css({
  flex: 1,
  overflowX: 'auto',
});

interface LineWithIconProps {
  icon: JSX.Element;
  className?: string;
  ['data-testid']?: string;
}

export class LineWithIcon extends Component<LineWithIconProps> {
  static propTypes = {
    icon: PropTypes.object.isRequired,
    className: PropTypes.string,
    ['data-testid']: PropTypes.string,
  };

  render(): JSX.Element {
    return (
      <div
        className={cx(this.props.className, lineWithIcon)}
        data-testid={this.props['data-testid']}
      >
        <span className={lineWithIconIcon}>{this.props.icon}</span>
        <div className={lineWithIconContent}>{this.props.children}</div>
      </div>
    );
  }
}
