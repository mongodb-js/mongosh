import React, { Component } from 'react';
import classnames from 'classnames';

const styles = require('./shell-loader.less');

interface ShellLoaderProps {
  size: number;
}

export default class ShellLoader extends Component<ShellLoaderProps> {
  render(): JSX.Element {
    const { size } = this.props;

    return (
      <div
        className={classnames(styles['shell-loader'])}
        style={{
          height: `${size}px`,
          width: `${size}px`
        }}
      />
    );
  }
}
