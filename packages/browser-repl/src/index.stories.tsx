import React, {useEffect} from 'react';
import Shell from './index';
import { IframeInterpreter } from './lib/interpreter';
import Mapper from 'mongosh-mapper';
import ShellApi from 'mongosh-shell-api';

export default {
  title: 'Shell',
  component: Shell,
};

const interpreter = new IframeInterpreter();

export const Example1: React.FunctionComponent = () => {
  useEffect(() => {
    interpreter.initialize()
      .then(() => {
        const serviceProvider = {};
        const mapper = new Mapper(serviceProvider);
        const shellApi = new ShellApi(mapper);
        const context = interpreter.getContext();
        Object.keys(shellApi)
          .filter(k => (!k.startsWith('_')))
          .forEach(k => (context[k] = shellApi[k]));
        mapper.setCtx(context);
      });

    return (): void => {
      interpreter.destroy();
    };
  }, []);

  return <Shell interpreter={interpreter}/>;
};
