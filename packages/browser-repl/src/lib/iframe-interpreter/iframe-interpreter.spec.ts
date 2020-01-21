import { IframeInterpreter } from './iframe-interpreter';
import { expect } from '../../../testing/chai';

describe('IframeInterpreter', () => {
  let iframeInterpreter;

  beforeEach(() => {
    iframeInterpreter = new IframeInterpreter();
    document.body.innerHTML = '';
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
      expect(await iframeInterpreter.evaluate('1')).to.deep.equal({value: 1});
    });

    it('allows to set and evaluate a variable', async() => {
      await iframeInterpreter.evaluate('x = 2');
      expect(await iframeInterpreter.evaluate('x')).to.deep.equal({value: 2});
    });

    it('does not interfere with the parent window', async() => {
      await iframeInterpreter.evaluate('x = 2');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((window as any).x).not.to.deep.equal({value: 2});
    });

    it('does not interfere with other instances', async() => {
      const other = new IframeInterpreter();
      await other.evaluate('x = 1');
      await iframeInterpreter.evaluate('x = 2');

      expect(await other.evaluate('x')).to.deep.equal({value: 1});
      expect(await iframeInterpreter.evaluate('x')).to.deep.equal({value: 2});
    });

    it('allows promises to be returned', async() => {
      const result = await iframeInterpreter.evaluate('Promise.resolve(1)');
      expect(result.value).not.to.equal(1);
      expect(result.value.then).to.exist;
    });

    it('evaluates an object literal as object', async() => {
      expect(await iframeInterpreter.evaluate('{x: 2}')).to.deep.equal({value: {x: 2}});
    });

    it('can declare a top level variable with let', async() => {
      await iframeInterpreter.evaluate('let x = 2');
      expect(await iframeInterpreter.evaluate('x')).to.deep.equal({value: 2});
    });

    it('can declare a top level variable with const', async() => {
      await iframeInterpreter.evaluate('const x = 2');
      expect(await iframeInterpreter.evaluate('x')).to.deep.equal({value: 2});
    });

    it('does not override "this" with top level "let" declarations', async() => {
      await iframeInterpreter.evaluate('this.x = 3');
      await iframeInterpreter.evaluate('let x = 2');
      expect(await iframeInterpreter.evaluate('x')).to.deep.equal({value: 2});
      expect(await iframeInterpreter.evaluate('this.x')).to.deep.equal({value: 3});
    });

    it('does not override "this" with top level "const" declarations', async() => {
      await iframeInterpreter.evaluate('this.x = 3');
      await iframeInterpreter.evaluate('const x = 2');
      expect(await iframeInterpreter.evaluate('x')).to.deep.equal({value: 2});
      expect(await iframeInterpreter.evaluate('this.x')).to.deep.equal({value: 3});
    });

    it('can declare a top level class', async() => {
      await iframeInterpreter.evaluate('class A { doSomething() { return 2; } }');
      expect(await iframeInterpreter.evaluate('new A().doSomething()')).to.deep.equal({value: 2});
    });
  });

  describe('#setContextVariable', () => {
    const sum = (a: number, b: number): number => a + b;

    it('sets a variable that can be evaluated', async() => {
      await iframeInterpreter.setContextVariable('z', 1);
      expect(await iframeInterpreter.evaluate('z')).to.deep.equal({value: 1});
    });

    it('sets a function that can be evaluated', async() => {
      await iframeInterpreter.setContextVariable('sum', sum);
      expect(await iframeInterpreter.evaluate('sum(2, 3)')).to.deep.equal({value: 5});
    });

    it('sets an object with a method that can be called', async() => {
      await iframeInterpreter.setContextVariable('obj', {sum: sum});
      expect(await iframeInterpreter.evaluate('obj.sum(2, 3)')).to.deep.equal({value: 5});
    });

    it('sets an object with a method that can be called with references to surrounding scope', async() => {
      await iframeInterpreter.setContextVariable('obj', {wrappedSum: (a: number, b: number): number => sum(a, b) });
      expect(await iframeInterpreter.evaluate('obj.wrappedSum(2, 3)')).to.deep.equal({value: 5});
    });
  });
});
