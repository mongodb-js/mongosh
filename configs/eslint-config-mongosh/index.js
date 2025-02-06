'use strict';

const shared = require('@mongodb-js/eslint-config-devtools');
const common = require('@mongodb-js/eslint-config-devtools/common');

const extraJSRules = {
  'jsx-a11y/no-autofocus': 1,
  'jsx-a11y/click-events-have-key-events': 1,
  'jsx-a11y/no-static-element-interactions': 1,
  'jsx-a11y/anchor-is-valid': 1,

  'mocha/no-exports': 1,
  'mocha/max-top-level-suites': 1,
  'mocha/no-sibling-hooks': 1,

  // this would disallow our locale files' filenames like de_DE.ts
  'filename-rules/match': 1,

  // TODO(MONGOSH-1580): re-enable this rule
  'no-case-declarations': 1,
};

const extraTypescriptRules = {
  // this rule causes many false positives, so we leave it to just warn
  '@typescript-eslint/no-unnecessary-type-assertion': 1,

  // TODO(MONGOSH-1581): re-enable this rule
  '@typescript-eslint/restrict-plus-operands': 1,
  // TODO(MONGOSH-1582): re-enable this rule
  '@typescript-eslint/no-var-requires': 1,
  // TODO(MONGOSH-1583): re-enable this rule
  '@typescript-eslint/restrict-template-expressions': 1,
  // TODO(MONGOSH-1584): re-enable this rule
  '@typescript-eslint/no-empty-function': 1,
  // TODO(MONGOSH-1585): re-enable this rule
  '@typescript-eslint/no-misused-promises': 1,
  // TODO(MONGOSH-1586): re-enable this rule
  '@typescript-eslint/unbound-method': 1,
  // TODO(MONGOSH-1587): re-enable this rule
  '@typescript-eslint/ban-types': 1,
};

module.exports = {
  plugins: [...shared.plugins],
  rules: {
    ...shared.rules,
  },
  env: {
    ...shared.env,
  },
  overrides: [
    {
      ...common.jsOverrides,
      rules: {
        ...common.jsRules,
        ...extraJSRules,
      },
    },
    {
      ...common.jsxOverrides,
      rules: {
        ...common.jsxRules,
        ...extraJSRules,
      },
    },
    {
      ...common.tsOverrides,
      rules: {
        ...common.tsRules,
        ...extraJSRules,
        ...extraTypescriptRules,
      },
    },
    {
      ...common.tsxOverrides,
      rules: {
        ...common.tsxRules,
        ...extraJSRules,
        ...extraTypescriptRules,
      },
    },
    {
      ...common.testOverrides,
      rules: {
        ...common.testRules,
        ...extraJSRules,
      },
    },
    {
      ...common.testOverrides,
      files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.tsx', '**/*.test.ts'],
      rules: {
        ...common.testRules,
        ...extraJSRules,
        ...extraTypescriptRules,
      },
    },
  ],
  settings: {
    ...shared.settings,
  },
};
