import React, { useCallback } from 'react';
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

type PasswordPromptProps = {
  onChange: (value: string) => void;
  onFinish: (value: string) => void;
  onCancel: () => void;
  prompt: string;
  password: string;
};

export const PasswordPrompt = React.forwardRef<
  HTMLInputElement,
  PasswordPromptProps
>(function PasswordPrompt(
  { prompt, password, onChange, onFinish, onCancel },
  ref
) {
  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      switch (ev.key) {
        case 'Enter':
          onFinish((ev.target as HTMLInputElement).value);
          break;
        case 'Esc':
        case 'Escape':
          onCancel();
          break;
        default:
          break;
      }
    },
    [onCancel, onFinish]
  );
  return (
    <label id="password-prompt-label" className={passwordPrompt}>
      {prompt}:&nbsp;
      <TextInput
        ref={ref}
        value={password}
        data-testid="password-prompt"
        aria-labelledby="password-prompt-label"
        type="password"
        onChange={(evt) => onChange(evt.currentTarget.value)}
        onKeyDown={onKeyDown}
        className={passwordPropmtInputStyles}
        sizeVariant="xsmall"
      ></TextInput>
    </label>
  );
});
