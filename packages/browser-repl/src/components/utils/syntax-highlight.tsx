import React from 'react';
import { Code, css, spacing } from '@mongodb-js/compass-components';

const codeStyles = css({
  '> div': {
    // Remove the LG border and align it with other output types
    border: 'none !important',
    padding: `${spacing[50]}px 0`,
    marginLeft: `-${spacing[400]}px`,
  },
});

export const SyntaxHighlight = ({ code }: { code: string }) => {
  return (
    <div className={codeStyles}>
      <Code language="js" showLineNumbers={false} copyable={false}>
        {code}
      </Code>
    </div>
  );
};
