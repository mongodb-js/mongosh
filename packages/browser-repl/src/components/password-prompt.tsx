import React, { Component } from 'react';
import { css, fontFamilies, TextInput } from '@mongodb-js/compass-components';

const passwordPrompt = css({
  paddingLeft: 23,
  '& input': {
    fontFamily: fontFamilies.code,
  },
});

const passwordPropmtInputStyles = css({
  display: 'inline-block',
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
      <label id="password-prompt-label" className={passwordPrompt}>
        {this.props.prompt}:&nbsp;
        <TextInput
          data-testid="password-prompt"
          aria-labelledby="password-prompt-label"
          type="password"
          onKeyDown={this.onKeyDown}
          className={passwordPropmtInputStyles}
          sizeVariant="xsmall"
          autoFocus
        ></TextInput>
      </label>
    );
  }
}
