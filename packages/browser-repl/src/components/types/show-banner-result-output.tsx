import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { H3 } from '@leafygreen-ui/typography';

interface ShowBannerResultOutputProps {
  value: null | { header?: string, content: string };
}

export class ShowBannerResultOutput extends Component<ShowBannerResultOutputProps> {
  static propTypes = {
    value: PropTypes.any
  };

  render(): JSX.Element {
    return (<>
      {this.props.value?.header && <H3>{this.props.value.header}</H3>}
      {this.props.value?.content && <pre>{this.props.value.content}</pre>}
    </>);
  }
}
