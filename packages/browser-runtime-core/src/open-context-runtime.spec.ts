import bson from 'bson';
import vm from 'vm';
import { OpenContextRuntime, InterpreterEnvironment } from './';
import type { MongoshBus } from '@mongosh/types';
import { ServiceProvider } from '@mongosh/service-provider-core';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import { StubbedInstance, stubInterface } from 'ts-sinon';
chai.use(sinonChai);

describe('OpenContextRuntime', () => {
  let sp: StubbedInstance<ServiceProvider>;
  let interpreterEnvironment: InterpreterEnvironment;
  let bus: MongoshBus;
  let runtime: OpenContextRuntime;

  async function testEvaluate(...statements: string[]): Promise<any> {
    let result = undefined;
    for (const code of statements) {
      result = await runtime.evaluate(code);
    }
    return result?.printable;
  }

  for (const evaluator of ['eval', 'vm']) {
    // eslint-disable-next-line no-loop-func
    context(`with ${evaluator} evaluator`, () => {
      beforeEach(() => {
        sp = stubInterface<ServiceProvider>();
        sp.initialDb = 'test';
        sp.bsonLibrary = bson;
        sp.runCommand.resolves({ ok: 1 });
        sp.runCommandWithCheck.resolves({ ok: 1 });
        bus = stubInterface<MongoshBus>();

        const context = vm.createContext();
        interpreterEnvironment = {
          sloppyEval(code: string): any {
            return evaluator === 'eval' ?
              vm.runInContext('globalThis.eval', context)(code) :
              vm.runInContext(code, context);
          },

          getContextObject(): any {
            return interpreterEnvironment.sloppyEval('globalThis');
          }
        };
        runtime = new OpenContextRuntime(sp, interpreterEnvironment, bus);
      });

      describe('basic evaluation', () => {
        it('evaluates an integer literal', async() => {
          expect(
            await testEvaluate(
              '1'
            )
          ).to.equal(1);
        });

        it('evaluates an string literal', async() => {
          expect(
            await testEvaluate(
              '"some text"'
            )
          ).to.equal('some text');
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

        it('evaluates object literal after other statements as block', async() => {
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

        it('can redeclare a top level function as var', async() => {
          expect(
            await testEvaluate(
              'function sum(a, b) { return a + b; }',
              'var sum = 1',
              'sum'
            )
          ).to.equal(1);
        });

        it('can run shell commands', async() => {
          expect(
            await testEvaluate(
              'db.adminCommand({ ping: 1 })'
            )
          ).to.deep.equal({ ok: 1 });
        });

        it('can create BSON objects', async() => {
          expect(
            JSON.parse(await testEvaluate(
              'EJSON.stringify(Timestamp({ t: 1, i: 2 }))'
            ))
          ).to.deep.equal({ $timestamp: { t: 1, i: 2 } });
        });
      });
    });
  }
});
