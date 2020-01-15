import React from 'react';
import BrowserRepl from './browser-repl';

export default {
  title: 'BrowserRepl',
  component: BrowserRepl,
};

export const Example1 = (): JSX.Element => (<BrowserRepl name="Browser Repl" />);
