import React, {useEffect} from 'react';
import { Shell } from './index';
import { IframeRuntime } from './lib/iframe-runtime';

import { withKnobs, boolean, number } from '@storybook/addon-knobs';

export default {
  title: 'Shell',
  component: Shell,
  decorators: [withKnobs]
};

const runtime = new IframeRuntime({});

export const IframeRuntimeExample: React.FunctionComponent = () => {
  useEffect(() => {
    runtime.initialize();

    return (): void => {
      runtime.destroy();
    };
  }, []);

  return (<Shell runtime={runtime}
    redactInfo={boolean('redactInfo', false)}
    maxHistoryLength={number('maxHistoryLength', 1000)}
    maxOutputLength={number('maxOutputLength', 1000)}
  />);
};
