/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Interpreter } from './interpreter';
import { expect } from '../../../testing/chai';

async function createTestIframe() {
  const iframe = document.createElement('iframe');
  iframe.src = 'about:blank';

  const ready = new Promise((resolve) => {
    iframe.onload = () => resolve(iframe);
  });

  document.body.appendChild(iframe);
  return ready;
}

describe('Interpreter', () => {
  let interpreter;
  let testEvaluate;
  let iframe;

  beforeEach(async() => {
    document.body.innerHTML = '';
    iframe = await createTestIframe();

    const testEnvironment = {
      sloppyEval: (iframe.contentWindow as any).eval,
      getGlobal: (name): any => iframe.contentWindow[name],
      setGlobal: (name, value): void => { iframe.contentWindow[name] = value; }
    };

    interpreter = new Interpreter(testEnvironment);

    testEvaluate = async(...program): Promise<object> => {
      let result = undefined;
      for (const code of program) {
        result = await interpreter.evaluate(code);
      }

      return result.value;
    };
  });

  describe('#evaluate', () => {
    it('evaluates an integer literal', async() => {
      expect(
        await testEvaluate(
          '1'
        )
      ).to.equal(1);
    });

    it('allows to set and evaluate a variable', async() => {
      expect(
        await testEvaluate(
          'x = 1',
          'x'
        )
      ).to.equal(1);
    });

    it('resolve promises before return', async() => {
      expect(
        await testEvaluate(
          'Promise.resolve(1)'
        )
      ).to.equal(1);
    });

    it('evaluates an object literal as object', async() => {
      expect(
        await testEvaluate(
          '{x: 1}'
        )
      ).to.deep.equal({x: 1});
    });

    it.skip('evaluates object literal after other statements as block', async() => {
      // TODO: for some reason this is the default behaviour in node repl and devtools,
      // as is now it wraps everything, which breaks the code.
      expect(
        await testEvaluate(
          ';{x: 1}'
        )
      ).to.equal(1);
    });

    it('can declare a top level variable with let', async() => {
      expect(
        await testEvaluate(
          'let x = 1',
          'x'
        )
      ).to.equal(1);
    });

    it('can declare a top level variable with const', async() => {
      expect(
        await testEvaluate(
          'const x = 1',
          'x'
        )
      ).to.equal(1);
    });

    it('can declare a top level variable with var', async() => {
      expect(
        await testEvaluate(
          'var x = 1',
          'x'
        )
      ).to.equal(1);
    });

    it('does not override "this" with top level "let" declarations', async() => {
      expect(
        await testEvaluate(
          'this.x = 2',
          'let x = 1',
          'x'
        )
      ).to.equal(1);

      expect(
        await testEvaluate(
          'this.x'
        )
      ).to.equal(2);
    });

    it('does not override "this" with top level "const" declarations', async() => {
      expect(
        await testEvaluate(
          'this.x = 2',
          'const x = 1',
          'x'
        )
      ).to.equal(1);

      expect(
        await testEvaluate(
          'this.x'
        )
      ).to.equal(2);
    });

    it('can declare a top level class', async() => {
      expect(
        await testEvaluate(
          'class A { doSomething() { return 1; } }',
          'new A().doSomething()'
        )
      ).to.equal(1);
    });


    it('can declare a top level function', async() => {
      expect(
        await testEvaluate(
          'function sum(a, b) { return a + b; }',
          'sum(1, 2)'
        )
      ).to.equal(3);
    });

    it.skip('can redeclare a top level function as function', async() => {
      expect(
        await testEvaluate(
          'function f() { return 1; }',
          'function f() { return 2; }',
          'f()'
        )
      ).to.equal(2);
    });

    it.skip('can redeclare a top level function as var', async() => {
      expect(
        await testEvaluate(
          'function sum(a, b) { return a + b; }',
          'var sum = 1'
        )
      ).to.equal(1);
    });

    it('cannot re-declare a top level function as let', async() => {
      const error = await testEvaluate(
        'function sum(a, b) { return a + b; }',
        'let sum = 1'
      ).catch(err => err);

      expect(error).to.be.instanceOf(SyntaxError);
      expect(error.message).to.contain('Identifier \'sum\' has already been declared');
    });

    it('cannot re-declare a top level function as const', async() => {
      const error = await testEvaluate(
        'function sum(a, b) { return a + b; }',
        'const sum = 1'
      ).catch(err => err);

      expect(error).to.be.instanceOf(SyntaxError);
      expect(error.message).to.contain('Identifier \'sum\' has already been declared');
    });

    it('cannot re-declare a top level function as class', async() => {
      const error = await testEvaluate(
        'function sum(a, b) { return a + b; }',
        'class sum {}'
      ).catch(err => err);

      expect(error).to.be.instanceOf(SyntaxError);
      expect(error.message).to.contain('Identifier \'sum\' has already been declared');
    });

    it.skip('allows top level await', async() => {
      expect(
        await testEvaluate(
          '1 + await Promise.resolve(1)'
        )
      ).to.equal(1);
    });

    it('throws with top level return', async() => {
      const error = await testEvaluate(
        'return 1; await Promise.resolve(1)'
      ).catch(err => err);

      expect(error)
        .to.be.instanceOf(SyntaxError);

      expect(error.message)
        .to.contain('\'return\' outside of function');
    });
  });
});
