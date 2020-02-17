import React, {useEffect} from 'react';
import { Shell } from './index';
import { IframeRuntime } from './iframe-runtime';

import { withKnobs, boolean, number } from '@storybook/addon-knobs';
import { ServiceProvider } from 'mongosh-service-provider-core';

export default {
  title: 'Shell',
  component: Shell,
  decorators: [withKnobs]
};

class DemoServiceProvider {
  async getServerVersion(): Promise<string> {
    return '4.0.0';
  }
}

const runtime = new IframeRuntime(new DemoServiceProvider() as ServiceProvider);

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
