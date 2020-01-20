import React, {useEffect} from 'react';
import Shell from './index';
import { IframeInterpreter } from './lib/iframe-interpreter';

export default {
  title: 'Shell',
  component: Shell,
};

const interpreter = new IframeInterpreter();

export const Example1: React.FunctionComponent = () => {
  useEffect(() => {
    interpreter.initialize();
    return (): void => {
      interpreter.destroy();
    };
  }, []);

  return <Shell interpreter={interpreter}/>;
};
