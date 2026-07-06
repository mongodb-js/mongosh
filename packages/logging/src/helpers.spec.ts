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
    const cleanup = () => {
      for (const v of Object.keys(KNOWN_AGENT_ENV_VARS)) {
        delete process.env[v];
      }
      delete process.env.AGENT;
      delete process.env.AI_AGENT;
    };

    beforeEach(cleanup);
    afterEach(cleanup);

    it('returns undefined when no agent env var is set', function () {
      expect(getAiAgent()).to.equal(undefined);
    });

    for (const [envVar, agentName] of Object.entries(KNOWN_AGENT_ENV_VARS)) {
      it(`returns '${agentName}' for ${envVar}`, function () {
        process.env[envVar] = '1';
        expect(getAiAgent()).to.equal(agentName);
      });
    }

    it('returns ai_agent for AGENT=1', function () {
      process.env.AGENT = '1';
      expect(getAiAgent()).to.equal('ai_agent');
    });

    it('returns ai_agent for AI_AGENT=true', function () {
      process.env.AI_AGENT = 'true';
      expect(getAiAgent()).to.equal('ai_agent');
    });

    it('returns the value of AGENT when it is a known agent name', function () {
      process.env.AGENT = 'my_custom_tool';
      expect(getAiAgent()).to.equal('my_custom_tool');
    });

    it('returns the first matching KNOWN_AGENT_ENV_VARS entry when multiple are set', function () {
      process.env.CLAUDECODE = '1';
      process.env.CURSOR_AGENT = '1';
      expect(getAiAgent()).to.equal('claude_code');
    });

    it('AGENT and AI_AGENT take priority over KNOWN_AGENT_ENV_VARS', function () {
      process.env.AI_AGENT = '1';
      process.env.CLAUDECODE = '1';
      expect(getAiAgent()).to.equal('ai_agent');
    });
  });
});
