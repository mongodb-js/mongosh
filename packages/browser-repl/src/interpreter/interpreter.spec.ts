import { Interpreter } from './interpreter';
import { expect } from '../../testing/chai';

async function createTestIframe(): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.src = 'about:blank';

  const ready = new Promise<HTMLIFrameElement>((resolve) => {
    iframe.onload = (): void => resolve(iframe);
  });

  document.body.appendChild(iframe);
  return ready;
}

describe('Interpreter', () => {
  let interpreter;
  let testEvaluate;
  let iframe;
  let testEnvironment;

  beforeEach(async() => {
    document.body.innerHTML = '';
    iframe = await createTestIframe();
    const contentWindow = iframe.contentWindow as any;

    testEnvironment = {
      sloppyEval: contentWindow.eval,
      getContextObject: (): any => contentWindow
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

    it('allows to invoke the help command', async() => {
      testEnvironment.getContextObject().help = (): string => 'help invoked';

      expect(
        await testEvaluate(
          'help'
        )
      ).to.equal('help invoked');
    });

    it('allows to invoke the it command', async() => {
      testEnvironment.getContextObject().it = (): string => 'it invoked';

      expect(
        await testEvaluate(
          'it'
        )
      ).to.equal('it invoked');
    });

    it('allows to invoke the show command', async() => {
      testEnvironment.getContextObject().show = (): string => 'show invoked';

      expect(
        await testEvaluate(
          'show'
        )
      ).to.equal('show invoked');
    });

    it('allows to invoke the use command', async() => {
      testEnvironment.getContextObject().use = (): string => 'use invoked';

      expect(
        await testEvaluate(
          'use'
        )
      ).to.equal('use invoked');
    });
  });
});
