import React from 'react';
import { expect } from '@mongosh/testing';
import { render, mount } from '../../../testing/enzyme';

import { ErrorOutput } from './error-output';

describe('ErrorOutput', function () {
  class MongoError extends Error {
    code: number;
    codeName: string;
    errorInfo: string;
    constructor({
      message,
      code,
      codeName,
      name,
      errorInfo,
    }: {
      message: string;
      code: number;
      codeName: string;
      name: string;
      errorInfo: string;
    }) {
      super(message);
      this.code = code;
      this.codeName = codeName;
      this.name = name;
      this.errorInfo = errorInfo;
    }
  }

  const mongoError = new MongoError({
    message: 'Something went wrong.',
    code: 123,
    codeName: 'ErrorCode',
    name: 'MongoError',
    errorInfo: 'More details about the error',
  });

  describe('collapsed', function () {
    it('renders basic info - MongoError', function () {
      const wrapper = render(<ErrorOutput value={mongoError} />);

      expect(wrapper.text()).to.contain(
        'MongoError[ErrorCode]: Something went wrong'
      );
      expect(wrapper.text()).not.to.contain('More details about the error');
    });

    it('renders basic info - generic Error', function () {
      const error = new Error('Something went wrong.');
      const wrapper = render(<ErrorOutput value={error} />);

      expect(wrapper.text()).to.contain('Something went wrong.');
    });

    it('strips ANSI codes from syntax errors', function () {
      const error = new SyntaxError('Syntax is wrong');
      error.stack = `SyntaxError: Syntax is wrong
\u001b[0m    at new Script (vm.js:79:7)\u001b[0m
\u001b[0m    at createScript (vm.js:251:10)\u001b[0m
\u001b[0m    at Object.runInThisContext (vm.js:303:10)\u001b[0m
\u001b[0m    at ...`;
      error.message = error.stack;

      const wrapper = mount(<ErrorOutput value={error} />);
      expect(wrapper.text()).to.deep
        .equal(`SyntaxError: SyntaxError: Syntax is wrong
    at new Script (vm.js:79:7)
    at createScript (vm.js:251:10)
    at Object.runInThisContext (vm.js:303:10)
    at ...`);
    });
  });

  describe('expanded', function () {
    it('renders basic info - generic Error', function () {
      const wrapper = mount(<ErrorOutput value={mongoError} />);

      expect(wrapper.text()).to.contain('Something went wrong.');
      // wrapper.findWhere((node) => node.text().includes('Something went wrong')).simulate('click');
      wrapper.find('svg').simulate('click');

      expect(wrapper.text()).to.contain(
        'MongoError[ErrorCode]: Something went wrong'
      );
      expect(wrapper.text()).not.to.contain('More details about the error');
    });

    it('strips ANSI codes from syntax errors', function () {
      const error = new SyntaxError('Syntax is wrong');
      error.stack = `SyntaxError: Syntax is wrong
\u001b[0m    at new Script (vm.js:79:7)\u001b[0m
\u001b[0m    at createScript (vm.js:251:10)\u001b[0m
\u001b[0m    at Object.runInThisContext (vm.js:303:10)\u001b[0m
\u001b[0m    at ...`;
      error.message = error.stack;

      const wrapper = mount(<ErrorOutput value={error} />);
      wrapper.find('svg').simulate('click');

      expect(wrapper.text()).to.deep
        .equal(`SyntaxError: SyntaxError: Syntax is wrong
    at new Script (vm.js:79:7)
    at createScript (vm.js:251:10)
    at Object.runInThisContext (vm.js:303:10)
    at ...    at new Script (vm.js:79:7)
    at createScript (vm.js:251:10)
    at Object.runInThisContext (vm.js:303:10)
    at ...`);
    });
  });
});
