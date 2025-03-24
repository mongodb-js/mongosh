import AsyncWriter from './';
import childProcess from 'child_process';
import path from 'path';
import { promisify } from 'util';
import vm from 'vm';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
const execFile = promisify(childProcess.execFile);

describe('AsyncWriter', function () {
  let implicitlyAsyncFn: sinon.SinonStub;
  let plainFn: sinon.SinonStub;
  let implicitlyAsyncMethod: sinon.SinonStub;
  let plainMethod: sinon.SinonStub;
  let implicitlyAsyncValue: any;
  let ctx: any;
  let runTranspiledCode: (code: string, context?: any) => any;
  let runUntranspiledCode: (code: string, context?: any) => any;
  let asyncWriter: AsyncWriter;

  beforeEach(function () {
    implicitlyAsyncFn = sinon.stub();
    plainFn = sinon.stub();
    implicitlyAsyncMethod = sinon.stub();
    plainMethod = sinon.stub();
    implicitlyAsyncValue = undefined;

    asyncWriter = new AsyncWriter();
    ctx = vm.createContext({
      expect,
      console,
      implicitlyAsyncFn: function (...args: any[]) {
        return Object.assign(
          Promise.resolve(implicitlyAsyncFn.call(this, ...args)),
          { [Symbol.for('@@mongosh.syntheticPromise')]: true }
        );
      },
      plainFn,
      obj: {
        implicitlyAsyncMethod: function (...args: any[]) {
          return Object.assign(
            Promise.resolve(implicitlyAsyncMethod.call(this, ...args)),
            { [Symbol.for('@@mongosh.syntheticPromise')]: true }
          );
        },
        plainMethod,
      },
      get implicitlyAsyncValue() {
        return Object.assign(Promise.resolve(implicitlyAsyncValue), {
          [Symbol.for('@@mongosh.syntheticPromise')]: true,
        });
      },
      throwUncatchable() {
        throw Object.assign(new Error('uncatchable!'), {
          [Symbol.for('@@mongosh.uncatchable')]: true,
        });
      },
      regularIterable: function* () {
        yield* [1, 2, 3];
      },
      regularAsyncIterable: async function* () {
        await Promise.resolve();
        yield* [1, 2, 3];
      },
      implicitlyAsyncIterable: function () {
        return Object.assign(
          (async function* () {
            await Promise.resolve();
            yield* [1, 2, 3];
          })(),
          {
            [Symbol.for('@@mongosh.syntheticAsyncIterable')]: true,
          }
        );
      },
    });
    runTranspiledCode = (code: string, context?: any) => {
      const transpiled = asyncWriter.process(code);
      return runUntranspiledCode(transpiled, context);
    };
    runUntranspiledCode = (code: string, context?: any) => {
      return vm.runInContext(code, context ?? ctx, {
        async importModuleDynamically(specifier: string) {
          if (specifier === 'forty-two') {
            const mod = new (vm as any).SourceTextModule(
              'export const value = 42'
            );
            await mod.link(() => {});
            await mod.evaluate();
            return mod;
          }
          throw new Error('Module not found');
        },
      } as any);
    };
  });

  before(function () {
    process.on('unhandledRejection', (err) => {
      throw err;
    });
  });

  context('basic testing', function () {
    it('evaluates plain literal expressions', function () {
      expect(runTranspiledCode('42')).to.equal(42);
      expect(runTranspiledCode('"42"')).to.equal('42');
      expect(runTranspiledCode('false')).to.equal(false);
      expect(runTranspiledCode('null')).to.equal(null);
      expect(runTranspiledCode('undefined')).to.equal(undefined);
      expect(runTranspiledCode('[1,2,3]')).to.deep.equal([1, 2, 3]);
      expect(runTranspiledCode('({ a: 10 })')).to.deep.equal({ a: 10 });
    });

    it('does not auto-resolve Promises automatically', function () {
      expect(
        runTranspiledCode('Promise.resolve([])').constructor.name
      ).to.equal('Promise');
      expect(
        runTranspiledCode('Promise.resolve([]).constructor').name
      ).to.equal('Promise');
      expect(
        runTranspiledCode('Promise.resolve([]).constructor.name')
      ).to.equal('Promise');
    });

    it('works fine when immediately receiving a rejected Promise', async function () {
      try {
        await runTranspiledCode('Promise.reject(42)');
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err).to.equal(42);
      }
    });
  });

  context('use strict', function () {
    it('parses a plain "use strict"; as a string literal', function () {
      expect(runTranspiledCode('"use strict"')).to.equal('use strict');
      expect(runTranspiledCode('"use strict";')).to.equal('use strict');
      expect(runTranspiledCode("'use strict'")).to.equal('use strict');
      expect(runTranspiledCode("'use strict';")).to.equal('use strict');
    });

    it('runs code that starts with "use strict"', function () {
      expect(runTranspiledCode("'use strict'; 144 + 233;")).to.equal(377);
    });

    it('fails to run invalid strict-mode code', function () {
      try {
        runTranspiledCode("'use strict'; delete Object.prototype");
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.name).to.equal('TypeError');
      }
    });

    it('runs code in sloppy mode by default', function () {
      expect(runTranspiledCode('delete Object.prototype')).to.equal(false);
    });

    it('parses code in sloppy mode by default', function () {
      expect(runTranspiledCode('"<\\101>"')).to.equal('<A>');
      expect(runTranspiledCode('"x" + "<\\101>"')).to.equal('x<A>');
    });

    it('parses code in strict mode if strict mode is explicitly enabled', function () {
      expect(() => runTranspiledCode('"use strict"; "<\\101>"')).to.throw(
        SyntaxError
      );
    });
  });

  context('scoping', function () {
    it('adds functions to the global scope as expected', function () {
      const f = runTranspiledCode('function f() {}');
      expect(f.constructor.name).to.equal('Function');
      expect(ctx.f).to.equal(f);
    });

    it('adds var declarations to the global scope as expected', function () {
      const a = runTranspiledCode('var a = 10;');
      expect(a).to.equal(undefined);
      expect(ctx.a).to.equal(10);
    });

    it('adds let declarations to the global scope as expected (unlike regular JS)', function () {
      const a = runTranspiledCode('let a = 10;');
      expect(a).to.equal(undefined);
      expect(ctx.a).to.equal(10);
    });

    it('adds const declarations to the global scope as expected (unlike regular JS)', function () {
      const a = runTranspiledCode('const a = 11;');
      expect(a).to.equal(undefined);
      expect(ctx.a).to.equal(11);
    });

    it('adds block-scoped functions to the global scope as expected', function () {
      const f = runTranspiledCode('f(); { function f() {} }');
      expect(f.constructor.name).to.equal('Function');
      expect(ctx.f).to.equal(f);
    });

    it('adds block-scoped var declarations to the global scope as expected', function () {
      const a = runTranspiledCode('{ var a = 10; }');
      expect(a).to.equal(undefined);
      expect(ctx.a).to.equal(10);
    });

    it('does not add block-scoped let declarations to the global scope', function () {
      const a = runTranspiledCode('{ let a = 10; a }');
      expect(a).to.equal(10);
      expect(ctx.a).to.equal(undefined);
    });

    it('does not make let declarations implicit completion records', function () {
      const a = runTranspiledCode('{ let a = 10; }');
      expect(a).to.equal(undefined);
      expect(ctx.a).to.equal(undefined);
    });

    it('does not make const declarations implicit completion records', function () {
      const a = runTranspiledCode('{ const a = 10; }');
      expect(a).to.equal(undefined);
      expect(ctx.a).to.equal(undefined);
    });

    it('ignores variable declarations for completion records', function () {
      expect(runTranspiledCode('"foo" + "bar"; var a = 10;')).to.equal(
        'foobar'
      );
    });

    it('moves top-level classes into the top-level scope', function () {
      const A = runTranspiledCode('class A {}');
      expect(A.constructor.name).to.equal('Function');
      expect(A.name).to.equal('A');
      expect(ctx.A).to.equal(A);
    });

    it('does not move classes from block scopes to the top-level scope', function () {
      const A = runTranspiledCode('{ class A {} }');
      expect(A).to.equal(undefined);
      expect(ctx.A).to.equal(undefined);
    });

    it('does not make top-level classes accessible before their definition', function () {
      expect(() => runTranspiledCode('var a = new A(); class A {}')).to.throw();
    });

    it('does not make block-scoped classes accessible before their definition', function () {
      expect(() =>
        runTranspiledCode('{ var a = new A(); class A {} }')
      ).to.throw();
    });

    it('does not silently remove break; inside switch', function () {
      expect(
        runTranspiledCode('switch (1) { case 1: 1; break; case 2: 2; break;}')
      ).to.equal(1);
    });
  });

  context('implicit awaiting', function () {
    it('does not implicitly await plain function calls', async function () {
      plainFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode('plainFn()');
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(undefined);
      expect((await ret).foo).to.equal('bar');

      expect(await runTranspiledCode('plainFn().foo')).to.equal(undefined);
    });

    it('marks function calls as implicitly awaited when requested', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode('implicitlyAsyncFn()');
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect((await ret).foo).to.equal('bar');

      expect(await runTranspiledCode('implicitlyAsyncFn().foo')).to.equal(
        'bar'
      );
    });

    it('does not implicitly await plain method calls', async function () {
      plainMethod.resolves({ foo: 'bar' });
      const ret = runTranspiledCode('obj.plainMethod()');
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(undefined);
      expect((await ret).foo).to.equal('bar');

      expect(await runTranspiledCode('obj.plainMethod().foo')).to.equal(
        undefined
      );
    });

    it('marks method calls as implicitly awaited when requested', async function () {
      implicitlyAsyncMethod.resolves({ foo: 'bar' });
      const ret = runTranspiledCode('obj.implicitlyAsyncMethod()');
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect((await ret).foo).to.equal('bar');

      expect(
        await runTranspiledCode('obj.implicitlyAsyncMethod().foo')
      ).to.equal('bar');
    });

    it('can implicitly await inside of class methods', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`class A {
        method() { return implicitlyAsyncFn().foo; }
      }; new A().method()`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of functions', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`(function() {
        return implicitlyAsyncFn().foo;
      })()`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of async functions', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`(async function() {
        return implicitlyAsyncFn().foo;
      })()`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of async generator functions', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`(async function() {
        const gen = (async function*() {
          yield implicitlyAsyncFn().foo;
        })();
        for await (const value of gen) return value;
      })()`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of shorthand arrow functions', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode('(() => implicitlyAsyncFn().foo)()');
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of block-statement arrow functions', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(
        '(() => { return implicitlyAsyncFn().foo; })()'
      );
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of template literals', async function () {
      implicitlyAsyncFn.resolves('foobar');
      const ret = runTranspiledCode(
        '(() => { return `>>${implicitlyAsyncFn()}<<`; })()'
      );
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('>>foobar<<');
    });

    it('can implicitly await inside of branches', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`
      if (true) {
        implicitlyAsyncFn().foo;
      } else {
        null;
      }`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of loops', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`
      do {
        implicitlyAsyncFn().foo;
      } while(false)`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('can implicitly await inside of for loops', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`
      let value;
      for (let i = 0; i < 10; i++) {
        value = implicitlyAsyncFn().foo;
      }
      value`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
      expect(implicitlyAsyncFn).to.have.callCount(10);
    });

    it('can use for loops as weird assignments (sync)', async function () {
      const obj = { foo: null };
      implicitlyAsyncFn.resolves(obj);
      await runTranspiledCode(
        'for (implicitlyAsyncFn().foo of ["foo", "bar"]);'
      );
      expect(implicitlyAsyncFn).to.have.callCount(2);
      expect(obj.foo).to.equal('bar');
    });

    it('can use for loops as weird assignments (async)', async function () {
      const obj = { foo: null };
      implicitlyAsyncFn.resolves(obj);
      await runTranspiledCode(
        '(async() => { for await (implicitlyAsyncFn().foo of ["foo", "bar"]); })()'
      );
      expect(implicitlyAsyncFn).to.have.callCount(2);
      expect(obj.foo).to.equal('bar');
    });

    it('works with assignments to objects', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`
      const x = {};
      x.key = implicitlyAsyncFn().foo;
      x.key;`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('works with eval', async function () {
      implicitlyAsyncFn.resolves('yes');
      expect(runTranspiledCode('eval("42")')).to.equal(42);
      expect(runTranspiledCode('let a = 43; eval("a");')).to.equal(43);
      expect(
        runTranspiledCode('(() => { let b = 44; return eval("b"); })()')
      ).to.equal(44);
      expect(
        await runTranspiledCode(`(() => {
        globalThis.eval = implicitlyAsyncFn; return eval("b");
      })()`)
      ).to.equal('yes');
    });

    it('works with import', async function () {
      const ret = runTranspiledCode(
        '(async() => (await import("forty-two")).value)()'
      );
      expect(await ret).to.equal(42);
    });

    it('allows re-declaring variables in separate snippets', function () {
      expect(runTranspiledCode('const a = 42;')).to.equal(undefined);
      expect(runTranspiledCode('const a = 43;')).to.equal(undefined);
      expect(runTranspiledCode('a;')).to.equal(43);
    });

    it('disallows re-declaring variables in the same input text', function () {
      expect(() => runTranspiledCode('const a = 42; const a = 43;')).to.throw(
        /has already been declared/
      );
    });

    it('handles sync callbacks for builtin functions', async function () {
      const ret = runTranspiledCode(
        '["abc", "def"].filter(x => x.endsWith("f"))'
      );
      expect(await ret).to.deep.equal(['def']);
    });

    it('supports typeof for un-defined variables', function () {
      expect(runTranspiledCode('typeof nonexistent')).to.equal('undefined');
    });

    it('supports typeof for un-defined variables in parentheses', function () {
      expect(runTranspiledCode('typeof ((nonexistent))')).to.equal('undefined');
    });

    it('supports typeof for implicitly awaited function calls', async function () {
      implicitlyAsyncFn.resolves(0);
      expect(await runTranspiledCode('typeof implicitlyAsyncFn()')).to.equal(
        'number'
      );
    });

    it('supports typeof for implicitly awaited values', async function () {
      implicitlyAsyncValue = 'abc';
      expect(await runTranspiledCode('typeof implicitlyAsyncValue')).to.equal(
        'string'
      );
    });

    it('supports delete for implicitly awaited values', async function () {
      const obj = { foo: 'bar' };
      implicitlyAsyncFn.resolves(obj);
      expect(
        await runTranspiledCode('delete implicitlyAsyncFn().foo')
      ).to.equal(true);
      expect(obj).to.deep.equal({});
    });

    it('supports delete for implicitly awaited values (indexed)', async function () {
      const obj = { foo: 'bar' };
      implicitlyAsyncFn.resolves(obj);
      expect(
        await runTranspiledCode('delete implicitlyAsyncFn()["foo"]')
      ).to.equal(true);
      expect(obj).to.deep.equal({});
    });

    it('supports delete for plain values', function () {
      expect(
        runTranspiledCode('const obj = { x: "x", y: "y" }; delete obj.x; obj')
      ).to.deep.equal({ y: 'y' });
    });

    it('supports delete for plain values (idnexed)', function () {
      expect(
        runTranspiledCode(
          'const obj = { x: "x", y: "y" }; delete obj["x"]; obj'
        )
      ).to.deep.equal({ y: 'y' });
    });

    it('supports awaiting destructured objects', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      const ret = runTranspiledCode(`
      const { foo } = implicitlyAsyncFn();
      foo`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('supports awaiting destructured arrays', async function () {
      implicitlyAsyncFn.resolves(['bar']);
      const ret = runTranspiledCode(`
      const [ foo ] = implicitlyAsyncFn();
      foo`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('supports awaiting nested destructured objects', async function () {
      implicitlyAsyncFn.resolves({ nested: [{ foo: 'bar' }] });
      const ret = runTranspiledCode(`
      const { nested: [{ foo }] } = implicitlyAsyncFn();
      foo`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('supports awaiting destructured function parameters', async function () {
      implicitlyAsyncFn.resolves({ nested: [{ foo: 'bar' }] });
      const ret = runTranspiledCode(`
      (({ nested: [{ foo }] } = {}) => foo)(implicitlyAsyncFn())`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    it('supports awaiting inside a function which is a default argument of another function', async function () {
      implicitlyAsyncFn.resolves({ nested: [{ foo: 'bar' }] });
      const ret = runTranspiledCode(`
      const call = (fn = foo => foo.nested[0].foo, ...args) => fn(...args);
      call(undefined, implicitlyAsyncFn())`);
      expect(ret.constructor.name).to.equal('Promise');
      expect(ret[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await ret).to.equal('bar');
    });

    context('for-of', function () {
      it('can iterate over implicit iterables', async function () {
        expect(
          await runTranspiledCode(`(function() {
            let sum = 0;
            for (const value of implicitlyAsyncIterable())
              sum += value;
            return sum;
        })()`)
        ).to.equal(6);
      });

      it('can iterate over implicit iterables in async functions', async function () {
        expect(
          await runTranspiledCode(`(async function() {
            let sum = 0;
            for (const value of implicitlyAsyncIterable())
              sum += value;
            return sum;
        })()`)
        ).to.equal(6);
      });

      it('can implicitly yield* inside of async generator functions', async function () {
        expect(
          await runTranspiledCode(`(async function() {
          const gen = (async function*() {
            yield* implicitlyAsyncIterable();
          })();
          let sum = 0;
          for await (const value of gen)
            sum += value;
          return sum;
        })()`)
        ).to.equal(6);
      });
    });

    context('invalid implicit awaits', function () {
      beforeEach(function () {
        runUntranspiledCode(asyncWriter.runtimeSupportCode());
      });

      it('cannot implicitly await inside of class constructors', function () {
        implicitlyAsyncFn.resolves({ foo: 'bar' });
        expect(
          () =>
            runTranspiledCode(`class A {
          constructor() { this.value = implicitlyAsyncFn().foo; }
        }; new A()`).value
        ).to.throw(
          '[ASYNC-10012] Result of expression "implicitlyAsyncFn()" cannot be used in this context'
        );
      });

      it('wrapping inside async functions makes class constructors work nicely', async function () {
        implicitlyAsyncFn.resolves({ foo: 'bar' });
        expect(
          await runTranspiledCode(`class A {
          constructor() { this.value = (async() => implicitlyAsyncFn().foo)(); }
        }; new A()`).value
        ).to.equal('bar');
      });

      it('cannot implicitly await inside of plain generator functions', function () {
        implicitlyAsyncFn.resolves({ foo: 'bar' });
        expect(() =>
          runTranspiledCode(`(function() {
          const gen = (function*() {
            yield implicitlyAsyncFn().foo;
          })();
          for (const value of gen) return value;
        })()`)
        ).to.throw(
          '[ASYNC-10012] Result of expression "implicitlyAsyncFn()" cannot be used in this context'
        );
      });

      it('cannot implicitly await inside of array.sort() callback', function () {
        implicitlyAsyncFn.callsFake((x, y) => x.a - y.a);
        expect(() =>
          runTranspiledCode(`
        const arr = [{ a: 2 }, { a : 1 }];
        arr.sort((x, y) => implicitlyAsyncFn(x, y));
        `)
        ).to.throw(
          '[ASYNC-10012] Result of expression "compareFn(...args)" cannot be used in this context'
        );
      });

      context('for-of', function () {
        it('cannot implicitly yield* inside of generator functions', function () {
          expect(() =>
            runTranspiledCode(`(function() {
            const gen = (function*() {
              yield* implicitlyAsyncIterable();
            })();
            for (const value of gen) return value;
          })()`)
          ).to.throw(
            '[ASYNC-10013] Result of expression "implicitlyAsyncIterable()" cannot be iterated in this context'
          );
        });

        it('cannot implicitly for-of inside of generator functions', function () {
          expect(() =>
            runTranspiledCode(`(function() {
            const gen = (function*() {
              for (const item of implicitlyAsyncIterable()) yield item;
            })();
            for (const value of gen) return value;
          })()`)
          ).to.throw(
            '[ASYNC-10013] Result of expression "implicitlyAsyncIterable()" cannot be iterated in this context'
          );
        });

        it('cannot implicitly for-of await inside of class constructors', function () {
          expect(
            () =>
              runTranspiledCode(`class A {
            constructor() { for (this.foo of implicitlyAsyncIterable()) {} }
          }; new A()`).value
          ).to.throw(
            '[ASYNC-10013] Result of expression "implicitlyAsyncIterable()" cannot be iterated in this context'
          );
        });
      });
    });
  });

  context('error handling', function () {
    it('handles syntax errors properly', function () {
      expect(() => runTranspiledCode('foo(')).to.throw(/Unexpected token/);
    });

    it('accepts comments at the end of code', async function () {
      implicitlyAsyncFn.resolves({ foo: 'bar' });
      expect(
        await runTranspiledCode('implicitlyAsyncFn().foo // comment')
      ).to.equal('bar');
    });
  });

  context('recursion', function () {
    it('can deal with calling a recursive function', function () {
      const result = runTranspiledCode(`
        function sumToN(n) {
          if (n <= 1) return 1;
          return n + sumToN(n - 1);
        }
        sumToN(2);
      `);
      expect(result).to.equal(3);
    });
  });

  context('runtime support', function () {
    beforeEach(function () {
      runUntranspiledCode(asyncWriter.runtimeSupportCode());
    });

    context('async', function () {
      it('supports Array.prototype.forEach', async function () {
        implicitlyAsyncFn.resolves({ foo: 'bar' });
        expect(
          await runTranspiledCode(`
          const a = [implicitlyAsyncFn];
          let value;
          a.forEach((fn) => { value = fn().foo; });
          value;
        `)
        ).to.equal('bar');
      });

      it('supports Array.prototype.map', async function () {
        implicitlyAsyncFn.resolves({ foo: 'bar' });
        expect(
          (
            await runTranspiledCode(`
          [implicitlyAsyncFn].map((fn) => fn());
        `)
          )[0].foo
        ).to.equal('bar');
      });

      it('supports Array.prototype.find', async function () {
        implicitlyAsyncFn.resolves({ foo: 'bar' });
        expect(
          (
            await runTranspiledCode(`
          [() => 0, implicitlyAsyncFn].find((fn) => fn())();
        `)
          ).foo
        ).to.equal('bar');
      });

      it('supports Array.prototype.some', async function () {
        implicitlyAsyncFn.callsFake((value) => value);
        expect(
          await runTranspiledCode(`
          [{ prop: 'prop' }].some((value) => implicitlyAsyncFn(value).prop === 'prop');
        `)
        ).to.equal(true);
      });

      it('supports Array.prototype.every', async function () {
        implicitlyAsyncFn.callsFake((value) => value);
        expect(
          await runTranspiledCode(`
          [{ prop: 'prop' }].every((value) => implicitlyAsyncFn(value).prop === 'prop');
        `)
        ).to.equal(true);
      });

      it('supports Array.prototype.filter', async function () {
        implicitlyAsyncFn.callsFake((value) => value);
        expect(
          await runTranspiledCode(`
          [
            { prop: 'prop' },
            { prop: 'other' }
          ].filter((value) => implicitlyAsyncFn(value).prop === 'prop');
        `)
        ).to.deep.equal([{ prop: 'prop' }]);
      });

      it('supports Array.prototype.findIndex', async function () {
        implicitlyAsyncFn.resolves({ foo: 'bar' });
        expect(
          await runTranspiledCode(`
          const arr = [() => 0, implicitlyAsyncFn];
          arr.findIndex((fn) => fn());
        `)
        ).to.equal(1);
      });

      it('supports Array.prototype.reduce', async function () {
        implicitlyAsyncFn.callsFake((left, right) => left + right);
        expect(
          await runTranspiledCode(`
          [1,2,3].reduce(implicitlyAsyncFn, 0)
        `)
        ).to.equal(6);
      });

      it('supports Array.prototype.reduceRight', async function () {
        implicitlyAsyncFn.callsFake((left, right) => left + right);
        expect(
          await runTranspiledCode(`
          [1,2,3].reduceRight(implicitlyAsyncFn, 0)
        `)
        ).to.equal(6);
      });

      it('supports TypedArray.prototype.map', async function () {
        implicitlyAsyncFn.callsFake((v) => v + 1);
        expect(
          await runTranspiledCode(`
          new Uint8Array([ 1, 2, 3 ]).map(implicitlyAsyncFn).reduce((a, b) => a + b)
        `)
        ).to.equal(9);
      });

      it('supports TypedArray.prototype.filter', async function () {
        implicitlyAsyncFn.callsFake((v) => v < 3);
        expect(
          await runTranspiledCode(`
          new Uint8Array([ 1, 2, 3 ]).filter(implicitlyAsyncFn).reduce((a, b) => a + b)
        `)
        ).to.equal(3);
      });

      it('supports Map.prototype.forEach', async function () {
        const map = await runTranspiledCode(`
          const map = new Map([[1,2], [3,4]]);
          map.forEach(implicitlyAsyncFn);
          map
        `);
        expect(implicitlyAsyncFn).to.have.been.calledWith(2, 1, map);
        expect(implicitlyAsyncFn).to.have.been.calledWith(4, 3, map);
      });

      it('supports Set.prototype.forEach', async function () {
        const set = await runTranspiledCode(`
          const set = new Set([ 2, 4, 6 ]);
          set.forEach(implicitlyAsyncFn);
          set
        `);
        expect(implicitlyAsyncFn).to.have.been.calledWith(2, 2, set);
        expect(implicitlyAsyncFn).to.have.been.calledWith(4, 4, set);
        expect(implicitlyAsyncFn).to.have.been.calledWith(6, 6, set);
      });

      it('supports Array.prototype.flatMap', async function () {
        implicitlyAsyncFn.callsFake((x) => [x - 1, x]);
        const arr = await runTranspiledCode(`
          const arr = [ 2, 4, 6, 8 ];
          arr.flatMap(implicitlyAsyncFn)
        `);
        expect(arr).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
      });
    });

    context('synchronous', function () {
      it('supports Array.prototype.forEach', function () {
        plainFn.returns({ foo: 'bar' });
        expect(
          runTranspiledCode(`
          const a = [plainFn];
          let value;
          a.forEach((fn) => { value = fn().foo; });
          value;
        `)
        ).to.equal('bar');
      });

      it('supports Array.prototype.map', function () {
        plainFn.returns({ foo: 'bar' });
        expect(
          runTranspiledCode(`
          [plainFn].map((fn) => fn());
        `)[0].foo
        ).to.equal('bar');
      });

      it('supports Array.prototype.find', function () {
        plainFn.returns({ foo: 'bar' });
        expect(
          runTranspiledCode(`
          [() => 0, plainFn].find((fn) => fn())();
        `).foo
        ).to.equal('bar');
      });

      it('supports Array.prototype.some', function () {
        plainFn.callsFake((value) => value);
        expect(
          runTranspiledCode(`
          [{ prop: 'prop' }].some((value) => plainFn(value).prop === 'prop');
        `)
        ).to.equal(true);
      });

      it('supports Array.prototype.every', function () {
        plainFn.callsFake((value) => value);
        expect(
          runTranspiledCode(`
          [{ prop: 'prop' }].every((value) => plainFn(value).prop === 'prop');
        `)
        ).to.equal(true);
      });

      it('supports Array.prototype.filter', function () {
        plainFn.callsFake((value) => value);
        expect(
          runTranspiledCode(`
          [
            { prop: 'prop' },
            { prop: 'other' }
          ].filter((value) => plainFn(value).prop === 'prop');
        `)
        ).to.deep.equal([{ prop: 'prop' }]);
      });

      it('supports Array.prototype.findIndex', function () {
        plainFn.returns({ foo: 'bar' });
        expect(
          runTranspiledCode(`
          const arr = [() => 0, plainFn];
          arr.findIndex((fn) => fn());
        `)
        ).to.equal(1);
      });

      it('supports Array.prototype.reduce', function () {
        plainFn.callsFake((left, right) => left + right);
        expect(
          runTranspiledCode(`
          [1,2,3].reduce(plainFn, 0)
        `)
        ).to.equal(6);
      });

      it('supports Array.prototype.reduceRight', function () {
        plainFn.callsFake((left, right) => left + right);
        expect(
          runTranspiledCode(`
          [1,2,3].reduceRight(plainFn, 0)
        `)
        ).to.equal(6);
      });

      it('supports TypedArray.prototype.map', function () {
        plainFn.callsFake((v) => v + 1);
        expect(
          runTranspiledCode(`
          new Uint8Array([ 1, 2, 3 ]).map(plainFn).reduce((a, b) => a + b)
        `)
        ).to.equal(9);
      });

      it('supports TypedArray.prototype.filter', function () {
        plainFn.callsFake((v) => v < 3);
        expect(
          runTranspiledCode(`
          new Uint8Array([ 1, 2, 3 ]).filter(plainFn).reduce((a, b) => a + b)
        `)
        ).to.equal(3);
      });

      it('supports Map.prototype.forEach', function () {
        const map = runTranspiledCode(`
          const map = new Map([[1,2], [3,4]]);
          map.forEach(plainFn);
          map
        `);
        expect(plainFn).to.have.been.calledWith(2, 1, map);
        expect(plainFn).to.have.been.calledWith(4, 3, map);
      });

      it('supports Set.prototype.forEach', function () {
        const set = runTranspiledCode(`
          const set = new Set([ 2, 4, 6 ]);
          set.forEach(plainFn);
          set
        `);
        expect(plainFn).to.have.been.calledWith(2, 2, set);
        expect(plainFn).to.have.been.calledWith(4, 4, set);
        expect(plainFn).to.have.been.calledWith(6, 6, set);
      });

      it('supports Array.prototype.flatMap', function () {
        plainFn.callsFake((x) => [x - 1, x]);
        const arr = runTranspiledCode(`
          const arr = [ 2, 4, 6, 8 ];
          arr.flatMap(plainFn)
        `);
        expect(arr).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
      });

      it('supports Array.prototype.sort', function () {
        plainFn.callsFake((x, y) => x.a - y.a);
        const arr = runTranspiledCode(`
          const arr = [ { a: 1 }, { a: 9 }, { a: 4 }, { a: 16 } ];
          arr.sort(plainFn)
        `);
        expect(arr).to.deep.equal([{ a: 1 }, { a: 4 }, { a: 9 }, { a: 16 }]);
      });

      it('supports TypedArray.prototype.sort', function () {
        plainFn.callsFake((x, y) => x - y);
        const arr = runTranspiledCode(`
          const arr = new Uint8Array([1, 9, 4, 16]);
          arr.sort(plainFn)
        `);
        expect(arr).to.deep.equal(new Uint8Array([1, 4, 9, 16]));
      });

      it('supports Array.prototype.sort without callback', function () {
        const arr = runTranspiledCode(`
          const arr = [ 1, 9, 4, 16 ];
          arr.sort()
        `);
        expect(arr).to.deep.equal([1, 16, 4, 9]);
      });
    });

    context('Function.prototype.toString', function () {
      it('returns the original function source', function () {
        expect(
          runTranspiledCode('Function.prototype.toString.call(() => {})')
        ).to.equal('() => {}');
        expect(
          runTranspiledCode('Function.prototype.toString.call(function () {})')
        ).to.equal('function () {}');
        expect(
          runTranspiledCode(
            'Function.prototype.toString.call(async function () {})'
          )
        ).to.equal('async function () {}');
        expect(
          runTranspiledCode('Function.prototype.toString.call(function* () {})')
        ).to.equal('function* () {}');
        expect(
          runTranspiledCode(
            'Function.prototype.toString.call(async function* () {})'
          )
        ).to.equal('async function* () {}');
        expect(
          runTranspiledCode(
            'Function.prototype.toString.call((class { method() {} }).prototype.method)'
          )
        ).to.equal('method() {}');
      });

      it('lets us not worry about special characters', function () {
        expect(
          runTranspiledCode(
            'Function.prototype.toString.call(() => {\n  method();\n})'
          )
        ).to.equal('() => {\n  method();\n}');
        expect(
          runTranspiledCode(
            'Function.prototype.toString.call(() => { const 八 = 8; })'
          )
        ).to.equal('() => { const 八 = 8; }');
        expect(
          runTranspiledCode(
            'Function.prototype.toString.call(() => { const str = \'"extra quotes"\'; })'
          )
        ).to.equal('() => { const str = \'"extra quotes"\'; }');
      });

      it('does not include references to destructuring helpers', function () {
        expect(
          runTranspiledCode(
            'Function.prototype.toString.call(() => {\n  const [a,{b}] = foo();\n})'
          )
        ).to.equal('() => {\n  const [a,{b}] = foo();\n}');
      });
    });
  });

  context('error messages', function () {
    it('throws sensible error messages', function () {
      expect(() => runTranspiledCode('foo()')).to.throw('foo is not defined');
      expect(() => runTranspiledCode('var foo = 0; foo()')).to.throw(
        'foo is not a function'
      );
      expect(() => runTranspiledCode('Number.prototype()')).to.throw(
        'Number.prototype is not a function'
      );
      expect(() => runTranspiledCode('(Number.prototype[0])()')).to.throw(
        'Number.prototype[0] is not a function'
      );
      expect(() => runTranspiledCode('var db = {}; db.testx();')).to.throw(
        'db.testx is not a function'
      );
      // (Note: The following one would give better error messages in regular code)
      expect(() =>
        runTranspiledCode('var db = {}; new Promise(db.foo)')
      ).to.throw('Promise resolver undefined is not a function');
      expect(() =>
        runTranspiledCode('var db = {}; for (const a of db.foo) {}')
      ).to.throw(/db.foo is not iterable/);
      expect(() =>
        runTranspiledCode('var db = {}; for (const a of db[0]) {}')
      ).to.throw(/db\[0\] is not iterable/);
      expect(() => runTranspiledCode('for (const a of 8) {}')).to.throw(
        '8 is not iterable'
      );
    });

    it('throws sensible error message for code in IIFEs', async function () {
      expect(() => runTranspiledCode('(() => foo())()')).to.throw(
        'foo is not defined'
      );
      expect(() => runTranspiledCode('(() => { var foo; foo(); })()')).to.throw(
        'foo is not a function'
      );
      try {
        await runTranspiledCode('(async () => { var foo; foo(); })()');
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('foo is not a function');
      }
    });

    it('throws sensible error messages for long expressions', function () {
      expect(() =>
        runTranspiledCode(
          'globalThis.abcdefghijklmnopqrstuvwxyz = {}; abcdefghijklmnopqrstuvwxyz()'
        )
      ).to.throw('abcdefghijklmn ... uvwxyz is not a function');
    });
  });

  context('domain support', function () {
    it('works fine when run inside a Node.js domain context', async function () {
      await execFile(
        process.execPath,
        [path.resolve(__dirname, '..', 'test', 'fixtures', 'with-domain.js')],
        {
          timeout: 15_000,
        }
      );
    });
  });

  context('uncatchable exceptions', function () {
    it('allows catching regular exceptions', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw new Error('generic error');
        } catch (err) {
          return ({ caught: err });
        }
      })();`);
      expect(result.caught.message).to.equal('generic error');
    });

    it('allows catching regular exceptions with destructuring catch (object)', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw new Error('generic error');
        } catch ({ message }) {
          return ({ caught: message });
        }
      })();`);
      expect(result.caught).to.equal('generic error');
    });

    it('allows catching regular exceptions with destructuring catch (array)', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw [ 'foo' ];
        } catch ([message]) {
          return ({ caught: message });
        }
      })();`);
      expect(result.caught).to.equal('foo');
    });

    it('allows catching regular exceptions with destructuring catch (assignable)', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw [ 'foo' ];
        } catch ([message]) {
          message = 42;
          return ({ caught: message });
        }
      })();`);
      expect(result.caught).to.equal(42);
    });

    it('allows rethrowing regular exceptions', function () {
      try {
        runTranspiledCode(`
        (() => {
          try {
            throw new Error('generic error');
          } catch (err) {
            throw err;
          }
        })();`);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('generic error');
      }
    });

    it('allows returning from finally', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw new Error('generic error');
        } catch (err) {
          return ({ caught: err });
        } finally {
          return 'finally';
        }
      })();`);
      expect(result).to.equal('finally');
    });

    it('allows returning from finally when exception was thrown in catch block', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw new Error('first error');
        } catch (err) {
          throw new Error('second error');
        } finally {
          return 'finally';
        }
      })();`);
      expect(result).to.equal('finally');
    });

    it('allows returning from finally when no exception is thrown', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
        } catch (err) {
          return 'catch';
        } finally {
          return 'finally';
        }
      })();`);
      expect(result).to.equal('finally');
    });

    it('allows finally without catch', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw new Error('generic error');
        } finally {
          return 'finally';
        }
      })();`);
      expect(result).to.equal('finally');
    });

    it('allows finally without catch with return from try block', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          return 'try';
        } finally {
          return 'finally';
        }
      })();`);
      expect(result).to.equal('finally');
    });

    it('allows throwing primitives', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw null;
        } catch (err) {
          return ({ caught: err });
        }
      })();`);
      expect(result.caught).to.equal(null);
    });

    it('allows throwing primitives with finally', function () {
      const result = runTranspiledCode(`
      (() => {
        try {
          throw null;
        } catch (err) {
          return ({ caught: err });
        } finally {
          return 'finally';
        }
      })();`);
      expect(result).to.equal('finally');
    });

    it('does not catch uncatchable exceptions', function () {
      try {
        runTranspiledCode(`
        (() => {
          try {
            throwUncatchable();
          } catch (err) {
            return ({ caught: err });
          }
        })();`);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('uncatchable!');
      }
    });

    it('does not catch uncatchable exceptions with empty catch clause', function () {
      try {
        runTranspiledCode(`
        (() => {
          try {
            throwUncatchable();
          } catch { }
        })();`);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('uncatchable!');
      }
    });

    it('does not catch uncatchable exceptions with finalizer', function () {
      try {
        runTranspiledCode(`
        (() => {
          try {
            throwUncatchable();
          } catch { } finally { return; }
        })();`);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('uncatchable!');
      }
    });

    it('does not catch uncatchable exceptions with only finalizer', function () {
      try {
        runTranspiledCode(`
        (() => {
          try {
            throwUncatchable();
          } finally { return; }
        })();`);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('uncatchable!');
      }
    });

    it('does not catch uncatchable exceptions thrown from catch block', function () {
      try {
        runTranspiledCode(`
        (() => {
          try {
            throw new Error('regular error');
          } catch {
            throwUncatchable();
          } finally {
            return;
          }
        })();`);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('uncatchable!');
      }
    });
  });
});
