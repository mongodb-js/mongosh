import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
const { expect } = chai;

import { createCustomEval } from './custom-eval';

const delay = (msecs = 1): Promise<void> => new Promise(resolve => setTimeout(resolve, msecs));

describe('custom-eval', () => {
  it('runs asynchronous code sequentially', async() => {
    const inputs = [];
    const callback = sinon.spy();
    const replEval = sinon.spy();
    const shellEvaluatorCustomEval = async(_, input): Promise<any> => {
      if (input === '1') {
        await delay(1000);
      }

      inputs.push(input);
    };

    const customEval = createCustomEval(replEval, shellEvaluatorCustomEval);

    await Promise.all(
      [
        customEval('1', {}, '', callback),
        customEval('2', {}, '', callback)
      ]
    );

    expect(inputs).to.deep.equal(['1', '2']);
  });

  it('keeps running code in case of an error', async() => {
    const inputs = [];
    const callback = sinon.spy();
    const replEval = sinon.spy();
    const shellEvaluatorCustomEval = async(_, input): Promise<any> => {
      if (input === '1') {
        await delay(1000);
      }

      if (input === 'err') {
        throw new Error();
      }

      inputs.push(input);
    };

    const customEval = createCustomEval(replEval, shellEvaluatorCustomEval);

    await Promise.all(
      [
        customEval('1', {}, '', callback),
        customEval('err', {}, '', callback),
        customEval('2', {}, '', callback)
      ]
    );

    expect(callback).to.have.been.calledThrice;
    expect(inputs).to.deep.equal(['1', '2']);
  });
});
