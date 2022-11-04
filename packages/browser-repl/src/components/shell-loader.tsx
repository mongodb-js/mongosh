import React, { Component } from 'react';
import { SpinLoader, css, palette } from '@mongodb-js/compass-components';

// TODO: Add dark mode to compass components spinner
const shellLoader = css({
  '& div': { borderTopColor: palette.green.light2 }
});

interface ShellLoaderProps {
  size?: string;
}

export default class ShellLoader extends Component<ShellLoaderProps> {
  static defaultProps = {
    size: '12px'
  };

  render() {
    const { size } = this.props;
    return <div className={shellLoader}><SpinLoader size={size} /></div>;
  }
}
