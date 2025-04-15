import React, { Component } from 'react';
import { SpinLoader } from '@mongodb-js/compass-components';

interface ShellLoaderProps {
  size?: string;
}

export default class ShellLoader extends Component<ShellLoaderProps> {
  static defaultProps = {
    size: '12px',
  };

  render() {
    const { size } = this.props;
    return (
      <div>
        <SpinLoader size={size} />
      </div>
    );
  }
}
