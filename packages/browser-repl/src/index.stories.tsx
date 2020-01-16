import React from 'react';
import Shell from './index';
import { Interpreter } from './lib/interpreter';

export default {
  title: 'Shell',
  component: Shell,
};

class DemoInterpreter implements Interpreter {
  evaluate(code: string): Promise<object> {
    // eslint-disable-next-line no-eval
    return Promise.resolve(window.eval(code));
  }
}

export const Example1: React.FunctionComponent = () => (<Shell interpreter={new DemoInterpreter()}/>);
