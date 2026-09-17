import React from 'react';
import { expect } from '@mongosh/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  // The collapsed view renders the error name as a link that toggles the
  // Expandable it lives in.
  async function expand(): Promise<void> {
    await userEvent.click(screen.getByTestId('error-name'));
  }

  describe('collapsed', function () {
    it('renders basic info - MongoError', function () {
      render(<ErrorOutput value={mongoError} />);

      expect(screen.getByTestId('error-name').textContent).to.equal(
        'MongoError[ErrorCode]:'
      );
      expect(screen.getByTestId('error-message').textContent).to.equal(
        'Something went wrong.'
      );
      expect(screen.queryByTestId('error-stack')).to.equal(null);
    });

    it('renders basic info - generic Error', function () {
      const error = new Error('Something went wrong.');
      render(<ErrorOutput value={error} />);

      expect(screen.getByTestId('error-name').textContent).to.equal('Error:');
      expect(screen.getByTestId('error-message').textContent).to.equal(
        'Something went wrong.'
      );
    });

    it('strips ANSI codes from syntax errors', function () {
      const error = new SyntaxError('Syntax is wrong');
      error.stack = `SyntaxError: Syntax is wrong
\u001b[0m    at new Script (vm.js:79:7)\u001b[0m
\u001b[0m    at createScript (vm.js:251:10)\u001b[0m
\u001b[0m    at Object.runInThisContext (vm.js:303:10)\u001b[0m
\u001b[0m    at ...`;
      error.message = error.stack;

      render(<ErrorOutput value={error} />);

      expect(screen.getByTestId('error-name').textContent).to.equal(
        'SyntaxError:'
      );
      expect(screen.getByTestId('error-message').textContent).to.deep
        .equal(`SyntaxError: Syntax is wrong
    at new Script (vm.js:79:7)
    at createScript (vm.js:251:10)
    at Object.runInThisContext (vm.js:303:10)
    at ...`);
    });
  });

  describe('expanded', function () {
    it('renders basic info - generic Error', async function () {
      render(<ErrorOutput value={mongoError} />);
      await expand();

      expect(screen.getByTestId('error-name').textContent).to.equal(
        'MongoError[ErrorCode]:'
      );
      expect(screen.getByTestId('error-message').textContent).to.equal(
        'Something went wrong.'
      );
      expect(screen.getByTestId('error-stack')).to.exist;
    });

    it('strips ANSI codes from syntax errors', async function () {
      const error = new SyntaxError('Syntax is wrong');
      error.stack = `SyntaxError: Syntax is wrong
\u001b[0m    at new Script (vm.js:79:7)\u001b[0m
\u001b[0m    at createScript (vm.js:251:10)\u001b[0m
\u001b[0m    at Object.runInThisContext (vm.js:303:10)\u001b[0m
\u001b[0m    at ...`;
      error.message = error.stack;

      render(<ErrorOutput value={error} />);
      await expand();

      expect(screen.getByTestId('error-message').textContent).to.deep
        .equal(`SyntaxError: Syntax is wrong
    at new Script (vm.js:79:7)
    at createScript (vm.js:251:10)
    at Object.runInThisContext (vm.js:303:10)
    at ...`);
      expect(screen.getByTestId('error-stack').textContent).to.deep
        .equal(`    at new Script (vm.js:79:7)
    at createScript (vm.js:251:10)
    at Object.runInThisContext (vm.js:303:10)
    at ...`);
    });

    it('renders violations when expanded', async function () {
      const error = new Error('Validation failed.') as any;
      error.violations = [{ namespace: 'db.coll', properties: ['x', 'y'] }];

      render(<ErrorOutput value={error} />);
      await expand();

      expect(screen.getByText(/Violations:/).textContent).to.contain(
        'namespace'
      );
      expect(screen.getByText(/Violations:/).textContent).to.contain('db.coll');
      expect(screen.getByText(/Violations:/).textContent).to.contain("'x'");
    });

    it('renders writeErrors when expanded', async function () {
      const error = new Error('Bulk write failed.') as any;
      error.writeErrors = [{ index: 0, code: 11000, errmsg: 'duplicate key' }];

      render(<ErrorOutput value={error} />);
      await expand();

      expect(screen.getByText(/Write Errors:/).textContent).to.contain('11000');
      expect(screen.getByText(/Write Errors:/).textContent).to.contain(
        'duplicate key'
      );
    });

    it('renders cause when expanded - Error cause', async function () {
      const cause = new Error('Underlying failure.');
      const error = new Error('Wrapper failure.', { cause });

      render(<ErrorOutput value={error} />);
      await expand();

      expect(screen.getByText(/Caused by:/).textContent).to.contain(
        'Underlying failure.'
      );
    });

    it('renders cause when expanded - non-Error cause', async function () {
      const error = new Error('Wrapper failure.') as any;
      error.cause = { reason: 'something broke' };

      render(<ErrorOutput value={error} />);
      await expand();

      expect(screen.getByText(/Caused by:/).textContent).to.contain('reason');
      expect(screen.getByText(/Caused by:/).textContent).to.contain(
        'something broke'
      );
    });
  });
});
