'use strict';

const shared = require('@mongodb-js/eslint-config-devtools');
const common = require('@mongodb-js/eslint-config-devtools/common');

// TODO(MONGOSH-1508) we need to turn these back into errors (and fix them) or ticket them
const tempRules = {
  'jsx-a11y/no-autofocus': 1,
  'jsx-a11y/click-events-have-key-events': 1,
  'jsx-a11y/no-static-element-interactions': 1,
  'jsx-a11y/anchor-is-valid': 1,

  'mocha/no-exports': 1,
  'mocha/max-top-level-suites': 1,
  'mocha/no-identical-title': 1,
  'mocha/no-sibling-hooks': 1,
  'mocha/no-nested-tests': 1,

  'filename-rules/match': 1,

  'no-useless-escape': 1,
  'no-undef': 1,
  'no-prototype-builtins': 1,
  'no-async-promise-executor': 1,
  'no-case-declarations': 1,
};

// TODO(MONGOSH-1508) we need to turn these back into errors (and fix them) or ticket them
const tempTypescriptRules = {
  '@typescript-eslint/no-unnecessary-type-assertion': 1,
  '@typescript-eslint/restrict-plus-operands': 1,
  '@typescript-eslint/no-var-requires': 1,
  '@typescript-eslint/restrict-template-expressions': 1,
  '@typescript-eslint/no-empty-function': 1,
  '@typescript-eslint/no-misused-promises': 1,
  '@typescript-eslint/consistent-type-imports': 1,
  '@typescript-eslint/unbound-method': 1,
  '@typescript-eslint/no-implied-eval': 1,
  '@typescript-eslint/no-unused-vars': 1,
  '@typescript-eslint/prefer-regexp-exec': 1,
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
        ...tempRules,
      },
    },
    {
      ...common.jsxOverrides,
      rules: {
        ...common.jsxRules,
        ...tempRules,
      },
    },
    {
      ...common.tsOverrides,
      rules: {
        ...common.tsRules,
        ...tempRules,
        ...tempTypescriptRules,
      },
    },
    {
      ...common.tsxOverrides,
      rules: {
        ...common.tsxRules,
        ...tempRules,
        ...tempTypescriptRules,
      },
    },
    {
      ...common.testOverrides,
      rules: {
        ...common.testRules,
        ...tempRules,
      },
    },
    {
      ...common.testOverrides,
      files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.tsx', '**/*.test.ts'],
      rules: {
        ...common.testRules,
        ...tempRules,
        ...tempTypescriptRules,
      },
    },
  ],
  settings: {
    ...shared.settings,
  },
};
