import React, {useEffect} from 'react';
import Shell from './index';
import { IframeRuntime } from './lib/iframe-runtime';

export default {
  title: 'Shell',
  component: Shell,
};

const runtime = new IframeRuntime({});

export const IframeRuntimeExample: React.FunctionComponent = () => {
  useEffect(() => {
    runtime.initialize();

    return (): void => {
      runtime.destroy();
    };
  }, []);

  return <Shell runtime={runtime}/>;
};
