import React, { useEffect } from 'react';
import { Shell } from './index';
import { IframeRuntime } from './iframe-runtime';

import { withKnobs, boolean, number } from '@storybook/addon-knobs';

export default {
  title: 'Shell',
  component: Shell,
  decorators: [withKnobs]
};

class DemoServiceProvider {
  async getServerVersion(): Promise<string> {
    return '4.0.0';
  }

  async listDatabases(): Promise<any> {
    return {
      databases: [
        { name: 'db1', sizeOnDisk: 10000, empty: false },
        { name: 'db2', sizeOnDisk: 20000, empty: false },
        { name: 'db-with-long-name', sizeOnDisk: 30000, empty: false },
        { name: '500mb', sizeOnDisk: 500000000, empty: false },
      ],
      totalSize: 50000,
      ok: 1
    };
  }
}

const runtime = new IframeRuntime(new DemoServiceProvider() as any);

export const IframeRuntimeExample: React.FunctionComponent = () => {
  useEffect(() => {
    runtime.initialize();

    return (): void => {
      runtime.destroy();
    };
  }, []);

  return (<div style={{ height: '240px' }}><Shell runtime={runtime}
    redactInfo={boolean('redactInfo', false)}
    maxHistoryLength={number('maxHistoryLength', 1000)}
    maxOutputLength={number('maxOutputLength', 1000)}
    initialHistory={['{x: 1, y: {z: 2}, k: [1, 2, 3]}']}
  /></div>);
};
