import React, { Component } from 'react';
import { css, palette, fontFamilies } from '@mongodb-js/compass-components';

const passwordPrompt = css({
  paddingLeft: 23,
  '& input': {
    fontSize: '13px',
    lineHeight: '24px',
    fontFamily: fontFamilies.code,
    backgroundColor: palette.gray.dark4,
    color: palette.gray.light3,
    padding: '0 3px',
    border: `1px solid ${palette.gray.light3}`,
    borderRadius: 3
  }
});

interface PasswordPromptProps {
  onFinish: (result: string) => void;
  onCancel: () => void;
  prompt: string;
}

export class PasswordPrompt extends Component<PasswordPromptProps> {
  constructor(props: PasswordPromptProps) {
    super(props);
  }

  onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (ev.key) {
      case 'Enter':
        this.props.onFinish((ev.target as HTMLInputElement).value);
        break;
      case 'Esc':
      case 'Escape':
        this.props.onCancel();
        break;
      default:
        break;
    }
  };

  render(): JSX.Element {
    return (
      <label className={passwordPrompt}>
        {this.props.prompt}:&nbsp;
        <input type="password" onKeyDown={this.onKeyDown} autoFocus />
      </label>
    );
  }
}
