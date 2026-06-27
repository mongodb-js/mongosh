import { expect } from 'chai';
import { toSnakeCase, getAiAgent, KNOWN_AGENT_ENV_VARS } from './helpers';

describe('logging helpers', function () {
  describe('toSnakeCase', function () {
    const useCases = [
      { input: 'MongoDB REPL', output: 'mongo_db_repl' },
      {
        input: 'Node.js REPL Instantiation',
        output: 'node_js_repl_instantiation',
      },
      { input: 'A', output: 'a' },
      {
        input: 'OneLongThingInPascalCase',
        output: 'one_long_thing_in_pascal_case',
      },
      { input: 'Removes .Dots in Node.js', output: 'removes_dots_in_node_js' },
    ];

    for (const { input, output } of useCases) {
      it(`should convert ${input} to ${output}`, function () {
        expect(toSnakeCase(input)).to.equal(output);
      });
    }
  });

  describe('getAiAgent', function () {
    beforeEach(function () {
      for (const v of KNOWN_AGENT_ENV_VARS) {
        delete process.env[v];
      }
    });

    afterEach(function () {
      for (const v of KNOWN_AGENT_ENV_VARS) {
        delete process.env[v];
      }
    });

    it('returns undefined when no agent env var is set', function () {
      expect(getAiAgent()).to.equal(undefined);
    });

    for (const envVar of KNOWN_AGENT_ENV_VARS) {
      it(`returns lowercase env var name for ${envVar}`, function () {
        process.env[envVar] = '1';
        expect(getAiAgent()).to.equal(envVar.toLowerCase());
      });
    }

    it('returns the first matching var when multiple are set', function () {
      process.env.CLAUDECODE = '1';
      process.env.AI_AGENT = '1';
      expect(getAiAgent()).to.equal('claudecode');
    });
  });
});
