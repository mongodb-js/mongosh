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
    interpreter.initialize()
      .then(() => {
        const db = {
          coll1: {
            find: (): Promise<Array<object>> => Promise.resolve([{_id: 1}, {_id: 2}, {_id: 3}])
          }
        };

        interpreter.setContextVariable('db', db);
      });
    return (): void => {
      interpreter.destroy();
    };
  }, []);

  return <Shell interpreter={interpreter}/>;
};
