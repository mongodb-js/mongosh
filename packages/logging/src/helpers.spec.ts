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
    let savedEnv: Record<string, string | undefined> = {};

    beforeEach(function () {
      savedEnv = {};
      for (const v of Object.keys(KNOWN_AGENT_ENV_VARS)) {
        savedEnv[v] = process.env[v];
        delete process.env[v];
      }
    });

    afterEach(function () {
      for (const [v, original] of Object.entries(savedEnv)) {
        if (original === undefined) {
          delete process.env[v];
        } else {
          process.env[v] = original;
        }
      }
    });

    it('returns undefined when no agent env var is set', function () {
      expect(getAiAgent()).to.equal(undefined);
    });

    for (const [envVar, agentName] of Object.entries(KNOWN_AGENT_ENV_VARS)) {
      it(`returns '${agentName}' for ${envVar}`, function () {
        process.env[envVar] = '1';
        expect(getAiAgent()).to.equal(agentName);
      });
    }

    it('returns the first matching entry when multiple vars are set', function () {
      process.env.CLAUDECODE = '1';
      process.env.CURSOR_AGENT = '1';
      expect(getAiAgent()).to.equal('claude_code');
    });

    describe('AI_AGENT fallback', function () {
      it('returns ai_agent when set to boolean-style value "1"', function () {
        process.env.AI_AGENT = '1';
        expect(getAiAgent()).to.equal('ai_agent');
      });

      it('returns ai_agent when set to boolean-style value "true"', function () {
        process.env.AI_AGENT = 'true';
        expect(getAiAgent()).to.equal('ai_agent');
      });

      it('returns the value directly when it is a descriptive agent name', function () {
        process.env.AI_AGENT = 'my_custom_tool';
        expect(getAiAgent()).to.equal('my_custom_tool');
      });

      it('is checked after specific vars — specific vars take priority', function () {
        process.env.CLAUDECODE = '1';
        process.env.AI_AGENT = '1';
        expect(getAiAgent()).to.equal('claude_code');
      });
    });
  });
});
