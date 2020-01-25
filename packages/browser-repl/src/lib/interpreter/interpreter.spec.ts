import { IframeInterpreter } from './iframe-interpreter';
import { expect } from '../../../testing/chai';

describe('IframeInterpreter', () => {
  let iframeInterpreter;
  let testEvaluate;

  beforeEach(() => {
    iframeInterpreter = new IframeInterpreter();
    document.body.innerHTML = '';

    testEvaluate = async(...program): Promise<object> => {
      let result = undefined;
      for (const code of program) {
        result = await iframeInterpreter.evaluate(code);
      }

      return result.value;
    };
  });

  describe('#initialize', () => {
    it('adds an hidden sandboxed iframe to the document', async() => {
      expect(document.querySelector('iframe')).not.to.exist;

      await iframeInterpreter.initialize();

      const iframe = document.querySelector('iframe');
      expect(iframe).to.exist;
      expect(iframe.style.display).to.equal('none');
      expect(iframe.sandbox.value).to.equal('allow-same-origin');
    });
  });

  describe('#destroy', () => {
    it('removes the iframe added by initialize', async() => {
      await iframeInterpreter.initialize();
      expect(document.querySelector('iframe')).to.exist;

      await iframeInterpreter.destroy();
      expect(document.querySelector('iframe')).not.to.exist;
    });

    it('does not throw if not initialized', async() => {
      await iframeInterpreter.destroy();
    });
  });

  describe('#evaluate', () => {
    beforeEach(async() => {
      await iframeInterpreter.initialize();
    });

    afterEach(async() => {
      await iframeInterpreter.destroy();
    });

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

    it('does not interfere with the parent window', async() => {
      await testEvaluate(
        'x = 1'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((window as any).x).not.to.equal(1);
    });

    it('does not interfere with other instances', async() => {
      const other = new IframeInterpreter();
      await testEvaluate('x = 1');
      await other.evaluate('x = 2');

      expect(
        await testEvaluate('x')
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

    it('can redeclare a top level function as function', async() => {
      expect(
        await testEvaluate(
          'function f() { return 1; }',
          'function f() { return 2; }',
          'f()'
        )
      ).to.equal(2);
    });

    // it.skip('can redeclare a top level function as var', async() => {
    //   expect(
    //     await testEvaluate(
    //       'function sum(a, b) { return a + b; }',
    //       'var sum = 1'
    //     )
    //   ).to.equal(1);
    // });

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
